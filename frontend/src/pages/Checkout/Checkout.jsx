import React, { useContext, useState, useEffect, useCallback } from 'react';
import usePromotionRevision from '../../hooks/usePromotionRevision';
import { 
  FiCreditCard, FiCheckCircle, FiUserPlus, FiUser, FiMapPin, 
  FiEdit2, FiPlus, FiAlertCircle, FiShoppingBag, FiArrowRight,
  FiDownload, FiPrinter, FiPackage, FiPhone, FiMail, FiGlobe, FiTruck, FiGift, FiShield, FiTag,
  FiLock, FiCheck, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { RiSparkling2Line } from 'react-icons/ri';
import { ShopContext } from '../../context/ShopContext';
import PageBanner from '../../components/PageBanner/PageBanner';
import axios from 'axios';
import { toast } from 'react-toastify';
import { COUNTRIES } from '../../utils/countries';
import './Checkout.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    const timeout = setTimeout(() => { script.remove(); resolve(false); }, 15000);
    script.onload = () => { clearTimeout(timeout); resolve(typeof window.Razorpay === 'function'); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); resolve(false); };
    document.body.appendChild(script);
  });
};

const downloadCustomerInvoice = (order) => {
  if (!order) return;
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups in your browser to view and download your invoice.');
    return;
  }

  const itemsHtml = (order.items || []).map((item, idx) => {
    const rawImg = item.productImage || item.image || item.mainImage;
    const pImage = rawImg
      ? (rawImg.startsWith('http') || rawImg.startsWith('/') ? rawImg : `${API_BASE}/uploads/${rawImg}`)
      : '/assests/pr1.jpeg';
    const price = Number(item.salesPrice ?? item.mrpPrice ?? 0);
    const qty = Number(item.quantity || 1);
    const lineTotal = price * qty;

    return `
      <tr>
        <td style="text-align:center;color:#4b5563;width:45px;font-weight:600;">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <img src="${pImage}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;flex-shrink:0" onError="this.style.display='none'"/>
            <div>
               <div style="font-weight:700;color:#12382e;font-size:13px">${item.productName || 'Jewellery Item'}</div>
               ${item.variantLabel ? `<div style="font-size:11.5px;color:#6b7280;margin-top:2px;">${item.variantLabel}</div>` : ''}
               ${item.promotionSource ? `<div style="font-size:11.5px;color:#a16207;margin-top:3px;font-weight:700;">${item.promotionSource === 'Offer Banner' ? 'SPECIAL OFFER' : 'DEAL'}: ${item.promotionLabel || 'Promotion'} · ${item.promotionDiscountType === 'FLAT' ? `₹${Number(item.promotionDiscountValue || 0).toLocaleString('en-IN')} OFF` : `${item.promotionDiscountValue || item.discountPercentage || 0}% OFF`}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="text-align:center;width:60px;font-weight:600;">${qty}</td>
        <td style="text-align:right;width:110px">₹${price.toLocaleString('en-IN')}</td>
        <td style="text-align:right;font-weight:700;color:#12382e;width:120px">₹${lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  const addr = order.address || {};
  const fullAddress = [addr.line, addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ');

  const rawId = String(order.orderId || order.id || '');
  const cleanInvoiceId = rawId.replace(/^SE-/, 'BJ-').replace(/^#+/, '');
  const displayInvoiceNo = cleanInvoiceId.startsWith('BJ-') ? cleanInvoiceId : `BJ-${cleanInvoiceId}`;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tax Invoice - ${displayInvoiceNo} - Baani Jewels</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; font-size: 12.5px; line-height: 1.5; padding: 26px 30px; -webkit-font-smoothing: antialiased; }
    .inv-card { max-width: 820px; margin: 0 auto; background: #fff; }
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #12382e; padding-bottom: 18px; margin-bottom: 24px; }
    .brand-wrap { display: flex; flex-direction: column; }
    .brand-title { font-size: 26px; font-weight: 700; color: #12382e; letter-spacing: 1.5px; font-family: 'Playfair Display', Georgia, serif; line-height: 1.1; }
    .brand-sub { font-size: 10.5px; color: #b45309; text-transform: uppercase; font-weight: 700; letter-spacing: 2px; margin-top: 4px; }
    .company-meta { font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6; }
    .inv-meta { text-align: right; }
    .inv-title { display: inline-block; background: #12382e; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 6px; }
    .inv-meta-row { font-size: 12px; color: #475569; margin-top: 2px; }
    .inv-meta-row strong { color: #0f172a; font-weight: 600; }
    .badge-paid { display: inline-block; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-top: 6px; text-transform: uppercase; }
    
    .addresses-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .addr-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; background: #fafaf9; }
    .addr-box h4 { font-size: 11px; font-weight: 800; color: #12382e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .addr-box p { font-size: 12.5px; color: #374151; margin-bottom: 3px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #12382e; color: #fff; }
    th { padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #fff; }
    th.right, td.right { text-align: right; }
    th.center, td.center { text-align: center; }
    td { padding: 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    
    .summary-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .summary-table { width: 320px; border-collapse: collapse; font-size: 13px; }
    .summary-table td { padding: 7px 12px; border: none; border-bottom: 1px solid #f3f4f6; }
    .summary-table tr.grand-row td { background: #12382e; color: #fff; font-weight: 800; font-size: 15px; border-radius: 6px; padding: 10px 12px; border: none; }
    .summary-table tr.grand-row td span { color: #facc15; }
    
    .footer { border-top: 1px solid #e5e7eb; padding-top: 18px; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .footer strong { color: #12382e; }
    @media print {
      body { padding: 0; }
      .inv-card { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="inv-card">
    <div class="inv-header">
      <div class="brand-wrap">
        <div class="brand-title">BAANI JEWELS</div>
        <div class="brand-sub">Luxury Made Affordable</div>
        <div class="company-meta">
          Proudly Based in Chennai, Tamil Nadu, India<br/>
          Phone: +91 93453 22621 &nbsp;|&nbsp; WhatsApp: +91 93453 22621<br/>
          Email: Baanijewels.ind@gmail.com
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-title">OFFICIAL TAX INVOICE</div>
        <div class="inv-meta-row"><strong>Invoice No:</strong> ${displayInvoiceNo}</div>
        <div class="inv-meta-row"><strong>Date:</strong> ${order.date || new Date().toLocaleDateString('en-IN')}</div>
        <div class="inv-meta-row"><strong>Payment:</strong> ${order.paymentMethod || 'Online (Razorpay)'}</div>
        ${order.paymentId ? `<div class="inv-meta-row"><strong>Transaction ID:</strong> ${order.paymentId}</div>` : ''}
        <div><span class="badge-paid">Payment Status: PAID</span></div>
      </div>
    </div>

    <div class="addresses-grid">
      <div class="addr-box">
        <h4>Customer Information</h4>
        <p><strong>${order.name}</strong></p>
        <p>Phone: ${order.phone || '—'}</p>
        <p>Email: ${order.email || '—'}</p>
      </div>
      <div class="addr-box">
        <h4>Delivery Address</h4>
        <p><strong>${order.name}</strong></p>
        <p>Phone: ${order.phone || '—'}</p>
        <p>${fullAddress || 'Delivery address on record'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:50px;text-align:center">S.No</th>
          <th style="text-align:left">Item Description</th>
          <th class="center" style="width:60px">Qty</th>
          <th class="right" style="width:110px">Unit Price</th>
          <th class="right" style="width:120px">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td>Subtotal</td>
          <td class="right">₹${Number(order.subtotal || order.total).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Shipping (${order.shippingType || 'Standard Delivery'})</td>
          <td class="right">${Number(order.shippingAmount || 0) <= 0 ? 'FREE' : `₹${Number(order.shippingAmount).toLocaleString('en-IN')}`}</td>
        </tr>
        ${order.giftWrap ? `
          <tr>
            <td>Luxury Gift Wrapping</td>
            <td class="right">₹30</td>
          </tr>
        ` : ''}
        <tr class="grand-row">
          <td>TOTAL PAID</td>
          <td class="right"><span>₹${Number(order.total).toLocaleString('en-IN')}</span></td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <strong>Thank you for your purchase with Baani Jewels!</strong><br/>
      This is a computer-generated tax invoice. No signature is required.<br/>
      For assistance, email Baanijewels.ind@gmail.com or call +91 93453 22621.
    </div>
  </div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 600);
};

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'
];

const renderCheckoutTrackingStepper = (status) => {
  if (status === 'Cancelled') {
    return (
      <div style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', margin: '20px 0' }}>
        <strong>Order Status: Cancelled</strong>
        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>This order has been cancelled.</p>
      </div>
    );
  }

  const stages = [
    { key: 'Pending', label: 'Order Placed' },
    { key: 'Confirmed', label: 'Confirmed' },
    { key: 'Packed', label: 'Packed' },
    { key: 'Shipped', label: 'Shipped' },
    { key: 'Out for Delivery', label: 'Out for Delivery' },
    { key: 'Delivered', label: 'Delivered' }
  ];

  const stageIndexMap = {
    Pending: 0,
    Confirmed: 1,
    Packed: 2,
    Shipped: 3,
    'Out for Delivery': 4,
    Delivered: 5
  };

  const currentIndex = stageIndexMap[status] ?? 0;

  return (
    <div style={{ margin: '20px 0 10px', background: '#ffffff', border: '1px solid #ede8df', borderRadius: '12px', padding: '20px' }}>
      <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#12382e', letterSpacing: '1px', fontWeight: '800', margin: '0 0 16px', borderBottom: '1px solid #f3f0ea', paddingBottom: '8px' }}>
        Live Shipment Tracker
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {stages.map((st, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={st.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              {idx > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  right: '50%',
                  width: '100%',
                  height: '3px',
                  background: idx <= currentIndex ? '#12382e' : '#e5e7eb',
                  zIndex: 1
                }} />
              )}
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: isDone ? '#12382e' : '#fff',
                color: isDone ? '#c9a84c' : '#9ca3af',
                border: isDone ? '2px solid #c9a84c' : '2px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: '12px',
                fontWeight: 'bold',
                position: 'relative',
                zIndex: 2,
                boxShadow: isCurrent ? '0 0 0 4px rgba(201, 168, 76, 0.25)' : 'none'
              }}>
                {isDone ? '✓' : idx + 1}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: isCurrent ? 700 : 500,
                color: isDone ? '#12382e' : '#9ca3af'
              }}>
                {st.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const emptyAddress = { name: '', phone: '', email: '', addressLine: '', city: '', district: '', state: '', pincode: '' };

const Checkout = () => {
  const promotionRevision = usePromotionRevision();
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, cartTotal, customer, token, login, clearCart, refreshGuestOrders } = useContext(ShopContext);

  // Buy Now item from route state
  const routeItem = location.state?.buyNowItem || null;
  const [freshBuyNow, setFreshBuyNow] = useState(null);
  const buyNowItem = freshBuyNow || routeItem;
  useEffect(() => {
    let active = true;
    if (routeItem) axios.get(`${API_BASE}/api/products/${routeItem.id || routeItem.productId}`).then(({ data }) => {
      const variant = (data.variants || []).find(v => Number(v.id) === Number(routeItem.variantId));
      if (active) setFreshBuyNow({ ...routeItem, ...data, ...(variant ? { salesPrice: variant.salesPrice, mrpPrice: variant.mrpPrice } : {}), quantity: routeItem.quantity, variantId: routeItem.variantId });
    }).catch(() => {});
    return () => { active = false; };
  }, [routeItem, promotionRevision]);
  const isBuyNow = Boolean(buyNowItem);
  const checkoutItems = isBuyNow ? [buyNowItem] : cartItems;
  const checkoutTotal = isBuyNow
    ? Number(buyNowItem.salesPrice ?? buyNowItem.mrpPrice ?? buyNowItem.price ?? 0) * Math.max(1, Number(buyNowItem.quantity) || 1)
    : cartTotal;

  // Steps: auth-choice | register-form | login-form | otp | password | address | payment
  const [step, setStep] = useState('address');

  const [authData, setAuthData] = useState({ name: '', email: '', phone: '', otp: '', password: '', confirmPassword: '' });
  const [countryCode, setCountryCode] = useState('+91');
  const [deliveryCountry, setDeliveryCountry] = useState('India');
  const [isGiftWrap, setIsGiftWrap] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null); // null = new address
  const [addrForm, setAddrForm] = useState(emptyAddress);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeMsg, setPincodeMsg] = useState('');
  const [pincodeAreas, setPincodeAreas] = useState([]);
  const [showNewAddrForm, setShowNewAddrForm] = useState(false);
  const [shippingQuote, setShippingQuote] = useState({ amount: 0, zoneName: 'Standard Delivery', ready: false, loading: false, error: '', isFreeShipping: false, zoneAmount: 0 });

  // Coupon state
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCouponList, setShowCouponList] = useState(false);

  // Dynamic Shipping & Grand Total
  const shippingInfo = { fee: shippingQuote.amount, type: shippingQuote.zoneName };
  const shippingFee = deliveryCountry === 'India' ? shippingQuote.amount : 0;
  const giftWrapFee = isGiftWrap ? 30 : 0;
  const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountAmount || 0) : 0;
  const grandTotal = Math.max(0, checkoutTotal - couponDiscount + shippingFee + giftWrapFee);

  // Show only coupons that are eligible for the current product subtotal.
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/coupons/list`, {
          params: { productSubtotal: checkoutTotal }
        });
        if (Array.isArray(res.data)) {
          setAvailableCoupons(res.data);
        }
      } catch (err) {
        console.error('Error fetching coupons:', err);
      }
    };
    fetchCoupons();
  }, [checkoutTotal, promotionRevision]);

  useEffect(() => {
    if (!appliedCoupon?.code) return;
    let active = true;
    axios.post(`${API_BASE}/api/coupons/validate`, { code: appliedCoupon.code, productSubtotal: checkoutTotal, guestDetails: { email: addrForm.email, phone: addrForm.phone } })
      .then(({ data }) => { if (active) setAppliedCoupon(previous => previous ? { ...previous, discountAmount: data.data.discountAmount } : null); })
      .catch(error => { if (active) { setAppliedCoupon(null); setCouponSuccess(''); setCouponError(error.response?.data?.message || 'Coupon is no longer available.'); } });
    return () => { active = false; };
  }, [checkoutTotal, promotionRevision, appliedCoupon?.code, addrForm.email, addrForm.phone]);

  const handleApplyCoupon = async (explicitCode = null) => {
    const code = (explicitCode || couponCodeInput || '').trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a valid coupon code.');
      toast.warn('Please enter a valid coupon code.');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const res = await axios.post(`${API_BASE}/api/coupons/validate`, {
        code,
        productSubtotal: checkoutTotal,
        customerId: customer && !customer.isGuest ? customer.id : null,
        guestDetails: { email: addrForm.email, phone: addrForm.phone }
      });
      if (res.data?.success && res.data?.data) {
        setAppliedCoupon({
          id: res.data.data.couponId,
          code: res.data.data.code,
          discountAmount: res.data.data.discountAmount,
          message: res.data.message
        });
        const msg = res.data.message || `Coupon ${code} applied successfully!`;
        setCouponSuccess(msg);
        toast.success(msg);
        setCouponCodeInput('');
        setShowCouponList(false);
      } else {
        const msg = res.data?.message || 'Unable to apply coupon.';
        setCouponError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired coupon for this order.';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
    toast.info('Coupon removed');
  };

  const internationalWhatsAppMessage = [
    'Hello Baani Jewellery,',
    'I would like to place an order for international delivery. Please provide the shipping details and quote.',
    '',
    'Cart details:',
    ...checkoutItems.map((item, index) => {
      const name = item.name || item.productName || 'Jewellery item';
      const quantity = Number(item.quantity || 1);
      const variant = item.variantLabel || item.variantName || '';
      const unitPrice = Number(item.salesPrice ?? item.price ?? item.mrpPrice ?? 0);
      const itemTotal = unitPrice * quantity;
      return `${index + 1}. ${name}${variant ? ` (${variant})` : ''} × ${quantity}${itemTotal > 0 ? ` - ₹${itemTotal.toLocaleString('en-IN')}` : ''}`;
    }),
    '',
    `Subtotal: ₹${Number(checkoutTotal).toLocaleString('en-IN')}`,
    ...(appliedCoupon ? [`Coupon discount (${appliedCoupon.code}): -₹${couponDiscount.toLocaleString('en-IN')}`] : []),
    `Gift wrapping: ${isGiftWrap ? 'Yes (+₹30)' : 'No'}`,
    `Grand Total: ₹${grandTotal.toLocaleString('en-IN')}`,
    '',
    'Thank you!'
  ].join('\n');

  // Check auth on mount / customer change
  useEffect(() => {
    if (customer && !customer.isGuest) {
      setStep('address');
      setAddrForm(prev => ({
        ...prev,
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || ''
      }));
    } else {
      // Both Buy Now and Cart Checkout allow direct Express Guest Checkout:
      setStep('address');
    }
  }, [customer, isBuyNow]);

  // Fetch saved addresses when we reach address step
  useEffect(() => {
    if (step === 'address' && customer?.id) {
      fetchSavedAddresses();
    }
  }, [step, customer]);

  const fetchSavedAddresses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/customers/${customer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const addresses = res.data?.ShippingAddresses || [];
      setSavedAddresses(addresses);
      if (addresses.length > 0) {
        const firstAddress = addresses[0];
        setSelectedAddressId(firstAddress.id);
        setShowNewAddrForm(false);
        setAddrForm({
          name: firstAddress.name || customer?.name || '',
          phone: firstAddress.phone || customer?.phone || '',
          email: customer?.email || '',
          addressLine: firstAddress.addressLine || '',
          city: firstAddress.city || '',
          district: firstAddress.district || '',
          state: firstAddress.state || '',
          pincode: firstAddress.pincode || '',
        });
        handlePincodeChange(firstAddress.pincode || '');
      } else {
        setSelectedAddressId(null);
        setShowNewAddrForm(true);
      }
    } catch (err) {
      setSavedAddresses([]);
      setShowNewAddrForm(true);
    }
  };

  // The server validates the pincode, returns its state, and applies the rate set by admin.
  const handlePincodeChange = useCallback(async (pincode) => {
    setAddrForm(prev => ({ ...prev, pincode }));
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setPincodeLoading(true);
      setPincodeMsg('');
      setShippingQuote({ amount: 0, zoneName: 'Calculating delivery charge...', ready: false, loading: true, error: '' });
      try {
        const { data } = await axios.get(`${API_BASE}/api/shipping/rate`, {
          params: { pincode, country: 'India', subtotal: checkoutTotal, paymentMethod: 'Online' }
        });
        if (data?.success) {
          const areas = data.areas || [];
          setPincodeAreas(areas);
          setAddrForm(prev => ({
            ...prev,
            state: data.state || prev.state,
            district: data.district || prev.district,
            city: areas.includes(prev.city) ? prev.city : (areas[0] || prev.city),
          }));
          setShippingQuote({ amount: Number(data.amount), zoneName: data.zoneName, ready: true, loading: false, error: '', isFreeShipping: Boolean(data.isFreeShipping), zoneAmount: Number(data.zoneAmount || data.amount) });
          setPincodeMsg(data.isFreeShipping
            ? `Delivery: ${data.district}, ${data.state} — FREE (you save ₹${Number(data.zoneAmount || 0)})`
            : `Delivery: ${data.district}, ${data.state} — ₹${Number(data.amount)}`);
        } else {
          throw new Error(data?.message || 'Pincode not found.');
        }
      } catch (error) {
        setPincodeAreas([]);
        const message = error.response?.data?.message || error.message || 'Could not calculate the delivery charge.';
        setShippingQuote({ amount: 0, zoneName: 'Delivery charge unavailable', ready: false, loading: false, error: message });
        setPincodeMsg(message);
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setPincodeAreas([]);
      setPincodeMsg('');
      setShippingQuote({ amount: 0, zoneName: 'Standard Delivery', ready: false, loading: false, error: '' });
    }
  }, [checkoutTotal]);

  const handleAddrChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setAddrForm(prev => ({ ...prev, name: value.replace(/[^a-zA-Z\s]/g, '').slice(0, 35) }));
      return;
    }
    if (name === 'phone') {
      setAddrForm(prev => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    if (name === 'pincode') {
      handlePincodeChange(value.replace(/\D/g, '').slice(0, 6));
    } else {
      setAddrForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setShowNewAddrForm(false);
    setAddrForm({
      name: addr.name || customer?.name || '',
      phone: addr.phone || customer?.phone || '',
      addressLine: addr.addressLine || '',
      city: addr.city || '',
      district: addr.district || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
    });
    handlePincodeChange(addr.pincode || '');
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    // Validate address form
    const name = addrForm.name.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = (addrForm.email || customer?.email || authData.email || '').trim();
    if (!/^[a-zA-Z\s]{3,35}$/.test(name)) return setErrorMsg('Name must contain only letters and spaces, with 3 to 35 characters.');
    if (!/^\d{10}$/.test(addrForm.phone)) return setErrorMsg('Phone must contain exactly 10 digits.');
    if (!emailRegex.test(email)) return setErrorMsg('Enter a valid email address containing @.');
    if (!addrForm.addressLine.trim()) return setErrorMsg('Address is required.');
    if (!addrForm.city.trim()) return setErrorMsg('City is required.');
    if (!addrForm.district.trim()) return setErrorMsg('District is required.');
    if (!addrForm.state) return setErrorMsg('State is required.');
    if (!/^\d{6}$/.test(addrForm.pincode)) return setErrorMsg('Pincode must be 6 digits.');
    if (deliveryCountry === 'India' && !shippingQuote.ready) return setErrorMsg(shippingQuote.error || 'Please wait while we calculate delivery charges.');

    if (customer?.id && !customer.isGuest && (showNewAddrForm || selectedAddressId === null)) {
      try {
        const addrRes = await axios.post(`${API_BASE}/api/customers/add-shipping`, {
          customerId: customer.id,
          name: addrForm.name,
          phone: addrForm.phone,
          addressLine: addrForm.addressLine,
          city: addrForm.city,
          district: addrForm.district,
          state: addrForm.state,
          pincode: addrForm.pincode,
        }, { headers: { Authorization: `Bearer ${token}` } });
        const savedId = addrRes.data?.address?.id || addrRes.data?.id;
        if (savedId) {
          setSelectedAddressId(savedId);
        }
      } catch (err) {
        console.warn('Address save failed:', err.message);
      }
    }
    setStep('payment');
  };

  // ── AUTH HANDLERS ──────────────────────────────────────────────
  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setAuthData(prev => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 15) }));
      return;
    }
    if (name === 'otp') {
      setAuthData(prev => ({ ...prev, otp: value.replace(/\D/g, '').slice(0, 6) }));
      return;
    }
    setAuthData(prev => ({ ...prev, [name]: value }));
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const nameRegex = /^[a-zA-Z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = authData.phone.trim().replace(/\D/g, '');

    if (authData.name.trim().length < 3 || authData.name.trim().length > 30 || !nameRegex.test(authData.name.trim()))
      return setErrorMsg('Name must be 3–30 characters (letters only, no numbers).');
    if (!emailRegex.test(authData.email.trim()))
      return setErrorMsg('Please enter a valid email address.');
    if (phoneDigits.length < 7 || phoneDigits.length > 15)
      return setErrorMsg('Please enter a valid mobile number (7–15 digits).');

    const fullPhone = `${countryCode}${phoneDigits}`;

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/send-register-otp`, {
        name: authData.name.trim(), email: authData.email.trim().toLowerCase(), phone: fullPhone
      });
      toast.success('Registration OTP sent to your email!');
      setStep('otp');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setErrorMsg('');
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/verify-register-otp`, {
        email: authData.email.trim().toLowerCase(),
        otp: authData.otp.trim()
      });
      toast.success('OTP verified successfully!');
      setStep('password');
    } catch (err) {
      const msg = err.response?.data?.message || 'Incorrect OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    }
    finally { setLoading(false); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!authData.password || authData.password.length < 4) {
      const msg = 'Password must be at least 4 characters.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    if (authData.password !== authData.confirmPassword) {
      const msg = 'Passwords do not match!';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    const phoneDigits = authData.phone.trim().replace(/\D/g, '');
    const fullPhone = `${countryCode}${phoneDigits}`;
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/customers/register`, {
        name: authData.name.trim(),
        email: authData.email.trim().toLowerCase(),
        phone: fullPhone,
        password: authData.password
      });
      await login(res.data.customer, res.data.token);
      toast.success('Account created successfully! You are now logged in.');
      setAddrForm(prev => ({
        ...prev,
        name: res.data.customer.name,
        phone: res.data.customer.phone,
        email: res.data.customer.email
      }));
      setStep('address');
    } catch (err) { setErrorMsg(err.response?.data?.message || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!authData.email || !authData.email.includes('@')) return setErrorMsg('Enter a valid email.');
    if (!authData.password || authData.password.length < 4) return setErrorMsg('Password must be at least 4 characters.');
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/customers/login`, {
        email: authData.email.trim().toLowerCase(),
        password: authData.password
      });
      login(res.data.customer, res.data.token);
      setAddrForm(prev => ({
        ...prev,
        name: res.data.customer.name,
        phone: res.data.customer.phone,
        email: res.data.customer.email
      }));
      setStep('address');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCheckout = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (loading) return;
    setLoading(true);

    try {
      setLoading(true);
      const isGuestCheckout = !customer || customer.isGuest;
      const isPreorder = checkoutItems.some(item => Boolean(item.isPreorder) || (item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0));
      const formattedItems = checkoutItems.map(item => ({
        productId: item.id || item.productId,
        productName: item.name || item.productName,
        productImage: item.mainImage || item.image || item.productImage,
        variantId: item.variantId || (Array.isArray(item.variants) && item.variants[0]?.id) || null,
        variantLabel: item.variantLabel || (Array.isArray(item.variants) && item.variants[0]?.variantValue ? `${item.variants[0]?.variantType}: ${item.variants[0]?.variantValue}` : null),
        selectedSubOption: item.selectedSubOption || null,
        salesPrice: Number(item.salesPrice ?? item.mrpPrice ?? item.price ?? 0),
        mrpPrice: Number(item.mrpPrice ?? item.salesPrice ?? item.price ?? 0),
        promotionSource: item.promotionSource || null,
        promotionLabel: item.promotionLabel || null,
        promotionDiscountType: item.promotionDiscountType || null,
        promotionDiscountValue: item.promotionDiscountValue || null,
        quantity: Number(item.quantity || 1),
        isPreorder: Boolean(item.isPreorder) || (item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0)
      }));

      // 1. Create Razorpay order on backend
      const orderCreateRes = await axios.post(`${API_BASE}/api/payment/create-order`, {
        amount: grandTotal,
        items: formattedItems,
        shippingAmount: shippingFee,
        shippingPincode: addrForm.pincode,
        giftWrap: isGiftWrap,
        couponId: appliedCoupon ? appliedCoupon.id : null,
        discountAmount: couponDiscount,
        customerId: isGuestCheckout ? null : customer?.id,
        guestDetails: isGuestCheckout ? { email: addrForm.email, phone: addrForm.phone } : { email: customer?.email, phone: customer?.phone }
      });

      if (!orderCreateRes.data?.success || !orderCreateRes.data?.order) {
        throw new Error(orderCreateRes.data?.message || 'Could not initiate online payment session');
      }

      const razorpayOrder = orderCreateRes.data.order;
      const guestEmail = (addrForm.email || authData.email || 'guest@customer.com').trim().toLowerCase();
      const customerEmail = isGuestCheckout ? guestEmail : (customer?.email || guestEmail);
      const customerName = addrForm.name.trim() || customer?.name || 'Customer';
      const customerPhone = addrForm.phone.trim().replace(/\D/g, '') || customer?.phone || '';


      // Helper to submit order placement to backend
      const executeOrderPlacement = async (paymentId, rzpOrderId) => {
        try {
          setLoading(true);
          let orderRes;
          if (isGuestCheckout) {
            orderRes = await axios.post(`${API_BASE}/api/orders/guest-place`, {
              isGuestCheckout: true,
              customerId: customer?.id || null,
              email: customerEmail,
              phone: customerPhone,
              name: customerName,
              guestDetails: {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                addressLine: addrForm.addressLine.trim(),
                city: addrForm.city.trim(),
                district: addrForm.district ? addrForm.district.trim() : '',
                state: addrForm.state,
                pincode: addrForm.pincode.trim()
              },
              items: formattedItems,
              totalAmount: grandTotal,
              isPreorder: isPreorder,
              shippingAmount: shippingFee,
              shippingType: shippingInfo.type,
              giftWrap: isGiftWrap,
              couponId: appliedCoupon ? appliedCoupon.id : null,
              discountAmount: couponDiscount,
              paymentMethod: 'Online',
              paymentStatus: 'Paid',
              paymentId: paymentId,
              razorpayOrderId: rzpOrderId
            });
          } else {
            orderRes = await axios.post(`${API_BASE}/api/orders/place`, {
              customerId: customer.id,
              email: customerEmail,
              shippingAddressId: selectedAddressId,
              shippingAddress: {
                name: addrForm.name.trim() || customer?.name || 'Customer',
                phone: addrForm.phone.trim().replace(/\D/g, '') || customer?.phone || '',
                addressLine: addrForm.addressLine.trim(),
                city: addrForm.city.trim(),
                district: addrForm.district ? addrForm.district.trim() : '',
                state: addrForm.state,
                pincode: addrForm.pincode.trim()
              },
              address: {
                name: addrForm.name.trim() || customer?.name || 'Customer',
                phone: addrForm.phone.trim().replace(/\D/g, '') || customer?.phone || '',
                addressLine: addrForm.addressLine.trim(),
                city: addrForm.city.trim(),
                district: addrForm.district ? addrForm.district.trim() : '',
                state: addrForm.state,
                pincode: addrForm.pincode.trim()
              },
              items: formattedItems,
              totalAmount: grandTotal,
              isPreorder: isPreorder,
              shippingAmount: shippingFee,
              shippingType: shippingInfo.type,
              giftWrap: isGiftWrap,
              couponId: appliedCoupon ? appliedCoupon.id : null,
              discountAmount: couponDiscount,
              paymentMethod: 'Online',
              paymentStatus: 'Paid',
              paymentId: paymentId,
              razorpayOrderId: rzpOrderId
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }

          if (!isBuyNow) clearCart();

          const placedOrderId = orderRes.data?.order?.orderId || orderRes.data?.orderId || `SE-${Date.now()}`;
          toast.success(`Order placed successfully! (${placedOrderId})`);
          if (isGuestCheckout) await refreshGuestOrders();
          const placedCustomerId = orderRes.data?.order?.customerId || (customer?.id || null);
          const placedCustomerType = orderRes.data?.order?.customerType || 'REGISTERED';
          setOrderPlaced({
            orderId: placedOrderId,
            customerId: placedCustomerId,
            customerType: placedCustomerType,
            orderStatus: 'Pending',
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: {
              line: addrForm.addressLine,
              city: addrForm.city,
              district: addrForm.district,
              state: addrForm.state,
              pincode: addrForm.pincode
            },
            items: orderRes.data?.order?.slots || formattedItems,
            total: Number(orderRes.data?.order?.totalAmount ?? grandTotal),
            subtotal: checkoutTotal,
            discountAmount: Number(orderRes.data?.order?.discountAmount ?? couponDiscount),
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            shippingAmount: shippingFee,
            shippingType: shippingInfo.type,
            giftWrap: isGiftWrap,
            paymentMethod: 'Online (Razorpay)',
            paymentStatus: 'Paid',
            paymentId: paymentId,
            date: new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          });
        } catch (err) {
          console.error('Order placement error after payment:', err);
          setErrorMsg(
            err.response?.data?.error ||
            err.response?.data?.message ||
            `Payment was successful (ID: ${paymentId}), but recording order encountered an issue. Please contact support.`
          );
        } finally {
          setLoading(false);
        }
      };

      if (orderCreateRes.data?.isFree && razorpayOrder.amount === 0) {
        await executeOrderPlacement(razorpayOrder.id, razorpayOrder.id);
        return;
      }
      if (orderCreateRes.data?.isSimulated || String(razorpayOrder.id).startsWith('order_sim_')) {
        throw new Error('Payment gateway returned an invalid order. Please contact support.');
      }
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Payment gateway failed to load. Please retry.');
      const razorpayKey = orderCreateRes.data?.key;
      if (!razorpayKey || typeof window.Razorpay !== 'function') {
        throw new Error('Razorpay is unavailable. Please reload and try again.');
      }

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency || 'INR',
        name: 'Baani Jewels',
        description: isPreorder ? 'Jewellery Pre-Booking Order' : 'Luxury Jewellery Purchase',
        image: `${window.location.origin}/assests/logo_bani.png`,
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            const verification = await axios.post(`${API_BASE}/api/payment/verify`, {
              ...response,
              razorpay_order_id: razorpayOrder.id
            });
            if (!verification.data?.success) throw new Error('Payment verification failed.');
            await executeOrderPlacement(response.razorpay_payment_id, razorpayOrder.id);
          } catch (error) {
            setLoading(false);
            setErrorMsg(error.response?.data?.message || error.message || 'Could not verify payment. Please contact support.');
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone
        },
        notes: {
          address: `${addrForm.addressLine}, ${addrForm.city}, ${addrForm.state} - ${addrForm.pincode}`
        },
        theme: {
          color: '#12382e'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setLoading(false);
          setErrorMsg(resp.error?.description || 'Payment was unsuccessful or cancelled.');
        });
        rzp.open();
      } catch (sdkErr) {
        throw new Error(sdkErr.message || 'Unable to open Razorpay. Please try again.');
      }

    } catch (err) {
      console.error('Payment initialization error:', err);
      setErrorMsg(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Unable to initialize Razorpay checkout. Please try again.'
      );
      setLoading(false);
    }
  };

  if (!isBuyNow && checkoutItems.length === 0 && !orderPlaced) {
    return (
      <div className="checkout-page empty">
        <PageBanner title="Checkout" trail="Checkout" />
        <div className="container">
          <h2>Your cart is empty</h2>
          <button onClick={() => navigate('/shop')} className="btn-return">Return to Shop</button>
        </div>
      </div>
    );
  }

  // ── RENDERERS ──────────────────────────────────────────────────
  const renderAuthChoice = () => (
    <div className="auth-choice-container">
      <h2>How Would You Like to Checkout?</h2>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>
        Proceed directly with Express Guest Checkout or sign in to your Baani account.
      </p>
      <div className="auth-choice-grid">
        <div className="auth-choice-card guest-card" style={{ border: '2px solid #c9a84c' }}>
          <div className="choice-icon" style={{ background: '#fcf8ee', color: '#12382e' }}><FiShoppingBag /></div>
          <h3>Express Guest Checkout</h3>
          <p className="marketing-text"><strong>Fastest checkout — no account or password required!</strong></p>
          <button className="btn-primary" onClick={() => setStep('address')}>Continue as Guest &rarr;</button>
        </div>
        <div className="auth-choice-card register-card">
          <div className="choice-icon"><FiUserPlus /></div>
          <h3>New Customer?</h3>
          <p className="marketing-text">Register to unlock orders tracking, percentage coupons, and easy checkouts.</p>
          <button className="btn-secondary" onClick={() => setStep('register-form')}>Register with OTP</button>
        </div>
        <div className="auth-choice-card guest-card">
          <div className="choice-icon"><FiUser /></div>
          <h3>Already Have An Account?</h3>
          <p>Sign in with your registered email and password to access saved addresses.</p>
          <button className="btn-secondary" onClick={() => setStep('login-form')}>Sign In With Password</button>
        </div>
      </div>
    </div>
  );

  const renderLoginForm = () => (
    <div className="auth-form-container">
      <h2>Sign In to Your Account</h2>
      <p>Enter your registered email and password.</p>
      {errorMsg && <div className="error-alert">{errorMsg}</div>}
      <form onSubmit={handleLoginSubmit} className="auth-form">
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={authData.email}
            onChange={handleAuthChange}
            placeholder="yourname@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={authData.password}
            onChange={handleAuthChange}
            placeholder="6 letters or numbers"
            required
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn-text" onClick={() => setStep('auth-choice')}>Back</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </div>
      </form>
    </div>
  );

  const renderRegisterForm = () => (
    <div className="auth-form-container">
      <h2>Create Your Account</h2>
      <p>Join us for exclusive deals and order tracking.</p>
      {errorMsg && <div className="error-alert">{errorMsg}</div>}
      <form onSubmit={handleRequestOtp} className="auth-form">
        <div className="form-group"><label>Full Name</label>
          <input type="text" name="name" value={authData.name} onChange={handleAuthChange} placeholder="3–30 characters (Letters only)" required /></div>
        <div className="form-group"><label>Email Address</label>
          <input type="email" name="email" value={authData.email} onChange={handleAuthChange} placeholder="Must contain @" required /></div>
        <div className="form-group">
          <label>Mobile Number (Select Country)</label>
          <div className="phone-input-combined">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="country-code-select"
            >
              {COUNTRIES.map((c) => (
                <option key={c.iso + c.code} value={c.code}>{c.flag} {c.country} ({c.code})</option>
              ))}
            </select>
            <input 
              type="tel" 
              name="phone" 
              inputMode="numeric"
              maxLength={15}
              value={authData.phone} 
              onKeyDown={(e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              onChange={handleAuthChange} 
              placeholder="Mobile number (7–15 digits)" 
              required 
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn-text" onClick={() => setStep('auth-choice')}>Back</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send Registration OTP'}</button>
        </div>
      </form>
    </div>
  );

  const renderOtpForm = () => (
    <div className="auth-form-container">
      <h2>Verify Registration OTP</h2>
      <p>An OTP has been sent to <strong>{authData.email}</strong> (Valid for 10 minutes).</p>
      {errorMsg && <div className="error-alert">{errorMsg}</div>}
      <form onSubmit={handleVerifyOtp} className="auth-form">
        <div className="form-group"><label>Enter 6-Digit OTP</label>
          <input 
            type="text" 
            name="otp" 
            inputMode="numeric"
            maxLength={6}
            value={authData.otp} 
            onKeyDown={(e) => {
              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            }}
            onChange={handleAuthChange} 
            placeholder="6-digit OTP" 
            required 
          /></div>
        <div className="form-actions">
          <button type="button" className="btn-text" onClick={() => setStep('register-form')}>Back</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Verifying…' : 'Verify OTP'}</button>
        </div>
      </form>
    </div>
  );

  const renderPasswordForm = () => (
    <div className="auth-form-container">
      <h2>Set Password</h2>
      <p>Create a password to secure your account (minimum 6 characters with letters, numbers, or special characters).</p>
      {errorMsg && <div className="error-alert">{errorMsg}</div>}
      <form onSubmit={handleSetPassword} className="auth-form">
        <div className="form-group"><label>Password (min. 6 characters)</label>
          <input type="password" name="password" value={authData.password} onChange={handleAuthChange} placeholder="Create password" required /></div>
        <div className="form-group"><label>Confirm Password</label>
          <input type="password" name="confirmPassword" value={authData.confirmPassword} onChange={handleAuthChange} placeholder="Retype password" required /></div>
        <div className="form-actions">
          <button type="button" className="btn-text" onClick={() => setStep('otp')}>Back</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</button>
        </div>
      </form>
    </div>
  );

  const renderOrderSummary = () => (
    <aside className="checkout-summary-section" data-aos="fade-left">
      <div className="summary-header">
        <h3 className="summary-title">Order Summary {isBuyNow ? '(Buy Now)' : ''}</h3>
        <span className="summary-items-count">{checkoutItems.length} {checkoutItems.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="checkout-items">
        {checkoutItems.map(item => {
          const finalPrice = item.salesPrice ?? item.mrpPrice ?? item.price ?? 0;
          const rawImg = item.mainImage || item.image || item.productImage;
          const imgSrc = rawImg
            ? (rawImg.startsWith('http') || rawImg.startsWith('/') ? rawImg : `${IMG}${rawImg}`)
            : '/assests/pr1.jpeg';
          const isItemPreorder = Boolean(item.isPreorder) || (item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0);
          const qty = Number(item.quantity || 1);

          return (
            <div className="checkout-item" key={item.id || item.productId}>
              <div className="ci-thumb-wrap">
                <img src={imgSrc} alt={item.name || item.productName} onError={(e) => { e.target.src = '/assests/pr1.jpeg'; }} />
                <span className="ci-qty-badge">+{qty}</span>
              </div>
              <div className="ci-info">
                <div className="ci-name-row">
                  <h4 className="ci-name">{item.name || item.productName}</h4>
                  <span className="ci-qty-pill">Qty: {qty}</span>
                </div>
                {item.promotionSource && (
                  <span className="ci-preorder-badge" style={{ background: item.promotionSource === 'Offer Banner' ? '#fff7ed' : '#fef3c7', color: '#92400e' }}>
                    {item.promotionSource === 'Offer Banner' ? '✦ Offer' : '⚡ Deal'}: {item.promotionLabel || 'Promotion'} · {item.promotionDiscountType === 'FLAT' ? `₹${Number(item.promotionDiscountValue || 0).toLocaleString('en-IN')} OFF` : `${item.promotionDiscountValue || item.discountPercentage || 0}% OFF`}
                  </span>
                )}
                {isItemPreorder && (
                  <span className="ci-preorder-badge">✦ Pre-Booking Item</span>
                )}
                <div className="ci-price-line">
                  <span className="ci-price">₹{Number(finalPrice * qty).toLocaleString('en-IN')}</span>
                  <span className="ci-qty-chip">+{qty} {qty > 1 ? 'items' : 'item'}</span>
                  {qty > 1 && <span className="ci-unit-calc">(₹{Number(finalPrice).toLocaleString('en-IN')} each)</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PROMO / COUPON CODE SECTION ── */}
      <div className="checkout-coupon-box">
        <div className="coupon-box-header">
          <span className="coupon-box-title">
            <FiTag style={{ marginRight: '6px', color: '#c9a84c' }} /> Apply Coupon / Offer
          </span>
          {availableCoupons.length > 0 && !appliedCoupon && (
            <button 
              type="button" 
              className="toggle-offers-btn"
              onClick={() => setShowCouponList(prev => !prev)}
            >
              {showCouponList ? 'Hide Coupons' : `View Coupons (${availableCoupons.length})`}
            </button>
          )}
        </div>

        {appliedCoupon ? (
          <div className="applied-coupon-pill">
            <div className="applied-info">
              <span className="applied-tag">✓ {appliedCoupon.code}</span>
              <span className="applied-save-text">Saved ₹{Number(appliedCoupon.discountAmount).toLocaleString('en-IN')}</span>
            </div>
            <button type="button" className="btn-remove-coupon" onClick={handleRemoveCoupon}>
              Remove
            </button>
          </div>
        ) : (
          <div className="coupon-input-group">
            <input 
              type="text" 
              placeholder="Enter Coupon Code" 
              value={couponCodeInput}
              onChange={(e) => {
                setCouponCodeInput(e.target.value.toUpperCase());
                if (couponError) setCouponError('');
              }}
              className="coupon-input"
            />
            <button 
              type="button" 
              className="btn-apply-coupon"
              onClick={() => handleApplyCoupon()}
              disabled={couponLoading || !couponCodeInput.trim()}
            >
              {couponLoading ? '...' : 'Apply'}
            </button>
          </div>
        )}

        {couponError && <p className="coupon-error-msg">{couponError}</p>}
        {couponSuccess && !couponError && <p className="coupon-success-msg">{couponSuccess}</p>}

        {/* Available Coupons List */}
        {showCouponList && !appliedCoupon && (
          <div className="available-coupons-list">
            <div className="available-coupons-title">Available Coupons for You</div>
            {availableCoupons.map((coupon) => {
              const minVal = parseFloat(coupon.minOrderAmount) || 0;
              const maxVal = coupon.maxOrderAmount ? parseFloat(coupon.maxOrderAmount) : null;
              const isEligible = checkoutTotal >= minVal && (maxVal === null || maxVal === 0 || checkoutTotal <= maxVal);
              const isBelowMin = checkoutTotal < minVal;
              const isAboveMax = maxVal !== null && maxVal > 0 && checkoutTotal > maxVal;

              return (
                <div className={`available-coupon-card ${isEligible ? 'eligible' : 'locked'}`} key={coupon.id || coupon.code}>
                  <div className="acc-left">
                    <div className="acc-code-row">
                      <span className="acc-code">{coupon.code}</span>
                      <span className="acc-discount-badge">
                        {coupon.type === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                      </span>
                    </div>
                    {coupon.description && <p className="acc-desc">{coupon.description}</p>}
                    <div className="acc-rule">
                      {minVal > 0 && `Min. order ₹${minVal.toLocaleString('en-IN')}`}
                      {minVal > 0 && maxVal ? ' • ' : ''}
                      {maxVal ? `Max. order ₹${maxVal.toLocaleString('en-IN')}` : ''}
                      {minVal === 0 && !maxVal ? 'No min. order required' : ''}
                    </div>
                    {isBelowMin && (
                      <p className="acc-diff-hint">Add ₹{(minVal - checkoutTotal).toLocaleString('en-IN')} more to apply</p>
                    )}
                    {isAboveMax && (
                      <p className="acc-diff-hint">Valid only on orders up to ₹{maxVal.toLocaleString('en-IN')}</p>
                    )}
                  </div>
                  <div className="acc-right">
                    <button 
                      type="button"
                      className="btn-acc-apply"
                      disabled={!isEligible || couponLoading}
                      onClick={() => handleApplyCoupon(coupon.code)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="checkout-totals">
        <div className="total-row">
          <span>Product Subtotal</span>
          <span>₹{checkoutTotal.toLocaleString('en-IN')}</span>
        </div>

        {appliedCoupon && (
          <div className="total-row discount-row">
            <span>Coupon Discount ({appliedCoupon.code})</span>
            <span className="discount-amount">- ₹{Number(appliedCoupon.discountAmount).toLocaleString('en-IN')}</span>
          </div>
        )}

        <div className="total-row">
          <span>Delivery</span>
          <span>{deliveryCountry !== 'India'
            ? 'Quoted on WhatsApp'
            : shippingQuote.loading
              ? 'Calculating...'
              : !shippingQuote.ready
                ? (shippingQuote.error ? 'Unavailable' : 'Enter pincode')
                : shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
        </div>

        {isGiftWrap && (
          <div className="total-row">
            <span>Luxury Gift Wrapping</span>
            <span>₹30</span>
          </div>
        )}

        <div className="total-row grand-total">
          <div>
            <div className="grand-title">Total Amount</div>
            <div className="grand-sub">Inclusive of all taxes</div>
          </div>
          <span className="grand-value">₹{grandTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Trust & Guarantee */}
      <div className="checkout-summary-trust">
        <div className="cst-item"><FiTruck /> Insured & Tracked Doorstep Delivery</div>
      </div>
    </aside>
  );

  const renderAddressStep = () => (
    <div className="checkout-layout">
      <div className="checkout-form-section" data-aos="fade-right">
        {/* Luxury top ribbon */}
        <div className="checkout-top-ribbon">
          {customer && !customer.isGuest ? (
            <div className="ribbon-user">
              <span className="ribbon-avatar">{customer.name?.charAt(0)?.toUpperCase() || 'C'}</span>
              <div className="ribbon-user-meta">
                <span className="ribbon-role">Verified Baani Member</span>
                <strong>{customer.name}</strong> <span className="ribbon-contact">({customer.email || customer.phone})</span>
              </div>
            </div>
          ) : (
            <div className="ribbon-guest">
              <span className="ribbon-icon"><FiShoppingBag /></span>
              <div className="ribbon-user-meta">
                <strong>Express Direct Checkout</strong>
                <span>Guest Checkout &bull; 100% Encrypted &amp; Secure</span>
              </div>
              <button
                type="button"
                onClick={() => setStep('login-form')}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: '1px solid rgba(200, 156, 74, 0.4)',
                  color: '#12382e',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>
          )}
          <div className="ribbon-shield">
            <FiShield /> Authentic Certified Jewels
          </div>
        </div>

        <div className="section-title-wrap">
          <h2 className="section-heading">Delivery Details</h2>
          <p className="section-subheading">Enter your shipping destination for insured doorstep delivery.</p>
        </div>

        {/* Delivery Destination Selector Cards */}
        <div className="dest-toggle-container">
          <div className="dest-label-row">
            <span className="dest-label-title"><FiGlobe /> Select Shipping Destination</span>
          </div>
          <div className="dest-toggle-grid">
            <div 
              className={`dest-card-option ${deliveryCountry === 'India' ? 'selected' : ''}`}
              onClick={() => setDeliveryCountry('India')}
            >
              <div className="dco-header">
                <span className={`radio-dot ${deliveryCountry === 'India' ? 'active' : ''}`} />
                <span className="dco-flag">🇮🇳</span>
                <div className="dco-info">
                  <strong>Domestic (India)</strong>
                  <span>Insured delivery via DTDC / BlueDart</span>
                </div>
              </div>
            </div>

            <div 
              className={`dest-card-option ${deliveryCountry === 'International' ? 'selected' : ''}`}
              onClick={() => setDeliveryCountry('International')}
            >
              <div className="dco-header">
                <span className={`radio-dot ${deliveryCountry === 'International' ? 'active' : ''}`} />
                <span className="dco-flag">🌍</span>
                <div className="dco-info">
                  <strong>International Delivery</strong>
                  <span>Worldwide concierge service via DHL / FedEx</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {deliveryCountry === 'International' ? (
          <div className="intl-concierge-card">
            <div className="intl-icon-circle">
              <FiGlobe />
            </div>
            <h3 className="intl-title">
              Worldwide Fine Jewellery Concierge
            </h3>
            <p className="intl-desc">
              For worldwide deliveries outside India, our luxury concierge will confirm the shipping duties and courier speed directly with you on WhatsApp.
            </p>
            <a
              href={`https://wa.me/919345322621?text=${encodeURIComponent(internationalWhatsAppMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-intl-whatsapp"
            >
              <FiPhone style={{ fontSize: '18px' }} /> Connect with WhatsApp Concierge (+91 93453 22621)
            </a>
          </div>
        ) : (
          <>
            {/* Saved addresses for registered customer */}
            {customer && !customer.isGuest && savedAddresses.length > 0 && (
              <div className="saved-addresses">
                <div className="saved-addr-top">
                  <p className="saved-addr-label">Saved Delivery Addresses</p>
                  <span className="saved-addr-count">{savedAddresses.length} on file</span>
                </div>
                <div className="saved-addr-list">
                  {savedAddresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`saved-addr-card ${selectedAddressId === addr.id && !showNewAddrForm ? 'selected' : ''}`}
                      onClick={() => handleSelectSavedAddress(addr)}
                    >
                      <div className="addr-card-radio">
                        <span className={`radio-dot ${selectedAddressId === addr.id && !showNewAddrForm ? 'active' : ''}`} />
                      </div>
                      <div className="addr-card-info">
                        <div className="addr-name-row">
                          <strong>{addr.name}</strong>
                          <span className="addr-phone">{addr.phone}</span>
                        </div>
                        <p className="addr-detail-text">{addr.addressLine}, {addr.city}{addr.district ? `, ${addr.district}` : ''}</p>
                        <p className="addr-sub-text">{addr.state} — <strong>{addr.pincode}</strong></p>
                      </div>
                      <FiMapPin className="addr-card-icon" />
                    </div>
                  ))}

                  <button
                    type="button"
                    className={`add-new-addr-btn ${showNewAddrForm ? 'active' : ''}`}
                    onClick={() => { setShowNewAddrForm(true); setSelectedAddressId(null); setAddrForm({ ...emptyAddress, name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '' }); setPincodeMsg(''); }}
                  >
                    <FiPlus /> Add A New Address
                  </button>
                </div>
              </div>
            )}

            {/* Address Form */}
            {(showNewAddrForm || !customer || customer.isGuest || savedAddresses.length === 0) && (
              <form onSubmit={handleProceedToPayment} className="address-form">
                {errorMsg && <div className="error-alert">{errorMsg}</div>}

                <div className="addr-row-2">
                  <div className="form-group">
                    <label>Full Name <span className="req-star">*</span></label>
                    <input type="text" name="name" value={addrForm.name} onChange={handleAddrChange} placeholder="Recipient's full name" minLength={3} maxLength={35} pattern="[A-Za-z ]+" title="Use letters and spaces only (3-35 characters)." required />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number <span className="req-star">*</span></label>
                    <div className="phone-input-combined">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="country-code-select"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.iso + c.code} value={c.code}>{c.flag} {c.country} ({c.code})</option>
                        ))}
                      </select>
                      <input 
                        type="tel" 
                        name="phone" 
                        value={addrForm.phone} 
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                          }
                        }}
                        onChange={handleAddrChange} 
                        placeholder="10-digit mobile number" 
                        inputMode="numeric" 
                        pattern="[0-9]{10}" 
                        maxLength={10} 
                        title="Enter exactly 10 digits." 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                    <label>Email Address <span className="req-star">*</span> <small className="label-helper">(For tax invoice &amp; courier tracking updates)</small></label>
                    <input
                      type="email"
                      name="email"
                      value={addrForm.email}
                      onChange={handleAddrChange}
                      placeholder="e.g. yourname@example.com"
                      required
                    />
                </div>

                <div className="form-group">
                  <label>Full Street Address <span className="req-star">*</span></label>
                  <textarea name="addressLine" value={addrForm.addressLine} onChange={handleAddrChange} placeholder="House / Flat No., Apartment / Building, Street Name, Landmark..." rows={3} required />
                </div>

                <div className="addr-row-2">
                  <div className="form-group">
                    <label>Pincode <span className="req-star">*</span> {pincodeLoading && <span className="pin-spinner">⟳</span>}</label>
                    <input type="text" name="pincode" value={addrForm.pincode} onChange={handleAddrChange} placeholder="6-digit pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} title="Enter exactly 6 digits." required />
                    {pincodeMsg && <span className={`pincode-msg ${shippingQuote.ready ? 'success' : 'warn'}`}>{pincodeMsg}</span>}
                  </div>
                  <div className="form-group">
                    <label>City / Town <span className="req-star">*</span></label>
                    <input 
                      type="text" 
                      name="city" 
                      list="area-list"
                      value={addrForm.city} 
                      onChange={handleAddrChange} 
                      placeholder="Type city or select area" 
                      required 
                    />
                    <datalist id="area-list">
                      {pincodeAreas.map(area => (
                        <option key={area} value={area} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="addr-row-2">
                  <div className="form-group">
                    <label>District <span className="req-star">*</span></label>
                    <input type="text" name="district" value={addrForm.district} onChange={handleAddrChange} placeholder="District / Region" required />
                  </div>
                  <div className="form-group">
                    <label>State <span className="req-star">*</span></label>
                    <select name="state" value={addrForm.state} onChange={handleAddrChange} required>
                      <option value="">Select State</option>
                      {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Gift Wrapping Option */}
                <div className={`luxury-gifting-card ${isGiftWrap ? 'active' : ''}`}>
                  <label className="lgc-label">
                    <input
                      type="checkbox"
                      checked={isGiftWrap}
                      onChange={(e) => setIsGiftWrap(e.target.checked)}
                      className="lgc-checkbox"
                    />
                    <div className="lgc-icon-wrap">
                      <FiGift />
                    </div>
                    <div className="lgc-content">
                      <div className="lgc-title-row">
                        <span className="lgc-title">Add Gift Wrapping</span>
                        <span className="lgc-price">+₹30</span>
                      </div>
                      <p className="lgc-desc">
                        Your order will be beautifully wrapped and ready to gift.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="form-actions addr-actions">
                  {customer && !customer.isGuest && savedAddresses.length > 0 && (
                    <button type="button" className="btn-secondary-cancel" onClick={() => { setShowNewAddrForm(false); setSelectedAddressId(savedAddresses[0]?.id); handleSelectSavedAddress(savedAddresses[0]); }}>Cancel</button>
                  )}
                  <button type="submit" className="btn-primary-proceed">
                    Continue to Payment &rarr;
                  </button>
                </div>
              </form>
            )}

            {/* Proceed button when using a saved address */}
            {!showNewAddrForm && customer && !customer.isGuest && selectedAddressId && (
              <div className="saved-addr-confirm-wrap">
                {errorMsg && <div className="error-alert">{errorMsg}</div>}
                {/* Gift Wrapping Option */}
                <div className={`luxury-gifting-card ${isGiftWrap ? 'active' : ''}`}>
                  <label className="lgc-label">
                    <input
                      type="checkbox"
                      checked={isGiftWrap}
                      onChange={(e) => setIsGiftWrap(e.target.checked)}
                      className="lgc-checkbox"
                    />
                    <div className="lgc-icon-wrap">
                      <FiGift />
                    </div>
                    <div className="lgc-content">
                      <div className="lgc-title-row">
                        <span className="lgc-title">Add Gift Wrapping</span>
                        <span className="lgc-price">+₹30</span>
                      </div>
                      <p className="lgc-desc">
                        Your order will be beautifully wrapped and ready to gift.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="form-actions addr-actions">
                  <button type="button" className="btn-primary-proceed" onClick={() => handleProceedToPayment({ preventDefault: () => {} })}>
                    Continue to Payment &rarr;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order summary sidebar */}
      {renderOrderSummary()}
    </div>
  );

  const renderPayment = () => (
    <div className="checkout-layout">
      <div className="checkout-form-section" data-aos="fade-right">
        {/* Recipient summary card */}
        <div className="payment-addr-recap">
          <div className="par-header">
            <span className="par-badge"><FiMapPin /> Delivering Order To</span>
            <button type="button" className="btn-recap-change" onClick={() => setStep('address')}>
              <FiEdit2 /> Change Address
            </button>
          </div>
          <div className="par-body">
            <div className="par-name">{addrForm.name} &bull; {addrForm.phone}</div>
            <div className="par-text">
              {addrForm.addressLine}, {addrForm.city}, {addrForm.district ? `${addrForm.district}, ` : ''}{addrForm.state} — {addrForm.pincode}
            </div>
          </div>
        </div>

        <div className="section-title-wrap" style={{ marginTop: '28px' }}>
          <h2 className="section-heading">Payment Method</h2>
          <p className="section-subheading">Choose your preferred payment gateway to complete your fine jewellery purchase.</p>
        </div>

        {errorMsg && <div className="error-alert">{errorMsg}</div>}
        
        <form onSubmit={handleFinalCheckout}>
          <div className="payment-method-card selected">
            <div className="pmc-header">
              <span className="radio-dot active" />
              <div className="pmc-title-group">
                <span className="pmc-title">Instant Online Payment (Razorpay)</span>
                <span className="pmc-sub">Pay securely using UPI, Credit/Debit Cards, or Net Banking</span>
              </div>
              <FiCreditCard className="pmc-icon" />
            </div>
            <div className="pmc-badges-row">
              <span className="pm-pill">Google Pay</span>
              <span className="pm-pill">PhonePe</span>
              <span className="pm-pill">Paytm</span>
              <span className="pm-pill">Visa / Mastercard</span>
              <span className="pm-pill">RuPay</span>
              <span className="pm-pill">Net Banking</span>
            </div>
          </div>

          <div className="checkout-security-guarantee">
            <FiShield className="csg-icon" />
            <div className="csg-text">
              <strong>100% Secure &amp; Encrypted:</strong> Powered by RBI-authorized 256-bit bank encryption. Baani Jewels never stores your banking credentials.
            </div>
          </div>

          <button type="submit" className="btn-place-order" disabled={loading}>
            {loading ? (
              <span>Securing Order…</span>
            ) : (
              <span>
                <FiLock style={{ marginRight: '8px', verticalAlign: '-1px' }} /> 
                Pay Online &amp; Place Order (₹{grandTotal.toLocaleString('en-IN')})
              </span>
            )}
          </button>
        </form>
      </div>

      {renderOrderSummary()}
    </div>
  );

  // ── ORDER SUCCESS SCREEN ──
  if (orderPlaced) {
    const addr = orderPlaced.address || {};
    const fullAddrStr = [addr.line, addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ');

    return (
      <div className="checkout-page order-success">
        <PageBanner title="Order Confirmed" trail="Success" />
        <div className="container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
          
          {/* Header Banner */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #a7f3d0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '44px',
              margin: '0 auto 18px',
              boxShadow: '0 10px 25px rgba(5, 150, 105, 0.15)'
            }}>
              <FiCheckCircle />
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', color: '#12382e', margin: '0 0 10px', fontWeight: '700' }}>
              Order Placed Successfully!
            </h2>
            <p style={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '560px', margin: '0 auto' }}>
              Thank you for choosing <strong>Baani Jewels</strong>. Your order is confirmed and our artisans are preparing your package.
            </p>
          </div>

          {/* Key Order Meta Bar */}
          <div style={{
            background: '#f8faf9',
            border: '1px solid #dbe5e0',
            borderRadius: '12px',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', letterSpacing: '0.5px' }}>Order Reference</span>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#12382e', marginTop: '2px' }}>{orderPlaced.orderId}</div>
            </div>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', letterSpacing: '0.5px' }}>Order Date</span>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginTop: '2px' }}>{orderPlaced.date || new Date().toLocaleDateString('en-IN')}</div>
            </div>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', letterSpacing: '0.5px' }}>Payment Status</span>
              <div style={{ marginTop: '2px' }}>
                <span style={{
                  display: 'inline-block',
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '3px 12px',
                  borderRadius: '9999px',
                  border: '1px solid #a7f3d0'
                }}>
                  PAID (Online)
                </span>
              </div>
            </div>
            {orderPlaced.paymentId && (
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', letterSpacing: '0.5px' }}>Payment ID</span>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#374151', marginTop: '2px' }}>{orderPlaced.paymentId}</div>
              </div>
            )}
          </div>

          {/* Live Order Tracking Stepper */}
          {renderCheckoutTrackingStepper(orderPlaced.orderStatus || 'Pending')}

          {/* Order Tracking Guidance Callout */}
          <div style={{
            background: '#fdfbf7',
            border: '1px solid #e8dfd3',
            borderRadius: '10px',
            padding: '14px 18px',
            margin: '16px 0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <FiTruck style={{ fontSize: '26px', color: '#12382e', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
              <strong>Save your Order ID!</strong> Keep <strong>{orderPlaced.orderId}</strong> handy to track real-time packing and courier movement or download invoices anytime on our <Link to="/account" style={{ color: '#12382e', fontWeight: 700, textDecoration: 'underline' }}>Account &amp; Tracking Portal</Link>.
            </div>
          </div>

          {/* Delivery & Customer Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '28px'
          }}>
            {/* Customer Box */}
            <div style={{ background: '#ffffff', border: '1px solid #ede8df', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#12382e', letterSpacing: '1px', fontWeight: '800', margin: '0 0 12px', borderBottom: '1px solid #f3f0ea', paddingBottom: '8px' }}>
                Customer Information
              </h4>
              <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#111827' }}>
                <strong>{orderPlaced.name}</strong>
              </p>
              {orderPlaced.customerId && (
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#4b5563' }}>
                  Customer ID: <strong style={{ color: '#12382e' }}>{orderPlaced.customerId}</strong>
                </p>
              )}
              <p style={{ margin: '0 0 6px', fontSize: '13.5px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMail style={{ color: '#c9a84c' }} /> {orderPlaced.email || '—'}
              </p>
              <p style={{ margin: '0', fontSize: '13.5px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiPhone style={{ color: '#c9a84c' }} /> {orderPlaced.phone || '—'}
              </p>
            </div>

            {/* Address Box */}
            <div style={{ background: '#ffffff', border: '1px solid #ede8df', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#12382e', letterSpacing: '1px', fontWeight: '800', margin: '0 0 12px', borderBottom: '1px solid #f3f0ea', paddingBottom: '8px' }}>
                Shipping &amp; Delivery Address
              </h4>
              <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#111827' }}>
                <strong>{orderPlaced.name}</strong>
              </p>
              <p style={{ margin: '0', fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <FiMapPin style={{ color: '#c9a84c', marginTop: '3px', flexShrink: 0 }} />
                <span>{fullAddrStr || 'Delivery address saved on file'}</span>
              </p>
            </div>
          </div>

          {/* Ordered Products Itemized Section */}
          <div style={{ background: '#ffffff', border: '1px solid #ede8df', borderRadius: '12px', padding: '24px', marginBottom: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#12382e', letterSpacing: '1px', fontWeight: '800', margin: '0 0 18px', borderBottom: '1px solid #f3f0ea', paddingBottom: '10px' }}>
              Ordered Items ({(orderPlaced.items || []).length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(orderPlaced.items || []).map((item, idx) => {
                const rawImg = item.productImage || item.image || item.mainImage;
                const imgSrc = rawImg
                  ? (rawImg.startsWith('http') || rawImg.startsWith('/') ? rawImg : `${API_BASE}/uploads/${rawImg}`)
                  : '/assests/pr1.jpeg';
                const price = Number(item.salesPrice ?? item.mrpPrice ?? 0);
                const qty = Number(item.quantity || 1);

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    borderBottom: idx === (orderPlaced.items || []).length - 1 ? 'none' : '1px solid #f3f4f6',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={imgSrc}
                        alt={item.productName}
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb', flexShrink: 0 }}
                        onError={(e) => { e.target.src = '/assests/pr1.jpeg'; }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#12382e', marginBottom: '3px' }}>
                          {item.productName || 'Baani Jewels Piece'}
                        </div>
                        {item.variantLabel && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '3px' }}>{item.variantLabel}</div>
                        )}
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          Qty: {qty} &nbsp;|&nbsp; ₹{price.toLocaleString('en-IN')} each
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#12382e' }}>
                        ₹{(price * qty).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Totals */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #ede8df',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#4b5563' }}>
                <span>Subtotal</span>
                <span>₹{Number(orderPlaced.subtotal || orderPlaced.total).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#4b5563' }}>
                <span>Shipping ({orderPlaced.shippingType || 'Standard Delivery'})</span>
                <span style={{ fontWeight: '600', color: '#12382e' }}>₹{Number(orderPlaced.shippingAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              {orderPlaced.giftWrap ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#4b5563' }}>
                  <span>Luxury Gift Wrapping</span>
                  <span style={{ fontWeight: '600', color: '#12382e' }}>₹30</span>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: '#12382e', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
                <span>Total Amount Paid</span>
                <span style={{ color: '#12382e', fontSize: '18px' }}>₹{Number(orderPlaced.total).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons with Download Invoice */}
          <div style={{
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '28px'
          }}>
            <button
              type="button"
              onClick={() => downloadCustomerInvoice(orderPlaced)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 28px', fontSize: '15px', fontWeight: '700',
                background: '#12382e', color: '#ffffff', border: 'none',
                borderRadius: '8px', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(18, 56, 46, 0.2)'
              }}
            >
              <FiDownload style={{ fontSize: '18px' }} /> Download Invoice
            </button>

            <button
              type="button"
              onClick={() => navigate(`/track-order?orderId=${orderPlaced.orderId}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 24px', fontSize: '15px', fontWeight: '600',
                background: '#fdfbf7', color: '#12382e',
                border: '1.5px solid #12382e', borderRadius: '8px', cursor: 'pointer'
              }}
            >
              <FiTruck /> Track Order
            </button>

            <button
              type="button"
              onClick={() => navigate('/shop')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 26px', fontSize: '15px', fontWeight: '600',
                background: '#ffffff', color: '#12382e',
                border: '1.5px solid #12382e', borderRadius: '8px', cursor: 'pointer'
              }}
            >
              <FiShoppingBag /> Continue Shopping
            </button>
          </div>

          {/* ── REGISTER NUDGE BANNER (Guest only) ── */}
          {isBuyNow && (
            <div style={{
              background: 'linear-gradient(135deg, #042e22 0%, #0a3d2e 100%)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '14px',
              padding: '28px 32px',
              marginBottom: '40px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative gold accent */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '180px', height: '180px',
                background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
                borderRadius: '50%', transform: 'translate(40px,-40px)'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '36px', flexShrink: 0 }}>🎁</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#c9a84c', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                      One-Time Offer · Create a Free Account
                    </div>
                    <h3 style={{ color: '#ffffff', fontFamily: 'Georgia, serif', fontSize: '1.4rem', margin: '0 0 8px', fontWeight: '700' }}>
                      You're shopping as a Guest — Register to unlock more!
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', margin: '0 0 16px', lineHeight: '1.6' }}>
                      Your order is safe. Register now to get these benefits for future orders:
                    </p>

                    {/* Benefits grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '22px' }}>
                      {[
                        { icon: '🛒', text: 'Add to Cart & Wishlist' },
                        { icon: '📦', text: 'View full order history' },
                        { icon: '🔔', text: 'Order status updates' },
                        { icon: '🏠', text: 'Save multiple addresses' },
                        { icon: '⭐', text: 'Write product reviews' },
                        { icon: '🎀', text: 'Exclusive member offers' },
                      ].map((b, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: 'rgba(255,255,255,0.07)', borderRadius: '8px',
                          padding: '8px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.85)'
                        }}>
                          <span style={{ fontSize: '16px' }}>{b.icon}</span>
                          {b.text}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => navigate('/account?tab=register')}
                        style={{
                          background: 'linear-gradient(135deg, #c9a84c, #b58739)',
                          color: '#fff', border: 'none',
                          padding: '12px 28px', borderRadius: '8px',
                          fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(201,168,76,0.35)',
                          letterSpacing: '0.3px'
                        }}
                      >
                        <RiSparkling2Line style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Create Free Account
                      </button>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        Already have one?{' '}
                        <button
                          type="button"
                          onClick={() => navigate('/account?tab=login')}
                          style={{ background: 'none', border: 'none', color: '#c9a84c', fontWeight: '700', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                        >
                          Sign In
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <PageBanner title={isBuyNow ? "Direct Checkout" : "Checkout"} trail="Checkout" />
      <div className="container">
        {/* Luxury Step Progress Bar */}
        <div className="checkout-steps">
          {!isBuyNow && (
            <>
              <div className={`chk-step ${['auth-choice','register-form','login-form','otp','password'].includes(step) ? 'active' : 'done'}`}>
                <span className="chk-step-circle">
                  {!['auth-choice','register-form','login-form','otp','password'].includes(step) ? <FiCheck /> : '1'}
                </span>
                <div className="chk-step-meta">
                  <span className="chk-step-tag">Step 01</span>
                  <span className="chk-step-title">Account</span>
                </div>
              </div>
              <div className={`chk-step-line ${!['auth-choice','register-form','login-form','otp','password'].includes(step) ? 'filled' : ''}`} />
            </>
          )}
          <div className={`chk-step ${step === 'address' ? 'active' : step === 'payment' ? 'done' : ''}`}>
            <span className="chk-step-circle">
              {step === 'payment' ? <FiCheck /> : isBuyNow ? '1' : '2'}
            </span>
            <div className="chk-step-meta">
              <span className="chk-step-tag">Step {isBuyNow ? '01' : '02'}</span>
              <span className="chk-step-title">Delivery Details</span>
            </div>
          </div>
          <div className={`chk-step-line ${step === 'payment' ? 'filled' : ''}`} />
          <div className={`chk-step ${step === 'payment' ? 'active' : ''}`}>
            <span className="chk-step-circle">{isBuyNow ? '2' : '3'}</span>
            <div className="chk-step-meta">
              <span className="chk-step-tag">Step {isBuyNow ? '02' : '03'}</span>
              <span className="chk-step-title">Payment &amp; Review</span>
            </div>
          </div>
        </div>

        {step === 'auth-choice'   && renderAuthChoice()}
        {step === 'register-form' && renderRegisterForm()}
        {step === 'login-form'    && renderLoginForm()}
        {step === 'otp'           && renderOtpForm()}
        {step === 'password'      && renderPasswordForm()}
        {step === 'address'       && renderAddressStep()}
        {step === 'payment'       && renderPayment()}
      </div>
    </div>
  );
};

export default Checkout;
