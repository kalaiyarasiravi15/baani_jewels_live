const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shippingZoneController');

// Public
router.get('/rate', ctrl.getRateByState);

const adminMiddleware = require('../middleware/adminMiddleware');
router.use(adminMiddleware);
// Admin
router.get('/zones', ctrl.getAll);
router.post('/zones', ctrl.create);
router.put('/zones/:id', ctrl.update);
router.delete('/zones/:id', ctrl.remove);

module.exports = router;
