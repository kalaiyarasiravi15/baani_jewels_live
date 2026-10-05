const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/testimonialController');
const { testimonialUpload } = require('../middleware/upload');

// Public routes
router.get('/active', ctrl.getActiveTestimonials);
router.get('/all', ctrl.getAllTestimonials);

// Admin routes (image is optional)
router.post('/add', testimonialUpload, ctrl.addTestimonial);
router.put('/update/:id', testimonialUpload, ctrl.updateTestimonial);
router.delete('/delete/:id', ctrl.deleteTestimonial);

module.exports = router;
