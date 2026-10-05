import { getSession, savePreference, endSession, sessionFetch } from '../sessionClient';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  RiEyeLine, RiDeleteBin6Line,
  RiArrowLeftSLine, RiArrowRightSLine, 
  RiFileList3Line, RiCloseLine, RiMapPinLine,
  RiTimeLine, RiShoppingBag3Line, RiUserLine,
  RiCalendarCheckLine, RiDownloadLine, RiFilter3Line,
  RiBankCardLine, RiCheckboxCircleLine, RiCloseCircleLine, RiPrinterLine,
  RiSearchLine
} from "react-icons/ri";
import { FiEye, FiTrash2 } from "react-icons/fi";
import './OrderPage.css';
import { API, IMG } from '../config';
import OrderTrackingStepper from '../components/OrderTrackingStepper/OrderTrackingStepper';
import AdminPagination from '../components/AdminPagination';

const ORDERS_PER_PAGE = 10;   // → single source of truth




const getShipping = (order) => {
  if (order.shippingSnapshot) return order.shippingSnapshot;
  const s = order.orderShipping;
  if (s) {
    return {
      name:        s.name        || order.Customer?.name  || 'Guest',
      phone:       s.phone       || order.Customer?.phone || null,
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
      name:        order.Customer?.name  || 'Guest',
      phone:       order.Customer?.phone || null,
      addressLine: [addr.houseNo, addr.street].filter(Boolean).join(', '),
      city:        addr.city     || null,
      district:    addr.district || null,
      state:       addr.state    || null,
      pincode:     addr.pincode  || null,
    };
  }
  return null;
};

const getShippingAddressStr = (order) => {
  const s = getShipping(order);
  if (!s) return null;
  const parts = [s.name, s.phone, s.addressLine, s.city, s.district, s.state, s.pincode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

/* ════════════════════════════════════════════════════════════════
   PRINT GENERATORS
════════════════════════════════════════════════════════════════ */
const printTodayOrdersHTML = (orders) => {
  const win = window.open('', '_blank');
  
  const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  });
  
  const orderRows = orders.map((o, idx) => {
    const slots = o.slots || [];
    const itemsText = slots.map(sl => `${sl.Product?.name || sl.productName || sl.productId} (×${sl.quantity})`).join(', ');
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${o.orderId}</strong></td>
        <td>
          <div style="font-weight:600;color:#12382e">${o.Customer?.name || o.snapName || 'Customer'}</div>
          <div style="font-size:11px;color:#6b7280">${o.Customer?.phone || o.snapPhone || '—'}</div>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
        <td>${o.paymentMethod || 'Online'}</td>
        <td><span class="badge ${o.orderStatus?.toLowerCase().replace(/\s+/g, '-')}">${o.orderStatus}</span></td>
        <td style="max-width:300px;font-size:11.5px;color:#475569">${itemsText || '—'}</td>
        <td class="right" style="font-weight:700">₹${Number(o.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>BAANI JEWELS — Today's Orders Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family: Arial, Helvetica, sans-serif;padding:36px 40px;color:#1a1a2e;background:#fff;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #12382e;padding-bottom:16px;margin-bottom:20px}
  .brand-wrap{display:flex;align-items:center;gap:14px}
  .brand-logo{width:56px;height:56px;object-fit:contain}
  .title{font-size:24px;font-weight:800;color:#12382e;letter-spacing:1px;font-family: Arial, Helvetica, sans-serif}
  .title span{color:#c9a84c}
  .muted{color:#6b7280;font-size:11.5px;margin-top:2px}
  .meta{font-size:11.5px;color:#6b7280;text-align:right;line-height:1.6}
  .stats-strip{display:flex;gap:12px;margin-bottom:24px}
  .stat-box{flex:1;background:#f9fafb;border-left:4px solid #12382e;border-radius:8px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
  .stat-box h3{font-size:20px;color:#12382e;font-weight:700}
  .stat-box p{font-size:9.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:3px;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  thead tr{background:#12382e}
  th{color:#ffffff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  td{padding:10px 12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  tr:nth-child(even) td{background:#fafaf9}
  tr:last-child td{border-bottom:none}
  .right{text-align:right}
  .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap}
  .badge.delivered{background:#ecfdf5;color:#065f46}
  .badge.pending{background:#fffbeb;color:#b45309}
  .badge.cancelled{background:#fef2f2;color:#b91c1c}
  .badge.shipped{background:#eff6ff;color:#1d4ed8}
  .badge.confirmed{background:#f0fdf4;color:#15803d}
  .badge.out-for-delivery{background:#f0fdfa;color:#0f766e}
  .footer{margin-top:36px;text-align:center;color:#9ca3af;font-size:10.5px;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:18px 22px}}
</style></head><body>
  <div class="header">
    <div class="brand-wrap">
      <div>
        <div class="title">BAANI <span>JEWELS</span></div>
        <div class="muted">Luxury Made Affordable &nbsp;·&nbsp; Today's Orders Audit &amp; Dispatch Report</div>
      </div>
    </div>
    <div class="meta"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br/><strong>Generated:</strong> ${new Date().toLocaleTimeString('en-IN')}</div>
  </div>
  <div class="stats-strip">
    <div class="stat-box"><h3>${orders.length}</h3><p>Total Orders</p></div>
    <div class="stat-box"><h3>₹${totalAmount.toLocaleString('en-IN')}</h3><p>Total Value</p></div>
    <div class="stat-box"><h3>${statusCounts['Delivered'] || 0}</h3><p>Delivered</p></div>
    <div class="stat-box"><h3>${statusCounts['Pending'] || 0}</h3><p>Pending</p></div>
    <div class="stat-box"><h3>${statusCounts['Cancelled'] || 0}</h3><p>Cancelled</p></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:50px;text-align:center">S.No</th>
      <th>Order ID</th>
      <th>Customer</th>
      <th>Date</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Items Summary</th>
      <th class="right">Total</th>
    </tr></thead>
    <tbody>${orderRows}</tbody>
  </table>
  <div class="footer">BAANI JEWELS &nbsp;|&nbsp; Luxury Made Affordable &nbsp;|&nbsp; Generated automatically by Admin Portal</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

const printFilteredOrdersHTML = (orders, startDate, endDate) => {
  const win = window.open('', '_blank');
  
  const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  });
  
  const orderRows = orders.map((o, idx) => {
    const slots = o.slots || [];
    const itemsText = slots.map(sl => `${sl.Product?.name || sl.productName || sl.productId} (×${sl.quantity})`).join(', ');
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${o.orderId}</strong></td>
        <td>
          <div style="font-weight:600;color:#12382e">${o.Customer?.name || o.snapName || 'Customer'}</div>
          <div style="font-size:11px;color:#6b7280">${o.Customer?.phone || o.snapPhone || '—'}</div>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
        <td>${o.paymentMethod || '—'}</td>
        <td><span class="badge ${o.orderStatus?.toLowerCase().replace(/\s+/g, '-')}">${o.orderStatus}</span></td>
        <td style="max-width:300px;font-size:11.5px;color:#475569">${itemsText || '—'}</td>
        <td class="right" style="font-weight:700">₹${Number(o.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  let titleExtra = startDate && endDate ? `(${startDate} to ${endDate})` : (startDate ? `(From ${startDate})` : (endDate ? `(Until ${endDate})` : ''));

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>BAANI JEWELS — Orders Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family: Arial, Helvetica, sans-serif;padding:36px 40px;color:#1a1a2e;background:#fff;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #12382e;padding-bottom:16px;margin-bottom:20px}
  .brand-wrap{display:flex;align-items:center;gap:14px}
  .brand-logo{width:56px;height:56px;object-fit:contain}
  .title{font-size:24px;font-weight:800;color:#12382e;letter-spacing:1px;font-family: Arial, Helvetica, sans-serif}
  .title span{color:#c9a84c}
  .muted{color:#6b7280;font-size:11.5px;margin-top:2px}
  .meta{font-size:11.5px;color:#6b7280;text-align:right;line-height:1.6}
  .stats-strip{display:flex;gap:12px;margin-bottom:24px}
  .stat-box{flex:1;background:#f9fafb;border-left:4px solid #12382e;border-radius:8px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
  .stat-box h3{font-size:20px;color:#12382e;font-weight:700}
  .stat-box p{font-size:9.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:3px;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  thead tr{background:#12382e}
  th{color:#ffffff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  td{padding:10px 12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  tr:nth-child(even) td{background:#fafaf9}
  tr:last-child td{border-bottom:none}
  .right{text-align:right}
  .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap}
  .badge.delivered{background:#ecfdf5;color:#065f46}
  .badge.pending{background:#fffbeb;color:#b45309}
  .badge.cancelled{background:#fef2f2;color:#b91c1c}
  .badge.shipped{background:#eff6ff;color:#1d4ed8}
  .badge.confirmed{background:#f0fdf4;color:#15803d}
  .badge.out-for-delivery{background:#f0fdfa;color:#0f766e}
  .footer{margin-top:36px;text-align:center;color:#9ca3af;font-size:10.5px;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:18px 22px}}
</style></head><body>
  <div class="header">
    <div class="brand-wrap">
      <div>
        <div class="title">BAANI <span>JEWELS</span></div>
        <div class="muted">Luxury Made Affordable &nbsp;·&nbsp; Orders Report ${titleExtra}</div>
      </div>
    </div>
    <div class="meta"><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</div>
  </div>
  <div class="stats-strip">
    <div class="stat-box"><h3>${orders.length}</h3><p>Filtered Orders</p></div>
    <div class="stat-box"><h3>₹${totalAmount.toLocaleString('en-IN')}</h3><p>Filtered Value</p></div>
    <div class="stat-box"><h3>${statusCounts['Delivered'] || 0}</h3><p>Delivered</p></div>
    <div class="stat-box"><h3>${statusCounts['Pending'] || 0}</h3><p>Pending</p></div>
    <div class="stat-box"><h3>${statusCounts['Cancelled'] || 0}</h3><p>Cancelled</p></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:50px;text-align:center">S.No</th>
      <th>Order ID</th>
      <th>Customer</th>
      <th>Date</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Items Summary</th>
      <th class="right">Total</th>
    </tr></thead>
    <tbody>${orderRows}</tbody>
  </table>
  <div class="footer">BAANI JEWELS &nbsp;|&nbsp; Luxury Made Affordable &nbsp;|&nbsp; Generated automatically by Admin Portal</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

const printOrderInvoiceHTML = (order, companyState = 'Tamil Nadu') => {
  const win = window.open('', '_blank');
  
  const snap = getShipping(order);
  const slots = order.slots || [];
  
  let totalMRP = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalGst = 0;
  
  const itemRows = slots.map((sl, idx) => {
    const mrp = parseFloat(sl.Product?.mrpPrice || sl.mrpPrice || sl.salesPrice || 0);
    const price = parseFloat(sl.salesPrice || 0);
    const quantity = parseInt(sl.quantity || 1);
    const lineTotal = price * quantity;
    const discount = Math.max(0, mrp - price);
    const lineDiscount = discount * quantity;
    const lineTaxable = Number(sl.basePrice ?? price) * quantity;
    const lineGst = Number(sl.gstAmount ?? 0) * quantity;
    
    totalMRP += mrp * quantity;
    totalDiscount += lineDiscount;
    totalTaxable += lineTaxable;
    totalGst += lineGst;
    
    const pImage = sl.productImage ? (sl.productImage.startsWith('http') ? sl.productImage : (IMG + sl.productImage)) : (sl.Product?.mainImage ? (IMG + sl.Product?.mainImage) : null);
    
    return `
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;text-align:center;vertical-align:middle;color:#4b5563;font-weight:600;">${idx + 1}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
          <div style="display:flex;align-items:center;gap:12px">
            ${pImage ? `<img src="${pImage}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;flex-shrink:0" onError="this.style.display='none'"/>` : ''}
            <div>
              <div style="font-weight:700;color:#12382e;font-size:13.5px">${sl.Product?.name || sl.productName || 'Product'}</div>
              ${sl.variantLabel ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px;">${sl.variantLabel}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="right" style="padding:12px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">₹${mrp.toLocaleString('en-IN')}</td>
        <td class="right text-gold" style="padding:12px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">${discount > 0 ? `-₹${discount.toLocaleString('en-IN')}` : '—'}</td>
        <td class="right" style="padding:12px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">₹${price.toLocaleString('en-IN')}</td>
        <td class="center" style="padding:12px 10px;border-bottom:1px solid #f3f4f6;text-align:center;vertical-align:middle;font-weight:600;">${quantity}</td>
        <td class="right" style="padding:12px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;font-weight:700;color:#12382e">₹${lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');
  
  const finalDiscount = totalDiscount + parseFloat(order.discountAmount || 0);
  const deliveryCharge = Number(order.shippingAmount || (parseFloat(order.totalAmount || 0) - (totalMRP - totalDiscount)) || 0);
  const normalizeState = (value) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/\./g, '');
    return normalized === 'tn' ? 'tamil nadu' : normalized;
  };
  const isInterstate = snap?.state && normalizeState(snap.state) !== normalizeState(companyState);
  const cgst = isInterstate ? 0 : totalGst / 2;
  const sgst = isInterstate ? 0 : totalGst / 2;
  
  const rawId = String(order.orderId || order.id || '');
  const cleanInvoiceId = rawId.replace(/^SE-/, 'BJ-').replace(/^#+/, '');
  const displayInvoiceNo = cleanInvoiceId.startsWith('BJ-') ? cleanInvoiceId : `BJ-${cleanInvoiceId}`;
  
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Tax Invoice - ${displayInvoiceNo} - Baani Jewels</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page { size: A4; margin: 12mm; }
  body{font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:26px 30px;color:#1e293b;background:#fff;font-size:12.5px;line-height:1.5;-webkit-font-smoothing:antialiased}
  .inv-container{max-width:820px;margin:0 auto;background:#fff}
  .invoice-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #12382e;padding-bottom:18px;margin-bottom:24px}
  .brand-wrap{display:flex;flex-direction:column}
  .brand-title{font-size:26px;font-weight:700;color:#12382e;letter-spacing:1.5px;font-family:'Playfair Display',Georgia,serif;line-height:1.1}
  .brand-sub{font-size:11px;color:#c89c4a;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
  .company-info{font-size:11.5px;color:#6b7280;margin-top:6px;line-height:1.5}
  .invoice-details{text-align:right}
  .invoice-details h2{font-size:20px;font-weight:800;color:#12382e;text-transform:uppercase;margin-bottom:4px;letter-spacing:1px}
  .invoice-details p{font-size:12px;color:#4b5563;margin-top:2px}
  .badge-paid{display:inline-block;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;text-transform:uppercase;margin-top:6px;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
  .address-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .address-box{border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;background:#fafaf9}
  .address-box h3{font-size:11px;font-weight:800;color:#12382e;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  .address-box p{font-size:12.5px;color:#374151;margin-bottom:3px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
  thead tr{background:#12382e}
  th{color:#ffffff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  td{padding:12px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
  .right{text-align:right}
  .center{text-align:center}
  .text-gold{color:#b45309;font-weight:600}
  .summary-wrap{display:flex;justify-content:flex-end}
  .summary-table{width:320px;border-collapse:collapse;font-size:12.5px}
  .summary-table td{padding:6px 12px;border:none;border-bottom:1px solid #f3f4f6}
  .summary-table tr.grand-total td{font-weight:800;font-size:14px;color:#fff;background:#12382e;border-radius:6px;border-bottom:none;padding:10px 12px}
  .summary-table tr.grand-total td span{color:#facc15}
  .footer{margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #eee;padding-top:14px;line-height:1.6}
  .footer strong{color:#12382e}
  @media print{body{padding:0}.inv-container{max-width:100%}}
</style></head><body>
  <div class="inv-container">
    <div class="invoice-header">
      <div class="brand-wrap">
        <div>
          <div class="brand-title">BAANI JEWELS</div>
          <div class="brand-sub">Luxury Made Affordable</div>
          <div class="company-info">
            Proudly Based in Chennai, Tamil Nadu, India<br/>
            Phone: +91 93453 22621 &nbsp;|&nbsp; WhatsApp: +91 93453 22621<br/>
            Email: Baanijewels.ind@gmail.com
          </div>
        </div>
      </div>
      <div class="invoice-details">
        <h2>OFFICIAL TAX INVOICE</h2>
        <p><strong>Invoice No:</strong> ${displayInvoiceNo}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
        <p><strong>Payment Mode:</strong> ${order.paymentMethod || 'Online (Razorpay)'}</p>
        ${order.paymentId ? `<p><strong>Payment ID:</strong> ${order.paymentId}</p>` : ''}
        <div><span class="badge-paid">${order.paymentStatus === 'Paid' ? 'PAID' : (order.paymentStatus || 'PENDING')}</span></div>
      </div>
    </div>

  <div class="address-grid">
    <div class="address-box">
      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${order.Customer?.name || snap?.name || order.snapName || 'Customer'}</p>
      <p><strong>Email:</strong> ${order.Customer?.email || order.customerEmail || order.guestEmail || order.shippingSnapshot?.email || snap?.email || order.snapEmail || '—'}</p>
      <p><strong>Phone:</strong> ${order.Customer?.phone || snap?.phone || order.snapPhone || '—'}</p>
    </div>
    <div class="address-box">
      <h3>Shipping Address</h3>
      ${snap ? `
        <p><strong>Name:</strong> ${snap.name || order.snapName || order.Customer?.name || '—'}</p>
        <p><strong>Phone:</strong> ${snap.phone || order.snapPhone || order.Customer?.phone || '—'}</p>
        <p><strong>Address:</strong> ${snap.addressLine || order.snapAddressLine || '—'}</p>
        <p>${[snap.district || order.snapDistrict, snap.city || order.snapCity, snap.state || order.snapState, snap.pincode || order.snapPincode].filter(Boolean).join(', ')}</p>
      ` : `
        <p style="color:#aaa;font-style:italic">Shipping address details not available</p>
      `}
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:50px;text-align:center">S.No</th>
      <th>Item Description</th>
      <th class="right" style="width:100px">MRP Price</th>
      <th class="right" style="width:90px">Savings</th>
      <th class="right" style="width:100px">Sales Price</th>
      <th class="center" style="width:60px">Qty</th>
      <th class="right" style="width:110px">Total</th>
    </tr></thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary-wrap">
    <table class="summary-table">
      ${totalGst > 0 ? `
      <tr><td>Taxable Value</td><td class="right">₹${totalTaxable.toLocaleString('en-IN')}</td></tr>
      ${isInterstate
        ? `<tr><td>IGST Included</td><td class="right">₹${totalGst.toLocaleString('en-IN')}</td></tr>`
        : `<tr><td>CGST Included</td><td class="right">₹${cgst.toLocaleString('en-IN')}</td></tr><tr><td>SGST Included</td><td class="right">₹${sgst.toLocaleString('en-IN')}</td></tr>`}
      ` : ''}
      <tr>
        <td>Subtotal MRP</td>
        <td class="right">₹${totalMRP.toLocaleString('en-IN')}</td>
      </tr>
      ${finalDiscount > 0 ? `
      <tr>
        <td class="text-gold">Total Savings</td>
        <td class="right text-gold">-₹${finalDiscount.toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr>
        <td>Delivery &amp; Shipping</td>
        <td class="right" style="color:#059669;font-weight:600">${deliveryCharge <= 0 ? 'FREE' : `₹${deliveryCharge.toLocaleString('en-IN')}`}</td>
      </tr>
      <tr class="grand-total">
        <td><span>GRAND TOTAL</span></td>
        <td class="right"><span>₹${Number(order.totalAmount).toLocaleString('en-IN')}</span></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <strong>Thank you for choosing Baani Jewels!</strong><br/>
    This is an authentic computer-generated invoice. No physical signature required.<br/>
    For assistance, contact us at Baanijewels.ind@gmail.com or call +91 93453 22621.
  </div>
  </div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

/* ────────────────────────────────────────────────────────
   REACT COMPONENT
──────────────────────────────────────────────────────── */
const OrderPage = ({ orderStatusFilter, setActivePage, todayFilter, setTodayFilter }) => {
  const location = useLocation();
  const adminRole = getSession()?.admin?.role || 'admin';
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [companyState, setCompanyState] = useState('Tamil Nadu');

  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrderList, setTodayOrderList] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // { orderId, courierPartner }
  const [packageDetails, setPackageDetails] = useState({ weight: '1', length: '10', width: '10', height: '10', shippingAmount: '' });
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [trackingState, setTrackingState] = useState({ loading: false, orderId: null, data: null, error: '' });
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('Confirmed');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isUpdatingSettlement, setIsUpdatingSettlement] = useState(false);

  const handleBulkStatusUpdate = async () => {
    if (!selectedOrderIds || selectedOrderIds.length === 0) {
      toast.warn('Please select at least one order to update.');
      return;
    }
    setIsBulkUpdating(true);
    try {
      const token = 'session';
      const res = await axios.put(
        `${API}/orders/bulk-update-status`,
        { orderIds: selectedOrderIds, orderStatus: bulkStatus },
        { headers: { Authorization: token ? `Bearer ${token}` : undefined, 'x-admin-request': 'true' } }
      );
      if (res.data?.success) {
        toast.success(res.data.message || `Successfully updated ${selectedOrderIds.length} orders to ${bulkStatus}`);
        setSelectedOrderIds([]);
        fetchOrders();
      }
    } catch (err) {
      console.error('Bulk Status Update Error:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update selected orders');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkSettlementUpdate = async (status) => {
    if (selectedOrderIds.length === 0) return;
    setIsUpdatingSettlement(true);
    try {
      const res = await axios.post(`${API}/orders/shipping/update-settlement`, {
        orderIds: selectedOrderIds,
        courierPaymentStatus: status
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedOrderIds([]);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update courier settlement');
    } finally {
      setIsUpdatingSettlement(false);
    }
  };


  const query        = new URLSearchParams(location.search);
  const filter       = query.get('filter');
  const statusQuery  = query.get('status');
  const paymentQuery = query.get('paymentMethod');
  const orderIdParam = query.get('orderId');
  const isTodayFilter = filter === 'today';

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState(statusQuery || 'All');
  const [paymentFilter, setPaymentFilter] = useState(paymentQuery || 'All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderSearch(orderSearchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [orderSearchQuery]);

  const effectiveStatus = statusFilter === 'All' ? (orderStatusFilter || '') : statusFilter;
  const effectivePayment = paymentFilter === 'All' ? '' : paymentFilter;

  useEffect(() => {
    fetchOrders();
  }, [effectiveStatus, adminRole === 'admin' ? effectivePayment : '', currentPage, location.search, startDate, endDate, debouncedOrderSearch]);
  useEffect(() => { fetchTodayStats(); }, []);
  useEffect(() => {
    axios.get(`${API}/settings`).then(res => {
      if (res.data?.success && res.data.data?.COMPANY_STATE) setCompanyState(res.data.data.COMPANY_STATE);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!loading && orderIdParam && orders.length > 0) {
      const match = orders.find(
        o => String(o.orderId) === String(orderIdParam) || String(o.id) === String(orderIdParam)
      );
      if (match) setSelectedOrder(match);
    }
  }, [loading, orders, orderIdParam]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/all`, {
        params: {
          status: effectiveStatus,
          paymentMethod: effectivePayment || undefined,
          page:   currentPage,
          limit:  ORDERS_PER_PAGE,          // send limit to backend
          filter: isTodayFilter ? 'today' : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: debouncedOrderSearch ? debouncedOrderSearch.trim() : undefined
        }
      });
      if (res.data?.orders) {
        setOrders(res.data.orders);
        setTotalPages(res.data.totalPages || 1);
        setTotalOrders(res.data.totalOrders || res.data.orders.length);
        const rev = res.data.orders.reduce((a, o) => a + Number(o.totalAmount || 0), 0);
        setTotalRevenue(rev);
      }
    } catch (err) {
      console.error('API Error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const res = await axios.get(`${API}/orders/all`, {
        params: { filter: 'today', page: 1, limit: 1000 }
      });
      if (res.data?.orders) {
        const list = res.data.orders;
        setTodayOrderList(list);
        setTodayOrders(list.length);
        setTodayRevenue(list.reduce((a, o) => a + Number(o.totalAmount || 0), 0));
      }
    } catch (err) {
      console.error("Today stats error:", err);
    }
  };

  const handleDownloadPDF = () => {
    if (todayOrderList.length === 0) {
      toast.info("No today's orders to download.");
      return;
    }
    printTodayOrdersHTML(todayOrderList);
  };

  const handleAssignCourier = async (e) => {
    e.preventDefault();
    if (!assignModal) return;
    setIsAssigning(true);
    try {
      const res = await axios.post(`${API}/orders/shipping/assign/${assignModal.orderId}`, {
        courierPartner: assignModal.courierPartner,
        packageDetails
      }, {
        headers: { Authorization: `Bearer ${'session'}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setAssignModal(null);
        fetchOrders(currentPage, statusFilter, paymentFilter);
        if (selectedOrder && selectedOrder.orderId === assignModal.orderId) {
          setSelectedOrder(prev => ({ ...prev, courierPartner: assignModal.courierPartner, awb_code: res.data.awb_code, orderStatus: 'Shipped' }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign courier');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDownloadLabel = async (order) => {
    setIsDownloading(true);
    try {
      const res = await axios.get(`${API}/orders/shipping/label/${order.orderId}`, {
        headers: { Authorization: `Bearer ${'session'}` }
      });
      if (res.data.success && res.data.label) {
        const url = res.data.label;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `Label_${order.orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error('Failed to get label');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to get label');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTrackShipment = async (order) => {
    setTrackingState({ loading: true, orderId: order.orderId, data: null, error: '' });
    try {
      const res = await axios.get(`${API}/orders/shipping/tracking/${order.orderId}`, {
        headers: { Authorization: `Bearer ${'session'}` }
      });

      if (res.data.success) {
        setTrackingState({
          loading: false,
          orderId: order.orderId,
          data: res.data,
          error: ''
        });
      } else {
        const message = res.data.message || 'Tracking not available';
        setTrackingState({ loading: false, orderId: order.orderId, data: null, error: message });
        toast.error(message);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch tracking';
      setTrackingState({ loading: false, orderId: order.orderId, data: null, error: message });
      toast.error(message);
    }
  };


  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = 'session';
      const res = await axios.put(
        `${API}/orders/update/${id}`,
        { orderStatus: newStatus },
        { headers: { Authorization: token ? `Bearer ${token}` : undefined, 'x-admin-request': 'true' } }
      );
      toast.success(res.data?.message || `Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      console.error('Update Error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to update order status';
      toast.error(message);
    }
  };



  const deleteOrder = (id) => {
    setDeleteTarget(id);
    toast.warn(
      <div style={{ lineHeight: 1.5 }}>
        <strong>Delete this order?</strong>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={() => confirmDelete(id)}
            style={{
              background: '#ef4444', color: '#fff', border: 'none',
              borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
            }}
          >
            Yes, Delete
          </button>
          <button
            onClick={() => { toast.dismiss(); setDeleteTarget(null); }}
            style={{
              background: '#e2e8f0', color: '#475569', border: 'none',
              borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false, icon: '' }
    );
  };

  const confirmDelete = async (id) => {
    toast.dismiss();
    setDeleteTarget(null);
    try {
      await axios.delete(`${API}/orders/delete/${id}`);
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error('Failed to delete order');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + '  ·  '
      + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  /* ── Pagination helpers ── */
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Build page number buttons (max 5 visible) */
  const pageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  /* ── Filter orders (only confirmed online paid orders, case-insensitive comprehensive search) ── */
  const cleanOrderSearch = (orderSearchQuery || '').trim().toLowerCase();
  const filteredOrders = orders.filter(o => {
    // 100% online prepayment: exclude failed payments
    if (o.paymentStatus === 'Failed') return false;

    // Comprehensive search query matching (Order ID, Customer Name, Phone, Email, Status, Products, Location)
    if (!cleanOrderSearch) return true;
    const snap = getShipping(o);
    const orderIdMatch   = String(o.orderId || '').toLowerCase().includes(cleanOrderSearch);
    const customerMatch  = String(o.Customer?.name || o.customerName || snap?.name || '').toLowerCase().includes(cleanOrderSearch);
    const phoneMatch     = String(o.Customer?.phone || o.phone || snap?.phone || '').toLowerCase().includes(cleanOrderSearch);
    const emailMatch     = String(o.Customer?.email || o.customerEmail || o.guestEmail || snap?.email || '').toLowerCase().includes(cleanOrderSearch);
    const statusMatch    = String(o.orderStatus || '').toLowerCase().includes(cleanOrderSearch);
    const itemsMatch     = (o.slots || []).some(sl => (sl.Product?.name || sl.productName || '').toLowerCase().includes(cleanOrderSearch));
    const locationMatch  = String(snap?.city || snap?.district || snap?.pincode || '').toLowerCase().includes(cleanOrderSearch);
    return orderIdMatch || customerMatch || phoneMatch || emailMatch || statusMatch || itemsMatch || locationMatch;
  });

  return (
    <div className="ars-order-wrapper">
      <div className="ars-main-card">
        <div className="card-header">
          <div className="title-area">
            <h1>Order <span className="gold-text">Management</span></h1>
            <p className="status-indicator">
              Showing: <b>{effectiveStatus || 'All'}</b>
              {isTodayFilter ? ' today' : ''} Orders
            </p>
          </div>

          <div className="order-stats">
            <div className="stat-box">
              <p>Total Orders</p>
              <h3>{totalOrders}</h3>
            </div>
            {adminRole === 'admin' && (
            <div className="stat-box">
              <p>Total Revenue</p>
              <h3>₹{totalRevenue.toLocaleString('en-IN')}</h3>
            </div>
            )}

            <div className="stat-box stat-box--today">
              <div className="today-stat-top">
                <RiCalendarCheckLine className="today-icon" />
                <p>Today's Orders</p>
              </div>
              <h3>{todayOrders}</h3>
              <span className="today-revenue">₹{todayRevenue.toLocaleString('en-IN')}</span>
              <button
                className="pdf-download-btn"
                onClick={handleDownloadPDF}
                disabled={pdfLoading || todayOrders === 0}
                title="Download today's orders as PDF"
              >
                {pdfLoading
                  ? <span className="pdf-spinner" />
                  : <><RiDownloadLine /> Download PDF</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Status Filter and Search Bar ── */}
        <div className="order-filter-bar">
          <div className="cp-search-box order-search-box">
            <RiSearchLine className="cp-search-icon" />
            <input 
              type="text" 
              placeholder="Search by Order ID, Customer, Phone..." 
              value={orderSearchQuery}
              onChange={(e) => { setOrderSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '42px', paddingRight: '36px' }}
            />
            {orderSearchQuery && (
              <RiCloseLine
                className="cp-search-clear"
                onClick={() => { setOrderSearchQuery(''); setCurrentPage(1); }}
                title="Clear search"
              />
            )}
          </div>
          <div className="order-filter-dropdown-wrap">
            <RiFilter3Line className="filter-icon" />
            <select
              className="order-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '40px', paddingRight: '36px' }}
            >
              <option value="All">All Orders</option>
              <option value="Pre-Booking">Pre-Booking Orders</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Packed">Packed</option>
              <option value="Shipped">Shipped</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="order-date-filters">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} 
              title="Start Date"
            />
            <span className="order-date-sep">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} 
              title="End Date"
            />
            {(startDate || endDate) && (
              <button 
                type="button" 
                className="order-date-clear-btn" 
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                title="Reset Date Range"
              >
                <RiCloseLine size={15} /> Reset
              </button>
            )}
            <button 
              onClick={() => printFilteredOrdersHTML(orders, startDate, endDate)}
              className="order-pdf-btn"
              title="Download filtered orders report as PDF"
            >
              <RiDownloadLine size={16} /> Download PDF
            </button>
          </div>
          <span className="filter-result-count">
            {filteredOrders.length} orders · Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* ── 100% Online Payment Status Indicator ── */}
        {adminRole === 'admin' && (
          <div className="payment-filter-tabs" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: '#ecfdf5', color: '#065f46', border: '1px solid #34d399', borderRadius: '20px', fontSize: '12.5px', fontWeight: 700 }}>
              <RiCheckboxCircleLine size={16} style={{ color: '#059669' }} /> Total Orders: {cleanOrderSearch ? filteredOrders.length : (totalOrders || filteredOrders.length)}
            </div>
          </div>
        )}

        {/* ── Bulk Status Update Bar ── */}
        {selectedOrderIds.length > 0 && (
          <div className="order-bulk-bar animate-slide-up">
            <div className="order-bulk-left">
              <span className="order-bulk-badge">
                <RiCheckboxCircleLine className="order-bulk-badge-icon" />
                <strong>{selectedOrderIds.length}</strong> {selectedOrderIds.length === 1 ? 'Order' : 'Orders'} Selected
              </span>
              <button
                type="button"
                className="order-bulk-select-all-btn"
                onClick={() => {
                  if (selectedOrderIds.length === filteredOrders.length) {
                    setSelectedOrderIds([]);
                  } else {
                    setSelectedOrderIds(filteredOrders.map(o => o.orderId));
                  }
                }}
              >
                {selectedOrderIds.length === filteredOrders.length ? 'Deselect All' : `Select All on Page (${filteredOrders.length})`}
              </button>
            </div>

            <div className="order-bulk-right">
              <div className="order-bulk-status-group">
                <label className="order-bulk-label">Change Status to:</label>
                <select
                  className="order-bulk-select"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  disabled={isBulkUpdating}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <button
                type="button"
                className="order-bulk-apply-btn"
                onClick={handleBulkStatusUpdate}
                disabled={isBulkUpdating}
              >
                {isBulkUpdating ? 'Updating…' : 'Apply Status Update'}
              </button>

              <button
                type="button"
                className="order-bulk-cancel-btn"
                onClick={() => setSelectedOrderIds([])}
                disabled={isBulkUpdating}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="table-responsive">
          <table className="ars-premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(filteredOrders.map(o => o.orderId));
                      } else {
                        setSelectedOrderIds([]);
                      }
                    }}
                    title={selectedOrderIds.length === filteredOrders.length ? "Deselect all" : "Select all visible"}
                  />
                </th>
                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                {adminRole === 'admin' && <th>Total</th>}
                {adminRole === 'admin' && <th>Payment</th>}
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={adminRole === 'admin' ? "10" : "8"} className="text-center py-10">Loading Orders...</td></tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order, idx) => (
                  <tr key={order.orderId} data-status={order.orderStatus} className={selectedOrderIds.includes(order.orderId) ? 'is-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.orderId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(prev => [...prev, order.orderId]);
                          } else {
                            setSelectedOrderIds(prev => prev.filter(id => id !== order.orderId));
                          }
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="id-txt">{(currentPage - 1) * ORDERS_PER_PAGE + idx + 1}</span>
                    </td>
                    <td>
                      <span className="id-txt">{order.orderId}</span>
                      {order.isPreorder && (
                        <div style={{
                          display: 'inline-block',
                          marginLeft: '6px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '800',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Pre-Booking
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="name-txt">{order.Customer?.name || order.snapName || 'Guest User'}</div>
                      <div className="phone-sub">{order.Customer?.phone || order.snapPhone || 'No Phone'}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {order.customerType === 'GUEST' ? 'Guest Buyer' : 'Registered Customer'}
                      </div>
                    </td>
                    <td className="date-txt">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    {adminRole === 'admin' && <td className="amount-txt">₹{Number(order.totalAmount).toLocaleString('en-IN')}</td>}
                    {adminRole === 'admin' && (
                      <td>
                        <div className={`admin-payment-badge pay-${(order.paymentStatus || 'pending').toLowerCase()}`}>
                          {order.paymentStatus === 'Paid' ? (
                            <><RiCheckboxCircleLine className="badge-ico" /> Paid</>
                          ) : order.paymentStatus === 'Failed' ? (
                            <><RiCloseCircleLine className="badge-ico" /> Failed</>
                          ) : (
                            <><RiTimeLine className="badge-ico" /> Pending</>
                          )}
                        </div>
                      </td>
                    )}
                    {false && <td>
                      {order.courierPartner ? (
                        <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                          <strong>{order.courierPartner}</strong>
                          <div style={{ color: '#555' }}>
                            Cost: ₹{Number(order.courierShippingCost || 0).toFixed(2)}
                          </div>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: order.courierPaymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2',
                            color: order.courierPaymentStatus === 'Paid' ? '#065f46' : '#991b1b',
                            marginTop: '4px'
                          }}>
                            {order.courierPaymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '11px' }}>Unassigned</span>
                      )}
                    </td>}
                    <td>
                      {(() => {
                        // Forward-only stage progression — strict stage-by-stage lifecycle
                        const forwardOptions = {
                          Pending:            ['Pending', 'Confirmed', 'Cancelled'],
                          Confirmed:          ['Confirmed', 'Packed', 'Shipped', 'Cancelled'],
                          Packed:             ['Packed', 'Shipped', 'Cancelled'],
                          Shipped:            ['Shipped', 'Out for Delivery', 'Cancelled'],
                          'Out for Delivery': ['Out for Delivery', 'Delivered', 'Cancelled'],
                          Delivered:          ['Delivered'],
                          Cancelled:          ['Cancelled'],
                        };
                        const isTerminal = order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled';
                        const opts = forwardOptions[order.orderStatus] || [order.orderStatus];
                        return (
                          <select
                            className={`status-select ${order.orderStatus?.toLowerCase().replace(/\s+/g, '-')}`}
                            value={order.orderStatus}
                            disabled={isTerminal}
                            onChange={(e) => handleStatusUpdate(order.orderId, e.target.value)}
                            title={isTerminal ? `Order is ${order.orderStatus} — Final State` : 'Update Order Status (Forward Only)'}
                          >
                            {opts.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td className="action-cell">
                      <div className="pp-action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="pp-act-btn view" onClick={() => setSelectedOrder(order)} title="View Order">
                          <FiEye size={16} />
                        </button>
                        <button
                          className="pp-act-btn print"
                          onClick={() => printOrderInvoiceHTML(order, companyState)}
                          title="Print Tax Invoice"
                          style={{ color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                        >
                          <RiPrinterLine size={16} />
                        </button>
                        <button
                          className="pp-act-btn del"
                          onClick={() => deleteOrder(order.orderId)}
                          title="Delete Order"
                          disabled={deleteTarget === order.orderId}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="10" className="text-center py-10">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Order Management Bottom Bar & Pagination ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e5e5e5', flexWrap: 'wrap', gap: '12px', background: '#fafbfc' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(currentPage * ORDERS_PER_PAGE, totalOrders)} of {totalOrders} orders
          </span>
          <AdminPagination
            page={currentPage}
            totalItems={totalOrders}
            pageSize={ORDERS_PER_PAGE}
            onPageChange={goToPage}
            label="orders"
          />
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (() => {
        const snap   = getShipping(selectedOrder);
        const addrStr = getShippingAddressStr(selectedOrder);
        return (
          <div className="ars-modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="ars-modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <RiFileList3Line className="gold-text" />
                  Order <span className="gold-text">{selectedOrder.orderId}</span>
                </h3>
                <div className="modal-header-right">
                  {(() => {
                    const isTerminal = selectedOrder.orderStatus === 'Delivered' || selectedOrder.orderStatus === 'Cancelled';
                    const forwardOptions = {
                      Pending: ['Pending', 'Confirmed', 'Cancelled'],
                      Confirmed: ['Confirmed', 'Packed', 'Cancelled'],
                      Packed: ['Packed', 'Shipped', 'Cancelled'],
                      Shipped: ['Shipped', 'Delivered', 'Cancelled'],
                      'Out for Delivery': ['Out for Delivery', 'Delivered', 'Cancelled'],
                      Delivered: ['Delivered'],
                      Cancelled: ['Cancelled']
                    };
                    const opts = forwardOptions[selectedOrder.orderStatus] || [selectedOrder.orderStatus];
                    return (
                      <select
                        className={`status-select ${selectedOrder.orderStatus?.toLowerCase().replace(/\s+/g, '-')}`}
                        value={selectedOrder.orderStatus}
                        disabled={isTerminal}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await handleStatusUpdate(selectedOrder.orderId, val);
                          setSelectedOrder(prev => ({ ...prev, orderStatus: val }));
                        }}
                        style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}
                        title={isTerminal ? `Order is ${selectedOrder.orderStatus} (Final State)` : 'Update Order Status (Forward Only)'}
                      >
                        {opts.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    );
                  })()}
                  <button
                    className="modal-pdf-btn"
                    title="Download this order as PDF"
                    onClick={() => printOrderInvoiceHTML(selectedOrder, companyState)}
                  >
                    <RiDownloadLine /> PDF
                  </button>
                  <button className="close-x" onClick={() => setSelectedOrder(null)}>
                    <RiCloseLine />
                  </button>
                </div>
              </div>

              <div className="modal-body-scroll">
                <div className="modal-time-bar">
                  <RiTimeLine />
                <span>Order Placed: <strong>{formatDateTime(selectedOrder.createdAt)}</strong></span>
              </div>

              {selectedOrder.isPreorder && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#92400e',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  <span style={{ fontSize: '16px' }}>✦</span>
                  <span><strong>PRE-BOOKING ORDER:</strong> This customer has placed a pre-booking order for jewellery pieces scheduled for crafting.</span>
                </div>
              )}

              <div className="modal-grid">
                <div className="modal-section">
                  <h4><RiUserLine style={{ marginRight: 6, verticalAlign: 'middle' }} />Customer Info</h4>
                  <p><strong>Name:</strong> {selectedOrder.Customer?.name || selectedOrder.snapName || 'Guest User'}</p>
                  <p><strong>Email:</strong> {selectedOrder.Customer?.email || selectedOrder.guestEmail || '—'}</p>
                  <p><strong>Phone:</strong> {selectedOrder.Customer?.phone || selectedOrder.snapPhone || '—'}</p>

                  {selectedOrder.customerType && (
                    <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      Type: <span style={{ fontWeight: 600, color: selectedOrder.customerType === 'GUEST' ? '#b45309' : '#047857' }}>{selectedOrder.customerType}</span>
                    </p>
                  )}
                </div>

                <div className="modal-section">
                  <h4><RiMapPinLine style={{ marginRight: 6, verticalAlign: 'middle' }} />Shipping Address</h4>
                  {snap ? (
                    <>
                      {snap.name        && <p><strong>{snap.name}</strong></p>}
                      {snap.phone       && <p>{snap.phone}</p>}
                      {snap.addressLine && <p>{snap.addressLine}</p>}
                      <p>{[snap.district, snap.city, snap.state, snap.pincode].filter(Boolean).join(', ')}</p>
                    </>
                  ) : (
                    <p className="modal-no-data">Address not available</p>
                  )}
                </div>

                <div className="modal-section">
                  <h4><RiBankCardLine style={{ marginRight: 6, verticalAlign: 'middle' }} />Payment Info</h4>
                  <p><strong>Mode:</strong> {selectedOrder.paymentMethod || 'Online (Razorpay)'}</p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className={`admin-payment-badge pay-${(selectedOrder.paymentStatus || 'pending').toLowerCase()}`}>
                      {selectedOrder.paymentStatus === 'Paid' ? (
                        <><RiCheckboxCircleLine className="badge-ico" /> Paid</>
                      ) : selectedOrder.paymentStatus === 'Failed' ? (
                        <><RiCloseCircleLine className="badge-ico" /> Failed</>
                      ) : (
                        <><RiTimeLine className="badge-ico" /> Pending</>
                      )}
                    </span>
                  </p>
                  {selectedOrder.paymentId && (
                    <p style={{ wordBreak: 'break-all' }}><strong>Payment ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#12382e', fontWeight: 600 }}>{selectedOrder.paymentId}</span></p>
                  )}
                  {selectedOrder.razorpayOrderId && (
                    <p style={{ wordBreak: 'break-all' }}><strong>Razorpay Order:</strong> <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>{selectedOrder.razorpayOrderId}</span></p>
                  )}
                </div>

                <div className="modal-section modal-section--full">
                  <h4><RiShoppingBag3Line style={{ marginRight: 6, verticalAlign: 'middle' }} />Order Items</h4>
                  <div className="modal-items-list">
                    {selectedOrder.slots?.length > 0 ? (
                      selectedOrder.slots.map((item, i) => {
                        const imgPath = item.Product?.mainImage || item.productImage;
                        const imgSrc = imgPath ? `${IMG}${imgPath}` : '/assets/images/placeholder.png';
                        return (
                          <div key={i} className="modal-item-row">
                            <span className="modal-item-dot" />
                            <img 
                              src={imgSrc} 
                              alt={item.Product?.name || item.productName || 'Product'} 
                              className="modal-item-img"
                              onError={e => { e.target.src = '/assets/images/placeholder.png'; }}
                              style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', flexShrink: 0 }}
                            />
                            <span className="modal-item-name">
                              {item.Product?.name || item.productName || 'Product'}
                              {item.variantLabel && <small style={{ display: 'block', color: '#64748b', fontWeight: 500 }}>{item.variantLabel}</small>}
                            </span>
                            <span className="modal-item-qty">× {item.quantity}</span>
                            <span className="modal-item-price">
                              ₹{Number(item.salesPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="modal-no-data">No items found</p>
                    )}
                  </div>
                  <div className="modal-total-row">
                    <span>Grand Total</span>
                    <span className="modal-total-amount">
                      ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {false && <div className="modal-section modal-section--full" style={{ marginTop: '20px' }}>
                  <h4>Courier & Shipping</h4>
                  {selectedOrder.courierPartner ? (
                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                      <p><strong>Courier Partner:</strong> {selectedOrder.courierPartner}</p>
                      <p><strong>{selectedOrder.courierPartner === 'Manual' ? 'Tracking Details / Note' : 'AWB Code'}:</strong> {selectedOrder.awb_code || 'N/A'}</p>
                      
                      {adminRole === 'admin' && (
                        <div style={{ margin: '10px 0', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <p style={{ margin: 0 }}><strong>Actual Courier Cost:</strong> ₹{Number(selectedOrder.courierShippingCost || 0).toFixed(2)}</p>
                          <p style={{ margin: 0 }}>
                            <strong>Courier Payment Status:</strong>{' '}
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              backgroundColor: selectedOrder.courierPaymentStatus === 'Paid' ? '#d1fae5' : '#fee2e2',
                              color: selectedOrder.courierPaymentStatus === 'Paid' ? '#065f46' : '#991b1b',
                            }}>
                              {selectedOrder.courierPaymentStatus === 'Paid' ? 'Paid to Courier' : 'Unpaid'}
                            </span>
                          </p>
                          <button 
                            onClick={async () => {
                              const newStatus = selectedOrder.courierPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
                              try {
                                const res = await axios.post(`${API}/orders/shipping/update-settlement`, {
                                  orderIds: [selectedOrder.orderId],
                                  courierPaymentStatus: newStatus
                                });
                                if (res.data.success) {
                                  toast.success('Courier settlement updated');
                                  setSelectedOrder(prev => ({ ...prev, courierPaymentStatus: newStatus }));
                                  fetchOrders();
                                }
                              } catch (err) {
                                toast.error('Failed to update settlement status');
                              }
                            }}
                            style={{
                              padding: '4px 10px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
                              cursor: 'pointer', fontSize: '11px', fontWeight: '600'
                            }}
                          >
                            Mark as {selectedOrder.courierPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                        {selectedOrder.courierPartner !== 'Manual' && (
                          <button 
                            onClick={() => handleDownloadLabel(selectedOrder)}
                            disabled={isDownloading}
                            style={{ padding: '8px 16px', background: '#011c15', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {isDownloading ? 'Downloading...' : 'Download Shipping Label'}
                          </button>
                        )}
                        {(selectedOrder.courierPartner === 'Manual' || selectedOrder.awb_code || selectedOrder.tracking_url) && (
                          <button 
                            onClick={() => handleTrackShipment(selectedOrder)}
                            disabled={trackingState.loading && trackingState.orderId === selectedOrder.orderId}
                            style={{ padding: '8px 16px', background: '#fff', color: '#011c15', border: '1px solid #011c15', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {trackingState.loading && trackingState.orderId === selectedOrder.orderId ? 'Loading Tracking...' : 'Refresh Live Status'}
                          </button>
                        )}
                      </div>

                      {/* Flipkart / Amazon Style Stage-by-Stage Stepper */}
                      <OrderTrackingStepper 
                        order={selectedOrder} 
                        trackingData={trackingState.orderId === selectedOrder.orderId ? trackingState.data : null} 
                      />

                      {trackingState.orderId === selectedOrder.orderId && trackingState.error && (
                        <p style={{ marginTop: '10px', color: '#b91c1c', fontSize: '13px' }}>{trackingState.error}</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                      <OrderTrackingStepper 
                        order={selectedOrder} 
                      />
                    </div>
                  )}
                </div>}


              </div>
              </div>
            </div>
          </div>
        );
      })()}

      {false && assignModal && (
        <div className="ars-modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="ars-modal-content" style={{ maxWidth: '420px', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div className="modal-header" style={{ borderBottom: '2px solid #011c15', paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ color: '#011c15', fontSize: '20px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assign <span style={{ color: '#FFCC00' }}>{assignModal.courierPartner}</span>
              </h3>
              <button className="close-x" onClick={() => setAssignModal(null)} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#555', transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.background='#ffebee'; e.currentTarget.style.color='#e53935' }} onMouseOut={e => { e.currentTarget.style.background='#f5f5f5'; e.currentTarget.style.color='#555' }}>
                <RiCloseLine size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignCourier} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {assignModal.courierPartner === 'Manual' ? (
                <div style={{ padding: '10px', background: '#eef2ff', borderRadius: '8px', color: '#4f46e5', fontWeight: '600', textAlign: 'center' }}>
                  <p style={{ margin: 0 }}>You are assigning this order manually.</p>
                  <label style={{ display: 'block', marginTop: '12px', textAlign: 'left', fontSize: '13px', color: '#444' }}>
                    Delivery charge (₹)
                    <input type="number" min="0" step="0.01" value={packageDetails.shippingAmount} onChange={e => setPackageDetails(p => ({ ...p, shippingAmount: e.target.value }))} placeholder="Enter manual delivery charge" style={{ width: '100%', marginTop: '6px', padding: '10px', borderRadius: '6px', border: '1px solid #c7d2fe' }} />
                  </label>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: 'normal' }}>Enter the amount only when the customer must be charged manually.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Weight (kg)</label>
                    <input type="number" step="0.01" required value={packageDetails.weight || ''} onChange={e => setPackageDetails(p => ({ ...p, weight: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#011c15'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="e.g. 1.5" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Length (cm)</label>
                      <input type="number" step="0.1" required value={packageDetails.length || ''} onChange={e => setPackageDetails(p => ({ ...p, length: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#011c15'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="10" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Width (cm)</label>
                      <input type="number" step="0.1" required value={packageDetails.width || ''} onChange={e => setPackageDetails(p => ({ ...p, width: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#011c15'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="10" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#444' }}>Height (cm)</label>
                      <input type="number" step="0.1" required value={packageDetails.height || ''} onChange={e => setPackageDetails(p => ({ ...p, height: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#011c15'} onBlur={e => e.target.style.borderColor = '#ddd'} placeholder="10" />
                    </div>
                  </div>
                </>
              )}
              <button type="submit" disabled={isAssigning} style={{ marginTop: '10px', padding: '14px', background: isAssigning ? '#6fa65b' : '#011c15', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', cursor: isAssigning ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(45, 90, 27, 0.2)', transition: 'background-color 0.2s' }} onMouseOver={e => !isAssigning && (e.currentTarget.style.backgroundColor = '#1e3f12')} onMouseOut={e => !isAssigning && (e.currentTarget.style.backgroundColor = '#011c15')}>
                {isAssigning ? 'Assigning Courier...' : `Confirm & Assign to ${assignModal.courierPartner}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;


