const crypto = require('crypto');
const { Op } = require('sequelize');
const { Session, OrderAccess, Preference, RateBucket } = require('../models/securityModels');
const { Customer, Admin, Order, sequelize } = require('../models');
const digest = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const random = () => crypto.randomBytes(32).toString('hex');
const channel = req => req.headers['x-client-type'] === 'admin' ? 'admin' : 'store';
const cookieName = req => channel(req) === 'admin' ? 'baani_admin_session' : 'baani_session';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/', maxAge: 30 * 86400000 });
async function loadSession(req, res, next) {
 try {
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(value => { const index = value.indexOf('='); return [value.slice(0, index).trim(), value.slice(index + 1)]; }));
  if (req.path.startsWith('/uploads/') && /^[a-f0-9]{64}$/.test(cookies.baani_admin_session || '')) {
   const adminSession = await Session.findOne({ where: { id: digest(cookies.baani_admin_session), channel: 'admin', expiresAt: { [Op.gt]: new Date() } } });
   if (adminSession?.adminId) {
    const admin = await Admin.findByPk(adminSession.adminId, { attributes: { exclude: ['password'] } });
    if (admin) { req.adminId = admin.id; req.admin = admin; req.sessionRecord = adminSession; return next(); }
   }
  }
  const raw = cookies[cookieName(req)];
  if (raw && /^[a-f0-9]{64}$/.test(raw)) req.sessionRecord = await Session.findOne({ where: { id: digest(raw), channel: channel(req), expiresAt: { [Op.gt]: new Date() } } });
  if (!req.sessionRecord) {
   const csrfHeader = String(req.headers['x-csrf-token'] || '');
   if (csrfHeader && /^[a-f0-9]{64}$/.test(csrfHeader)) req.sessionRecord = await Session.findOne({ where: { csrf: csrfHeader, channel: channel(req), expiresAt: { [Op.gt]: new Date() } } });
  }
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authHeader.slice(7).trim(), process.env.JWT_SECRET || 'baani_jewels_secret_key_2026');
      if (decoded.id && !req.customerId && !decoded.role) {
        req.customerId = decoded.id;
        if (!req.customer) req.customer = await Customer.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      }
      if (decoded.id && !req.adminId && ['admin', 'employee'].includes(decoded.role)) {
        req.adminId = decoded.id;
        if (!req.admin) req.admin = await Admin.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      }
    } catch (_) {}
  }
  if (req.sessionRecord?.customerId && !req.customerId) {
   req.customer = await Customer.findByPk(req.sessionRecord.customerId, { attributes: { exclude: ['password'] } });
   if (req.customer && !req.customer.isGuest) req.customerId = req.customer.id;
  }
  if (req.sessionRecord?.adminId && !req.adminId) {
   req.admin = await Admin.findByPk(req.sessionRecord.adminId, { attributes: { exclude: ['password'] } });
   if (req.admin) req.adminId = req.admin.id;
  }
  next();
 } catch (error) { res.status(503).json({ message: 'Session service unavailable. Please try again.' }); }
}
async function ensureSession(req, res) {
 if (req.sessionRecord) return req.sessionRecord;
 const raw = random();
 req.sessionRecord = await Session.create({ id: digest(raw), channel: channel(req), csrf: random(), expiresAt: new Date(Date.now() + 30 * 86400000), data: {} });
 res.cookie(cookieName(req), raw, cookieOptions());
 return req.sessionRecord;
}
async function signIn(req, res, kind, owner) {
 const previous = await ensureSession(req, res);
 const raw = random();
 const next = await sequelize.transaction(async transaction => {
  const session = await Session.create({ id: digest(raw), channel: channel(req), csrf: random(), [kind === 'admin' ? 'adminId' : 'customerId']: owner.id, expiresAt: new Date(Date.now() + (kind === 'admin' ? 1 : 7) * 86400000), data: previous.data || {} }, { transaction });
  await OrderAccess.update({ sessionId: session.id }, { where: { sessionId: previous.id }, transaction });
  await previous.destroy({ transaction });
  return session;
 });
 req.sessionRecord = next;
 req[kind === 'admin' ? 'adminId' : 'customerId'] = owner.id;
 req[kind === 'admin' ? 'admin' : 'customer'] = owner;
 res.cookie(cookieName(req), raw, { ...cookieOptions(), maxAge: (kind === 'admin' ? 1 : 7) * 86400000 });
 res.setHeader('X-CSRF-Token', next.csrf);
}
const allowedOrigins = [...new Set([process.env.FRONTEND_URL, process.env.ADMIN_URL, ...(process.env.CORS_ORIGINS || '').split(',')].filter(Boolean).map(value => value.trim()))];
const isAllowedDevOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  return false;
};
function csrfGuard(req, res, next) {
 if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
 const origin = req.headers.origin;
 if (origin && isAllowedDevOrigin(origin)) return next();
 if (String(req.headers.authorization || '').startsWith('Bearer ')) return next();
 const supplied = String(req.headers['x-csrf-token'] || '');
 const expected = req.sessionRecord?.csrf;
 if (!expected || !/^[a-f0-9]{64}$/.test(supplied) || !crypto.timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) return res.status(403).json({ message: 'Session expired. Refresh the page and try again.', code: 'CSRF_FAILED' });
 next();
}
const requireAdmin = (req, res, next) => req.adminId ? next() : res.status(401).json({ message: 'Admin login required.' });
const requireCustomer = (req, res, next) => req.customerId ? next() : res.status(401).json({ message: 'Please sign in.' });
async function canAccessOrder(req, order) {
 if (!order) return false;
 if (req.adminId) return true;
 if (req.customerId && Number(order.customerId) === Number(req.customerId)) return true;
 return Boolean(req.sessionRecord && await OrderAccess.findOne({ where: { sessionId: req.sessionRecord.id, orderId: order.orderId } }));
}
async function grantOrder(req, orderId, transaction) {
 if (!req.sessionRecord) throw new Error('Session required.');
 await OrderAccess.findOrCreate({ where: { sessionId: req.sessionRecord.id, orderId }, transaction });
}
async function rateLimit(req, res, next) {
 try {
  const route = req.path.toLowerCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sensitive = /login|otp|password|request-access|verify-access|register|send|subscribe|create-order/.test(route);
  const limit = sensitive ? 20 : 150;
  const windowMs = 15 * 60000;
  const bucket = Math.floor(Date.now() / windowMs);
  const id = digest((process.env.SECURITY_RATE_NAMESPACE || '') + req.ip + ':' + route + ':' + bucket);
  await RateBucket.findOrCreate({ where: { id }, defaults: { count: 0, expiresAt: new Date((bucket + 1) * windowMs) } });
  await RateBucket.increment('count', { where: { id } });
  const row = await RateBucket.findByPk(id);
  if (row.count > limit) return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
  next();
 } catch (_) { res.status(503).json({ message: 'Please try again later.' }); }
}
async function preferences(req) {
 const id = req.adminId ? 'admin:' + req.adminId : req.customerId ? 'customer:' + req.customerId : 'session:' + req.sessionRecord.id;
 const [row] = await Preference.findOrCreate({ where: { id }, defaults: { data: {} } });
 return row;
}
module.exports = { digest, loadSession, ensureSession, signIn, csrfGuard, requireAdmin, requireCustomer, canAccessOrder, grantOrder, rateLimit, preferences, cookieName, cookieOptions };
