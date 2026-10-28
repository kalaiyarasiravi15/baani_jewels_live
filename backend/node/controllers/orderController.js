const fs = require('fs');
const path = require('path');
const { Order, OrderSlot, Customer, CustomerAddress, ShippingAddress, Product, ProductVariant, Coupon, Review } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const couponController = require('./couponController');
const { breakdownFromFinalPrice } = require('../utils/gstHelper');
const mailer = require('../utils/mailer');
const sms = require('../utils/smsService');


const resolveShipping = (order) => {
    if (!order) return null;
    const resolvedEmail = order.guestEmail || order.Customer?.email || order.snapEmail || null;
    if (order.snapAddressLine || order.snapCity) {
        return {
            name:        order.snapName        || order.Customer?.name || 'Customer',
            phone:       order.snapPhone       || order.Customer?.phone || null,
            email:       resolvedEmail,
            addressLine: order.snapAddressLine || null,
            city:        order.snapCity        || null,
            district:    order.snapDistrict    || null,
            state:       order.snapState       || null,
            pincode:     order.snapPincode     || null,
        };
    }
    const s = order.orderShipping;
    if (s) {
        return {
            name:        s.name        || order.Customer?.name || 'Customer',
            phone:       s.phone       || order.Customer?.phone || null,
            email:       resolvedEmail,
            addressLine: s.addressLine || null,
            city:        s.city        || null,
            district:    s.district    || null,
            state:       s.state       || null,
            pincode:     s.pincode     || null,
        };
    }
    const addr = order.Customer?.CustomerAddresses?.[0];
    if (addr) {
        return {
            name:        order.Customer?.name  || 'Customer',
            phone:       order.Customer?.phone || null,
            email:       resolvedEmail,
            addressLine: [addr.houseNo, addr.street].filter(Boolean).join(', '),
            city:        addr.city     || null,
            district:    addr.district || null,
            state:       addr.state    || null,
            pincode:     addr.pincode  || null,
        };
    }
    return {
        name:  order.snapName  || order.Customer?.name  || 'Customer',
        phone: order.snapPhone || order.Customer?.phone || null,
        email: resolvedEmail
    };
};

const sendOrderNotificationEmail = async (orderData, statusOverride = null) => {
    try {
        if (!orderData) return;
        const status = statusOverride || orderData.orderStatus || 'Pending';
        const customerEmail = orderData.guestEmail || orderData.Customer?.email || orderData.snapEmail;
        if (!customerEmail) {
            console.warn(`[Order Email] No email address found for order #${orderData.orderId}`);
            return;
        }

        const customerName = orderData.snapName || orderData.Customer?.name || 'Valued Customer';
        const orderId = orderData.orderId || orderData.id;
        const formattedDate = new Date(orderData.createdAt || Date.now()).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const statusDetails = {
            Pending: {
                subject: `Order Placed Successfully - ${orderId} | Baani Jewels`,
                title: 'Order Placed Successfully',
                intro: `Dear ${customerName}, thank you for choosing Baani Jewels. Your luxury order has been received and our master artisans are reviewing it.`,
                badge: 'ORDER PLACED',
                badgeBg: '#fef3c7',
                badgeColor: '#92400e',
                accentColor: '#c9a84c'
            },
            Confirmed: {
                subject: `Order Confirmed - ${orderId} | Baani Jewels`,
                title: 'Order Confirmed by Artisan',
                intro: `Dear ${customerName}, your order has been artisan verified and confirmed. We are preparing it for luxury packaging.`,
                badge: 'CONFIRMED',
                badgeBg: '#ecfdf5',
                badgeColor: '#065f46',
                accentColor: '#10b981'
            },
            Packed: {
                subject: `Order Packed in Luxury Box - ${orderId} | Baani Jewels`,
                title: 'Quality Inspected & Luxury Packed',
                intro: `Dear ${customerName}, your handcrafted jewelry has passed rigorous quality inspection and is safely packaged in our signature luxury presentation box.`,
                badge: 'LUXURY PACKED',
                badgeBg: '#f0fdf4',
                badgeColor: '#166534',
                accentColor: '#16a34a'
            },
            Shipped: {
                subject: `Shipment Dispatched - ${orderId} | Baani Jewels`,
                title: 'Shipment Dispatched & In Transit',
                intro: `Dear ${customerName}, your order is officially on its way to you via our trusted express delivery partner.`,
                badge: 'IN TRANSIT',
                badgeBg: '#eff6ff',
                badgeColor: '#1e40af',
                accentColor: '#3b82f6'
            },
            'Out for Delivery': {
                subject: `Out for Delivery Today - ${orderId} | Baani Jewels`,
                title: 'Out for Delivery',
                intro: `Dear ${customerName}, your package is out for delivery today and will reach your doorstep shortly.`,
                badge: 'OUT FOR DELIVERY',
                badgeBg: '#f0fdfa',
                badgeColor: '#115e59',
                accentColor: '#0d9488'
            },
            Delivered: {
                subject: `Order Delivered - ${orderId} | Baani Jewels`,
                title: 'Delivered to Your Doorstep',
                intro: `Dear ${customerName}, your Baani Jewels order has been successfully delivered. We hope you cherish each piece as much as we loved creating it!`,
                badge: 'DELIVERED',
                badgeBg: '#ecfdf5',
                badgeColor: '#065f46',
                accentColor: '#059669'
            },
            Cancelled: {
                subject: `Order Cancelled - ${orderId} | Baani Jewels`,
                title: 'Order Cancelled',
                intro: `Dear ${customerName}, your order has been cancelled. If any payment was deducted, your refund will be processed within 5–7 business days.`,
                badge: 'CANCELLED',
                badgeBg: '#fef2f2',
                badgeColor: '#991b1b',
                accentColor: '#dc2626'
            }
        };

        const currentMeta = statusDetails[status] || statusDetails.Pending;

        // Resolve Items with Images
        const items = orderData.slots || orderData.items || [];
        let backendUrl = (process.env.BACKEND_URL || '').trim();
        if (!backendUrl || backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1') || backendUrl.includes('172.16.') || backendUrl.includes('192.168.') || backendUrl.includes('10.')) {
            backendUrl = 'https://baanijewelsapi.com';
        }
        let frontendUrl = (process.env.FRONTEND_URL || '').trim();
        if (!frontendUrl || frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1') || frontendUrl.includes('172.16.') || frontendUrl.includes('192.168.') || frontendUrl.includes('10.')) {
            frontendUrl = 'https://baanijewels.com';
        }

        const itemRowsHtml = items.map((it, idx) => {
            const pName = it.productName || it.Product?.name || 'Baani Jewels Piece';
            const vLabel = it.variantLabel ? `<div style="font-size: 11.5px; color: #6b7280; margin-top: 3px;">${it.variantLabel}</div>` : '';
            const promotion = it.promotionSource ? `<div style="font-size: 11.5px; color: #a16207; margin-top: 3px; font-weight: 700;">${it.promotionSource === 'Offer Banner' ? 'SPECIAL OFFER' : 'DEAL'}: ${it.promotionLabel || 'Promotion'} · ${it.promotionDiscountType === 'FLAT' ? `₹${Number(it.promotionDiscountValue || 0).toLocaleString('en-IN')} OFF` : `${it.promotionDiscountValue || 0}% OFF`}</div>` : '';
            const qty = Number(it.quantity || 1);
            const price = Number(it.salesPrice || it.finalPrice || 0);
            const rowTotal = (qty * price).toLocaleString('en-IN');

            return `
              <tr>
                <td style="padding: 14px 10px; border-bottom: 1px solid #f0ede6; vertical-align: middle; width: 36px; text-align: center; color: #6b7280; font-weight: 600; font-size: 13px;">
                  ${idx + 1}
                </td>
                <td style="padding: 14px 12px; border-bottom: 1px solid #f0ede6; vertical-align: middle;">
                  <div style="font-weight: 700; color: #12382e; font-size: 13.5px; line-height: 1.4;">${pName}</div>
                  ${vLabel}
                  ${promotion}
                  <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">
                    Qty: <strong>${qty}</strong> &nbsp;•&nbsp; ₹${price.toLocaleString('en-IN')} each
                  </div>
                </td>
                <td style="padding: 14px 10px; border-bottom: 1px solid #f0ede6; vertical-align: middle; text-align: right; font-weight: 700; color: #12382e; font-size: 14px;">
                  ₹${rowTotal}
                </td>
              </tr>
            `;
        }).join('');

        const shipping = resolveShipping(orderData) || {
            name: orderData.snapName || customerName,
            phone: orderData.snapPhone || orderData.Customer?.phone || '',
            addressLine: orderData.snapAddressLine || '',
            city: orderData.snapCity || '',
            district: orderData.snapDistrict || '',
            state: orderData.snapState || '',
            pincode: orderData.snapPincode || ''
        };

        const fullAddrStr = [shipping.addressLine, shipping.city, shipping.district, shipping.state].filter(Boolean).join(', ');

        const subtotalVal = items.reduce((acc, it) => acc + (Number(it.salesPrice || it.finalPrice || 0) * Number(it.quantity || 1)), 0);
        const shippingVal = Number(orderData.shippingAmount || 0);
        const giftWrapVal = orderData.giftWrap ? 30 : 0;
        const discountVal = Number(orderData.discountAmount || 0);
        const grandTotalVal = Number(orderData.totalAmount || (subtotalVal + shippingVal + giftWrapVal - discountVal));

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentMeta.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f7f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px 6px !important; }
      .email-card { border-radius: 12px !important; }
      .header-pad { padding: 24px 18px !important; }
      .body-pad { padding: 20px 16px !important; }
      .summary-box { padding: 14px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f1;">
  <div class="email-wrapper" style="padding: 30px 12px; background-color: #f4f7f1;">
    <div class="email-card" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8dfc8; box-shadow: 0 12px 36px rgba(18, 56, 46, 0.08);">
      
      <!-- ── LUXURY HEADER ── -->
      <div class="header-pad" style="background: linear-gradient(135deg, #092b21 0%, #031711 100%); padding: 32px 28px; text-align: center; border-bottom: 3px solid #c9a84c;">
        <div style="margin-bottom: 6px;">
          <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #fff8ec; letter-spacing: 2px; text-transform: uppercase;">BAANI JEWELS</span>
        </div>
        <div style="font-size: 10.5px; color: #c9a84c; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 20px;">
          Luxury Made Affordable
        </div>

        <div style="display: inline-block; background: ${currentMeta.badgeBg}; color: ${currentMeta.badgeColor}; border: 1px solid ${currentMeta.badgeColor}40; padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
          ${currentMeta.badge}
        </div>

        <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">${currentMeta.title}</h1>
        <p style="margin: 0; color: #d1fae5; font-size: 13.5px; line-height: 1.6;">${currentMeta.intro}</p>
      </div>

      <!-- ── BODY CONTENT ── -->
      <div class="body-pad" style="padding: 28px 24px; color: #1f2937;">
        
        <!-- Meta info pill bar -->
        <table style="width: 100%; border-collapse: collapse; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 16px; border-right: 1px solid #e7e5e4;">
              <div style="font-size: 10.5px; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Order ID</div>
              <div style="font-size: 14px; color: #12382e; font-weight: 800; margin-top: 2px;">${orderId}</div>
            </td>
            <td style="padding: 12px 16px; border-right: 1px solid #e7e5e4;">
              <div style="font-size: 10.5px; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Order Date</div>
              <div style="font-size: 13px; color: #1f2937; font-weight: 600; margin-top: 2px;">${formattedDate}</div>
            </td>
            <td style="padding: 12px 16px;">
              <div style="font-size: 10.5px; color: #78716c; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Payment Status</div>
              <div style="font-size: 13px; color: #065f46; font-weight: 700; margin-top: 2px;">${(orderData.paymentStatus || 'Paid').toUpperCase()}</div>
            </td>
          </tr>
        </table>

        <!-- ── ORDER ITEMS LIST ── -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 800; color: #12382e; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #12382e; padding-bottom: 8px; margin-bottom: 12px;">
            Ordered Jewellery Pieces (${items.length})
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemRowsHtml || '<tr><td style="padding:10px;color:#6b7280;">Order details</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- ── PRICING & PAYMENT SUMMARY ── -->
        <div class="summary-box" style="background: #faf7f2; border: 1px solid #e8dfc8; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 5px 0; color: #4b5563;">Items Subtotal</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #1f2937;">₹${subtotalVal.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #4b5563;">Shipping (${orderData.shippingType || 'Express'})</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #1f2937;">${shippingVal > 0 ? `₹${shippingVal.toLocaleString('en-IN')}` : '<span style="color:#059669">FREE</span>'}</td>
            </tr>
            ${giftWrapVal > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #4b5563;">🎁 Signature Luxury Gift Wrap</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #1f2937;">₹30</td>
            </tr>
            ` : ''}
            ${discountVal > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #059669;">Special Discount Applied</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 700; color: #059669;">- ₹${discountVal.toLocaleString('en-IN')}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding: 8px 0 4px 0;"><div style="border-top: 1px dashed #d6cbb6;"></div></td>
            </tr>
            <tr>
              <td style="padding: 8px 0 0 0; font-size: 15px; font-weight: 800; color: #12382e;">Total Amount Paid</td>
              <td style="padding: 8px 0 0 0; text-align: right; font-size: 16px; font-weight: 800; color: #12382e;">₹${grandTotalVal.toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>

        <!-- ── DELIVERY ADDRESS ── -->
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 800; color: #12382e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
            Delivery Destination
          </div>
          <div style="font-weight: 700; color: #111827; font-size: 13.5px;">${shipping.name || customerName}</div>
          <div style="color: #4b5563; font-size: 13px; margin-top: 3px; line-height: 1.5;">${fullAddrStr || 'Address on record'}</div>
          ${shipping.pincode ? `<div style="color: #4b5563; font-size: 12.5px; margin-top: 2px;">Pincode: <strong>${shipping.pincode}</strong></div>` : ''}
          ${shipping.phone ? `<div style="color: #4b5563; font-size: 12.5px; margin-top: 2px;">Phone: <strong>${shipping.phone}</strong></div>` : ''}
        </div>

        <!-- ── ASSISTANCE / CONCIERGE ── -->
        <div style="background: #fdfbf7; border: 1px solid #edd5a3; border-radius: 12px; padding: 16px 18px; text-align: center;">
          <div style="font-weight: 700; color: #12382e; font-size: 13px; margin-bottom: 4px;">Need Assistance With Your Order?</div>
          <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
            Our dedicated luxury concierge team is available to assist you via WhatsApp or Email.<br/>
            <strong>WhatsApp / Phone:</strong> +91 93453 22621 &nbsp;|&nbsp; <strong>Email:</strong> Baanijewels.ind@gmail.com
          </div>
        </div>

        <!-- ── FOOTER ── -->
        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6;">
          <strong>BAANI JEWELS</strong> &bull; Luxury Made Affordable<br/>
          Proudly based in Chennai, Tamil Nadu, India<br/>
          This is an official automated transaction receipt. No physical signature is required.
        </div>

      </div>

    </div>
  </div>
</body>
</html>
        `;

        await mailer.sendMail({
            from: `"Baani Jewels" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: currentMeta.subject,
            html: emailHtml
        });

        console.log(`[Order Email Sent] Order #${orderId} -> Status: ${status} -> Recipient: ${customerEmail}`);

        // If this is a new order, also send an Admin Notification Email to the admin
        if (status === 'Pending' && process.env.EMAIL_USER && process.env.EMAIL_USER.toLowerCase() !== String(customerEmail).toLowerCase()) {
            try {
                await mailer.sendMail({
                    from: `"Baani Jewels Orders" <${process.env.EMAIL_USER}>`,
                    to: process.env.EMAIL_USER,
                    subject: `✦ New Order Received: ${orderId} - ₹${grandTotalVal.toLocaleString('en-IN')}`,
                    html: emailHtml
                });
                console.log(`[Admin Order Alert Sent] Order #${orderId} -> Admin: ${process.env.EMAIL_USER}`);
            } catch (adminMailErr) {
                console.warn(`[Admin Order Alert Failed]:`, adminMailErr.message);
            }
        }
    } catch (err) {
        console.error(`[Order Email Failed] Error sending mail:`, err.message);
    }
};

// 1. PLACE ORDER
exports.placeOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            customerId, totalAmount, discountAmount, couponId,
            paymentMethod, paymentStatus, paymentId, razorpayOrderId,
            items, shippingAddressId,
            shippingAmount,
            shippingType,
            giftWrap,
            isGuestCheckout = false,
            guestDetails = {}
        } = req.body;

        const guest = Boolean(isGuestCheckout) || Boolean(req.originalUrl && req.originalUrl.includes('guest-place'));
        const guestEmail = String(guestDetails.email || '').trim().toLowerCase();
        const cleanGuestPhone = String(guestDetails.phone || '').replace(/\D/g, '');

        if (!guest && !customerId) {
            await t.rollback();
            return res.status(400).json({ error: 'customerId is required' });
        }
        if (!guest && String(req.customerId) !== String(customerId)) {
            await t.rollback();
            return res.status(403).json({ error: 'You can only place orders for your own account' });
        }
        if (guest && (!guestDetails.name || cleanGuestPhone.length < 7 || cleanGuestPhone.length > 15 || !/^\S+@\S+\.\S+$/.test(guestEmail))) {
            await t.rollback();
            return res.status(400).json({ error: 'Guest name, valid phone (7-15 digits), and valid email are required' });
        }
        
        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'Order must have at least one item' });
        }

        // Delivery charges are set by the admin. Never accept a browser-supplied charge.
        let verifiedShippingAmount = 0;
        let verifiedShippingType = null;
        let addressForQuote = null;
        try {
            if (guest) {
                addressForQuote = guestDetails;
            } else {
                if (shippingAddressId) {
                    addressForQuote = await ShippingAddress.findByPk(shippingAddressId, { transaction: t });
                }
                if (!addressForQuote) {
                    addressForQuote = req.body.shippingAddress || req.body.address || req.body.customerDetails || req.body.guestDetails;
                }
            }

            if (!addressForQuote?.pincode && !guest && req.customerId) {
                const fallbackCustAddr = await CustomerAddress.findOne({ where: { customerId: req.customerId }, transaction: t });
                if (fallbackCustAddr?.pincode) {
                    addressForQuote = {
                        name: fallbackCustAddr.name,
                        phone: fallbackCustAddr.phone,
                        addressLine: [fallbackCustAddr.houseNo, fallbackCustAddr.street].filter(Boolean).join(', '),
                        city: fallbackCustAddr.city,
                        district: fallbackCustAddr.district,
                        state: fallbackCustAddr.state,
                        pincode: fallbackCustAddr.pincode
                    };
                } else if (req.body.shippingPincode) {
                    addressForQuote = { pincode: req.body.shippingPincode };
                }
            }

            if (!guest && addressForQuote && addressForQuote.customerId && Number(addressForQuote.customerId) !== Number(req.customerId)) {
                throw new Error('This delivery address does not belong to you.');
            }
            if (!addressForQuote?.pincode) throw new Error('A delivery pincode is required.');
            const { calculateServerOrderTotal } = require('../utils/priceHelper');
            const subtotalCalc = await calculateServerOrderTotal(items, 0, null, false);
            const { quotePincode } = require('../utils/shippingPolicy');
            const quote = await quotePincode(addressForQuote.pincode, 'India', {
                subtotal: subtotalCalc.subTotal,
                paymentMethod: 'Online'
            });
            verifiedShippingAmount = quote.amount;
            verifiedShippingType = quote.zoneName;
        } catch (shippingError) {
            await t.rollback();
            return res.status(400).json({ error: shippingError.message || 'Unable to calculate delivery charge.' });
        }

        // --------------------------------------------------------
        // Server-Side Price Calculation
        // --------------------------------------------------------
        const { calculateServerOrderTotal } = require('../utils/priceHelper');
        let serverCalculatedTotal = Number(totalAmount);
        let serverDiscountAmount = Number(discountAmount);
        let serverLineItems = [];

        try {
            const orderCalc = await calculateServerOrderTotal(items, verifiedShippingAmount, couponId, giftWrap);
            if (couponId) {
                await couponController.assertCouponEligibleForIdentity({
                    couponId,
                    productSubtotal: orderCalc.subTotal,
                    customerId: guest ? null : customerId,
                    guestDetails: guest ? guestDetails : {},
                    transaction: t
                });
            }
            serverCalculatedTotal = orderCalc.totalAmount;
            serverDiscountAmount = orderCalc.discountAmount;
            serverLineItems = orderCalc.lineItems || [];
            console.log(`[Place Order] Client Total: ${totalAmount}, Server Total: ${serverCalculatedTotal}`);
        } catch (calcError) {
            console.error('[Place Order] Error calculating server total:', calcError);
            await t.rollback();
            return res.status(400).json({ error: 'Error calculating order total on server' });
        }

        let customId = `BJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        while (await Order.findByPk(customId, { transaction: t })) {
            customId = `BJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        let snapName = null, snapPhone = null, snapAddressLine = null;
        let snapCity = null, snapDistrict = null, snapState = null, snapPincode = null;

        const custRecordInitial = guest ? null : await Customer.findByPk(customerId, { transaction: t });

        if (guest) {
            snapName = String(guestDetails.name || '').trim();
            snapPhone = String(guestDetails.phone || '').replace(/\D/g, '');
            snapAddressLine = String(guestDetails.addressLine || '').trim();
            snapCity = String(guestDetails.city || '').trim();
            snapDistrict = String(guestDetails.district || '').trim();
            snapState = String(guestDetails.state || '').trim();
            snapPincode = String(guestDetails.pincode || '').trim();
        } else if (shippingAddressId) {
            const addr = await ShippingAddress.findByPk(shippingAddressId, { transaction: t });
            if (addr) {
                snapName        = addr.name        || custRecordInitial?.name  || null;
                snapPhone       = addr.phone       || custRecordInitial?.phone || null;
                snapAddressLine = addr.addressLine || null;
                snapCity        = addr.city        || null;
                snapDistrict    = addr.district    || null;
                snapState       = addr.state       || null;
                snapPincode     = addr.pincode     || null;
            }
        }
        if (!snapAddressLine && addressForQuote) {
            snapName        = addressForQuote.name        || custRecordInitial?.name  || snapName;
            snapPhone       = addressForQuote.phone       || custRecordInitial?.phone || snapPhone;
            snapAddressLine = addressForQuote.addressLine || addressForQuote.address || snapAddressLine;
            snapCity        = addressForQuote.city        || snapCity;
            snapDistrict    = addressForQuote.district    || snapDistrict;
            snapState       = addressForQuote.state       || snapState;
            snapPincode     = addressForQuote.pincode     || snapPincode;
        }

        // A guest's email or phone is not proof of account ownership.
        const finalCustomerId = guest ? null : Number(req.customerId);
        const custRecord = guest ? null : custRecordInitial;
        const inputEmail = guest ? guestEmail : (custRecord?.email || null);
        const finalCustomerType = guest ? 'GUEST' : 'REGISTERED';


        const orderIsPreorder = Boolean(req.body.isPreorder) || (Array.isArray(items) && items.some(it => Boolean(it.isPreorder)));

        const { PaymentIntent } = require('../models/securityModels');
        const payment = await PaymentIntent.findByPk(razorpayOrderId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!payment || payment.sessionId !== req.sessionRecord?.id || !payment.verified || payment.consumed || payment.paymentId !== paymentId || Number(payment.amount) !== Math.round(serverCalculatedTotal * 100)) {
            await t.rollback();
            return res.status(400).json({ message: 'A verified payment for this checkout total is required.' });
        }
        await payment.update({ consumed: true }, { transaction: t });
        const createdOrder = await Order.create({
            orderId:           customId,
            customerId:        finalCustomerId,
            customerType:      finalCustomerType,
            guestSessionId:    req.sessionRecord?.id || null,
            guestEmail:        inputEmail || custRecord?.email || null,
            totalAmount:       serverCalculatedTotal,
            discountAmount:    serverDiscountAmount || 0,
            isPreorder:        orderIsPreorder,
            shippingAmount:    verifiedShippingAmount,
            shippingType:      verifiedShippingType,
            giftWrap:          Boolean(giftWrap),
            couponId:          couponId        || null,
            paymentMethod:     serverCalculatedTotal === 0 ? 'Free' : 'Online',
            paymentId:         paymentId       || null,
            razorpayOrderId:   razorpayOrderId || null,
            orderStatus:       'Pending',
            paymentStatus:     'Paid',
            shippingAddressId: guest ? null : (shippingAddressId || null),
            snapName,
            snapPhone,
            snapAddressLine,
            snapCity,
            snapDistrict,
            snapState,
            snapPincode,
        }, { transaction: t });

        let hasPreorderItem = orderIsPreorder;

        const itemsWithSnapshot = [];
        for (const [index, item] of items.entries()) {
            // Price comes only from the current server-side promotion calculation.
            // Never persist a browser-supplied price into an order or invoice.
            const calculatedLine = serverLineItems[index];
            const salesPrice = Number(calculatedLine?.unitPrice);
            if (!Number.isFinite(salesPrice) || salesPrice < 0)
                throw new Error(`Could not calculate a valid price for productId ${item.productId}`);

            const quantity = parseInt(item.quantity);
            if (isNaN(quantity) || quantity <= 0)
                throw new Error(`Invalid quantity "${item.quantity}" for productId ${item.productId}`);

            let productName = null;
            let productImage = null;
            let variantLabel = null;
            let selectedSubOption = item.selectedSubOption || null;

            if (!item.productId) {
                throw new Error('productId is required for every order item');
            }

            const product = await Product.findByPk(item.productId, {
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!product) {
                throw new Error(`Product not found with ID ${item.productId}`);
            }

            let inventoryItem = product;
            let inventoryName = `product "${product.name}"`;

            if (item.variantId) {
                const variant = await ProductVariant.findOne({
                    where: { id: item.variantId, productId: item.productId },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                if (variant) {
                    inventoryItem = variant;
                    inventoryName = `selected variant "${variant.variantValue || variant.id}"`;
                    if (!variantLabel) {
                        variantLabel = [variant.variantType, variant.variantValue].filter(Boolean).join(': ') || null;
                    }
                }
            }
            if (!item.variantId || inventoryItem === product) {
                const variants = await ProductVariant.findAll({ where: { productId: item.productId }, transaction: t });
                const selectableVariants = variants.filter(v => v.variantType && v.variantValue && (v.status === undefined || v.status === true || v.status === 1));
                if (selectableVariants.length > 0) {
                    const chosenVariant = selectableVariants.find(v => Number(v.stock || 0) >= quantity) || selectableVariants[0];
                    item.variantId = chosenVariant.id;
                    inventoryItem = chosenVariant;
                    inventoryName = `variant "${chosenVariant.variantValue || chosenVariant.id}"`;
                    if (!variantLabel) {
                        variantLabel = [chosenVariant.variantType, chosenVariant.variantValue].filter(Boolean).join(': ') || null;
                    }
                }
            }

            const availableStock = Number(inventoryItem.stock || 0);
            const isItemPreorder = Boolean(item.isPreorder) || (availableStock < quantity);
            if (isItemPreorder) {
                hasPreorderItem = true;
            }

            if (!isItemPreorder && availableStock < quantity) {
                throw new Error(`Sufficient stock is not available for ${inventoryName}. Remaining stock: ${availableStock}`);
            }

            // Reduce stock to max(0, stock - qty) and increase salesStock
            const remainingStock = Math.max(0, availableStock - quantity);
            const currentSales = Number(inventoryItem.salesStock || 0);

            await inventoryItem.update({
                stock: remainingStock,
                salesStock: currentSales + quantity
            }, { transaction: t });

            if (!productName) {
                productName = product.name;
                productImage = item.variantId && inventoryItem.mainImage ? inventoryItem.mainImage : product.mainImage;
            }

            const mrpPrice = Number(calculatedLine?.mrpPrice) || salesPrice;

            itemsWithSnapshot.push({
                orderId:      customId,
                productId:    item.productId || null,
                variantId:    item.variantId || null,
                selectedSubOption,
                isPreorder:   isItemPreorder,
                salesPrice,
                mrpPrice,
                promotionSource: calculatedLine?.promotionSource || null,
                promotionLabel: calculatedLine?.promotionLabel || null,
                promotionDiscountType: calculatedLine?.promotionDiscountType || null,
                promotionDiscountValue: calculatedLine?.promotionDiscountValue || null,
                quantity,
                productName,
                productImage,
                variantLabel
            });
        }

        if (hasPreorderItem && !orderIsPreorder) {
            await Order.update({ isPreorder: true }, { where: { orderId: customId }, transaction: t });
        }

        await OrderSlot.bulkCreate(itemsWithSnapshot, { transaction: t });
        if (guest) await require('../utils/sessionSecurity').grantOrder(req, customId, t);
        await t.commit();

        if (couponId) {
            await couponController.incrementUsage(couponId);
        }

        // Asynchronous luxury email and SMS notification
        setImmediate(async () => {
            let customer = null;
            try {
                const fullOrder = await Order.findOne({
                    where: { orderId: customId },
                    include: [
                        { model: Customer, attributes: ['id', 'name', 'email', 'phone'], required: false },
                        {
                            model: OrderSlot,
                            as: 'slots',
                            include: [{ model: Product, attributes: ['name', 'mainImage'], required: false }]
                        },
                        { model: ShippingAddress, as: 'orderShipping', required: false }
                    ]
                });
                if (fullOrder) {
                    await sendOrderNotificationEmail(fullOrder, 'Pending');
                }
            } catch (mailErr) {
                console.error('Order confirmation mail error:', mailErr.message);
            }

            // SMS: Order placed
            try {
                const customerPhone = snapPhone || custRecord?.phone;
                if (customerPhone) {
                    const smsResult = await sms.sendOrderPlacedSMS(customerPhone, customId);
                    if (!smsResult.success) {
                        console.error(`Order placed SMS rejected for order ${customId}:`, smsResult.error);
                    }
                }
            } catch (smsErr) {
                console.error('Order placed SMS error:', smsErr.message);
            }
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully!',
            orderId: customId,
            order: {
                id: customId,
                orderId: customId,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                totalAmount: serverCalculatedTotal,
                discountAmount: serverDiscountAmount || 0,
                shippingAmount: verifiedShippingAmount,
                shippingType: verifiedShippingType,
                giftWrap: Boolean(giftWrap),
                paymentMethod: paymentMethod || 'Online',
                paymentStatus: 'Paid',
                paymentId: paymentId || null,
                razorpayOrderId: razorpayOrderId || null,
                orderStatus: 'Pending',
                snapName,
                snapPhone,
                snapAddressLine,
                snapCity,
                snapDistrict,
                snapState,
                snapPincode,
                createdAt: createdOrder.createdAt,
                slots: itemsWithSnapshot
            }
        });

    } catch (err) {
        await t.rollback();
        console.error('Order Placement Error:', err.message);
        if (err.errors) err.errors.forEach(e => console.error('  Validation:', e.path, e.message));
        res.status(500).json({
            error:   err.message,
            details: err.errors?.map(e => ({ field: e.path, message: e.message })) || []
        });
    }
};

// 2. GET ALL ORDERS (Admin)
exports.getAllOrders = async (req, res) => {
    try {
        const { status, search, page = 1, filter, customerId, startDate, endDate, paymentMethod, isPreorder } = req.query;
        const limit  = Math.min(Math.max(Number(req.query.limit) || 10, 1), 1000);
        const offset = (Number(page) - 1) * limit;

        let whereCondition = {};
        if (status === 'Pre-Booking' || isPreorder === 'true' || isPreorder === true) {
            // Include legacy orders where the parent flag was not set but one or more items were pre-booked.
            whereCondition[Op.or] = [
                { isPreorder: true },
                sequelize.literal('EXISTS (SELECT 1 FROM orderslots AS preorderSlots WHERE preorderSlots.orderId = `Order`.orderId AND preorderSlots.isPreorder = 1)')
            ];
        } else if (status && status !== 'All') {
            whereCondition.orderStatus = status;
        }
        if (isPreorder === 'false' || isPreorder === false) {
            whereCondition.isPreorder = false;
        }
        if (paymentMethod && paymentMethod !== 'All') {
            if (paymentMethod === 'Online') {
                whereCondition.paymentMethod = { [Op.or]: ['Online Payment', 'Online', 'Online Payment (HDFC)', 'HDFC'] };
            } else if (paymentMethod === 'COD') {
                whereCondition.paymentMethod = { [Op.or]: ['COD', 'Cash on Delivery', 'Cash On Delivery'] };
            } else {
                whereCondition.paymentMethod = paymentMethod;
            }
        }
        if (customerId) whereCondition.customerId = customerId;
        if (search && search.trim()) {
            const rawSearch = search.trim();
            const s = `%${rawSearch}%`;
            const matchingCustomers = await Customer.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: s } },
                        { phone: { [Op.like]: s } },
                        { email: { [Op.like]: s } }
                    ]
                },
                attributes: ['id'],
                paranoid: false
            });
            const customerIds = matchingCustomers.map(c => c.id);

            const searchOr = [
                { orderId: { [Op.like]: s } },
                { trackingId: { [Op.like]: s } },
                { snapName: { [Op.like]: s } },
                { snapPhone: { [Op.like]: s } },
                { snapEmail: { [Op.like]: s } },
                { snapCity: { [Op.like]: s } },
                { snapDistrict: { [Op.like]: s } },
                { guestEmail: { [Op.like]: s } }
            ];

            if (customerIds.length > 0) {
                searchOr.push({ customerId: { [Op.in]: customerIds } });
            }

            whereCondition[Op.or] = searchOr;
        }

        if (filter === 'today') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            if (status === 'Delivered') {
                whereCondition.updatedAt = { [Op.between]: [startOfDay, endOfDay] };
            } else {
                whereCondition.createdAt = { [Op.between]: [startOfDay, endOfDay] };
            }
        } else if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                dateFilter[Op.gte] = s;
            }
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = e;
            }
            whereCondition.createdAt = dateFilter;
        }

        const { count, rows } = await Order.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: Customer,
                    attributes: ['id', 'name', 'email', 'phone'],
                    paranoid: false,
                    include: [{ model: CustomerAddress, required: false, paranoid: false }]
                },
                { model: ShippingAddress, as: 'orderShipping', required: false },
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{ model: Product, attributes: ['name', 'mainImage'], required: false, paranoid: false }]
                },
                { model: Coupon, as: 'appliedCoupon', required: false }
            ],
            limit, offset, distinct: true,
            order: [['createdAt', 'DESC']]
        });

        const ordersWithSnap = rows.map(o => {
            const plain = o.toJSON();
            plain.isPreorder = Boolean(plain.isPreorder) || (plain.slots || []).some(slot => Boolean(slot.isPreorder));
            plain.shippingSnapshot = resolveShipping(o);
            if (plain.Customer && plain.Customer.email) {
                plain.Customer.email = plain.Customer.email.replace(/_deleted_d+/, '');
            }
            return plain;
        });

        res.json({
            orders:      ordersWithSnap,
            totalPages:  Math.ceil(count / limit),
            totalOrders: count
        });

    } catch (error) {
        console.error('Fetch Orders Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// 3. GET ORDERS BY CUSTOMER
exports.getOrdersByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        const orders = await Order.findAll({
            where: { customerId },
            include: [
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{
                        model: Product,
                        attributes: ['name', 'mainImage'],
                        required: false,
                        paranoid: false
                    }]
                },
                { model: ShippingAddress, as: 'orderShipping', required: false },
                {
                    model: Customer,
                    attributes: ['id', 'name', 'email', 'phone'],
                    include: [{ model: CustomerAddress, required: false, paranoid: false }]
                },
                { model: Coupon, as: 'appliedCoupon', required: false }
            ],
            order: [['createdAt', 'DESC']]
        });

        const orderIds = orders.map(o => o.orderId);

        const existingReviews = await Review.findAll({
            where: {
                customerId,
                orderId: { [Op.in]: orderIds }
            },
            attributes: ['id', 'orderId', 'productId', 'rating', 'feedback']
        });

        const reviewsMap = {};
        existingReviews.forEach(r => {
            reviewsMap[`${r.orderId}_${r.productId}`] = {
                id: r.id,
                rating: r.rating,
                feedback: r.feedback
            };
        });

        const formatted = orders.map(o => ({
            id:                 o.orderId,
            orderId:            o.orderId,
            customerId:         o.customerId,
            customerType:       o.customerType,
            paymentId:          o.paymentId,
            razorpayOrderId:    o.razorpayOrderId,
            shippingType:       o.shippingType,
            giftWrap:           o.giftWrap,
            createdAt:          o.createdAt,
            status:             o.orderStatus,
            orderStatus:        o.orderStatus,
            isPreorder:         Boolean(o.isPreorder),
            courierPartner:     o.courierPartner,
            awb_code:           o.awb_code,
            tracking_url:       o.tracking_url,
            cancellationStatus: o.cancellationStatus,
            cancellationReason: o.cancellationReason,
            totalAmount:        o.totalAmount,
            discountAmount:     o.discountAmount  || 0,
            shippingAmount:     o.shippingAmount  || 0,
            paymentMethod:      o.paymentMethod,
            paymentStatus:      o.paymentStatus,
            couponCode:         o.appliedCoupon?.code || null,
            guestEmail:         o.guestEmail,
            snapName:           o.snapName,
            snapPhone:          o.snapPhone,
            snapAddressLine:    o.snapAddressLine,
            snapCity:           o.snapCity,
            snapDistrict:       o.snapDistrict,
            snapState:          o.snapState,
            snapPincode:        o.snapPincode,
            Customer:           o.Customer ? { id: o.Customer.id, name: o.Customer.name, email: o.Customer.email, phone: o.Customer.phone } : null,
            customerName:       o.snapName || o.Customer?.name || 'Customer',
            customerEmail:      o.Customer?.email || o.guestEmail || null,
            customerPhone:      o.snapPhone || o.Customer?.phone || null,
            shippingSnapshot:   resolveShipping(o),
            items: (o.slots || []).map(slot => {
                const reviewData = reviewsMap[`${o.orderId}_${slot.productId}`];
                return {
                    productId:    slot.productId,
                    variantId:    slot.variantId || null,
                    productName:  slot.Product?.name      || slot.productName  || `Product ${slot.productId || '?'}`,
                    productImage: slot.Product?.mainImage || slot.productImage || null,
                    variantLabel: slot.variantLabel || null,
                    selectedSubOption: slot.selectedSubOption || null,
                    isPreorder:   Boolean(slot.isPreorder),
                    quantity:     slot.quantity,
                    salesPrice:   slot.salesPrice,
                    mrpPrice:     slot.mrpPrice || slot.salesPrice,
                    finalPrice:   slot.finalPrice || slot.salesPrice,
                    promotionSource: slot.promotionSource || null,
                    promotionLabel: slot.promotionLabel || null,
                    promotionDiscountType: slot.promotionDiscountType || null,
                    promotionDiscountValue: slot.promotionDiscountValue || null,
                    hasReview:    !!reviewData,
                    _reviewId:     reviewData?.id || null,
                    _reviewRating: reviewData?.rating || null,
                    _reviewText:   reviewData?.feedback || null
                };
            })
        }));

        res.json(formatted);

    } catch (error) {
        console.error('Customer Orders Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// 4. UPDATE ORDER STATUS (Admin)
exports.updateStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { orderStatus } = req.body;
        const { id } = req.params;

        const validStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(orderStatus)) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const order = await Order.findOne({
            where: { orderId: String(id).trim() },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const currentStatus = order.orderStatus;

        if (currentStatus === orderStatus) {
            await t.rollback();
            return res.json({ success: true, message: `Order status is already ${orderStatus}` });
        }

        await order.update({ orderStatus }, { transaction: t });
        await t.commit();

        // Send Rich Order Email & SMS with Product Pictures & All Details
        setImmediate(async () => {
            try {
                const fullOrder = await Order.findOne({
                    where: { orderId: order.orderId },
                    include: [
                        { model: Customer, attributes: ['id', 'name', 'email', 'phone'], required: false },
                        {
                            model: OrderSlot,
                            as: 'slots',
                            include: [{ model: Product, attributes: ['name', 'mainImage'], required: false }]
                        },
                        { model: ShippingAddress, as: 'orderShipping', required: false }
                    ]
                });

                if (fullOrder) {
                    await sendOrderNotificationEmail(fullOrder, orderStatus);
                }
            } catch (mailErr) {
                console.error(`Order status mail failed for order ${order.orderId}:`, mailErr.message);
            }

            try {
                const customerPhone = order.snapPhone || order.Customer?.phone;
                if (customerPhone) {
                    const orderIdStr = order.orderId;
                    let smsResult = null;
                    if (orderStatus === 'Confirmed') {
                        smsResult = await sms.sendOrderConfirmedSMS(customerPhone, orderIdStr, order.totalAmount);
                    } else if (orderStatus === 'Shipped') {
                        smsResult = await sms.sendOrderShippedSMS(customerPhone, orderIdStr);
                    }
                    if (smsResult && !smsResult.success) {
                        console.error(`Order status SMS rejected for order ${order.orderId}:`, smsResult.error);
                    }
                }
            } catch (smsErr) {
                console.error(`Order status SMS failed for order ${order.orderId}:`, smsErr.message);
            }
        });

        res.json({ success: true, message: `Order status updated to ${orderStatus}` });

    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

// 4a. BULK UPDATE ORDER STATUS (Admin)
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { orderIds, orderStatus } = req.body;
        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Please select at least one order to update' });
        }

        const validStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const cleanIds = orderIds.map(id => String(id).trim());
        const orders = await Order.findAll({
            where: { orderId: { [Op.in]: cleanIds } }
        });

        if (orders.length === 0) {
            return res.status(404).json({ error: 'No matching orders found' });
        }

        const t = await sequelize.transaction();
        try {
            await Order.update(
                { orderStatus },
                { where: { orderId: { [Op.in]: cleanIds } }, transaction: t }
            );
            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }

        // Asynchronously send emails/SMS notifications
        setImmediate(async () => {
            for (const ord of orders) {
                if (ord.orderStatus === orderStatus) continue;
                try {
                    const fullOrder = await Order.findOne({
                        where: { orderId: ord.orderId },
                        include: [
                            { model: Customer, attributes: ['id', 'name', 'email', 'phone'], required: false },
                            {
                                model: OrderSlot,
                                as: 'slots',
                                include: [{ model: Product, attributes: ['name', 'mainImage'], required: false }]
                            },
                            { model: ShippingAddress, as: 'orderShipping', required: false }
                        ]
                    });
                    if (fullOrder) {
                        await sendOrderNotificationEmail(fullOrder, orderStatus);
                    }
                } catch (mailErr) {
                    console.error(`Bulk status mail error for order ${ord.orderId}:`, mailErr.message);
                }

                try {
                    const customerPhone = ord.snapPhone || ord.Customer?.phone;
                    if (customerPhone) {
                        if (orderStatus === 'Confirmed') {
                            await sms.sendOrderConfirmedSMS(customerPhone, ord.orderId, ord.totalAmount);
                        } else if (orderStatus === 'Shipped') {
                            await sms.sendOrderShippedSMS(customerPhone, ord.orderId);
                        }
                    }
                } catch (smsErr) {
                    console.error(`Bulk status SMS error for order ${ord.orderId}:`, smsErr.message);
                }
            }
        });

        res.json({
            success: true,
            message: `Successfully updated ${cleanIds.length} order(s) to ${orderStatus}`,
            updatedCount: cleanIds.length
        });

    } catch (err) {
        console.error('Bulk Status Update Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 4b. TRACK ORDER (Customer & Guest Lookup)
exports.trackOrder = async (req, res) => {
    try {
        const { orderIdentifier } = req.params;
        if (!orderIdentifier) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        const trimmed = String(orderIdentifier).trim().replace(/^#/, '');

        const order = await Order.findOne({
            where: { orderId: trimmed },
            include: [
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{
                        model: Product,
                        attributes: ['id', 'name', 'mainImage'],
                        required: false,
                        paranoid: false
                    }]
                },
                { model: Customer, attributes: ['id', 'name', 'email', 'phone'], required: false },
                { model: ShippingAddress, as: 'orderShipping', required: false }
            ]
        });

        if (!order) {
            return res.status(404).json({ error: 'No order found with this Order ID.' });
        }

        const shipping = resolveShipping(order);

        res.json({
            success: true,
            order: {
                id: order.orderId,
                orderId: order.orderId,
                customerId: order.customerId,
                customerType: order.customerType,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                paymentId: order.paymentId || null,
                razorpayOrderId: order.razorpayOrderId || null,
                totalAmount: order.totalAmount,
                discountAmount: order.discountAmount || 0,
                shippingAmount: order.shippingAmount || 0,
                shippingType: order.shippingType,
                giftWrap: order.giftWrap,
                courierPartner: order.courierPartner,
                awb_code: order.awb_code,
                tracking_url: order.tracking_url,
                guestEmail: order.guestEmail,
                Customer: order.Customer ? { id: order.Customer.id, name: order.Customer.name, email: order.Customer.email, phone: order.Customer.phone } : null,
                customerName: shipping?.name || order.snapName || order.Customer?.name || 'Customer',
                customerEmail: order.Customer?.email || order.guestEmail || shipping?.email || null,
                customerPhone: shipping?.phone || order.snapPhone || order.Customer?.phone || null,
                shippingAddress: shipping,
                shippingSnapshot: shipping,
                items: (order.slots || []).map(slot => ({
                    productId: slot.productId,
                    variantId: slot.variantId || null,
                    productName: slot.Product?.name || slot.productName || 'Jewellery Item',
                    productImage: slot.Product?.mainImage || slot.productImage || null,
                    salesPrice: slot.salesPrice,
                    mrpPrice: slot.mrpPrice || slot.salesPrice,
                    promotionSource: slot.promotionSource || null,
                    promotionLabel: slot.promotionLabel || null,
                    promotionDiscountType: slot.promotionDiscountType || null,
                    promotionDiscountValue: slot.promotionDiscountValue || null,
                    quantity: slot.quantity,
                    variantLabel: slot.variantLabel || null,
                    selectedSubOption: slot.selectedSubOption || null,
                    isPreorder: Boolean(slot.isPreorder)
                }))
            }
        });
    } catch (err) {
        console.error('Track order error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve tracking details' });
    }
};

// 5. DELETE ORDER
exports.deleteOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const order = await Order.findOne({
            where: { orderId: String(id).trim() },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        await OrderSlot.destroy({ where: { orderId: order.orderId }, transaction: t });
        await Review.update({ orderId: null }, { where: { orderId: order.orderId }, transaction: t });
        await order.destroy({ transaction: t });
        await t.commit();

        res.json({ success: true, message: 'Order and its history deleted successfully' });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

// 6. DASHBOARD RECENT ORDERS
exports.getRecentOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: Customer,        attributes: ['id', 'name', 'email', 'phone'], required: false, paranoid: false },
                { model: ShippingAddress, as: 'orderShipping',                          required: false },
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{ model: Product, attributes: ['name', 'mainImage'], required: false, paranoid: false }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        const ordersWithSnap = orders.map(o => {
            const plain = o.toJSON();
            plain.shippingSnapshot = resolveShipping(o);
            if (plain.Customer && plain.Customer.email) {
                plain.Customer.email = plain.Customer.email.replace(/_deleted_d+/, '');
            }
            return plain;
        });

        res.json({ orders: ordersWithSnap });
    } catch (error) {
        console.error('Recent Orders Error:', error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};

// 7. COURIER SETTLEMENT & SHIPPING COST TRACKING
exports.updateCourierSettlement = async (req, res) => {
    try {
        const { orderIds, courierPaymentStatus, courierShippingCost } = req.body;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, error: 'orderIds array is required' });
        }

        if (!['Paid', 'Unpaid'].includes(courierPaymentStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid courierPaymentStatus. Use Paid or Unpaid.' });
        }

        const updateData = {
            courierPaymentStatus,
            courierSettlementDate: courierPaymentStatus === 'Paid' ? new Date() : null
        };

        if (courierShippingCost !== undefined) {
            updateData.courierShippingCost = Number(courierShippingCost);
        }

        await Order.update(updateData, {
            where: {
                orderId: orderIds
            }
        });

        res.status(200).json({
            success: true,
            message: `Successfully updated settlement status to ${courierPaymentStatus} for ${orderIds.length} orders.`
        });
    } catch (error) {
        console.error('Update Settlement Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCourierSettlementSummary = async (req, res) => {
    try {
        const { range, startDate, endDate, courierPartner } = req.query;
        let dateFilter = '';
        const replacements = {};

        if (range === 'weekly') {
            dateFilter = 'AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        } else if (range === 'monthly') {
            dateFilter = 'AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        } else if (range === 'yearly') {
            dateFilter = 'AND createdAt >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
        } else if (range === 'custom' && startDate && endDate) {
            dateFilter = 'AND createdAt BETWEEN :startDate AND :endDate';
            replacements.startDate = new Date(startDate);
            replacements.endDate = new Date(endDate);
        }

        let partnerFilter = '';
        if (courierPartner) {
            partnerFilter = 'AND courierPartner = :courierPartner';
            replacements.courierPartner = courierPartner;
        }

        const query = `
            SELECT 
                courierPartner,
                COUNT(*) AS totalOrders,
                COALESCE(SUM(courierShippingCost), 0) AS totalCost,
                COALESCE(SUM(CASE WHEN courierPaymentStatus = 'Paid' THEN courierShippingCost ELSE 0 END), 0) AS totalPaid,
                COALESCE(SUM(CASE WHEN courierPaymentStatus = 'Unpaid' THEN courierShippingCost ELSE 0 END), 0) AS totalPending
            FROM orders
            WHERE courierPartner IS NOT NULL ${dateFilter} ${partnerFilter}
            GROUP BY courierPartner
        `;

        const summary = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const detailsQuery = `
            SELECT 
                orderId,
                customerId,
                totalAmount,
                orderStatus,
                courierPartner,
                awb_code,
                courierShippingCost,
                courierPaymentStatus,
                courierSettlementDate,
                createdAt
            FROM orders
            WHERE courierPartner IS NOT NULL ${dateFilter} ${partnerFilter}
            ORDER BY createdAt DESC
        `;

        const orders = await sequelize.query(detailsQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.status(200).json({
            success: true,
            summary,
            orders
        });
    } catch (error) {
        console.error('Settlement Summary Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.sendOrderNotificationEmail = sendOrderNotificationEmail;
exports.resolveShipping = resolveShipping;
