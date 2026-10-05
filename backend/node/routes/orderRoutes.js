const router      = require('express').Router();
const orderCtrl   = require('../controllers/orderController');
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/place',                   authMiddleware, orderCtrl.placeOrder);
router.post('/guest-place',             orderCtrl.placeOrder);
router.get('/recent',                   orderCtrl.getRecentOrders);
router.get('/all',                      orderCtrl.getAllOrders);
router.get('/customer/:customerId',     authMiddleware, orderCtrl.getOrdersByCustomer);
router.get('/track/:orderIdentifier',   orderCtrl.trackOrder);
router.put('/bulk-update-status',     adminMiddleware, orderCtrl.bulkUpdateStatus);
router.put('/update/:id',               adminMiddleware, orderCtrl.updateStatus);
router.delete('/delete/:id',            authMiddleware, orderCtrl.deleteOrder);
module.exports = router;
