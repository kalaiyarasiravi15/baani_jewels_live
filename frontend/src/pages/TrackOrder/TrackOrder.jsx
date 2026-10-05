import GuestOrderAccess from '../../components/OrderReviews/GuestOrderAccess';
import OrderReviews from '../../components/OrderReviews/OrderReviews';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  FiSearch, FiTruck, FiBox, FiCheckCircle, FiClock,
  FiDownload, FiAlertCircle, FiPackage, FiMapPin,
  FiArrowRight, FiShield
} from 'react-icons/fi';
import PageBanner from '../../components/PageBanner/PageBanner';
import './TrackOrder.css';

import { API_BASE, getMediaUrl } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const renderTrackingStepper = (status) => {
  if (status === 'Cancelled') {
    return (
      <div className="track-cancelled-banner">
        <FiAlertCircle />
        <div>
          <strong>Order Status: Cancelled</strong>
          <p>This order has been cancelled. If paid, your refund will be processed within 5–7 business days.</p>
        </div>
      </div>
    );
  }

  const stages = [
    { key: 'Pending',          label: 'Order Placed',      desc: 'Received & Queued' },
    { key: 'Confirmed',        label: 'Confirmed',         desc: 'Artisan Verified' },
    { key: 'Packed',           label: 'Packed',            desc: 'Luxury Boxed' },
    { key: 'Shipped',          label: 'In Transit',        desc: 'Courier Dispatched' },
    { key: 'Out for Delivery', label: 'Out for Delivery',  desc: 'Arriving Today' },
    { key: 'Delivered',        label: 'Delivered',         desc: 'Safely Arrived' },
  ];

  const statusMap = {
    'Pending': 0,
    'Confirmed': 1,
    'Packed': 2,
    'Shipped': 3,
    'Out for Delivery': 4,
    'Delivered': 5,
  };

  const currentIdx = statusMap[status] ?? 0;

  return (
    <div className="track-stepper-wrap">
      <div className="track-stepper-line-bg">
        <div
          className="track-stepper-line-fill"
          style={{ width: `${(currentIdx / (stages.length - 1)) * 100}%` }}
        />
      </div>

      <div className="track-stepper-nodes">
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent   = idx === currentIdx;
          return (
            <div key={stage.key} className={`track-step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="track-step-circle">
                {isCompleted ? <FiCheckCircle /> : isCurrent ? <FiClock /> : <span>{idx + 1}</span>}
              </div>
              <div className="track-step-text">
                <span className="step-label">{stage.label}</span>
                <span className="step-desc">{stage.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const downloadTaxInvoice = (order) => {
  if (!order) return;
  const items = order.items || order.slots || [];
  const addr = order.shippingSnapshot || order.shippingAddress || {};
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to view and download your tax invoice.');
    return;
  }

  const itemsHtml = items.map((it, idx) => {
    const rawImg = it.productImage || it.Product?.mainImage || it.image || null;
    const pImage = getMediaUrl(rawImg);
    const price = Number(it.salesPrice ?? it.price ?? 0);
    const qty = Number(it.quantity || 1);
    const lineTotal = price * qty;

    return `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f3f4f6; text-align: center; vertical-align: middle; color: #4b5563; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${pImage ? `<img src="${pImage}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; flex-shrink: 0;" onerror="this.style.display='none'"/>` : ''}
            <div>
              <div style="font-weight: 700; color: #12382e; font-size: 13.5px;">${it.productName || it.Product?.name || 'Jewellery Piece'}</div>
              ${it.variantLabel ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${it.variantLabel}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f3f4f6; text-align: center; vertical-align: middle; font-weight: 600;">${qty}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f3f4f6; text-align: right; vertical-align: middle;">₹${price.toLocaleString('en-IN')}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #f3f4f6; text-align: right; vertical-align: middle; font-weight: 700; color: #12382e;">₹${lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  const rawId = String(order.orderId || order.id || '');
  const cleanInvoiceId = rawId.replace(/^SE-/, 'BJ-').replace(/^#+/, '');
  const displayInvoiceNo = cleanInvoiceId.startsWith('BJ-') ? cleanInvoiceId : `BJ-${cleanInvoiceId}`;

  printWindow.document.write(`
    <!DOCTYPE html>
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
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 26px 30px; color: #1e293b; background: #fff; line-height: 1.5; font-size: 12.5px; -webkit-font-smoothing: antialiased; }
          .inv-container { max-width: 820px; margin: 0 auto; background: #fff; }
          .inv-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #12382e; padding-bottom: 18px; margin-bottom: 24px; }
          .brand-wrap { display: flex; flex-direction: column; }
          .brand-title { font-size: 26px; font-weight: 700; color: #12382e; letter-spacing: 1.5px; font-family: 'Playfair Display', Georgia, serif; line-height: 1.1; }
          .brand-sub { color: #b45309; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
          .company-meta { color: #64748b; font-size: 11px; margin-top: 6px; line-height: 1.6; }
          .inv-details { text-align: right; }
          .inv-details h2 { display: inline-block; background: #12382e; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 6px; }
          .inv-details p { font-size: 12px; color: #4b5563; margin-top: 2px; }
          .badge-paid { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-top: 6px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .box { background: #fafaf9; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
          .box h4 { margin: 0 0 8px; color: #12382e; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          .box p { font-size: 12.5px; color: #374151; margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #12382e; color: #fff; }
          th { padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #ffffff; }
          .total-box { margin-left: auto; width: 320px; margin-bottom: 30px; }
          .total-row { display: flex; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .total-row.grand { font-size: 15px; font-weight: 800; background: #12382e; color: #fff; border-radius: 6px; border-bottom: none; padding: 10px 12px; margin-top: 6px; }
          .total-row.grand span:last-child { color: #facc15; }
          .footer-note { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 18px; line-height: 1.6; }
          .footer-note strong { color: #12382e; }
          .no-print { margin-top: 30px; text-align: center; }
          .print-btn { background: #12382e; color: #fff; border: none; padding: 11px 28px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(18, 56, 46, 0.2); }
          .print-btn:hover { background: #0d2821; }
          @media print { body { margin: 0; padding: 0; } .no-print { display: none; } .inv-container { max-width: 100%; } }
        </style>
      </head>
      <body>
        <div class="inv-container">
          <div class="inv-head">
            <div class="brand-wrap">
              <div class="brand-title">BAANI JEWELS</div>
              <div class="brand-sub">Luxury Made Affordable</div>
              <div class="company-meta">
                Proudly Based in Chennai, Tamil Nadu, India<br/>
                Phone: +91 93453 22621 &nbsp;|&nbsp; WhatsApp: +91 93453 22621<br/>
                Email: Baanijewels.ind@gmail.com
              </div>
            </div>
            <div class="inv-details">
              <h2>OFFICIAL TAX INVOICE</h2>
              <p><strong>Invoice No:</strong> ${displayInvoiceNo}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
              <p><strong>Payment Mode:</strong> ${order.paymentMethod || 'Online'}</p>
              ${order.paymentId ? `<p><strong>Payment ID:</strong> ${order.paymentId}</p>` : ''}
              <div><span class="badge-paid">Status: ${(order.paymentStatus || 'PAID').toUpperCase()}</span></div>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <h4>Customer Details</h4>
              <p><strong>${addr.name || order.customerName || order.Customer?.name || order.snapName || 'Customer'}</strong></p>
              
              <p>Email: ${order.customerEmail || order.guestEmail || order.Customer?.email || addr.email || order.snapEmail || '—'}</p>
              <p>Phone: ${addr.phone || order.customerPhone || order.Customer?.phone || order.snapPhone || '—'}</p>
            </div>
            <div class="box">
              <h4>Shipping Address</h4>
              <p><strong>${addr.name || order.Customer?.name || 'Customer'}</strong></p>
              <p>${[addr.addressLine, addr.city, addr.district, addr.state].filter(Boolean).join(', ') || 'Address on file'}</p>
              <p>Pincode: ${addr.pincode || '—'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 50px;">S.No</th>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 110px;">Price</th>
                <th style="text-align: right; width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Subtotal</span><span>₹${Math.max(0, Number(order.totalAmount || 0) - Number(order.shippingAmount || 0) - (order.giftWrap ? 30 : 0)).toLocaleString('en-IN')}</span></div>
            <div class="total-row"><span>Shipping</span><span>${Number(order.shippingAmount || 0) <= 0 ? 'FREE' : `₹${Number(order.shippingAmount).toLocaleString('en-IN')}`}</span></div>
            ${order.giftWrap ? '<div class="total-row"><span>Luxury Gift Wrapping</span><span>₹30</span></div>' : ''}
            <div class="total-row grand"><span>Total Amount Paid</span><span>₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}</span></div>
          </div>

          <div class="footer-note">
            <strong>Thank you for choosing Baani Jewels!</strong><br/>
            This is an authentic computer-generated tax invoice. No physical signature is required.<br/>
            For customer care or inquiries, email Baanijewels.ind@gmail.com or WhatsApp +91 93453 22621.
          </div>

          <div class="no-print">
            <button class="print-btn" onclick="window.print()">
              Print / Save as PDF
            </button>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const TrackOrder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [verifyOrderId, setVerifyOrderId] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);

  useEffect(() => {
    try {
      axios.get(API_BASE + '/api/session/guest-orders').then(({ data }) => setDeviceHistory(data)).catch(() => setDeviceHistory([]));
    } catch {
      setDeviceHistory([]);
    }
  }, []);

  const performSearch = async (targetId) => {
    const idToSearch = String(targetId || orderIdInput).trim().replace(/^#/, '');
    if (!idToSearch) {
      setErrorMessage('Please enter your Order ID to track.');
      return;
    }

    setErrorMessage('');
    setVerifyOrderId(null);
    setLoading(true);
    setOrderData(null);

    try {
      const res = await axios.get(`${API_BASE}/api/orders/track/${encodeURIComponent(idToSearch)}`);
      if (res.data?.success && res.data?.order) {
        setOrderData(res.data.order);
      } else {
        setErrorMessage('No order found with this reference ID. Please check and try again.');
      }
    } catch (err) {
      if (err.response?.data?.verificationRequired) setVerifyOrderId(idToSearch);
      setErrorMessage(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Order not found. Please verify your Order ID and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderData?.orderId) return;
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const { data } = await axios.get(API_BASE + '/api/orders/track/' + encodeURIComponent(orderData.orderId));
        if (active && data.success) setOrderData(data.order);
      } catch { /* Keep the existing order during a temporary connection failure. */ }
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [orderData?.orderId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramId = params.get('orderId');
    if (paramId) {
      const clean = paramId.trim().replace(/^#/, '');
      setOrderIdInput(clean);
      performSearch(clean);
    }
  }, [location.search]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performSearch(orderIdInput);
  };

  return (
    <div className="track-order-page">
      <PageBanner title="Track Your Shipment" trail="Track Order" />

      <div className="container track-order-container">
        <div className="track-search-card" data-aos="fade-up">
          <div className="track-search-header">
            <div className="track-header-icon"><FiTruck /></div>
            <h2>Live Shipment Tracking</h2>
            <p>Enter your Order ID (from your confirmation screen or confirmation email) to check real-time artisan packing &amp; courier delivery status.</p>
          </div>

          <form onSubmit={handleFormSubmit} className="track-search-form">
            <div className="track-input-wrap">
              <FiSearch className="track-input-icon" />
              <input
                type="text"
                placeholder="Enter Order ID (e.g. SE-1789125036833 or ORD-102)"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-track-submit" disabled={loading}>
              {loading ? 'Searching…' : 'Track Shipment'}
            </button>
          </form>

          {deviceHistory.length > 0 && !orderData && (
            <div className="track-history-pill-box">
              <span className="history-label">Recent orders on this device:</span>
              <div className="history-pills">
                {deviceHistory.map((item) => (
                  <button
                    key={item.orderId}
                    type="button"
                    className="history-pill-btn"
                    onClick={() => {
                      setOrderIdInput(item.orderId);
                      performSearch(item.orderId);
                    }}
                  >
                    {item.orderId}
                    <span className="pill-date">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="track-error-box">
              <FiAlertCircle />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {verifyOrderId && <GuestOrderAccess key={verifyOrderId} orderId={verifyOrderId} onVerified={() => performSearch(verifyOrderId)} />}
        {orderData && (
          <div className="track-result-panel" data-aos="fade-up">
            <div className="track-result-top">
              <div>
                <span className="order-meta-label">ORDER REFERENCE</span>
                <h3 className="order-meta-id">{orderData.orderId}</h3>
                <span className="order-meta-date">
                  Placed on {new Date(orderData.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="track-status-badge-wrap">
                <span className={`order-status-badge status-${(orderData.orderStatus || 'Pending').toLowerCase()}`}>
                  {orderData.orderStatus || 'Pending'}
                </span>
              </div>
            </div>

            <div className="track-stepper-container">
              <h4 className="track-section-title"><FiPackage /> Courier &amp; Fulfillment Progress</h4>
              {renderTrackingStepper(orderData.orderStatus || 'Pending')}
            </div>

            <div className="track-grid-details">
              <div className="track-items-box">
                <h4 className="track-section-title"><FiBox /> Ordered Pieces ({(orderData.items || []).length})</h4>
                <div className="track-items-list">
                  {(orderData.items || []).map((item, idx) => {
                    const rawImg = item.productImage || item.Product?.mainImage || item.image;
                    const imgSrc = getMediaUrl(rawImg);
                    return (
                      <div key={idx} className="track-single-item">
                        <img 
                          src={imgSrc} 
                          alt={item.productName} 
                          onError={(e) => { 
                            if (e.target.src !== window.location.origin + '/assests/pr1.jpeg') {
                              e.target.src = '/assests/pr1.jpeg'; 
                            }
                          }} 
                        />
                        <div className="item-meta">
                          <strong>{item.productName || item.Product?.name}</strong>
                          {item.variantLabel && <span className="item-variant">{item.variantLabel}</span>}
                          <span className="item-qty-price">
                            Qty: {item.quantity || 1} &nbsp;|&nbsp; ₹{Number(item.salesPrice ?? 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="item-subtotal">
                          ₹{(Number(item.salesPrice ?? 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <OrderReviews key={orderData.orderId} order={orderData} />
                <div className="track-price-summary">
                  <div className="summary-row">
                    <span>Shipping ({orderData.shippingType || 'Standard'})</span>
                    <strong>₹{Number(orderData.shippingAmount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  {orderData.giftWrap ? (
                    <div className="summary-row">
                      <span>Luxury Gift Wrapping</span>
                      <strong>₹30</strong>
                    </div>
                  ) : null}
                  <div className="summary-row grand">
                    <span>Total Amount Paid</span>
                    <span className="grand-val">₹{Number(orderData.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="track-sidebar-box">
                <div className="track-addr-card">
                  <h4 className="track-section-title"><FiMapPin /> Delivery Address</h4>
                  {(() => {
                    const addr = orderData.shippingSnapshot || orderData.shippingAddress || {};
                    return (
                      <div className="addr-content">
                        <strong>{addr.name || 'Customer'}</strong>
                        {orderData.customerId && (
                          <p style={{ margin: '2px 0 6px', fontSize: '12px', color: '#6b7280' }}>
                            Customer ID: <strong style={{ color: '#12382e' }}>#{orderData.customerId}</strong>
                          </p>
                        )}
                        <p>{[addr.addressLine, addr.city, addr.district, addr.state].filter(Boolean).join(', ')}</p>
                        {addr.pincode && <p>Pincode: <strong>{addr.pincode}</strong></p>}
                        {addr.phone && <p>Contact: <strong>{addr.phone}</strong></p>}
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  className="btn-download-inv-full"
                  onClick={() => downloadTaxInvoice(orderData)}
                >
                  <FiDownload /> Download Tax Invoice (PDF)
                </button>

                <div className="track-help-card">
                  <FiShield className="help-icon" />
                  <div>
                    <h5>Need assistance with this order?</h5>
                    <p>Our dedicated luxury concierge team is available to assist you via WhatsApp or Email.</p>
                    <Link to="/contact" className="help-link">Contact Support <FiArrowRight /></Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;