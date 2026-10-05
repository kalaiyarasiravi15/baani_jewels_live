const path = require('path');
const { Op } = require('sequelize');
const { Review, Order, ContactMessage } = require('../models');
const { canAccessOrder } = require('../utils/sessionSecurity');
module.exports = async (req, res, next) => {
 try {
  const name = decodeURIComponent(req.path.slice(1));
  if (!name || path.basename(name) !== name) return res.sendStatus(404);
  const reviews = await Review.findAll({ where: { images: { [Op.like]: '%' + name.replace(/[\\%_]/g, '\\$&') + '%' } } });
  for (const review of reviews) {
   if (review.status === 'published' || req.adminId || await canAccessOrder(req, await Order.findByPk(review.orderId))) return next();
  }
  if (reviews.length || name.startsWith('review-')) return res.sendStatus(403);
  if (/^(invoice|receipt)-/i.test(name) || /\.pdf$/i.test(name)) {
   if (req.adminId) return next();
   const orderIdMatch = name.match(/(?:invoice|receipt)-([A-Za-z0-9_-]+)/i);
   if (orderIdMatch) {
    const order = await Order.findByPk(orderIdMatch[1]);
    if (order && await canAccessOrder(req, order)) return next();
   }
   return res.sendStatus(403);
  }
  const contact = await ContactMessage.findOne({ where: { image: name } });
  if (contact && !req.adminId) return res.sendStatus(403);
  next();
 } catch (_) { res.sendStatus(503); }
};
