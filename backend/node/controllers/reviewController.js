const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Review, Customer, Order, OrderSlot, Product, sequelize } = require('../models');
const { ownedOrder, fail } = require('../utils/reviewAccess');
const mailer = require('../utils/mailer');

const includes = [
    { model: Product, as: 'productInfo', attributes: ['id', 'name', 'mainImage'], required: false, paranoid: false },
    { model: Customer, as: 'customerInfo', attributes: ['name'], required: false, paranoid: false },
    { model: Order, as: 'orderInfo', attributes: ['snapName'], required: false }
];
const media = review => { try { const value = JSON.parse(review.images || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } };
const serialize = review => {
    const row = review.toJSON ? review.toJSON() : { ...review };
    row.reviewerName = row.customerInfo?.name || row.orderInfo?.snapName || 'Verified Buyer';
    delete row.orderInfo;
    return row;
};
const removeFiles = files => {
    for (const file of files) {
        if (typeof file !== 'string' || path.basename(file) !== file) continue;
        try { fs.unlinkSync(path.join(__dirname, '..', 'uploads', file)); } catch (_) { /* Already removed. */ }
    }
};
const errorResponse = (res, error) => res.status(error.status || (error.name === 'SequelizeUniqueConstraintError' ? 409 : 500)).json({ message: error.status ? error.message : error.name === 'SequelizeUniqueConstraintError' ? 'This product already has a review for this order.' : 'Unable to process review. Please try again.' });
function validate(body) {
    const rating = Number(body.rating);
    const feedback = String(body.feedback || '').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw fail('Choose a rating from 1 to 5 stars.', 400);
    if (!feedback || feedback.length > 5000) throw fail('Review must contain 1 to 5000 characters.', 400);
    return { rating, feedback };
}
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({ include: includes, order: [['createdAt', 'DESC']] });
        res.json(reviews.map(serialize));
    } catch (error) { errorResponse(res, error); }
};
exports.getParticularReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id, { include: includes });
        if (!review) throw fail('Review not found.', 404);
        res.json(serialize(review));
    } catch (error) { errorResponse(res, error); }
};
exports.getPublishedReviewsByProduct = async (req, res) => {
    try {
        let { productId } = req.params;
        if (!/^\d+$/.test(productId)) {
            const prod = await Product.findOne({ where: { slug: productId } });
            if (prod) productId = prod.id;
        }
        const reviews = await Review.findAll({ where: { productId, status: 'published' }, include: includes, order: [['createdAt', 'DESC']] });
        res.json(reviews.map(review => {
            const row = serialize(review);
            return { id: row.id, productId: row.productId, rating: row.rating, feedback: row.feedback, images: row.images, createdAt: row.createdAt, reviewerName: row.reviewerName, customerInfo: { name: row.reviewerName } };
        }));
    } catch (error) { errorResponse(res, error); }
};
exports.getOrderReviews = async (req, res) => {
    try {
        await ownedOrder(req, req.params.orderId);
        res.json(await Review.findAll({ where: { orderId: req.params.orderId } }));
    } catch (error) { errorResponse(res, error); }
};
exports.getReviewByOrderAndProduct = async (req, res) => {
    try {
        await ownedOrder(req, req.params.orderId);
        const review = await Review.findOne({ where: { orderId: req.params.orderId, productId: req.params.productId } });
        if (!review) throw fail('Review not found.', 404);
        res.json(review);
    } catch (error) { errorResponse(res, error); }
};
// Authorize before accepting any uploaded files.
exports.authorizeOrder = async (req, res, next) => {
    try {
        const order = await ownedOrder(req, req.params.orderId);
        if (order.orderStatus !== 'Delivered') throw fail('Reviews are available after delivery.', 400);
        if (!await OrderSlot.findOne({ where: { orderId: order.orderId, productId: req.params.productId } })) throw fail('This product is not in your order.', 400);
        req.reviewOrder = order;
        next();
    } catch (error) { errorResponse(res, error); }
};
exports.saveCustomerReview = async (req, res) => {
    const uploaded = (req.files || []).map(file => file.filename);
    try {
        const values = validate(req.body);
        let removed = [];
        const review = await sequelize.transaction(async transaction => {
            const order = await Order.findByPk(req.params.orderId, { transaction, lock: transaction.LOCK.UPDATE });
            if (order.orderStatus !== 'Delivered') throw fail('Reviews are available after delivery.', 400);
            const where = { orderId: order.orderId, productId: req.params.productId };
            const current = await Review.findOne({ where, transaction });
            if (req.method === 'POST' && current) throw fail('You already reviewed this product. Use Edit review.', 409);
            if (req.method === 'PUT' && !current) throw fail('Review no longer exists. Refresh and add a new review.', 404);
            const oldMedia = current ? media(current) : [];
            let retained = oldMedia;
            if (req.body.retainedMedia !== undefined) {
                try { retained = JSON.parse(req.body.retainedMedia); } catch (_) { throw fail('Invalid media selection.', 400); }
                if (!Array.isArray(retained) || retained.some(file => !oldMedia.includes(file))) throw fail('Invalid media selection.', 400);
                retained = [...new Set(retained)];
            }
            if (retained.length + uploaded.length > 5) throw fail('Attach up to 5 images or videos.', 400);
            removed = oldMedia.filter(file => !retained.includes(file));
            const data = { ...values, status: 'pending', images: JSON.stringify([...retained, ...uploaded]) };
            return current ? current.update(data, { transaction }) : Review.create({ ...where, customerId: order.customerId || null, ...data }, { transaction });
        });
        removeFiles(removed);
        res.status(req.method === 'POST' ? 201 : 200).json(review);
    } catch (error) { removeFiles(uploaded); errorResponse(res, error); }
};
exports.cancelCustomerReview = async (req, res) => {
    try {
        await ownedOrder(req, req.params.orderId);
        const files = await sequelize.transaction(async transaction => {
            await Order.findByPk(req.params.orderId, { transaction, lock: transaction.LOCK.UPDATE });
            const review = await Review.findOne({ where: { orderId: req.params.orderId, productId: req.params.productId }, transaction });
            if (!review) throw fail('Review not found.', 404);
            const files = media(review);
            await review.destroy({ transaction });
            return files;
        });
        removeFiles(files);
        res.json({ message: 'Review cancelled.' });
    } catch (error) { errorResponse(res, error); }
};
exports.updateReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);
        if (!review) throw fail('Review not found.', 404);
        const status = req.body.status || review.status;
        if (!['pending', 'published', 'rejected'].includes(status)) throw fail('Invalid review status.', 400);
        const values = validate({ rating: req.body.rating ?? review.rating, feedback: req.body.feedback ?? review.feedback });
        await review.update({ ...values, status });
        res.json({ message: 'Review updated.' });
    } catch (error) { errorResponse(res, error); }
};
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);
        if (!review) throw fail('Review not found.', 404);
        const files = media(review);
        await review.destroy();
        removeFiles(files);
        res.json({ message: 'Review deleted.' });
    } catch (error) { errorResponse(res, error); }
};
