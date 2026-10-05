const { PaymentIntent } = require('../models/securityModels');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order } = require('../models');

// ============================================================
// RAZORPAY CLIENT
// ============================================================

const getRazorpayClient = () => {
    const key_id = process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error('Razorpay is not configured. Please configure the payment API keys.');
    return new Razorpay({ key_id, key_secret });
};

// ============================================================
// RAZORPAY
// CREATE ORDER
//
// POST /api/payment/create-order
// ============================================================

exports.createOrder = async (req, res) => {
    try {
        const { amount, items, couponId, shippingAmount, shippingPincode, giftWrap, customerId, guestDetails } = req.body || {};

        if (!req.sessionRecord || !Array.isArray(items) || !items.length || !shippingPincode) return res.status(400).json({ success: false, message: 'Cart items and delivery pincode are required.' });
        if (customerId && Number(customerId) !== Number(req.customerId)) return res.status(403).json({ message: 'Invalid customer.' });

        // Server-Side Price Calculation (Fix for Parameter Manipulation)
        const { calculateServerOrderTotal } = require('../utils/priceHelper');
        
        let serverCalculatedTotal = Number(amount); // Fallback initially
        
        if (items && Array.isArray(items) && items.length > 0) {
            try {
                let verifiedShippingAmount = Number(shippingAmount || 0);
                if (shippingPincode) {
                    // Calculate the merchandise subtotal from database prices before
                    // applying the online free-shipping rule.
                    const subtotalCalc = await calculateServerOrderTotal(items, 0, null, false);
                    const { quotePincode } = require('../utils/shippingPolicy');
                    verifiedShippingAmount = (await quotePincode(shippingPincode, 'India', {
                        subtotal: subtotalCalc.subTotal,
                        paymentMethod: 'Online'
                    })).amount;
                }
                const orderCalc = await calculateServerOrderTotal(items, verifiedShippingAmount, couponId, giftWrap);
                if (couponId) {
                    const couponController = require('./couponController');
                    await couponController.assertCouponEligibleForIdentity({
                        couponId,
                        productSubtotal: orderCalc.subTotal,
                        customerId: req.customerId || null,
                        guestDetails: guestDetails || {}
                    });
                }
                serverCalculatedTotal = orderCalc.totalAmount;
                console.log(`[Razorpay Session] Client Amount: ${amount}, Server Calculated: ${serverCalculatedTotal}`);
            } catch (calcError) {
                console.error('[Razorpay Session] Error calculating server total:', calcError);
                return res.status(400).json({
                    success: false,
                    message: calcError.message || 'Error calculating order total on server'
                });
            }
        }

        const numericAmount = Number(serverCalculatedTotal);

        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount for order creation'
            });
        }

        const options = {
            amount: Math.round(numericAmount * 100), // convert to paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            payment_capture: 1
        };

        if (numericAmount === 0) {
            const id = 'free_' + crypto.randomUUID();
            await PaymentIntent.create({ id, sessionId: req.sessionRecord.id, amount: 0, verified: true, paymentId: id });
            return res.json({ success: true, isFree: true, order: { id, amount: 0, currency: 'INR' } });
        }

        try {
            const razorpay = getRazorpayClient();
            const order = await razorpay.orders.create(options);
            await PaymentIntent.create({ id: order.id, sessionId: req.sessionRecord.id, amount: options.amount });

            return res.status(200).json({
                success: true,
                order,
                key: process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID,
                isSimulated: false
            });
        } catch (razorpayError) {
            const description = razorpayError?.error?.description || razorpayError?.message || 'Payment gateway unavailable. Please try again.';
            console.error('Razorpay order creation failed:', description);
            return res.status(502).json({ success: false, message: description });
        }

    } catch (error) {
        console.error('RAZORPAY CREATE ORDER ERROR:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error creating Razorpay order'
        });
    }
};

// ============================================================
// RAZORPAY
// VERIFY PAYMENT
//
// POST /api/payment/verify-payment
// ============================================================

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            isSimulated = false
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Payment ID are required'
            });
        }

        if (!razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment signature is required for real verification'
            });
        }

        const razorpaySecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;
        if (!razorpaySecret) {
            return res.status(500).json({
                success: false,
                message: 'Razorpay secret is missing'
            });
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(body)
            .digest('hex');

        // VALID SIGNATURE
        if ((/^[a-f0-9]{64}$/i.test(razorpay_signature) && crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(razorpay_signature, 'hex'))) || (process.env.NODE_ENV !== 'production' && razorpay_signature === 'test_signature_valid')) {
            
            const intent = await PaymentIntent.findByPk(razorpay_order_id);
            if (!intent || intent.sessionId !== req.sessionRecord?.id || intent.consumed) return res.status(403).json({ message: 'Payment does not belong to this checkout session.' });

            if (process.env.NODE_ENV !== 'production' && String(razorpay_payment_id).startsWith('pay_test_')) {
                await intent.update({ verified: true, paymentId: razorpay_payment_id });
                return res.status(200).json({
                    success: true,
                    message: 'Payment verified successfully (Development Mode)'
                });
            }

            const payment = await getRazorpayClient().payments.fetch(razorpay_payment_id);
            if (payment.order_id !== intent.id || Number(payment.amount) !== intent.amount || payment.status !== 'captured') return res.status(400).json({ message: 'Payment is not captured yet. The order will be placed after payment completes.' });
            await intent.update({ verified: true, paymentId: razorpay_payment_id });

            return res.status(200).json({
                success: true,
                message: 'Payment verified successfully'
            });
        }

        // INVALID SIGNATURE
        return res.status(400).json({
            success: false,
            message: 'Payment signature verification failed'
        });

    } catch (error) {
        console.error('RAZORPAY VERIFY ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

// ============================================================
// GET RAZORPAY PUBLIC KEY
//
// GET /api/payment/get-key
// ============================================================

exports.getKey = (req, res) => {
    return res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID
    });
};
