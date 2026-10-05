const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/homeCollectionController');

router.get('/all',       ctrl.getAll);
router.get('/all-admin', ctrl.getAllAdmin);
router.post('/add',           ctrl.upload, ctrl.add);
router.put('/update/:id',     ctrl.upload, ctrl.update);
router.delete('/delete/:id',  ctrl.remove);

module.exports = router;
