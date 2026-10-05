const { Order } = require('../models');
const { canAccessOrder, requireAdmin } = require('./sessionSecurity');
const fail = (message, status = 403) => Object.assign(new Error(message), { status });
async function ownedOrder(req, orderId) {
 const order = await Order.findByPk(orderId);
 if (!order) throw fail('Order not found.', 404);
 if (!await canAccessOrder(req, order)) throw fail('Verify this order or sign in with the account that placed it.', 401);
 return order;
}
module.exports = { fail, requireAdmin, ownedOrder };
