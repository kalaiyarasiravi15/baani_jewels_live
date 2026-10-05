const { validatePromotion } = require('../utils/promotionValidation');
const Coupon = require('../models/Coupon');
const { Order, OrderSlot, Customer } = require('../models');
const { Op, literal } = require('sequelize');

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

// `usageLimit` is intentionally per customer/guest identity, not a store-wide
// cap.  A guest is recognised by either the email or phone used on an order.
const getIdentityUsageCount = async ({ couponId, customerId, email, phone, transaction }) => {
    const identity = [];
    if (customerId) identity.push({ customerId: Number(customerId) });
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);
    if (cleanEmail) identity.push({ guestEmail: cleanEmail });
    if (cleanPhone) identity.push({ snapPhone: cleanPhone });
    if (!identity.length) return 0;
    return Order.count({ where: { couponId, [Op.or]: identity }, transaction });
};

const assertCouponEligibleForIdentity = async ({ couponId, productSubtotal, customerId, guestDetails = {}, transaction }) => {
    const coupon = await Coupon.findByPk(couponId, transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {});
    if (!coupon || !coupon.status) throw new Error('Coupon is no longer active.');
    const now = new Date();
    if (now < new Date(coupon.startDate) || now >= new Date(coupon.endDate)) throw new Error('Coupon is expired or not yet active.');
    const subtotal = Number(productSubtotal);
    const max = coupon.maxOrderAmount === null || Number(coupon.maxOrderAmount) === 0 ? null : Number(coupon.maxOrderAmount);
    if (!Number.isFinite(subtotal) || subtotal < Number(coupon.minOrderAmount || 0) || (max !== null && subtotal > max)) throw new Error('Coupon is not valid for this order subtotal.');
    const usedByThisCustomer = await getIdentityUsageCount({ couponId: coupon.id, customerId, email: guestDetails.email, phone: guestDetails.phone, transaction });
    if (usedByThisCustomer >= Number(coupon.usageLimit || 1)) throw new Error(`You have already used this coupon ${usedByThisCustomer} time(s). Limit: ${coupon.usageLimit} per customer.`);
    return { coupon, usedByThisCustomer };
};

const buildCouponDescription = ({ type, discountValue, minOrderAmount, maxOrderAmount }) => {
    const discount = type === 'flat' ? `₹${discountValue} off` : `${discountValue}% off`;
    const minimum = Number(minOrderAmount || 0) > 0 ? ` on orders from ₹${minOrderAmount}` : ' on all eligible orders';
    const maximum = Number(maxOrderAmount || 0) > 0 ? ` up to ₹${maxOrderAmount}` : '';
    return `Get ${discount}${minimum}${maximum}.`;
};

// 1. CREATE COUPON

// 1. CREATE COUPON
exports.createCoupon = async (req, res) => {
    try {
        try { validatePromotion(req.body, true); } catch (error) { return res.status(400).json({ error: error.message, message: error.message }); }

        const { code, startDate, endDate, minOrderAmount, maxOrderAmount } = req.body;
        if (code) req.body.code = code.toUpperCase();
        req.body.description = buildCouponDescription(req.body);

        if (new Date(startDate) > new Date(endDate))
            return res.status(400).json({ error: 'Start date cannot be later than end date' });

        if (maxOrderAmount && parseFloat(maxOrderAmount) > 0) {
            if (parseFloat(minOrderAmount) > parseFloat(maxOrderAmount))
                return res.status(400).json({ error: 'Min order amount cannot be greater than max order amount' });
        }

        const coupon = await Coupon.create(req.body);
        res.status(201).json({ message: 'Coupon Created Successfully! ', coupon });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError')
            return res.status(400).json({ error: 'This coupon code already exists!' });
        res.status(500).json({ error: error.message });
    }
};

// 2. VALIDATE COUPON (Checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        // Never use shipping or the checkout grand total for coupon eligibility.
        // `orderAmount` remains as a legacy fallback for older storefront builds.
        const productSubtotal = req.body.productSubtotal ?? req.body.orderAmount;
        const currentDate = new Date();

        if (!code || productSubtotal === undefined || productSubtotal === null)
            return res.status(400).json({ message: 'Coupon code and product subtotal are required' });

        const coupon = await Coupon.findOne({
            where: {
                code:      code.toUpperCase(),
                status:    true,
                startDate: { [Op.lte]: currentDate },
                endDate:   { [Op.gt]: currentDate }
            }
        });

        if (!coupon)
            return res.status(404).json({ message: 'Invalid or Expired Coupon! ' });

        const customerId = req.customerId || null;
        const guestDetails = req.body.guestDetails || {};
        const usedByThisCustomer = await getIdentityUsageCount({ couponId: coupon.id, customerId, email: guestDetails.email, phone: guestDetails.phone });
        if ((customerId || guestDetails.email || guestDetails.phone) && usedByThisCustomer >= Number(coupon.usageLimit || 1)) {
            return res.status(400).json({ message: `You have already used this coupon. Limit: ${coupon.usageLimit} use(s) per customer.` });
        }

        const minAmount     = parseFloat(coupon.minOrderAmount) || 0;
        const maxAmount     = coupon.maxOrderAmount ? parseFloat(coupon.maxOrderAmount) : null;
        const currentAmount = parseFloat(productSubtotal);
        if (!Number.isFinite(currentAmount) || currentAmount < 0)
            return res.status(400).json({ message: 'A valid product subtotal is required' });

        if (currentAmount < minAmount)
            return res.status(400).json({
                message: `Minimum order of ₹${minAmount} required. Add ₹${(minAmount - currentAmount).toFixed(2)} more!`
            });

        if (maxAmount !== null && currentAmount > maxAmount)
            return res.status(400).json({
                message: `This coupon is valid only for orders up to ₹${maxAmount}`
            });

        // Calculate discount
        let discount = 0;
        const val = parseFloat(coupon.discountValue);

        if (coupon.type === 'percentage') {
            discount = (currentAmount * val) / 100;
        } else {
            discount = val;
        }

        if (Number(coupon.maxDiscount) > 0) discount = Math.min(discount, Number(coupon.maxDiscount));
        if (discount > currentAmount) discount = currentAmount;
        const roundedDiscount = Math.round(discount * 100) / 100;

        res.json({
            success: true,
            message: `Coupon Applied! You saved ₹${roundedDiscount.toLocaleString('en-IN')} `,
            data: {
                couponId:       coupon.id,
                code:           coupon.code,
                discountAmount: roundedDiscount,
                finalAmount:    Math.round((currentAmount - roundedDiscount) * 100) / 100,
                usageLeft:      Math.max(0, Number(coupon.usageLimit || 1) - usedByThisCustomer)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. GET VISIBLE COUPONS (Checkout suggestions — active and unexpired only)
exports.getVisibleCoupons = async (req, res) => {
    try {
        // `orderAmount` is retained only for compatibility with older clients.
        const orderAmount = Number(req.query.productSubtotal ?? req.query.orderAmount);
        const currentDate = new Date();
        const eligibilityWhere = Number.isFinite(orderAmount) && orderAmount >= 0
            ? {
                minOrderAmount: { [Op.lte]: orderAmount },
                [Op.or]: [
                    { maxOrderAmount: null },
                    { maxOrderAmount: 0 },
                    { maxOrderAmount: { [Op.gte]: orderAmount } }
                ]
            }
            : {};

        const coupons = await Coupon.findAll({
            where: {
                status:    true,
                startDate: { [Op.lte]: currentDate },
                endDate:   { [Op.gt]: currentDate },
                [Op.and]: [
                    eligibilityWhere
                ]
            },
            order: [['minOrderAmount', 'DESC']],
            attributes: [
                'id', 'code', 'description', 'type',
                'discountValue', 'minOrderAmount', 'maxOrderAmount',
                'maxDiscount', 'endDate', 'usedCount', 'usageLimit' 
            ]
        });

        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. TOGGLE STATUS
exports.toggleStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        if (!coupon.status && new Date(coupon.endDate) <= new Date()) return res.status(400).json({ message: 'Update the expiry before activating this coupon.' });
        coupon.status = !coupon.status;
        await coupon.save();
        res.json({ message: `Coupon is now ${coupon.status ? 'Active' : 'Inactive'}`, status: coupon.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. INCREMENT USAGE — internal function (never auto-deletes)
exports.incrementUsage = async (couponId) => {
    try {
        const coupon = await Coupon.findByPk(couponId);
        if (!coupon) return;

        // `usedCount` is analytics only; `usageLimit` is enforced separately
        // for every customer/guest identity.
        await coupon.increment('usedCount', { by: 1 });
    } catch (error) {
        console.error('Coupon Increment Error:', error.message);
    }
};

// 6. GET ALL COUPONS (Admin - keeps expired coupons marked as inactive/expired)
exports.getAllCoupons = async (req, res) => {
    try {
        const currentDate = new Date();
        const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
        
        const formatted = coupons.map(c => {
            const json = c.toJSON();
            const isExpired = new Date(c.endDate) <= currentDate;
            return {
                ...json,
                isExpired,
                effectiveStatus: isExpired ? false : json.status
            };
        });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. DELETE COUPON
exports.deleteCoupon = async (req, res) => {
    try {
        await Coupon.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Coupon deleted successfully! ' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 8. UPDATE COUPON
exports.getCouponUsage = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        const orders = await Order.findAll({
            where: { couponId: coupon.id },
            include: [
                { model: Customer, attributes: ['id', 'name', 'email', 'phone'], paranoid: false },
                { model: OrderSlot, as: 'slots', attributes: ['productName', 'variantLabel', 'quantity', 'salesPrice'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ coupon: { id: coupon.id, code: coupon.code, usedCount: coupon.usedCount }, orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        const { code, startDate, endDate, minOrderAmount, maxOrderAmount } = req.body;
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

        try { validatePromotion({ ...coupon.toJSON(), ...req.body }, true); } catch (error) { return res.status(400).json({ error: error.message, message: error.message }); }
        if (code) req.body.code = code.toUpperCase();
        req.body.description = buildCouponDescription({ ...coupon.toJSON(), ...req.body });

        if (startDate && endDate && new Date(startDate) > new Date(endDate))
            return res.status(400).json({ error: 'Start date cannot be later than end date' });

        if (minOrderAmount !== undefined && maxOrderAmount !== undefined) {
            if (maxOrderAmount && parseFloat(maxOrderAmount) > 0) {
                if (parseFloat(minOrderAmount) > parseFloat(maxOrderAmount))
                    return res.status(400).json({ error: 'Min order amount cannot be greater than max order amount' });
            }
        }

        await coupon.update(req.body);
        res.json({ message: 'Coupon Updated Successfully!', coupon });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError')
            return res.status(400).json({ error: 'This coupon code already exists!' });
        res.status(500).json({ error: error.message });
    }
};

exports.assertCouponEligibleForIdentity = assertCouponEligibleForIdentity;
