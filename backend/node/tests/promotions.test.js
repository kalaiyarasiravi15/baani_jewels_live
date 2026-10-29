const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Op } = require('sequelize');
// Isolate these tests from the configured database and all external providers.
let deals, offers, products, coupon, intents, writes, savedOrder, savedLines, grants;
const model = (name, find) => ({ findAll: async () => find(), update: async (values, options) => { writes.push({ name, values, options }); } });
const models = {
  CustomerAddress: {}, ShippingAddress: {}, Review: {}, Admin: {}, sequelize: {},
  Deal: model('deal', () => deals), OfferBanner: model('offer', () => offers),
  Product: { findByPk: async id => products[Number(id)] ? { ...products[id], toJSON: () => structuredClone(products[id]), update: async values => Object.assign(products[id], values) } : null },
  ProductVariant: { findAll: async () => [] }, Coupon: { findByPk: async () => coupon, update: async (values, options) => writes.push({ name: 'coupon', values, options }) },
  Order: { count: async () => 0, findByPk: async id => savedOrder?.orderId === id ? savedOrder : null, findOne: async () => null, create: async data => (savedOrder = data) },
  Customer: { findByPk: async () => { throw new Error('Guest must not access a customer account'); } },
  OrderSlot: { bulkCreate: async data => { savedLines = data; } }
};
require.cache[require.resolve('../models')] = { exports: models };
require.cache[require.resolve('../models/Coupon')] = { exports: models.Coupon };
require.cache[require.resolve('../models/securityModels')] = { exports: {
  Session: {}, Preference: {}, RateBucket: {},
  PaymentIntent: { create: async data => { intents.push(data); }, findByPk: async id => { const intent = intents.find(i => i.id === id); return intent ? { ...intent, update: async data => Object.assign(intent, data) } : null; } },
  OrderAccess: { findOrCreate: async ({ where }) => { grants.push(where); }, findOne: async ({ where }) => grants.find(g => g.sessionId === where.sessionId && g.orderId === where.orderId) }
} };
require.cache[require.resolve('../config/db')] = { exports: { transaction: async () => ({ LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} }) } };
let mockedGatewayPayment;
require.cache[require.resolve('razorpay')] = { exports: class MockRazorpay { constructor() { this.payments = { fetch: async () => mockedGatewayPayment }; } } };
require.cache[require.resolve('../utils/mailer')] = { exports: { sendMail: async () => {} } };
require.cache[require.resolve('../utils/smsService')] = { exports: { sendOrderPlacedSMS: async () => ({ success: true }) } };
require.cache[require.resolve('../utils/shippingPolicy')] = { exports: { quotePincode: async () => ({ amount: 0 }) } };
const { validatePromotion } = require('../utils/promotionValidation');
const { formatProductWithDiscounts, calculateServerOrderTotal } = require('../utils/priceHelper');
const { expirePromotions } = require('../utils/promotionExpiry');
const payment = require('../controllers/paymentController');
const couponController = require('../controllers/couponController');
const orderController = require('../controllers/orderController');
const permissions = require('../middleware/apiPermissions');
const { canAccessOrder } = require('../utils/sessionSecurity');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const promotion = { targetType: 'PRODUCT', targetProductId: 1, discountType: 'PERCENTAGE', discountValue: 100 };
beforeEach(() => {
  deals = []; offers = []; intents = []; writes = []; grants = []; savedOrder = null; savedLines = [];
  products = { 1: { id: 1, status: true, name: 'Ring', stock: 10, mrpPrice: 1000, salesPrice: 800, variants: [] } };
  coupon = { id: 1, status: true, type: 'percentage', discountValue: 100, startDate: new Date(Date.now() - 10000), endDate: new Date(Date.now() + 10000), minOrderAmount: 0, maxOrderAmount: null, maxDiscount: null, usageLimit: 1 };
});
test('all promotion types enforce the percentage ceiling and strict schedule', () => {
  for (const isCoupon of [false, true]) {
    const data = { type: 'percentage', discountType: 'PERCENTAGE', discountValue: 100, usageLimit: 1, startDate: '2026-09-23T18:00:00+05:30', expiryDate: '2026-09-23T19:55:00+05:30', endDate: '2026-09-23T19:55:00+05:30' };
    assert.doesNotThrow(() => validatePromotion(data, isCoupon));
    for (const value of [101, -1, 0, NaN, Infinity, 'abc']) assert.throws(() => validatePromotion({ ...data, discountValue: value }, isCoupon));
    assert.throws(() => validatePromotion({ ...data, startDate: data.endDate }, isCoupon));
    assert.throws(() => validatePromotion({ ...data, startDate: 'invalid' }, isCoupon));
    assert.doesNotThrow(() => validatePromotion({ ...data, type: 'flat', discountType: 'FLAT', discountValue: 500 }, isCoupon));
  }
});
test('100% product promotion is zero and discounts do not stack', () => {
  const formatted = formatProductWithDiscounts(products[1], { activeDeals: [promotion], activeOffers: [{ targetType: 'SHOP', discountType: 'PERCENTAGE', discountValue: 50 }] });
  assert.equal(formatted.salesPrice, 0);
  assert.equal(products[1].salesPrice, 800);
});
test('DB product prices override client amounts and zero survives totals', async () => {
  deals = [promotion];
  const result = await calculateServerOrderTotal([{ productId: 1, quantity: 2, salesPrice: 50000 }], 50, null, true);
  assert.equal(result.subTotal, 0);
  assert.equal(result.totalAmount, 80);
  assert.equal(result.lineItems[0].unitPrice, 0);
});
test('variant prices and discounts come from the selected product only', async () => {
  products[1].variants = [{ id: 4, productId: 1, status: true, variantType: 'Size', variantValue: 'L', stock: 3, mrpPrice: 2000, salesPrice: 1600 }];
  deals = [{ ...promotion, discountValue: 25 }];
  const items = [{ productId: 1, quantity: 2 }];
  const result = await calculateServerOrderTotal(items, 0, null);
  assert.equal(items[0].variantId, 4);
  // 25% discount off variant salesPrice (1600) = 1200 each * 2 = 2400
  assert.equal(result.totalAmount, 2400);
  await assert.rejects(calculateServerOrderTotal([{ productId: 1, variantId: 99, quantity: 1 }], 0, null), /variant/);
});
test('deal and offer discounts apply to salesPrice instead of mrpPrice', () => {
  // 1. Percentage discount: 10% off salesPrice (800) = 720 (not 10% off mrpPrice 1000 = 900)
  const deal10 = { targetType: 'PRODUCT', targetProductId: 1, discountType: 'PERCENTAGE', discountValue: 10 };
  const formatted10 = formatProductWithDiscounts(products[1], { activeDeals: [deal10], activeOffers: [] });
  assert.equal(formatted10.salesPrice, 720);
  assert.equal(formatted10.mrpPrice, 1000);

  // 2. Flat discount: Flat 100 off salesPrice (800) = 700 (not 1000 - 100 = 900)
  const dealFlat = { targetType: 'PRODUCT', targetProductId: 1, discountType: 'FLAT', discountValue: 100 };
  const formattedFlat = formatProductWithDiscounts(products[1], { activeDeals: [dealFlat], activeOffers: [] });
  assert.equal(formattedFlat.salesPrice, 700);
  assert.equal(formattedFlat.mrpPrice, 1000);

  // 3. Fallback: If product has null salesPrice, fallback to mrpPrice
  const productNoSales = { id: 2, status: true, name: 'Earrings', stock: 5, mrpPrice: 1000, salesPrice: null, variants: [] };
  const dealFallback = { targetType: 'PRODUCT', targetProductId: 2, discountType: 'PERCENTAGE', discountValue: 10 };
  const formattedFallback = formatProductWithDiscounts(productNoSales, { activeDeals: [dealFallback], activeOffers: [] });
  assert.equal(formattedFallback.salesPrice, 900);
  assert.equal(formattedFallback.mrpPrice, 1000);
});
test('invalid quantities, disabled products and malformed carts are rejected', async () => {
  for (const quantity of [-2, 0, 1.5, 1001, Infinity, undefined]) await assert.rejects(calculateServerOrderTotal([{ productId: 1, quantity }], 0, null));
  await assert.rejects(calculateServerOrderTotal([{ quantity: 1 }], 0, null));
  await assert.rejects(calculateServerOrderTotal([], 0, null));
  products[1].status = false;
  await assert.rejects(calculateServerOrderTotal([{ productId: 1, quantity: 1 }], 0, null));
});
test('coupon cap, money precision and exact expiry are enforced', async () => {
  coupon.maxDiscount = 100;
  assert.equal((await calculateServerOrderTotal([{ productId: 1, quantity: 1 }], 0, 1)).discountAmount, 100);
  coupon.maxDiscount = '0.00';
  products[1].salesPrice = 800.25;
  assert.equal((await calculateServerOrderTotal([{ productId: 1, quantity: 1 }], 0, 1)).totalAmount, 0);
  coupon.endDate = new Date(Date.now() - 1);
  await assert.rejects(calculateServerOrderTotal([{ productId: 1, quantity: 1 }], 0, 1), /expired/);
  await assert.rejects(couponController.assertCouponEligibleForIdentity({ couponId: 1, productSubtotal: 800, customerId: 1 }), /expired/);
});
test('expiry sweep persists inactive flags on all three tables with inclusive boundary', async () => {
  await expirePromotions();
  assert.equal(writes.length, 3);
  for (const write of writes) {
    assert.equal(Object.values(write.values)[0], false);
    const condition = write.options.where[write.name === 'coupon' ? 'endDate' : 'expiryDate'];
    assert.ok(condition[Op.lte] instanceof Date);
  }
});
test('free checkout creates a session-bound verified DB intent, without a gateway', async () => {
  deals = [promotion];
  const res = response();
  await payment.createOrder({ sessionRecord: { id: 'session-a' }, body: { amount: 999, items: [{ productId: 1, quantity: 1 }], shippingPincode: '600001' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.isFree, true);
  assert.equal(intents[0].amount, 0);
  assert.equal(intents[0].verified, true);
  assert.equal(intents[0].sessionId, 'session-a');
});
test('payment rejects client customer impersonation', async () => {
  const res = response();
  await payment.createOrder({ sessionRecord: { id: 'guest' }, body: { customerId: 42, items: [{ productId: 1, quantity: 1 }], shippingPincode: '600001' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(intents.length, 0);
});
test('an authorized but uncaptured gateway payment cannot be marked verified', async () => {
  const secret = 'isolated-test-signing-key';
  process.env.RAZORPAY_SECRET = secret;
  process.env.RAZORPAY_KEY = 'rzp_test_isolated';
  const intent = { id: 'rzp_order_test', sessionId: 'checkout-session', amount: 12500, verified: false, consumed: false };
  intents.push(intent);
  const paymentId = 'rzp_payment_test';
  const signature = crypto.createHmac('sha256', secret).update(`${intent.id}|${paymentId}`).digest('hex');
  mockedGatewayPayment = { order_id: intent.id, amount: intent.amount, status: 'authorized' };
  const req = { sessionRecord: { id: intent.sessionId }, body: { razorpay_order_id: intent.id, razorpay_payment_id: paymentId, razorpay_signature: signature } };
  const pending = response();
  await payment.verifyPayment(req, pending);
  assert.equal(pending.statusCode, 400);
  assert.equal(intent.verified, false);

  mockedGatewayPayment.status = 'captured';
  const captured = response();
  await payment.verifyPayment(req, captured);
  assert.equal(captured.statusCode, 200);
  assert.equal(intent.verified, true);
  assert.equal(intent.paymentId, paymentId);
});
test('IST schedule serialization survives repeated edit/save', async () => {
  const { toScheduleInput, scheduleToISO } = await import('../../panel/admin_dashboard/src/utils/promotionTime.js');
  const input = '2026-09-23T19:55';
  assert.equal(scheduleToISO(input), '2026-09-23T14:25:00.000Z');
  assert.equal(toScheduleInput(scheduleToISO(input)), input);
  assert.equal(toScheduleInput(scheduleToISO(toScheduleInput(scheduleToISO(input)))), input);
});
test('guest free order persists server prices and grants only that order, never an account', async () => {
  deals = [promotion];
  intents.push({ id: 'free-test', paymentId: 'free-test', sessionId: 'guest-a', amount: 0, verified: true });
  const req = { sessionRecord: { id: 'guest-a', update: async () => { throw new Error('Guest must not become logged in'); } }, originalUrl: '/api/orders/guest-place', body: {
    customerId: 999, isGuestCheckout: true, guestDetails: { name: 'Guest', phone: '9000000000', email: 'existing@example.invalid', pincode: '600001', addressLine: 'Test' },
    items: [{ productId: 1, quantity: 1, productName: 'Forged', salesPrice: 9999 }], totalAmount: 9999, discountAmount: 9999,
    paymentId: 'free-test', razorpayOrderId: 'free-test'
  } };
  const res = response();
  await orderController.placeOrder(req, res);
  assert.equal(res.statusCode, 201, JSON.stringify(res.body));
  assert.equal(savedOrder.customerId, null);
  assert.equal(savedOrder.customerType, 'GUEST');
  assert.equal(savedOrder.totalAmount, 0);
  assert.equal(savedLines[0].salesPrice, 0);
  assert.equal(savedLines[0].productName, 'Ring');
  assert.equal(intents[0].consumed, true);
  assert.equal(await canAccessOrder(req, savedOrder), true);
  assert.equal(await canAccessOrder({ sessionRecord: { id: 'other' } }, savedOrder), false);
  const replay = response();
  await orderController.placeOrder(req, replay);
  assert.equal(replay.statusCode, 400);
});
test('private admin and order routes deny anonymous access', async () => {
  for (const path of ['/orders/all', '/orders/recent', '/coupons/all', '/coupons/1/usage', '/deals/all', '/offer-banners/admin/all', '/customers/all']) {
    const res = response();
    let passed = false;
    await permissions({ path, method: 'GET', headers: {} }, res, () => { passed = true; });
    assert.equal(passed, false, path);
    assert.equal(res.statusCode, 401, path);
  }
});
