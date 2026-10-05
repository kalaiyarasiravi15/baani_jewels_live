import OrderReviews from '../../components/OrderReviews/OrderReviews';
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiShoppingBag, FiHeart, FiBox, FiStar, FiLock, FiLogOut, FiTrash2, FiArrowRight,
  FiUser, FiMail, FiPhone, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiTruck, FiDownload, FiGlobe, FiSearch,
  FiGift, FiShield, FiClock, FiKey
} from 'react-icons/fi';
import { RiSparkling2Line } from 'react-icons/ri';
import { LuDiamond } from 'react-icons/lu';
import PageBanner from '../../components/PageBanner/PageBanner';
import { ShopContext } from '../../context/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Account.css';

import { API_BASE, getMediaUrl } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

import { COUNTRIES } from '../../utils/countries';

const downloadOrderTaxInvoice = (order, fallbackCustomer = null) => {
  if (!order) return;
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups in your browser to view and download your invoice.');
    return;
  }

  const itemsList = order.items || order.slots || [];
  const itemsHtml = itemsList.map((item, idx) => {
    const rawImg = item.productImage || item.image || item.mainImage || item.Product?.mainImage;
    const pImage = getMediaUrl(rawImg);
    const price = Number(item.finalPrice ?? item.salesPrice ?? item.mrpPrice ?? 0);
    const qty = Number(item.quantity || 1);
    const lineTotal = price * qty;

    return `
      <tr>
        <td style="text-align:center;color:#4b5563;width:45px;font-weight:600;">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <img src="${pImage}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;flex-shrink:0" onError="this.style.display='none'"/>
            <div>
              <div style="font-weight:700;color:#12382e;font-size:13px">${item.productName || item.Product?.name || 'Jewellery Item'}</div>
              ${item.variantLabel ? `<div style="font-size:11.5px;color:#6b7280;margin-top:2px;">${item.variantLabel}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="text-align:center;width:60px;font-weight:600;">${qty}</td>
        <td style="text-align:right;width:110px">₹${price.toLocaleString('en-IN')}</td>
        <td style="text-align:right;font-weight:700;color:#12382e;width:120px">₹${lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  const snap = order.shippingSnapshot || order.shippingAddress || order.Customer?.CustomerAddresses?.[0] || {};
  const customerName = order.Customer?.name || snap.name || order.customerName || order.snapName || fallbackCustomer?.name || 'Customer';
  const customerPhone = order.Customer?.phone || snap.phone || order.customerPhone || order.snapPhone || fallbackCustomer?.phone || '—';
  const customerEmail = order.Customer?.email || order.customerEmail || order.guestEmail || order.email || snap.email || order.snapEmail || fallbackCustomer?.email || '—';
  const fullAddress = [snap.addressLine, snap.city, snap.district, snap.state, snap.pincode].filter(Boolean).join(', ') || [order.snapAddressLine, order.snapCity, order.snapState, order.snapPincode].filter(Boolean).join(', ') || 'On record';

  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const totalVal = Number(order.totalAmount || order.total || 0);
  const subTotalVal = totalVal - Number(order.shippingAmount || 0) - (order.giftWrap ? 30 : 0);

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
    @media print { body { padding: 0; } .inv-card { width: 100%; } }
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
        <div class="inv-meta-row"><strong>Date:</strong> ${orderDate}</div>
        <div class="inv-meta-row"><strong>Payment:</strong> ${order.paymentMethod || 'Online (Razorpay)'}</div>
        ${order.paymentId ? `<div class="inv-meta-row"><strong>Transaction ID:</strong> ${order.paymentId}</div>` : ''}
        <div><span class="badge-paid">Status: ${(order.paymentStatus || 'PAID').toUpperCase()}</span></div>
      </div>
    </div>

    <div class="addresses-grid">
      <div class="addr-box">
        <h4>Customer Details</h4>
        <p><strong>${customerName}</strong></p>
        
        <p>Phone: ${customerPhone}</p>
        <p>Email: ${customerEmail}</p>
      </div>
      <div class="addr-box">
        <h4>Delivery Address</h4>
        <p><strong>${customerName}</strong></p>
        <p>Phone: ${customerPhone}</p>
        <p>${fullAddress}</p>
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
          <td class="right">₹${Math.max(0, subTotalVal).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Shipping (${order.shippingType || 'Standard'})</td>
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
          <td class="right"><span>₹${totalVal.toLocaleString('en-IN')}</span></td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <strong>Thank you for shopping with Baani Jewels!</strong><br/>
      This is an authentic computer-generated tax invoice. No physical signature is required.<br/>
      For customer care or inquiries, email Baanijewels.ind@gmail.com or WhatsApp +91 93453 22621.
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

const renderCustomerTrackingStepper = (status) => {
  if (status === 'Cancelled') {
    return (
      <div style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c' }}>
        <strong>Order Status: Cancelled</strong>
        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>This order has been cancelled. For any inquiries, please contact our support team.</p>
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
    <div style={{ margin: '14px 0 6px' }}>
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
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: isDone ? '#12382e' : '#fff',
                color: isDone ? '#c9a84c' : '#9ca3af',
                border: isDone ? '2px solid #c9a84c' : '2px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px',
                fontSize: '12px',
                fontWeight: 'bold',
                position: 'relative',
                zIndex: 2,
                boxShadow: isCurrent ? '0 0 0 4px rgba(201, 168, 76, 0.25)' : 'none'
              }}>
                {isDone ? '✓' : idx + 1}
              </div>
              <div style={{
                fontSize: '11px',
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

const Account = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, logout, token, login, guestOrderHistory } = useContext(ShopContext);

  const authNotice = location.state?.authNotice;
  const redirectTo = location.state?.redirectTo;
  const isGuest = customer?.isGuest === true;
  const isLoggedIn = Boolean(customer && !isGuest);

  // Portal tabs when not logged in: 'login' | 'register' | 'forgot'
  const [authTab, setAuthTab] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Register form state (steps 1 -> 2 -> 3)
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [regPhone, setRegPhone] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirmPwd, setShowRegConfirmPwd] = useState(false);

  // Forgot password flow
  const [forgotStep, setForgotStep] = useState('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPwd, setForgotNewPwd] = useState('');

  // Order tracking state (for guests and logged-in customers)
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackData, setTrackData] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [guestOrdersDetails, setGuestOrdersDetails] = useState([]);
  const [guestOrdersLoading, setGuestOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (!isLoggedIn && guestOrderHistory.length > 0) {
      const fetchGuestOrders = async (silent = false) => {
        if (!silent) setGuestOrdersLoading(true);
        const list = [];
        for (const item of guestOrderHistory.slice(0, 10)) {
          try {
            const cleanId = String(item.orderId || '').trim().replace(/^#/, '');
            if (cleanId) {
              const res = await axios.get(`${API_BASE}/api/orders/track/${encodeURIComponent(cleanId)}`);
              if (res.data?.success && res.data?.order) {
                list.push(res.data.order);
              }
            }
          } catch (e) {
            console.warn('Error loading guest order:', item.orderId, e);
          }
        }
        setGuestOrdersDetails(list);
        setGuestOrdersLoading(false);
      };
      fetchGuestOrders();
      const refresh = () => { if (!document.hidden) fetchGuestOrders(true); };
      const timer = setInterval(refresh, 30000);
      window.addEventListener('focus', refresh);
      return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
    }
  }, [isLoggedIn, guestOrderHistory]);

  // Dashboard state for logged-in user
  const [activeTab, setActiveTab] = useState('orders');
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Reset Flow State
  const [pwdStep, setPwdStep] = useState('request');
  const [pwdOtp, setPwdOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Delete Account Flow State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');

  // Profile & Address Editing State
  const [profileName, setProfileName] = useState(customer?.name || '');
  const [profilePhone, setProfilePhone] = useState(customer?.phone || '');
  const [addrId, setAddrId] = useState(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');

  useEffect(() => {
    if (customer) {
      setProfileName(customer.name || '');
      setProfilePhone(customer.phone || '');
      const saved = customer.ShippingAddresses?.[0] || customer.CustomerAddresses?.[0];
      if (saved) {
        setAddrId(saved.id || null);
        setAddrName(saved.name || customer.name || '');
        setAddrPhone(saved.phone || customer.phone || '');
        setAddrLine(saved.addressLine || [saved.houseNo, saved.street].filter(Boolean).join(', ') || '');
        setAddrCity(saved.city || '');
        setAddrDistrict(saved.district || '');
        setAddrState(saved.state || '');
        setAddrPincode(saved.pincode || '');
      } else {
        setAddrName(customer.name || '');
        setAddrPhone(customer.phone || '');
      }
    }
  }, [customer]);

  const handleUpdateProfileInfo = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!profileName || profileName.trim().length < 3) {
      const msg = 'Name must be at least 3 characters.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    try {
      setLoading(true);
      await axios.put(`${API_BASE}/api/customers/update/${customer.id}`, {
        name: profileName.trim(),
        phone: profilePhone.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg('Profile information updated successfully!');
      toast.success('Profile updated successfully!');
      await login();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleSaveDeliveryAddress = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!addrLine || !addrCity || !addrState || !addrPincode) {
      const msg = 'Please fill in all address fields.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    try {
      setLoading(true);
      if (addrId) {
        await axios.put(`${API_BASE}/api/customers/shipping/update/${addrId}`, {
          name: addrName.trim() || profileName.trim(),
          phone: addrPhone.trim() || profilePhone.trim(),
          addressLine: addrLine.trim(),
          city: addrCity.trim(),
          district: addrDistrict.trim(),
          state: addrState.trim(),
          pincode: addrPincode.trim()
        });
      } else {
        const res = await axios.post(`${API_BASE}/api/customers/add-shipping`, {
          customerId: customer.id,
          name: addrName.trim() || profileName.trim(),
          phone: addrPhone.trim() || profilePhone.trim(),
          addressLine: addrLine.trim(),
          city: addrCity.trim(),
          district: addrDistrict.trim(),
          state: addrState.trim(),
          pincode: addrPincode.trim()
        });
        if (res.data?.address?.id) setAddrId(res.data.address.id);
      }
      setSuccessMsg('Default delivery address saved for future orders!');
      toast.success('Delivery address saved successfully!');
      await login();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save address.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const orderIdParam = params.get('orderId');

    if (tabParam === 'track') {
      navigate(`/track-order${orderIdParam ? `?orderId=${orderIdParam}` : ''}`, { replace: true });
      return;
    } else if (tabParam === 'register' && !isLoggedIn) {
      setAuthTab('register');
      setRegStep(1);
      setErrorMsg('');
      setSuccessMsg('');
    } else if (tabParam === 'login' && !isLoggedIn) {
      setAuthTab('login');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [location.search, isLoggedIn]);

  const fetchCustomerOrders = async (silent = false) => {
    try {
      if (!silent) setOrdersLoading(true);
      const res = await axios.get(`${API_BASE}/api/orders/customer/${customer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Could not fetch customer orders:', err.message);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && customer?.id && token) {
      fetchCustomerOrders();
      const refresh = () => { if (!document.hidden) fetchCustomerOrders(true); };
      const timer = setInterval(refresh, 30000);
      window.addEventListener('focus', refresh);
      return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
    }
  }, [isLoggedIn, customer?.id, token]);

  const handlePostAuthSuccess = async (customerData, authToken) => {
    await login(customerData, authToken);
    if (redirectTo) {
      navigate(redirectTo);
    }
  };

  // --- Auth Handlers ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!loginEmail || !loginEmail.includes('@')) {
      return setErrorMsg('Please enter a valid email address.');
    }
    if (!loginPassword || loginPassword.length < 4) {
      return setErrorMsg('Password must be at least 4 characters.');
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/customers/login`, {
        email: loginEmail.trim(),
        password: loginPassword
      });
      setSuccessMsg('Signed in successfully!');
      toast.success(`Welcome back, ${res.data.customer?.name || 'Customer'}!`);
      await handlePostAuthSuccess(res.data.customer, res.data.token);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const nameRegex = /^[a-zA-Z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = regPhone.trim().replace(/\D/g, '');

    if (regName.trim().length < 3 || regName.trim().length > 30 || !nameRegex.test(regName.trim())) {
      const msg = 'Name must be 3–30 characters and contain letters only (no numbers allowed).';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    if (!regEmail.includes('@') || !emailRegex.test(regEmail.trim())) {
      const msg = 'Please enter a valid email address containing @.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      const msg = 'Please enter a valid mobile number (7–15 digits).';
      toast.warn(msg);
      return setErrorMsg(msg);
    }

    const fullPhone = `${countryCode}${phoneDigits}`;

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/customers/send-register-otp`, {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: fullPhone
      });
      const msg = res.data.message || 'OTP sent to your email. Valid for 10 minutes.';
      setSuccessMsg(msg);
      toast.success('Registration OTP sent to your email!');
      setRegStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep2 = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!regOtp || regOtp.trim().length !== 6) {
      const msg = 'Please enter the 6-digit OTP.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/customers/verify-register-otp`, {
        email: regEmail.trim().toLowerCase(),
        otp: regOtp.trim()
      });
      const msg = res.data.message || 'OTP verified! You can now create your password.';
      setSuccessMsg(msg);
      toast.success('OTP verified successfully!');
      setRegStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/resend-register-otp`, {
        email: regEmail.trim().toLowerCase()
      });
      setSuccessMsg('New OTP sent to your email.');
      toast.success('New OTP sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep3 = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!regPassword || regPassword.length < 4) {
      const msg = 'Password must be at least 4 characters.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    if (regPassword !== regConfirmPassword) {
      const msg = 'Passwords do not match!';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    const phoneDigits = regPhone.trim().replace(/\D/g, '');
    const fullPhone = `${countryCode}${phoneDigits}`;

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/customers/register`, {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: fullPhone,
        password: regPassword
      });
      setSuccessMsg('Registration successful! Welcome to Baani Jewels.');
      toast.success('Registration successful! Welcome to Baani Jewels.');
      handlePostAuthSuccess(res.data.customer, res.data.token);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/forgot-password`, { email: forgotEmail.trim().toLowerCase() });
      const msg = 'Password reset OTP sent to your email (valid for 10 minutes).';
      setSuccessMsg(msg);
      toast.success('Password reset OTP sent to your email!');
      setForgotStep('verify');
    } catch (err) {
      const msg = err.response?.data?.message || 'Email not found.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      const msg = 'Please enter the 6-digit OTP.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/verify-otp`, {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim()
      });
      const msg = 'OTP verified! Please create your new password.';
      setSuccessMsg(msg);
      toast.success('OTP verified! Please create your new password.');
      setForgotStep('reset');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!forgotNewPwd || forgotNewPwd.length < 4) {
      const msg = 'New password must be at least 4 characters.';
      toast.warn(msg);
      return setErrorMsg(msg);
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/reset-password`, {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPwd
      });
      const msg = 'Password updated successfully! You can now sign in with your new password.';
      setSuccessMsg(msg);
      toast.success('Password updated successfully! Please sign in.');
      setAuthTab('login');
      setLoginEmail(forgotEmail);
      setForgotStep('request');
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPwd('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async (e, orderId = trackOrderId) => {
    if (e) e.preventDefault();
    if (!String(orderId || '').trim()) {
      setTrackError('Please enter your Order ID.');
      return;
    }
    setTrackError('');
    setTrackLoading(true);
    try {
      const cleanId = String(orderId).trim().replace(/^#/, '');
      const res = await axios.get(`${API_BASE}/api/orders/track/${encodeURIComponent(cleanId)}`);
      if (res.data?.success && res.data?.order) {
        setTrackData(res.data.order);
      } else {
        setTrackError('No order found with this Order ID.');
        setTrackData(null);
      }
    } catch (err) {
      setTrackError(err.response?.data?.error || 'Order not found. Please check your Order ID and try again.');
      setTrackData(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('You have logged out.');
    navigate('/');
  };

  // --- Password Reset Flow ---
  const handleRequestPwdOtp = async () => {
    setErrorMsg(''); setSuccessMsg('');
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/forgot-password`, { email: customer.email });
      setSuccessMsg('OTP sent to your email.');
      toast.success('Reset OTP sent successfully to your email!');
      setPwdStep('verify');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleVerifyPwdOtp = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/verify-otp`, { email: customer.email, otp: pwdOtp });
      setSuccessMsg('OTP verified! Enter your new password.');
      toast.success('OTP verified successfully!');
      setPwdStep('reset');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (newPassword.length < 4) {
      toast.warn('Password must be at least 4 characters.');
      return setErrorMsg('Password must be at least 4 characters.');
    }
    try {
      setLoading(true);
      const userEmail = customer?.email || '';
      await axios.post(`${API_BASE}/api/customers/reset-password`, { email: customer.email, otp: pwdOtp, newPassword });
      await logout();
      setAuthTab('login');
      setLoginEmail(userEmail);
      setSuccessMsg('Password changed successfully! Please log in with your new password.');
      toast.success('Password changed successfully! Please log in with your new password.');
      setPwdStep('request'); // Reset back to initial state
      setPwdOtp('');
      setNewPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  // --- Delete Account Flow ---
  const handleRequestDeleteOtp = async () => {
    setErrorMsg(''); setSuccessMsg('');
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/customers/delete/${customer.id}/request-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteModal(true);
      toast.info('Deletion OTP sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request delete OTP.';
      toast.error(msg);
      alert(msg);
    } finally { setLoading(false); }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deleteOtp) return;
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/api/customers/delete/${customer.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { otp: deleteOtp }
      });
      toast.success('Account successfully deleted.');
      setShowDeleteModal(false);
      logout();
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP or failed to delete.';
      toast.error(msg);
      alert(msg);
    } finally { setLoading(false); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="account-form-state account-tab-fade">
            <h2>My Profile &amp; Saved Address</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '13.5px' }}>
              Manage your personal information and default shipping address for quick, seamless checkout.
            </p>

            {errorMsg && <div className="error-alert">{errorMsg}</div>}
            {successMsg && <div className="success-alert">{successMsg}</div>}

            {/* 1. Personal Information */}
            <form className="account-form" onSubmit={handleUpdateProfileInfo} style={{ marginBottom: '36px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#12382e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUser style={{ color: '#c9a84c' }} /> Personal Information
              </h3>
              
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Email Address (Account ID)</label>
                <input type="email" value={customer?.email || ''} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
                <small style={{ color: '#9ca3af', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>Primary account email used for sign-in and invoice delivery.</small>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Full Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Enter your full name" required />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Mobile Phone Number</label>
                <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="10-digit mobile number" required />
              </div>

              <button type="submit" className="btn-account-submit" disabled={loading}>
                {loading ? 'Saving Profile…' : 'Save Profile Information'}
              </button>
            </form>

            {/* 2. Saved Delivery Address */}
            <form className="account-form" onSubmit={handleSaveDeliveryAddress}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#12382e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMapPin style={{ color: '#c9a84c' }} /> Saved Delivery Address
              </h3>
              <div style={{ background: '#fafaf9', borderLeft: '4px solid #c9a84c', padding: '12px 14px', borderRadius: '6px', marginBottom: '18px', fontSize: '12.5px', color: '#4b5563', lineHeight: '1.5' }}>
                <strong>Note:</strong> Address saved here will automatically pre-fill at checkout for future orders. Active or completed past orders will always retain their original shipping snapshot.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Recipient Name</label>
                  <input type="text" value={addrName} onChange={(e) => setAddrName(e.target.value)} placeholder="Recipient Name" required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Mobile Phone</label>
                  <input type="tel" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="Contact Phone" required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Address Line (Door No, Street, Landmark)</label>
                <input type="text" value={addrLine} onChange={(e) => setAddrLine(e.target.value)} placeholder="e.g. 92-7, Cross Street, Karur" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>City / Town</label>
                  <input type="text" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} placeholder="City" required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>District</label>
                  <input type="text" value={addrDistrict} onChange={(e) => setAddrDistrict(e.target.value)} placeholder="District" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>State</label>
                  <input type="text" value={addrState} onChange={(e) => setAddrState(e.target.value)} placeholder="State (e.g. Tamil Nadu)" required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>PIN Code (6 digits)</label>
                  <input type="text" value={addrPincode} onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="e.g. 639001" required />
                </div>
              </div>

              <button type="submit" className="btn-account-submit" disabled={loading}>
                {loading ? 'Saving Address…' : (addrId ? 'Update Saved Address' : 'Save New Address')}
              </button>
            </form>
          </div>
        );

      case 'orders':
        if (ordersLoading) {
          return (
            <div className="account-empty-state">
              <p>Loading your orders...</p>
            </div>
          );
        }

        if (!userOrders || userOrders.length === 0) {
          return (
            <div className="account-empty-state account-tab-fade">
              <div className="empty-icon-circle"><FiBox /></div>
              <h2>No orders yet</h2>
              <p>You haven't placed any orders with us. When you do, they will appear here.</p>
              <Link to="/shop" className="btn-account-cta">Start Shopping <FiArrowRight /></Link>
            </div>
          );
        }

        return (
          <div className="account-orders-list account-tab-fade">
            <h2 className="orders-section-title">Your Orders ({userOrders.length})</h2>
            {userOrders.map((order) => {
              const ordId = order.orderId || order.id;
              const isExpanded = expandedOrderId === ordId;
              return (
                <div className="account-order-card" key={ordId}>
                  <div className="aoc-header">
                    <div>
                      <span className="aoc-id">Order {ordId}</span>
                      {(order.customerId || customer?.id) && (
                        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                          Customer ID: #{order.customerId || customer?.id}
                        </span>
                      )}
                      <span className="aoc-date">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="aoc-status-badge">{order.orderStatus || order.status || 'Pending'}</div>
                  </div>

                  <div className="aoc-items">
                    {(order.items || []).map((it, idx) => {
                      const img = it.productImage || it.Product?.mainImage || it.image;
                      const imgSrc = getMediaUrl(img);
                      return (
                        <div className="aoc-item-row" key={idx}>
                          <img 
                            src={imgSrc} 
                            alt={it.productName} 
                            className="aoc-thumb"
                            onError={(e) => {
                              if (e.target.src !== window.location.origin + '/assests/pr1.jpeg') {
                                e.target.src = '/assests/pr1.jpeg';
                              }
                            }}
                          />
                          <div className="aoc-item-info">
                            <h4>{it.productName || 'Jewellery Item'}</h4>
                            <p>Qty: {it.quantity || 1} &nbsp;•&nbsp; ₹{Number(it.salesPrice ?? 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <OrderReviews order={order} />
                  <div className="aoc-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span className="aoc-total-label">Total Amount: </span>
                      <span className="aoc-total-amount">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</span>
                      {order.giftWrap ? <span style={{ marginLeft: '10px', fontSize: '11px', color: '#12382e', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>🎁 Gift Wrapped</span> : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', border: '1px solid #12382e', background: isExpanded ? '#12382e' : '#fff', color: isExpanded ? '#c9a84c' : '#12382e', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                        onClick={() => setExpandedOrderId(isExpanded ? null : ordId)}
                      >
                        <FiTruck /> {isExpanded ? 'Hide Tracking' : 'Track Order'}
                      </button>
                      <button
                        type="button"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', border: '1px solid #c9a84c', background: '#fdfbf7', color: '#12382e', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                        onClick={() => downloadOrderTaxInvoice(order, customer)}
                      >
                        <FiDownload /> Tax Invoice
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#12382e', fontWeight: 700 }}>Live Shipment Progress:</h4>
                      {renderCustomerTrackingStepper(order.orderStatus || order.status)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'reviews': {
        const deliveredOrders = (userOrders || []).filter(order => order.orderStatus === 'Delivered');
        if (deliveredOrders.length === 0) {
          return (
            <div className="account-empty-state account-tab-fade">
              <div className="empty-icon-circle"><FiStar /></div>
              <h2>No reviews yet</h2>
              <p>Product reviews become available once your orders are delivered. Share your experience and photos with Baani Jewels pieces!</p>
              <button 
                type="button" 
                className="btn-account-cta" 
                onClick={() => setActiveTab('orders')}
                style={{ cursor: 'pointer', border: 'none' }}
              >
                View Your Orders <FiArrowRight />
              </button>
            </div>
          );
        }
        return (
          <div className="account-orders-list account-tab-fade">
            <h2 className="orders-section-title">Your Product Reviews ({deliveredOrders.length})</h2>
            {deliveredOrders.map(order => (
              <div key={order.orderId || order.id} className="account-order-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f0ede6', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#12382e', fontSize: '15px' }}>Order {order.orderId || order.id}</span>
                  <span style={{ fontSize: '12px', color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>Delivered</span>
                </div>
                <OrderReviews order={order} />
              </div>
            ))}
          </div>
        );
      }

      case 'password':
        return (
          <div className="account-form-state account-tab-fade">
            <h2>Reset Password</h2>
            <p>We use OTP verification to ensure your account stays secure.</p>
            
            {errorMsg && <div className="error-alert">{errorMsg}</div>}
            {successMsg && <div className="success-alert">{successMsg}</div>}

            {pwdStep === 'request' && (
              <div className="account-form">
                <p style={{marginBottom: '20px', color: '#6b7280'}}>An OTP will be sent to <strong>{customer.email}</strong>.</p>
                <button onClick={handleRequestPwdOtp} className="btn-account-submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset OTP'}
                </button>
              </div>
            )}

            {pwdStep === 'verify' && (
              <form className="account-form" onSubmit={handleVerifyPwdOtp}>
                <div className="form-group">
                  <label>Enter OTP</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={pwdOtp} 
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => setPwdOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    placeholder="6-digit OTP" 
                    required 
                  />
                </div>
                <button type="submit" className="btn-account-submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" className="btn-text-link mt-2" onClick={() => setPwdStep('request')}>Cancel</button>
              </form>
            )}

            {pwdStep === 'reset' && (
              <form className="account-form" onSubmit={handleSetNewPassword}>
                <div className="form-group">
                  <label>New Password (minimum 6 characters)</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" required />
                </div>
                <button type="submit" className="btn-account-submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // ── RENDER: LOGGED OUT PORTAL ──
  if (!isLoggedIn) {
    return (
      <div className="account-page">
        <PageBanner title="Customer Account" trail="Sign In / Register" />

        <div className="auth-portal-wrapper account-tab-fade">
          {/* ── GUEST USER ORDER HISTORY (Shown when user is a guest who has placed orders) ── */}
          {(guestOrdersDetails.length > 0 || guestOrdersLoading) && (
            <div className="guest-orders-section account-tab-fade">
              <div className="guest-orders-header">
                <div className="guest-header-badge">
                  <FiShoppingBag /> GUEST SESSION
                </div>
                <h3>Your Orders on this Device</h3>
                <p>Track your shipment, view ordered pieces, and download official tax invoices.</p>
              </div>

              {guestOrdersLoading && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                  Loading your device orders…
                </div>
              )}

              <div className="guest-orders-grid">
                {guestOrdersDetails.map((ord) => (
                  <div key={ord.orderId} className="guest-order-card">
                    <div className="goc-top">
                      <div>
                        <span className="goc-meta-label">ORDER ID</span>
                        <h4 className="goc-id">{ord.orderId}</h4>
                        <span className="goc-date">
                          Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className={`order-status-badge status-${(ord.orderStatus || 'Pending').toLowerCase()}`}>
                        {ord.orderStatus || 'Pending'}
                      </span>
                    </div>

                    <div className="goc-items">
                      {(ord.items || []).map((it, i) => {
                        const rawImg = it.productImage || it.Product?.mainImage || it.image;
                        const imgSrc = getMediaUrl(rawImg);
                        return (
                          <div key={i} className="goc-item-row">
                            <img 
                              src={imgSrc} 
                              alt={it.productName} 
                              onError={(e) => { 
                                if (e.target.src !== window.location.origin + '/assests/pr1.jpeg') {
                                  e.target.src = '/assests/pr1.jpeg'; 
                                }
                              }} 
                            />
                            <div className="goc-item-info">
                              <span className="goc-item-name">{it.productName || 'Baani Jewels Piece'}</span>
                              <span className="goc-item-meta">
                                Qty: {it.quantity || 1} &nbsp;|&nbsp; ₹{Number(it.salesPrice ?? 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <OrderReviews order={ord} />
                    <div className="goc-bottom">
                      <div className="goc-total">
                        <span>Total Paid:</span>
                        <strong>₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="goc-actions">
                        <button
                          type="button"
                          className="btn-goc-invoice"
                          onClick={() => downloadOrderTaxInvoice(ord, customer)}
                        >
                          <FiDownload /> Tax Invoice
                        </button>
                        <button
                          type="button"
                          className="btn-goc-track"
                          onClick={() => navigate(`/track-order?orderId=${ord.orderId}`)}
                        >
                          <FiTruck /> Track Shipment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Banner inviting guest to create an account */}
              <div className="guest-to-member-banner">
                <div className="gtm-text">
                  <h4><RiSparkling2Line style={{ marginRight: '6px', verticalAlign: 'middle', color: '#c9a84c' }} /> Save These Orders Permanently — Create a Free Account</h4>
                  <p>Register with your email to link all past orders, save your delivery addresses, and unlock your permanent Cart &amp; Wishlist.</p>
                </div>
                <button
                  type="button"
                  className="btn-gtm-register"
                  onClick={() => {
                    setAuthTab('register');
                    const el = document.querySelector('.auth-split-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Create Free Account
                </button>
              </div>
            </div>
          )}

          <div className="auth-split-card">
            {/* ── LEFT: LUXURY BRAND SHOWCASE ── */}
            <div className="auth-showcase-pane">
              <div className="showcase-overlay" />
              <div className="showcase-content">
                <div className="brand-badge-row">
                  <img src="/assests/logo_bani.png" alt="Baani Jewels" className="showcase-logo" />
                  <span className="brand-tagline">ROYAL ATELIER</span>
                </div>

                <h2 className="showcase-title">
                  Timeless Beauty, <br />
                  <span>Made Affordable</span>
                </h2>
                <p className="showcase-desc">
                  At BAANI, discover exquisite imitation jewellery that brings the elegance of fine jewellery to your everyday style.
                </p>

                <div className="showcase-features">
                  <div className="showcase-feature-item">
                    <span className="feature-icon"><LuDiamond /></span>
                    <div>
                      <strong>Curated Jewellery Collections</strong>
                      <p>Traditional, contemporary &amp; statement designs</p>
                    </div>
                  </div>
                  <div className="showcase-feature-item">
                    <span className="feature-icon"><RiSparkling2Line /></span>
                    <div>
                      <strong>Premium Finish &amp; Detailing</strong>
                      <p>Beautifully crafted for an elegant look</p>
                    </div>
                  </div>
                  <div className="showcase-feature-item">
                    <span className="feature-icon"><FiGift /></span>
                    <div>
                      <strong>Exclusive Member Benefits</strong>
                      <p>Festive offers, new arrivals &amp; special rewards</p>
                    </div>
                  </div>
                  <div className="showcase-feature-item">
                    <span className="feature-icon"><FiShield /></span>
                    <div>
                      <strong>Safe &amp; Secure Delivery</strong>
                      <p>Carefully packed and delivered to your doorstep</p>
                    </div>
                  </div>
                </div>

                <div className="showcase-footer">
                  <span><RiSparkling2Line style={{ marginRight: '6px', verticalAlign: 'middle', color: '#c9a84c' }} /> Luxury Made Affordable · Crafted for Every Occasion</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: REFINED AUTH FORM PANE ── */}
            <div className="auth-form-pane">
              {/* Tab Switchers: ONLY Sign In & Register */}
              <div className="auth-portal-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthTab('register'); setErrorMsg(''); setSuccessMsg(''); setRegStep(1); }}
                >
                  Register
                </button>
              </div>

              {errorMsg && (
                <div className="error-alert">
                  <FiAlertCircle /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="success-alert">
                  <FiCheckCircle /> {successMsg}
                </div>
              )}

              {/* ── 1. SIGN IN FORM ── */}
              {authTab === 'login' && (
                <div className="auth-form-inner">
                  <div className="auth-form-heading">
                    <h3>Welcome Back</h3>
                    <p>Enter your registered email and password to access your account.</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="auth-form-body">
                    <div className="auth-field-group">
                      <label>Email Address</label>
                      <div className="input-with-icon">
                        <FiMail />
                        <input
                          type="email"
                          placeholder="e.g. yourname@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-field-group">
                      <div className="field-label-row">
                        <label>Password</label>
                        <button
                          type="button"
                          className="forgot-link-btn"
                          onClick={() => { setAuthTab('forgot'); setErrorMsg(''); setSuccessMsg(''); setForgotStep('request'); }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="input-with-icon">
                        <FiLock />
                        <input
                          type={showLoginPwd ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="pwd-toggle-btn"
                          onClick={() => setShowLoginPwd(!showLoginPwd)}
                          aria-label="Toggle password visibility"
                        >
                          {showLoginPwd ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn-royal-auth" disabled={loading}>
                      {loading ? 'Signing In…' : 'Sign In'}
                    </button>

                    <div className="auth-switch-footer">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthTab('register'); setErrorMsg(''); setSuccessMsg(''); setRegStep(1); }}
                      >
                        Create an account
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── 2. REGISTER FORM (3 STEPS) ── */}
              {authTab === 'register' && (
                <div className="auth-form-inner">
                  <div className="auth-form-heading">
                    <h3>Create Your Account</h3>
                    <p>Join the Baani Circle in 3 quick steps.</p>
                  </div>

                  {/* Step Progress Indicators */}
                  <div className="reg-stepper-pills">
                    <div className={`step-pill ${regStep >= 1 ? 'active' : ''} ${regStep > 1 ? 'completed' : ''}`}>
                      <span className="step-num">1</span>
                      <span className="step-txt">Details</span>
                    </div>
                    <div className="step-divider" />
                    <div className={`step-pill ${regStep >= 2 ? 'active' : ''} ${regStep > 2 ? 'completed' : ''}`}>
                      <span className="step-num">2</span>
                      <span className="step-txt">Verify OTP</span>
                    </div>
                    <div className="step-divider" />
                    <div className={`step-pill ${regStep >= 3 ? 'active' : ''}`}>
                      <span className="step-num">3</span>
                      <span className="step-txt">Password</span>
                    </div>
                  </div>

                  {/* Step 1: Details */}
                  {regStep === 1 && (
                    <form onSubmit={handleRegisterStep1} className="auth-form-body">
                      <div className="auth-field-group">
                        <label>Full Name</label>
                        <div className="input-with-icon">
                          <FiUser />
                          <input
                            type="text"
                            placeholder="Enter your name (letters only, min 3 chars)"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="auth-field-group">
                        <label>Email Address</label>
                        <div className="input-with-icon">
                          <FiMail />
                          <input
                            type="email"
                            placeholder="e.g. yourname@example.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="auth-field-group">
                        <label>Mobile Number (International)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="country-select-box"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.iso + c.code} value={c.code}>{c.flag} {c.country} ({c.code})</option>
                            ))}
                          </select>
                          <div className="input-with-icon" style={{ flex: 1 }}>
                            <FiPhone />
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={15}
                              placeholder="Mobile number (7–15 digits)"
                              value={regPhone}
                              onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="btn-royal-auth" disabled={loading}>
                        {loading ? 'Sending OTP…' : 'Send Verification OTP'}
                      </button>

                      <div className="auth-switch-footer">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => { setAuthTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                        >
                          Sign in here
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 2: OTP Verification */}
                  {regStep === 2 && (
                    <form onSubmit={handleRegisterStep2} className="auth-form-body">
                      <div className="otp-info-card">
                        <FiClock className="otp-clock-icon" />
                        <div>
                          <strong>Verification Code Sent</strong>
                          <p>We've sent a 6-digit OTP to <strong>{regEmail}</strong>. Valid for 10 minutes.</p>
                        </div>
                      </div>

                      <div className="auth-field-group">
                        <label>Enter 6-Digit OTP</label>
                        <div className="input-with-icon">
                          <FiKey />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                            placeholder="• • • • • •"
                            value={regOtp}
                            onKeyDown={(e) => {
                              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={{ letterSpacing: '8px', fontSize: '18px', textAlign: 'center', fontWeight: '700' }}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-royal-auth" disabled={loading}>
                        {loading ? 'Verifying…' : 'Verify & Continue'}
                      </button>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn-text-muted"
                          onClick={() => setRegStep(1)}
                        >
                          ← Change details
                        </button>
                        <button
                          type="button"
                          className="btn-text-gold"
                          onClick={handleResendRegOtp}
                          disabled={loading}
                        >
                          Resend OTP
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 3: Password Creation */}
                  {regStep === 3 && (
                    <form onSubmit={handleRegisterStep3} className="auth-form-body">
                      <div className="auth-field-group">
                        <label>Create Password (min. 6 characters)</label>
                        <div className="input-with-icon">
                          <FiLock />
                          <input
                            type={showRegPwd ? 'text' : 'password'}
                            placeholder="Enter new password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="pwd-toggle-btn"
                            onClick={() => setShowRegPwd(!showRegPwd)}
                            aria-label="Toggle password visibility"
                          >
                            {showRegPwd ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                        <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                          You can use letters, numbers, and special characters (!@#$%^&amp;*).
                        </span>
                      </div>

                      <div className="auth-field-group">
                        <label>Confirm Password</label>
                        <div className="input-with-icon">
                          <FiLock />
                          <input
                            type={showRegConfirmPwd ? 'text' : 'password'}
                            placeholder="Re-enter your password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="pwd-toggle-btn"
                            onClick={() => setShowRegConfirmPwd(!showRegConfirmPwd)}
                            aria-label="Toggle password visibility"
                          >
                            {showRegConfirmPwd ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="btn-royal-auth" disabled={loading}>
                        {loading ? 'Creating Account…' : 'Complete Registration'}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn-text-muted"
                          onClick={() => setRegStep(2)}
                        >
                          ← Back to OTP
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ── 3. FORGOT PASSWORD FLOW ── */}
              {authTab === 'forgot' && (
                <div className="auth-form-inner">
                  <div className="auth-form-heading">
                    <h3>Reset Your Password</h3>
                    <p>Enter your registered email to receive a secure 10-minute OTP.</p>
                  </div>

                  {forgotStep === 'request' && (
                    <form onSubmit={handleForgotRequest} className="auth-form-body">
                      <div className="auth-field-group">
                        <label>Registered Email Address</label>
                        <div className="input-with-icon">
                          <FiMail />
                          <input
                            type="email"
                            placeholder="e.g. yourname@example.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-royal-auth" disabled={loading}>
                        {loading ? 'Sending OTP…' : 'Send Password Reset OTP'}
                      </button>

                      <div className="auth-switch-footer">
                        Remember your password?{' '}
                        <button
                          type="button"
                          onClick={() => { setAuthTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                        >
                          Back to Sign In
                        </button>
                      </div>
                    </form>
                  )}

                  {forgotStep === 'verify' && (
                    <form onSubmit={handleForgotVerify} className="auth-form-body">
                      <div className="otp-info-card">
                        <FiClock className="otp-clock-icon" />
                        <div>
                          <strong>Verification Code Sent</strong>
                          <p>We've sent a 6-digit OTP to <strong>{forgotEmail}</strong>.</p>
                        </div>
                      </div>

                      <div className="auth-field-group">
                        <label>Enter 6-Digit OTP</label>
                        <div className="input-with-icon">
                          <FiKey />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                            placeholder="• • • • • •"
                            value={forgotOtp}
                            onKeyDown={(e) => {
                              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={{ letterSpacing: '8px', fontSize: '18px', textAlign: 'center', fontWeight: '700' }}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-royal-auth" disabled={loading}>
                        {loading ? 'Verifying…' : 'Verify OTP'}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn-text-muted"
                          onClick={() => setForgotStep('request')}
                        >
                          ← Change email
                        </button>
                      </div>
                    </form>
                  )}

                  {forgotStep === 'reset' && (
                    <form onSubmit={handleForgotReset} className="auth-form-body">
                      <div className="auth-field-group">
                        <label>New Password (min. 6 characters)</label>
                        <div className="input-with-icon">
                          <FiLock />
                          <input
                            type="password"
                            placeholder="Enter new password"
                            value={forgotNewPwd}
                            onChange={(e) => setForgotNewPwd(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-royal-auth" disabled={loading}>
                        {loading ? 'Updating…' : 'Set New Password &amp; Login'}
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <PageBanner title="My Account" trail="Account" />
      
      <div className="container account-container">
        {/* Left Sidebar */}
        <aside className="account-sidebar account-tab-fade">
          <div className="sidebar-profile">
            <div className="profile-avatar">{customer.name ? customer.name.charAt(0).toUpperCase() : 'U'}</div>
            <div className="profile-info">
              <h3>{customer.name}</h3>
              <p>{customer.email}</p>
            </div>
          </div>
          
          <nav className="account-nav">
            <ul>
              <li>
                <Link to="/cart" className="account-nav-link">
                  <FiShoppingBag /> Your Cart
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="account-nav-link">
                  <FiHeart /> Your Wishlist
                </Link>
              </li>

              <li className="nav-divider"></li>

              <li>
                <button 
                  className={`account-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FiUser /> My Profile &amp; Address
                </button>
              </li>

              <li>
                <button 
                  className={`account-nav-link ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  <FiBox /> Your Orders
                </button>
              </li>

              <li>
                <button 
                  className={`account-nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reviews')}
                >
                  <FiStar /> Your Reviews
                </button>
              </li>
              <li>
                <button 
                  className={`account-nav-link ${activeTab === 'password' ? 'active' : ''}`}
                  onClick={() => setActiveTab('password')}
                >
                  <FiLock /> Reset Password
                </button>
              </li>

              <li className="nav-divider"></li>

              <li>
                <button className="account-nav-link text-danger" onClick={handleLogout}>
                  <FiLogOut /> Logout
                </button>
              </li>

              <li>
                <button className="account-nav-link text-danger" onClick={handleRequestDeleteOtp}>
                  <FiTrash2 /> Delete Account
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Right Content Pane */}
        <main className="account-content">
          {renderContent()}
        </main>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <h3>Delete Account</h3>
            <p>An OTP has been sent to your email to confirm deletion. This action is irreversible.</p>
            <form onSubmit={handleConfirmDelete}>
              <input 
                type="text" 
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="Enter 6-digit OTP" 
                value={deleteOtp} 
                onKeyDown={(e) => {
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                required 
              />
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button type="submit" className="btn-danger" disabled={loading}>
                  {loading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;
