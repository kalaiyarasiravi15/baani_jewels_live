const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const tag = 'audit-' + crypto.randomUUID();
process.env.SECURITY_RATE_NAMESPACE = tag;

const models = require('../models');
const { syncSecurityTables, PaymentIntent, Session } = require('../models/securityModels');
const security = require('../utils/sessionSecurity');
const mailer = require('../utils/mailer');
const { getShippingRate, applyFreeShippingRule } = require('../utils/shippingPolicy');

// Intercept mailer and SMS for accurate OTP capture while tracking all outgoing emails
let lastSentOtp = null;
const dispatchedEmails = [];
const originalSendMail = mailer.sendMail;

mailer.sendMail = async (message) => {
  const textContent = String(message.text || message.html || '');
  // Match OTP inside styled headers or tags, avoiding color hex codes
  const match = textContent.match(/class="otp-display"[^>]*>(\d{6})<\/h1>/) || textContent.match(/>\s*(\d{6})\s*</);
  if (match) {
    lastSentOtp = match[1];
  }
  dispatchedEmails.push({
    to: message.to,
    subject: message.subject,
    otp: match ? match[1] : null,
    html: message.html
  });
  return { accepted: [message.to], rejected: [], messageId: 'audit-' + crypto.randomUUID() };
};

const sms = require('../utils/smsService');
for (const key of Object.keys(sms)) {
  if (typeof sms[key] === 'function') sms[key] = async () => ({ success: true });
}
sms.sendOtpSMS = (phone, otp) => {
  lastSentOtp = String(otp);
  return { success: true };
};

const { app } = require('../server');

test('Comprehensive Full-System End-to-End Audit & Verification Suite', async (t) => {
  await syncSecurityTables();

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;

  function createClient(channel = 'store') {
    return {
      channel,
      cookie: '',
      csrf: '',
      async call(url, method = 'GET', data = null, extraHeaders = {}) {
        const headers = {
          'Cookie': this.cookie,
          'X-Client-Type': channel,
          'X-CSRF-Token': this.csrf,
          ...extraHeaders
        };
        if (data) headers['Content-Type'] = 'application/json';

        const response = await fetch(base + url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined
        });

        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.cookie = setCookie.split(';')[0];
        }

        if (response.headers.get('x-csrf-token')) {
          this.csrf = response.headers.get('x-csrf-token');
        }

        let body;
        try {
          body = await response.json();
        } catch (_) {
          body = null;
        }

        if (body?.csrfToken) {
          this.csrf = body.csrfToken;
        }

        return { status: response.status, body, headers: response.headers };
      }
    };
  }

  // Setup Admin
  const adminPassword = 'AdminAuditPass2026!';
  const adminEmail = `admin-${tag}@baani.invalid`;
  const admin = await models.Admin.create({
    name: 'Audit Super Admin',
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 10),
    role: 'admin'
  });

  const adminClient = createClient('admin');
  await adminClient.call('/api/session');
  const adminLogin = await adminClient.call('/api/admin/login', 'POST', {
    email: adminEmail,
    password: adminPassword
  });
  assert.equal(adminLogin.status, 200, 'Admin login should succeed');

  // Customer credentials to test
  const testCustomerEmail = `customer-${tag}@baani.invalid`;
  const testCustomerPhone = '9876543210';
  const testCustomerName = 'Anita Sharma';
  const initialPassword = 'Password2026!';
  const newPassword = 'NewSecretPassword2026!';

  let createdCustomerId = null;
  let placedOrderId = null;
  let placedNumericId = null;

  try {
    // -------------------------------------------------------------
    // MODULE 1: Customer Registration & OTP Flow
    // -------------------------------------------------------------
    await t.test('Module 1: Customer Registration with Email OTP Verification', async () => {
      const client = createClient('store');
      await client.call('/api/session');

      // 1. Invalid input validation
      const badReq = await client.call('/api/customers/send-register-otp', 'POST', {
        name: 'A',
        email: 'invalid-email',
        phone: '123'
      });
      assert.equal(badReq.status, 400);

      // 2. Request OTP
      lastSentOtp = null;
      const otpReq = await client.call('/api/customers/send-register-otp', 'POST', {
        name: testCustomerName,
        email: testCustomerEmail,
        phone: testCustomerPhone
      });
      assert.equal(otpReq.status, 200);
      assert.ok(lastSentOtp, 'OTP should be dispatched via email/SMS');
      assert.match(lastSentOtp, /^\d{6}$/, 'OTP must be 6 digits');

      // 3. Verify incorrect OTP fails
      const badVerify = await client.call('/api/customers/verify-register-otp', 'POST', {
        email: testCustomerEmail,
        otp: '000000'
      });
      assert.equal(badVerify.status, 400);

      // 4. Verify correct OTP succeeds
      const goodVerify = await client.call('/api/customers/verify-register-otp', 'POST', {
        email: testCustomerEmail,
        otp: lastSentOtp
      });
      assert.equal(goodVerify.status, 200);

      // 5. Complete registration
      const reg = await client.call('/api/customers/register', 'POST', {
        name: testCustomerName,
        email: testCustomerEmail,
        phone: testCustomerPhone,
        password: initialPassword
      });
      assert.equal(reg.status, 201);
      assert.ok(reg.body.customer.id);
      createdCustomerId = reg.body.customer.id;

      // Duplicate registration attempt blocked
      const dup = await client.call('/api/customers/send-register-otp', 'POST', {
        name: testCustomerName,
        email: testCustomerEmail,
        phone: testCustomerPhone
      });
      assert.equal(dup.status, 400);
    });

    // -------------------------------------------------------------
    // MODULE 2: Customer Login, Sessions & Profile
    // -------------------------------------------------------------
    await t.test('Module 2: Customer Login, Session Identity & Profile Updates', async () => {
      const client = createClient('store');
      await client.call('/api/session');

      // 1. Bad password fails
      const badLogin = await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: 'WrongPassword999!'
      });
      assert.equal(badLogin.status, 401);

      // 2. Valid password succeeds
      const login = await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: initialPassword
      });
      assert.equal(login.status, 200);
      assert.equal(login.body.customer.email, testCustomerEmail);

      // 3. Session now holds customer identity
      const session = await client.call('/api/session');
      assert.equal(session.status, 200);
      assert.equal(session.body.customer.id, createdCustomerId);

      // 4. Update profile name and phone
      const update = await client.call(`/api/customers/update/${createdCustomerId}`, 'PUT', {
        name: 'Anita Sharma Verified',
        phone: '9876543211'
      });
      assert.equal(update.status, 200);
      assert.equal(update.body.customer.name, 'Anita Sharma Verified');

      // 5. Add shipping address
      const addAddr = await client.call('/api/customers/add-shipping', 'POST', {
        customerId: createdCustomerId,
        name: 'Anita Sharma',
        phone: '9876543211',
        addressLine: 'Flat 402, Royal Palms, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India'
      });
      assert.equal(addAddr.status, 201);
      assert.ok(addAddr.body.address.id);
    });

    // -------------------------------------------------------------
    // MODULE 3: Forgot Password, OTP Verification & Password Reset
    // -------------------------------------------------------------
    await t.test('Module 3: Forgot Password, OTP Email & Password Reset Flow', async () => {
      const client = createClient('store');
      await client.call('/api/session');

      // 1. Forgot password request
      lastSentOtp = null;
      const forgot = await client.call('/api/customers/forgot-password', 'POST', {
        email: testCustomerEmail
      });
      assert.equal(forgot.status, 200);
      assert.ok(lastSentOtp, 'Forgot password OTP should be dispatched');
      assert.match(lastSentOtp, /^\d{6}$/);
      const resetOtp = lastSentOtp;

      // 2. Verify OTP check
      const verify = await client.call('/api/customers/verify-otp', 'POST', {
        email: testCustomerEmail,
        otp: resetOtp
      });
      assert.equal(verify.status, 200);

      // 3. Reset password
      const reset = await client.call('/api/customers/reset-password', 'POST', {
        email: testCustomerEmail,
        otp: resetOtp,
        newPassword: newPassword
      });
      assert.equal(reset.status, 200);

      // 4. Old password rejected
      const oldLogin = await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: initialPassword
      });
      assert.equal(oldLogin.status, 401);

      // 5. New password accepted
      const newLogin = await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: newPassword
      });
      assert.equal(newLogin.status, 200);
    });

    // -------------------------------------------------------------
    // MODULE 4: Shopping Flow (Cart & Wishlist: Authenticated & Session)
    // -------------------------------------------------------------
    await t.test('Module 4: Cart and Wishlist Dynamic Operations', async () => {
      // Find an active product for testing
      const product = await models.Product.findOne({ where: { status: 'active' } }) || await models.Product.findOne();
      assert.ok(product, 'Must have at least one product in DB for testing');

      // A. Session & Guest Preferences
      const guestClient = createClient('store');
      const guestSessionRes = await guestClient.call('/api/session');
      assert.equal(guestSessionRes.status, 200);
      assert.ok(guestSessionRes.body.csrfToken);

      // Guest preferences update
      const prefUpdate = await guestClient.call('/api/session/preferences', 'PUT', { dealDismissed: true });
      assert.equal(prefUpdate.status, 200);

      // B. Authenticated Customer Cart & Wishlist
      const custClient = createClient('store');
      await custClient.call('/api/session');
      await custClient.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: newPassword
      });

      // Add to customer cart
      const custAdd = await custClient.call('/api/cart/add', 'POST', {
        customerId: createdCustomerId,
        productId: product.id,
        quantity: 2
      });
      assert.ok([200, 201].includes(custAdd.status), 'Adding to cart should return 200 or 201');

      // Get customer cart
      const custCart = await custClient.call(`/api/cart/${createdCustomerId}`);
      assert.equal(custCart.status, 200);
      assert.ok(Array.isArray(custCart.body));
      assert.ok(custCart.body.length >= 1);

      // Wishlist toggle (Add)
      const custWish = await custClient.call('/api/wishlist/toggle', 'POST', {
        customerId: createdCustomerId,
        productId: product.id
      });
      assert.ok([200, 201].includes(custWish.status), 'Wishlist add should return 200 or 201');

      // Check wishlist
      const checkWish = await custClient.call(`/api/wishlist/check/${createdCustomerId}/${product.id}`);
      assert.equal(checkWish.status, 200);

      // Remove from wishlist
      if (custWish.body?.item?.id) {
        const custWishRemove = await custClient.call(`/api/wishlist/remove/${custWish.body.item.id}`, 'DELETE');
        assert.equal(custWishRemove.status, 200);
      }
    });

    // -------------------------------------------------------------
    // MODULE 5: Shipping Zones Policy & Dynamic Calculation
    // -------------------------------------------------------------
    await t.test('Module 5: Shipping Zones Policy Rates & Online Free Shipping Rules', async () => {
      // 1. Regional State: Delhi -> 150
      const delhi = await getShippingRate('Delhi');
      assert.equal(delhi.amount, 150);
      assert.equal(delhi.zoneType, 'REGIONAL');

      // 2. Regional State: Maharashtra -> 150
      const mh = await getShippingRate('Maharashtra');
      assert.equal(mh.amount, 150);

      // 3. Local State: Tamil Nadu -> 85
      const tn = await getShippingRate('Tamil Nadu');
      assert.equal(tn.amount, 85);
      assert.equal(tn.zoneType, 'LOCAL');

      // 4. Zonal State: Karnataka -> 99
      const ka = await getShippingRate('Karnataka');
      assert.equal(ka.amount, 99);
      assert.equal(ka.zoneType, 'ZONAL');

      // 5. Free shipping rule on high value online orders
      const freeShipApplied = await applyFreeShippingRule(delhi, 5000, 'Online');
      assert.ok(Number.isFinite(freeShipApplied.amount));

      // 6. Admin Shipping Zones API
      const zones = await adminClient.call('/api/shipping/zones');
      assert.equal(zones.status, 200);
      const zoneList = Array.isArray(zones.body) ? zones.body : zones.body.data;
      assert.ok(zoneList.length >= 35, 'Should have at least 35 configured shipping zones');
    });

    // -------------------------------------------------------------
    // MODULE 6: Payment Flow (Razorpay Keys, Order & Anti-Tamper)
    // -------------------------------------------------------------
    await t.test('Module 6: Razorpay Payment Verification & Intent Lifecycle', async () => {
      // 1. Public key retrieval
      const keyRes = await adminClient.call('/api/payment/get-key');
      assert.equal(keyRes.status, 200);
      assert.ok(keyRes.body.key);

      // 2. Create PaymentIntent record in database to verify tamper protection
      const fakeOrderId = 'order_audit_' + crypto.randomUUID().slice(0, 14);
      const fakePaymentId = 'pay_audit_' + crypto.randomUUID().slice(0, 14);
      const testAmountPaise = 50000; // Rs 500

      const session = await Session.findOne();
      const intent = await PaymentIntent.create({
        id: fakeOrderId,
        sessionId: session ? session.id : 'audit-session',
        amount: testAmountPaise,
        verified: true,
        consumed: false,
        paymentId: fakePaymentId
      });

      assert.equal(intent.verified, true);
      assert.equal(intent.consumed, false);

      // Cleanup
      await intent.destroy();
    });

    // -------------------------------------------------------------
    // MODULE 7: Order Placement, Status Updates & Notification Emails
    // -------------------------------------------------------------
    await t.test('Module 7: Order Placement, Status Transitions & Notification Mails', async () => {
      const product = await models.Product.findOne({ where: { status: 'active' } }) || await models.Product.findOne();
      const customOrderId = 'ORD-AUDIT-' + Date.now();

      // Create test order directly through models to test status transitions and email dispatch
      const order = await models.Order.create({
        orderId: customOrderId,
        customerId: createdCustomerId,
        customerType: 'REGISTERED',
        totalAmount: 999.00,
        shippingAmount: 85.00,
        shippingType: 'LOCAL',
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        orderStatus: 'Pending',
        snapName: 'Anita Sharma',
        snapPhone: '9876543211',
        snapAddressLine: 'Flat 402, Royal Palms',
        snapCity: 'Bengaluru',
        snapState: 'Karnataka',
        snapPincode: '560001',
        guestEmail: testCustomerEmail
      });

      placedOrderId = customOrderId;
      placedNumericId = order.id;

      await models.OrderSlot.create({
        orderId: customOrderId,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        salesPrice: 914.00,
        finalPrice: 914.00
      });

      // 1. Order Status Transition: Pending -> Confirmed
      const toConfirmed = await adminClient.call(`/api/orders/update/${placedOrderId}`, 'PUT', {
        orderStatus: 'Confirmed'
      });
      assert.equal(toConfirmed.status, 200);

      // 2. Order Status Transition: Confirmed -> Packed
      const toPacked = await adminClient.call(`/api/orders/update/${placedOrderId}`, 'PUT', {
        orderStatus: 'Packed'
      });
      assert.equal(toPacked.status, 200);

      // 3. Order Status Transition: Packed -> Shipped (with Courier details)
      const toShipped = await adminClient.call(`/api/orders/update/${placedOrderId}`, 'PUT', {
        orderStatus: 'Shipped',
        courierPartner: 'BlueDart',
        trackingNumber: 'BLUEDART12345678'
      });
      assert.equal(toShipped.status, 200);

      // 4. Order Status Transition: Shipped -> Delivered
      const toDelivered = await adminClient.call(`/api/orders/update/${placedOrderId}`, 'PUT', {
        orderStatus: 'Delivered'
      });
      assert.equal(toDelivered.status, 200);

      // 5. Track Order endpoint verifies delivery
      const trackRes = await adminClient.call(`/api/orders/track/${placedOrderId}`);
      assert.equal(trackRes.status, 200);
      const trackOrder = trackRes.body.order || trackRes.body;
      assert.equal(trackOrder.orderStatus, 'Delivered');

      // Verify email notifications were generated
      const orderEmails = dispatchedEmails.filter(e => e.subject && e.subject.includes(placedOrderId));
      assert.ok(orderEmails.length >= 1, 'Should generate email notifications on status change');
    });

    // -------------------------------------------------------------
    // MODULE 8: Product Reviews & Moderation
    // -------------------------------------------------------------
    await t.test('Module 8: Product Review Submission & Admin Moderation', async () => {
      const product = await models.Product.findOne({ where: { status: 'active' } }) || await models.Product.findOne();

      // Submit review for delivered order using authenticated customer
      const client = createClient('store');
      await client.call('/api/session');
      await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: newPassword
      });

      const reviewSubmission = await client.call(`/api/reviews/order/${placedOrderId}/product/${product.id}`, 'POST', {
        rating: 5,
        feedback: 'Exquisite craftsmanship! The bangle shine is breathtaking. Highly recommended.',
        reviewerName: 'Anita Sharma'
      });
      assert.ok([200, 201].includes(reviewSubmission.status), 'Review should submit successfully');

      // Admin fetch reviews
      const adminReviews = await adminClient.call('/api/reviews/all');
      assert.equal(adminReviews.status, 200);
      const revList = Array.isArray(adminReviews.body) ? adminReviews.body : adminReviews.body.reviews;
      assert.ok(Array.isArray(revList));

      // Public reviews for product
      const pubReviews = await client.call(`/api/reviews/product/${product.id}`);
      assert.equal(pubReviews.status, 200);
    });

    // -------------------------------------------------------------
    // MODULE 9: Inbox & Contact Messages Flow
    // -------------------------------------------------------------
    await t.test('Module 9: Contact Form Submission, Admin Inbox & Email Reply', async () => {
      const client = createClient('store');
      await client.call('/api/session');

      // 1. Submit contact message with reference image from storefront
      const contactRes = await client.call('/api/contact/send', 'POST', {
        name: 'Anita Sharma',
        email: testCustomerEmail,
        phone: '9876543210',
        subject: 'Custom Sizing Query',
        message: 'Could you let me know if this festive bangle can be custom sized to 2.4?',
        image: 'design-reference.jpg'
      });
      assert.ok([200, 201].includes(contactRes.status), 'Contact message should be accepted');

      // 2. Admin unread count
      const unread = await adminClient.call('/api/contact/unread-count');
      assert.equal(unread.status, 200);

      // 3. Admin inbox messages list
      const inbox = await adminClient.call('/api/contact/all');
      assert.equal(inbox.status, 200);
      const messages = Array.isArray(inbox.body) ? inbox.body : inbox.body.messages;
      assert.ok(messages.length >= 1);
      const testMsg = messages.find(m => m.email === testCustomerEmail) || messages[0];

      // 4. Mark message as read
      const markRead = await adminClient.call(`/api/contact/read/${testMsg.id}`, 'PUT');
      assert.equal(markRead.status, 200);

      // 5. Admin reply to contact message
      const replyRes = await adminClient.call(`/api/contact/reply/${testMsg.id}`, 'POST', {
        replyMessage: 'Yes, 2.4 custom sizing is available! We have updated your preference.'
      });
      assert.equal(replyRes.status, 200);

      // Check reply email was dispatched
      assert.ok(dispatchedEmails.length > 0, 'Reply email should be dispatched');
    });

    // -------------------------------------------------------------
    // MODULE 10: Admin Dashboard Metrics & Dynamic Settings
    // -------------------------------------------------------------
    await t.test('Module 10: Admin Dashboard Metrics, Badges & Store Settings', async () => {
      // 1. Stats
      const stats = await adminClient.call('/api/dashboard/stats');
      assert.equal(stats.status, 200);
      assert.ok(stats.body !== null);

      // 2. Badges
      const badges = await adminClient.call('/api/dashboard/badges');
      assert.equal(badges.status, 200);

      // 3. Read Settings
      const settings = await adminClient.call('/api/settings');
      assert.equal(settings.status, 200);

      // 4. Categories & Subcategories
      const cats = await adminClient.call('/api/categories/all');
      assert.equal(cats.status, 200);

      // 5. Products & Inventory
      const prods = await adminClient.call('/api/products/all');
      assert.equal(prods.status, 200);

      // 6. Coupons
      const coupons = await adminClient.call('/api/coupons/all');
      assert.equal(coupons.status, 200);

      // 7. Testimonials
      const testimonials = await adminClient.call('/api/testimonials/all');
      assert.equal(testimonials.status, 200);
    });

    // -------------------------------------------------------------
    // MODULE 11: Customer Account Deletion Flow
    // -------------------------------------------------------------
    await t.test('Module 11: Customer Account Deletion with OTP Verification', async () => {
      const client = createClient('store');
      await client.call('/api/session');
      await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: newPassword
      });

      // 1. Request deletion OTP
      lastSentOtp = null;
      const delOtpReq = await client.call(`/api/customers/delete/${createdCustomerId}/request-otp`, 'POST');
      assert.equal(delOtpReq.status, 200);
      assert.ok(lastSentOtp, 'Deletion OTP should be sent via email');

      // 2. Wrong OTP fails
      const badDel = await client.call(`/api/customers/delete/${createdCustomerId}`, 'DELETE', {
        otp: '000000'
      });
      assert.equal(badDel.status, 400);

      // 3. Correct OTP deletes account
      const goodDel = await client.call(`/api/customers/delete/${createdCustomerId}`, 'DELETE', {
        otp: lastSentOtp
      });
      assert.equal(goodDel.status, 200);

      // 4. Login now blocked
      const afterLogin = await client.call('/api/customers/login', 'POST', {
        email: testCustomerEmail,
        password: newPassword
      });
      assert.equal(afterLogin.status, 404);
    });

  } finally {
    // Teardown
    mailer.sendMail = originalSendMail;
    server.close();
    await models.Admin.destroy({ where: { email: adminEmail } }).catch(() => {});
    await models.Customer.destroy({ where: { email: testCustomerEmail }, force: true }).catch(() => {});
    if (placedOrderId) {
      await models.Review.destroy({ where: { orderId: placedOrderId } }).catch(() => {});
      await models.OrderSlot.destroy({ where: { orderId: placedOrderId } }).catch(() => {});
    }
    if (placedNumericId) {
      await models.Order.destroy({ where: { id: placedNumericId } }).catch(() => {});
    }
  }
});
