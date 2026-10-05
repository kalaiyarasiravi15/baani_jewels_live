const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Order, Customer, Admin } = require('../models');
const { Session, OrderAccess, PaymentIntent, LegacyCredential } = require('../models/securityModels');
const security = require('../utils/sessionSecurity');
const codes = require('../utils/otpStore')('order-access');
const mailer = require('../utils/mailer');
const safeCustomer = row => row ? { id: row.id, name: row.name, email: row.email, phone: row.phone, isGuest: Boolean(row.isGuest) } : null;
const safeAdmin = row => row ? { id: row.id, name: row.name || 'Admin', role: row.role } : null;
router.get('/', async (req, res) => {
 try {
  const session = await security.ensureSession(req, res);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ customer: safeCustomer(req.customer), admin: safeAdmin(req.admin), csrfToken: session.csrf, preferences: (await security.preferences(req)).data || {} });
 } catch (_) { res.status(503).json({ message: 'Unable to initialize session.' }); }
});
router.post('/logout', async (req, res) => {
 try {
  if (req.sessionRecord) await req.sessionRecord.destroy();
  req.sessionRecord = null; req.customerId = null; req.adminId = null;
  const session = await security.ensureSession(req, res);
  res.setHeader('X-CSRF-Token', session.csrf);
  res.json({ success: true, csrfToken: session.csrf });
 } catch (_) { res.status(503).json({ message: 'Logout failed. Please try again.' }); }
});
router.put('/preferences', async (req, res) => {
 try {
  const allowed = ['dealDismissed', 'admin_notif_muted', 'admin_notif_dismissed_time'];
  const values = Object.fromEntries(Object.entries(req.body || {}).filter(([key, value]) => allowed.includes(key) && ['boolean','number'].includes(typeof value)));
  const row = await security.preferences(req);
  await row.update({ data: { ...row.data, ...values } });
  res.json(row.data);
 } catch (_) { res.status(503).json({ message: 'Unable to save preferences.' }); }
});
router.get('/guest-orders', async (req, res) => {
 try {
  if (!req.sessionRecord) return res.json([]);
  const grants = await OrderAccess.findAll({ where: { sessionId: req.sessionRecord.id }, attributes: ['orderId'] });
  const orders = await Order.findAll({ where: { orderId: { [Op.in]: grants.map(row => row.orderId) } }, attributes: ['orderId', 'createdAt'], order: [['createdAt', 'DESC']] });
  const hints = (req.sessionRecord.data?.legacyOrderHints || []).filter(hint => hint.orderId && !orders.some(order => order.orderId === hint.orderId));
  res.json([...orders, ...hints.map(hint => ({ ...hint, verificationRequired: true }))]);
 } catch (_) { res.status(503).json({ message: 'Unable to load guest orders.' }); }
});
// Import verified legacy browser access once; unverified IDs are hints, never permissions.
router.post('/import-legacy', async (req, res) => {
 try {
  const { token, guestTokens = {}, orderHints = [], preferences = {} } = req.body;
  let importedLogin = false;
  if (token) {
   try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (req.headers['x-client-type'] === 'admin' && ['admin','employee'].includes(decoded.role)) {
     const admin = await Admin.findByPk(decoded.id); if (admin) { await LegacyCredential.create({ id: security.digest(token), expiresAt: new Date(decoded.exp * 1000) }); await security.signIn(req, res, 'admin', admin); importedLogin = true; }
    } else if (req.headers['x-client-type'] !== 'admin' && !decoded.role && !decoded.purpose && !decoded.isGuest) {
     const customer = await Customer.findByPk(decoded.id);
     if (customer && !customer.isGuest && customer.email === decoded.email) { await LegacyCredential.create({ id: security.digest(token), expiresAt: new Date(decoded.exp * 1000) }); await security.signIn(req, res, 'customer', customer); importedLogin = true; }
    }
   } catch (_) { /* Expired credentials require sign-in; browser cart remains until imported. */ }
  }
  for (const [orderId, value] of Object.entries(guestTokens).slice(0,100)) {
   try {
    const decoded = jwt.verify(value, process.env.JWT_SECRET);
    const order = await Order.findByPk(orderId);
    if (decoded.purpose === 'order-review' && decoded.orderId === orderId && order?.customerType === 'GUEST') { await LegacyCredential.create({ id: security.digest(value), expiresAt: new Date(decoded.exp * 1000) }); await security.grantOrder(req, orderId); }
   } catch (_) { /* Invalid tokens grant no access. */ }
  }
  const row = await security.preferences(req);
  await row.update({ data: { ...row.data, ...Object.fromEntries(Object.entries(preferences).filter(([key, value]) => ['dealDismissed','admin_notif_muted','admin_notif_dismissed_time'].includes(key) && ['boolean','number'].includes(typeof value))) } });
  const hints = orderHints.slice(0,100).map(item => ({ orderId: String(item.orderId || '').slice(0,100), createdAt: item.createdAt || null }));
  await req.sessionRecord.update({ data: { ...req.sessionRecord.data, legacyOrderHints: hints, legacyCart: { ownerId: req.body.legacyCustomerId || null, cart: Array.isArray(req.body.cartItems) ? req.body.cartItems.slice(0,100) : [], wishlist: Array.isArray(req.body.wishlistItems) ? req.body.wishlistItems.slice(0,100) : [] } } });
  res.json({ success: true, importedLogin, customer: safeCustomer(req.customer), admin: safeAdmin(req.admin), csrfToken: req.sessionRecord.csrf });
 } catch (_) { res.status(503).json({ message: 'Migration incomplete. Your existing data has been preserved.' }); }
});
router.post('/order/request-access', async (req, res) => {
 try {
  const order = await Order.findByPk(req.body.orderId);
  if (!order || order.customerType !== 'GUEST' || !order.guestEmail) return res.status(400).json({ message: 'Sign in for registered orders, or check your guest Order ID.' });
  const key = req.sessionRecord.id + ':' + order.orderId;
  const previous = await codes.get(key);
  if (previous && Date.now() - previous.sentAt < 60000) return res.status(429).json({ message: 'Wait one minute before requesting another code.' });
  const otp = require('crypto').randomInt(100000,1000000).toString();
  await codes.set(key, { otp, sentAt: Date.now(), expiresAt: Date.now() + 600000 });
  try { await mailer.sendMail({ from: process.env.EMAIL_USER, to: order.guestEmail, subject: 'Baani Jewels order verification', text: 'Your order verification code is ' + otp + '. Valid for 10 minutes.' }); }
  catch (_) { await codes.delete(key); return res.status(503).json({ message: 'Verification email could not be sent. Please contact support.' }); }
  res.json({ message: 'Verification code sent to the order email.' });
 } catch (_) { res.status(503).json({ message: 'Unable to send verification code.' }); }
});
router.post('/order/verify-access', async (req, res) => {
 try {
  const orderId = String(req.body.orderId || '');
  if (!await codes.check(req.sessionRecord.id + ':' + orderId, req.body.otp, true)) return res.status(400).json({ message: 'Invalid or expired code.' });
  await security.grantOrder(req, orderId);
  res.json({ success: true });
 } catch (_) { res.status(503).json({ message: 'Unable to verify order.' }); }
});
router.post('/migrate-items', security.requireCustomer, async (req, res) => {
 try {
  const { Cart, Wishlist, Product, ProductVariant, sequelize } = require('../models');
  await sequelize.transaction(async transaction => {
   const session = await Session.findByPk(req.sessionRecord.id, { transaction, lock: transaction.LOCK.UPDATE });
   const saved = session.data?.legacyCart;
   if (!saved || (saved.ownerId && Number(saved.ownerId) !== Number(req.customerId))) return;
   for (const [model, items] of [[Cart, saved.cart], [Wishlist, saved.wishlist]]) {
    for (const item of items || []) {
     const product = await Product.findByPk(Number(item.id || item.productId), { transaction });
     if (!product) continue;
     const variant = item.variantId ? await ProductVariant.findOne({ where: { id: item.variantId, productId: product.id }, transaction }) : null;
     if (item.variantId && !variant) continue;
     const where = { customerId: req.customerId, productId: product.id, variantId: variant?.id || null, selectedSubOption: item.selectedSubOption || null };
     await model.findOrCreate({ where, defaults: model === Cart ? { quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)), salesPrice: variant?.salesPrice || product.salesPrice || product.mrpPrice, isPreorder: Boolean(item.isPreorder) } : {}, transaction });
    }
   }
   const data = { ...session.data }; delete data.legacyCart;
   await session.update({ data }, { transaction });
  });
  res.json({ success: true });
 } catch (_) { res.status(503).json({ message: 'Saved items migration is incomplete. Please retry.' }); }
});
module.exports = router;
