const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const tag = 'admin-test-' + crypto.randomUUID();
process.env.SECURITY_RATE_NAMESPACE = tag;

const models = require('../models');
const { syncSecurityTables } = require('../models/securityModels');
const security = require('../utils/sessionSecurity');
const mailer = require('../utils/mailer');
mailer.sendMail = async () => ({ accepted: ['admin-test@example.invalid'], rejected: [], messageId: 'admin-test' });

const sms = require('../utils/smsService');
for (const key of Object.keys(sms)) {
  if (typeof sms[key] === 'function') sms[key] = async () => ({ success: true });
}

const { app } = require('../server');

test('Comprehensive Admin Website Unit Tests — All Sections and Pages', async (t) => {
  await syncSecurityTables();

  const adminPassword = 'AdminSecurePass2026!';
  const adminEmail = `admin-${tag}@baani.invalid`;
  const admin = await models.Admin.create({
    name: 'Test Super Admin',
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 10),
    role: 'admin'
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;

  function createClient(channel = 'admin') {
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

  const unauthClient = createClient('admin');
  const adminClient = createClient('admin');

  try {
    // -------------------------------------------------------------
    // SECTION 1: Admin Authentication & Session Page (/login)
    // -------------------------------------------------------------
    await t.test('Section 1: Admin Authentication (Login, Session & Logout)', async () => {
      // 1. Initial unauthenticated session check
      const init = await adminClient.call('/api/session');
      assert.equal(init.status, 200);
      assert.equal(init.body.admin, null);
      assert.ok(init.body.csrfToken, 'Should receive CSRF token');

      // 2. Failed login with wrong password
      const failLogin = await adminClient.call('/api/admin/login', 'POST', {
        email: adminEmail,
        password: 'WrongPassword!'
      });
      assert.equal(failLogin.status, 401);

      // 3. Successful login with correct credentials
      const successLogin = await adminClient.call('/api/admin/login', 'POST', {
        email: adminEmail,
        password: adminPassword
      });
      assert.equal(successLogin.status, 200);
      assert.ok(successLogin.body.adminId, 'Should receive adminId on successful login');

      // 4. Session now recognizes verified admin
      const sessionAfterLogin = await adminClient.call('/api/session');
      assert.equal(sessionAfterLogin.status, 200);
      assert.ok(sessionAfterLogin.body.admin);
      assert.ok(sessionAfterLogin.body.admin.id);
      assert.equal(sessionAfterLogin.body.admin.role, 'admin');
    });

    // -------------------------------------------------------------
    // SECTION 2: Dashboard Overview & Metrics (/dashboard)
    // -------------------------------------------------------------
    await t.test('Section 2: Dashboard Overview & Metrics', async () => {
      // Unauthenticated access blocked
      const unauthStats = await unauthClient.call('/api/dashboard/stats');
      assert.equal(unauthStats.status, 401);

      // Admin access allowed
      const stats = await adminClient.call('/api/dashboard/stats');
      assert.equal(stats.status, 200);
      assert.ok(stats.body !== null);

      // Badges count
      const badges = await adminClient.call('/api/dashboard/badges');
      assert.equal(badges.status, 200);
    });

    // -------------------------------------------------------------
    // SECTION 3: Products Page (/dashboard/products)
    // -------------------------------------------------------------
    await t.test('Section 3: Products Management Page', async () => {
      const res = await adminClient.call('/api/products/all?page=1&limit=10');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.products || res.body));
    });

    // -------------------------------------------------------------
    // SECTION 4: Stock & Inventory Page (/dashboard/stock)
    // -------------------------------------------------------------
    await t.test('Section 4: Stock & Inventory Page', async () => {
      const res = await adminClient.call('/api/products/all');
      assert.equal(res.status, 200);
      const list = Array.isArray(res.body) ? res.body : res.body.products;
      assert.ok(Array.isArray(list));
    });

    // -------------------------------------------------------------
    // SECTION 5: Categories & Subcategories (/dashboard/categories)
    // -------------------------------------------------------------
    await t.test('Section 5: Categories & Subcategories Page', async () => {
      const cats = await adminClient.call('/api/categories/all');
      assert.equal(cats.status, 200);
      assert.ok(Array.isArray(cats.body) || Array.isArray(cats.body.categories));

      const subcats = await adminClient.call('/api/subcategories/all');
      assert.equal(subcats.status, 200);
      assert.ok(Array.isArray(subcats.body) || Array.isArray(subcats.body.subcategories));
    });

    // -------------------------------------------------------------
    // SECTION 6: Home Collections (/dashboard/home-collections)
    // -------------------------------------------------------------
    await t.test('Section 6: Home Collections Page', async () => {
      const res = await adminClient.call('/api/home-collections/all-admin');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 7: Orders Page (/dashboard/orders)
    // -------------------------------------------------------------
    await t.test('Section 7: Orders Management Page', async () => {
      // Unauthenticated access blocked
      const unauth = await unauthClient.call('/api/orders/all');
      assert.equal(unauth.status, 401);

      // Admin access allowed
      const res = await adminClient.call('/api/orders/all');
      assert.equal(res.status, 200);
      assert.ok(res.body.orders !== undefined || Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 8: Customers Page (/dashboard/customers)
    // -------------------------------------------------------------
    await t.test('Section 8: Customers Management Page', async () => {
      // Unauthenticated access blocked
      const unauth = await unauthClient.call('/api/customers/all');
      assert.equal(unauth.status, 401);

      // Registered customers
      const registered = await adminClient.call('/api/customers/all');
      assert.equal(registered.status, 200);
      assert.ok(Array.isArray(registered.body));

      // Guest customers
      const guests = await adminClient.call('/api/customers/guests');
      assert.equal(guests.status, 200);
      assert.ok(Array.isArray(guests.body));
    });

    // -------------------------------------------------------------
    // SECTION 9: Reviews Moderation (/dashboard/reviews)
    // -------------------------------------------------------------
    await t.test('Section 9: Reviews Moderation Page', async () => {
      // Unauthenticated access blocked
      const unauth = await unauthClient.call('/api/reviews/all');
      assert.equal(unauth.status, 401);

      // Admin access allowed
      const reviews = await adminClient.call('/api/reviews/all');
      assert.equal(reviews.status, 200);
      assert.ok(Array.isArray(reviews.body));
    });

    // -------------------------------------------------------------
    // SECTION 10: Testimonials Page (/dashboard/testimonials)
    // -------------------------------------------------------------
    await t.test('Section 10: Manage Testimonials Page', async () => {
      const res = await adminClient.call('/api/testimonials/all');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 11: Hero Banners Page (/dashboard/banner)
    // -------------------------------------------------------------
    await t.test('Section 11: Hero Banners Page', async () => {
      const res = await adminClient.call('/api/banners/all');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 12: Deals of the Day Page (/dashboard/deal-of-day)
    // -------------------------------------------------------------
    await t.test('Section 12: Deals of the Day Page', async () => {
      const res = await adminClient.call('/api/deals/all');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 13: Offer Banners Page (/dashboard/offer-banner)
    // -------------------------------------------------------------
    await t.test('Section 13: Offer Banners Page', async () => {
      const res = await adminClient.call('/api/offer-banners/admin/all');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 14: Inbox / Contact Messages (/dashboard/inbox)
    // -------------------------------------------------------------
    await t.test('Section 14: Inbox & Contact Messages Page', async () => {
      const unauth = await unauthClient.call('/api/contact/all');
      assert.equal(unauth.status, 401);

      const res = await adminClient.call('/api/contact/all');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));

      const unread = await adminClient.call('/api/contact/unread-count');
      assert.equal(unread.status, 200);
    });

    // -------------------------------------------------------------
    // SECTION 15: Coupons & Discounts (/dashboard/coupons)
    // -------------------------------------------------------------
    await t.test('Section 15: Coupons & Discounts Page', async () => {
      const unauth = await unauthClient.call('/api/coupons/all');
      assert.equal(unauth.status, 401);

      const res = await adminClient.call('/api/coupons/all');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    // -------------------------------------------------------------
    // SECTION 16: Reports & Analytics (/dashboard/reports)
    // -------------------------------------------------------------
    await t.test('Section 16: Reports & Analytics Page', async () => {
      const res = await adminClient.call('/api/dashboard/stats');
      assert.equal(res.status, 200);
    });

    // -------------------------------------------------------------
    // SECTION 17: Shipping Zones Page (/dashboard/shipping-zones)
    // -------------------------------------------------------------
    await t.test('Section 17: Shipping Zones & Rates Page', async () => {
      const unauth = await unauthClient.call('/api/shipping/zones');
      assert.equal(unauth.status, 401);

      const res = await adminClient.call('/api/shipping/zones');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data || res.body));
    });

    // -------------------------------------------------------------
    // SECTION 18, 19, 20: Settings Pages (General, About, Contact)
    // -------------------------------------------------------------
    await t.test('Sections 18-20: Settings Pages (General, About, Contact)', async () => {
      const res = await adminClient.call('/api/settings');
      assert.equal(res.status, 200);
      assert.ok(typeof res.body === 'object');
    });

    // -------------------------------------------------------------
    // SECTION 21: Logout & Cleanup
    // -------------------------------------------------------------
    await t.test('Section 21: Admin Logout and Post-Logout Protection', async () => {
      const logout = await adminClient.call('/api/session/logout', 'POST');
      assert.equal(logout.status, 200);

      // After logout, admin endpoints are immediately blocked
      const afterLogout = await adminClient.call('/api/orders/all');
      assert.equal(afterLogout.status, 401);
    });

  } finally {
    server.close();
    await models.Admin.destroy({ where: { email: adminEmail } });
  }
});
