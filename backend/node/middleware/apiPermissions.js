const { Order, ShippingAddress, CustomerAddress } = require('../models');
const { requireAdmin, canAccessOrder } = require('../utils/sessionSecurity');
module.exports = async (req, res, next) => {
 try {
  const p = req.path.toLowerCase().replace(/\/$/, '') || '/';
  const read = ['GET', 'HEAD'].includes(req.method);
  if (p.startsWith('/session')) return next();
  if (req.adminId) {
   if (p.startsWith('/admin') && !['/admin/login', '/admin/logout'].includes(p) && req.admin.role !== 'admin') return res.status(403).json({ message: 'Administrator permission required.' });
   return next();
  }
  if (/^\/(customers|admin)\/(login|forgot-password|verify-otp|reset-password)$/.test(p) && req.method === 'POST') return next();
  if (/^\/customers\/(send-register-otp|resend-register-otp|verify-register-otp|register)$/.test(p) && req.method === 'POST') return next();
  if (p.startsWith('/reviews/')) return next(); // Review routes enforce their own ownership/moderation rules.
  if (read && /^\/(products|categories|subcategories|brands|banners|collections|variants|thumbnails)(\/|$)/.test(p)) return next();
  if (read && ['/settings', '/shipping/rate', '/deals/active', '/deals/clock', '/home-collections/all', '/offer-banners/all', '/testimonials/active', '/coupons/list', '/payment/get-key'].includes(p)) return next();
  if (req.method === 'POST' && ['/contact/send', '/coupons/validate', '/payment/create-order', '/payment/verify', '/orders/guest-place'].includes(p) && req.sessionRecord) return next();
  if (req.method === 'POST' && p === '/orders/place' && req.customerId) return next();
  if (read && p.startsWith('/orders/track/')) {
   const identifier = decodeURIComponent(req.path.split('/').pop()).replace(/^#/, '');
   const order = await Order.findByPk(identifier);
   if (await canAccessOrder(req, order)) return next();
   return res.status(401).json({ message: 'Verify your order email or sign in to view this order.', verificationRequired: true });
  }
  if (read && p.startsWith('/orders/customer/') && req.customerId && String(req.customerId) === p.split('/').pop()) return next();
  if (/^\/(cart|wishlist)(\/|$)/.test(p)) {
   if (p.includes('/guest/')) return res.status(410).json({ message: 'Use your server session to access saved items.' });
   if (req.customerId) return next();
   return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  if (p.startsWith('/customers/') && req.customerId) {
   let customerId;
   if (p === '/customers/add-shipping') customerId = req.body.customerId;
   else if (/^\/customers\/shipping\/(update\/)?\d+$/.test(p)) customerId = (await ShippingAddress.findByPk(p.split('/').pop()))?.customerId;
   else if (/^\/customers\/address\/update\/\d+$/.test(p)) customerId = (await CustomerAddress.findByPk(p.split('/').pop()))?.customerId;
   else if (/^\/customers\/(\d+(\/stats)?|(update|change-password|settings|last-shipping-address)\/\d+|delete\/\d+(\/request-otp)?)$/.test(p)) customerId = p.match(/\d+/)?.[0];
   if (customerId && String(customerId) === String(req.customerId)) return next();
   return res.status(403).json({ message: 'You can access only your own account.' });
  }
  return requireAdmin(req, res, next);
 } catch (_) { res.status(503).json({ message: 'Unable to verify access. Please try again.' }); }
};
