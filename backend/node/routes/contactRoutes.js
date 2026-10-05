const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contactController');
const { contactUpload } = require('../middleware/upload');

router.post('/send', contactUpload, ctrl.sendMessage);
router.post('/reply/:id', ctrl.replyMessage);
router.get('/all', ctrl.getAllMessages);
router.get('/unread-count', ctrl.getUnreadCount);
router.get('/:id', ctrl.getMessage);
router.put('/read/:id', ctrl.markRead);
router.delete('/delete/:id', ctrl.deleteMessage);

module.exports = router;
