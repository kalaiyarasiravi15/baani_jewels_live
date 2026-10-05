
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import {
  RiDownloadLine, RiCalendarLine, RiShoppingBag3Line,
  RiMoneyDollarCircleLine, RiUser3Line, RiTrophyLine,
  RiArrowUpLine, RiLoader4Line, RiFileChartLine,
  RiTimeLine, RiTeamLine, RiShoppingCartLine,
  RiRefreshLine, RiTruckLine, RiArrowDownSLine, RiArrowRightSLine,
  RiSearchLine, RiCloseLine, RiFilter3Line, RiFileList3Line, RiCheckboxCircleLine,
  RiCloseCircleLine, RiGiftLine, RiAlertLine, RiPercentLine, RiEyeLine
} from 'react-icons/ri';
import './Reports.css';

import { API, IMG } from '../config';

const fmt  = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtK = (v) => Number(v) >= 1000 ? `₹${(Number(v) / 1000).toFixed(1)}k` : `₹${Number(v) || 0}`;

const getThumb = (product) => {
  if (product?.mainImage) return product.mainImage;
  const t = product?.Thumbnails?.[0] || product?.thumbnails?.[0];
  return t?.url || t?.image || null;
};

const COLORS = ['#d4af37', '#00044a', '#1a237e', '#283593', '#3949ab', '#5c6bc0', '#e91e63', '#009688'];
const STATUS_COLORS = {
  'Delivered':        '#22c55e',
  'Pending':          '#f59e0b',
  'Shipped':          '#3b82f6',
  'Confirmed':        '#6366f1',
  'Cancelled':        '#ef4444',
  'Out for Delivery': '#14b8a6',
};

// ── Custom Recharts Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rpt-tooltip">
        <p className="rpt-tooltip-label">{label}</p>
        {payload.map((p, i) => {
          const isCount = ['order', 'count', 'user'].some(w => p.name?.toLowerCase().includes(w));
          return (
            <div key={i}>
              <p style={{ color: p.color, margin: '2px 0', fontSize: 12, fontWeight: 600 }}>
                {p.name}: {isCount ? p.value : `₹${fmt(p.value)}`}
              </p>
              {p.payload?.orders !== undefined && p.name === 'Revenue' && (
                <p style={{ margin: '4px 0 0 0', fontSize: 11, fontWeight: 500, color: '#9aabcc' }}>
                  • {p.payload.orders} Orders Placed
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function Reports() {
  const navigate = useNavigate();
  const [range, setRange]                     = useState('monthly');
  const [loading, setLoading]                 = useState(true);
  const [downloading, setDownloading]         = useState(false);
  const [stats, setStats]                     = useState({});
  const [revenueChart, setRevenueChart]       = useState([]);
  const [allRevenueChart, setAllRevenueChart] = useState([]);
  const [topProducts, setTopProducts]         = useState([]);
  const [statusDist, setStatusDist]           = useState([]);
  const [newUsersDaily, setNewUsersDaily]     = useState([]);
  const [newOrdersDaily, setNewOrdersDaily]   = useState([]);
  const [topCustomers, setTopCustomers]       = useState([]);
  const [selCustomer, setSelCustomer]         = useState(null);
  const [custOrders, setCustOrders]           = useState([]);
  const [custLoading, setCustLoading]         = useState(false);
  const [error, setError]                     = useState('');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');

  const [allOrders, setAllOrders]             = useState([]);
  const [orderSearch, setOrderSearch]         = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderPage, setOrderPage]             = useState(1);
  const [expandedReportOrder, setExpandedReportOrder] = useState(null);



  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, custRes, ordersRes] = await Promise.allSettled([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/customers/all`),
        axios.get(`${API}/orders/all`, { params: { limit: 1000 } }),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setStats(d.stats || {});
        setRevenueChart(d.revenueChart       || []);
        setAllRevenueChart(d.allRevenueChart || []);
        setTopProducts(d.topProducts         || []);
        setStatusDist(
          (d.statusDist || []).map(s => ({
            name:  s.orderStatus,
            value: parseInt(s.count) || 0,
          }))
        );
        setNewUsersDaily(d.newUsersDaily   || []);
        setNewOrdersDaily(d.newOrdersDaily || []);
      } else {
        setError('Stats failed: ' + dashRes.reason?.message);
      }

      if (custRes.status === 'fulfilled') {
        const d = custRes.value.data;
        setTopCustomers(Array.isArray(d) ? d : d.customers || []);
      }

      if (ordersRes.status === 'fulfilled') {
        const d = ordersRes.value.data;
        setAllOrders(Array.isArray(d) ? d : d.orders || []);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const loadCustomerOrders = async (customer) => {
    if (selCustomer?.id === customer.id) {
      setSelCustomer(null);
      setCustOrders([]);
      return;
    }
    setSelCustomer(customer);
    setCustLoading(true);
    try {
      const res  = await axios.get(`${API}/orders/customer/${customer.id}`);
      const data = res.data;
      setCustOrders(Array.isArray(data) ? data : data.orders || []);
    } catch {
      setCustOrders([]);
    }
    setCustLoading(false);
  };

  const displayRevenue = range === '7days'
    ? newOrdersDaily.map(d => ({
        name:  new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }),
        value: parseFloat(d.revenue) || 0,
        orders: parseInt(d.orders) || 0
      }))
    : revenueChart.map(d => ({
        name:  d.month?.slice(0, 3) || '',
        value: parseFloat(d.val)    || 0,
        orders: parseInt(d.orderCount) || 0
      }));

  const displayOrders = range === '7days'
    ? newOrdersDaily.map(d => ({
        name:  new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }),
        count: parseInt(d.count) || 0,
      }))
    : allRevenueChart.map(d => ({
        name:  d.month?.slice(0, 3) || '',
        count: parseInt(d.orderCount) || 0,
      }));

  // ── CSV Export Utilities ──────────────────────────────────────────────────
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const triggerCSVDownload = (csvContent, fileName) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFilteredOrders = () => {
    let list = Array.isArray(allOrders) ? [...allOrders] : [];
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      list = list.filter(o => new Date(o.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      list = list.filter(o => new Date(o.createdAt) <= end);
    }
    return list;
  };

  const downloadSalesReportCSV = () => {
    const list = getFilteredOrders();
    if (!list.length) {
      alert('No orders found for the selected period to export.');
      return;
    }

    const headers = [
      'S.No',
      'Order ID',
      'Order Date',
      'Order Time',
      'Customer Name',
      'Phone',
      'Email',
      'Shipping Address',
      'City',
      'State',
      'Pincode',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Pre-Booking',
      'Courier Partner',
      'AWB / Tracking Code',
      'Items Purchased',
      'Total Units',
      'Discount Amount (₹)',
      'Total Amount (₹)'
    ];

    const rows = list.map((o, idx) => {
      const slots = o.slots || o.items || [];
      const itemsSummary = slots.map(sl => {
        const pName = sl.Product?.name || sl.productName || `Item ${sl.productId || ''}`;
        return `${pName} (Qty: ${sl.quantity || 1} @ ₹${sl.salesPrice || 0})`;
      }).join(' | ');
      const totalUnits = slots.reduce((s, sl) => s + (parseInt(sl.quantity) || 1), 0);
      const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '';
      const timeStr = o.createdAt ? new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
      const fullAddress = [o.snapAddressLine, o.snapCity, o.snapState, o.snapPincode].filter(Boolean).join(', ');

      return [
        idx + 1,
        o.orderId || o.id || '',
        dateStr,
        timeStr,
        o.Customer?.name || o.snapName || 'Customer',
        o.Customer?.phone || o.snapPhone || '',
        o.Customer?.email || o.guestEmail || '',
        fullAddress || '—',
        o.snapCity || '',
        o.snapState || '',
        o.snapPincode || '',
        o.paymentMethod || 'Online',
        o.paymentStatus || 'Pending',
        o.orderStatus || o.status || 'Pending',
        o.isPreorder ? 'Yes' : 'No',
        o.courierPartner || 'Unassigned',
        o.awb_code || '—',
        itemsSummary || '—',
        totalUnits,
        parseFloat(o.discountAmount || 0).toFixed(2),
        parseFloat(o.totalAmount || 0).toFixed(2)
      ].map(escapeCSV).join(',');
    });

    const periodLabel = (startDate || endDate)
      ? `${startDate || 'Start'}_to_${endDate || 'End'}`
      : 'All_Time';
    const csvString = [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
    triggerCSVDownload(csvString, `Baani_Jewels_Sales_Report_${periodLabel}.csv`);
  };

  const downloadRevenueReportCSV = () => {
    const list = getFilteredOrders();
    if (!list.length && !revenueChart.length) {
      alert('No revenue data available to export.');
      return;
    }

    const monthMap = {};
    list.forEach(o => {
      const d = new Date(o.createdAt || Date.now());
      const monthKey = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          period: monthKey,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          pendingOrders: 0,
          grossRevenue: 0,
          deliveredRevenue: 0,
          totalDiscounts: 0,
          totalUnits: 0
        };
      }
      const m = monthMap[monthKey];
      m.totalOrders += 1;
      const status = o.orderStatus || o.status || 'Pending';
      const amt = parseFloat(o.totalAmount || 0);
      const disc = parseFloat(o.discountAmount || 0);
      m.grossRevenue += amt;
      m.totalDiscounts += disc;

      const slots = o.slots || o.items || [];
      m.totalUnits += slots.reduce((s, sl) => s + (parseInt(sl.quantity) || 1), 0);

      if (status === 'Delivered') {
        m.deliveredOrders += 1;
        m.deliveredRevenue += amt;
      } else if (status === 'Cancelled') {
        m.cancelledOrders += 1;
      } else {
        m.pendingOrders += 1;
      }
    });

    const totalOrders = list.length;
    const deliveredOrders = list.filter(o => (o.orderStatus || o.status) === 'Delivered').length;
    const cancelledOrders = list.filter(o => (o.orderStatus || o.status) === 'Cancelled').length;
    const grossSales = list.reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0);
    const deliveredSales = list.filter(o => (o.orderStatus || o.status) === 'Delivered').reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0);
    const totalDiscounts = list.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
    const aov = totalOrders > 0 ? (grossSales / totalOrders).toFixed(2) : '0.00';

    const periodLabel = (startDate || endDate)
      ? `${startDate || 'Start'} to ${endDate || 'End'}`
      : 'All Time';

    const summaryHeader = [
      ['BAANI JEWELS - FINANCIAL REVENUE REPORT'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Selected Period', periodLabel],
      [''],
      ['--- EXECUTIVE KPI SUMMARY ---'],
      ['Gross Order Value (₹)', grossSales.toFixed(2)],
      ['Delivered Net Sales (₹)', deliveredSales.toFixed(2)],
      ['Total Orders Placed', totalOrders],
      ['Delivered Orders Count', deliveredOrders],
      ['Cancelled Orders Count', cancelledOrders],
      ['Total Discounts Given (₹)', totalDiscounts.toFixed(2)],
      ['Average Order Value (AOV ₹)', aov],
      [''],
      ['--- PERIODIC REVENUE BREAKDOWN ---']
    ];

    const summaryLines = summaryHeader.map(row => row.map(escapeCSV).join(',')).join('\r\n');

    const tableHeaders = [
      'Period / Month',
      'Total Orders',
      'Delivered Orders',
      'Cancelled Orders',
      'Pending / Active',
      'Delivered Revenue (₹)',
      'Gross Revenue (₹)',
      'Discounts (₹)',
      'Avg Order Value (₹)',
      'Units Sold'
    ];

    const breakdownRows = Object.values(monthMap).map(m => {
      const periodAOV = m.totalOrders > 0 ? (m.grossRevenue / m.totalOrders).toFixed(2) : '0.00';
      return [
        m.period,
        m.totalOrders,
        m.deliveredOrders,
        m.cancelledOrders,
        m.pendingOrders,
        m.deliveredRevenue.toFixed(2),
        m.grossRevenue.toFixed(2),
        m.totalDiscounts.toFixed(2),
        periodAOV,
        m.totalUnits
      ].map(escapeCSV).join(',');
    });

    const fullCSV = summaryLines + '\r\n' + tableHeaders.map(escapeCSV).join(',') + '\r\n' + breakdownRows.join('\r\n');
    const fileDateLabel = (startDate || endDate) ? `${startDate || 'Start'}_to_${endDate || 'End'}` : 'All_Time';
    triggerCSVDownload(fullCSV, `Baani_Jewels_Revenue_Report_${fileDateLabel}.csv`);
  };

  // ── PDF Download ──────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    setDownloading(true);

    // 1. Sort customers by total spend (desc)
    const sortedCustomers = [...topCustomers];

    // 2. Fetch all customer orders in parallel
    const customerOrderMap = {};
    await Promise.allSettled(
      sortedCustomers.map(async (c) => {
        try {
          const res  = await axios.get(`${API}/orders/customer/${c.id}`);
          const data = res.data;
          customerOrderMap[c.id] = Array.isArray(data) ? data : data.orders || [];
        } catch {
          customerOrderMap[c.id] = c.Orders || [];
        }
      })
    );

    // Filter orders by selected date range
    let allFilteredOrders = [];
    const customerFilteredOrders = {};

    sortedCustomers.forEach(c => {
      let orders = customerOrderMap[c.id] || [];
      if (startDate) {
        orders = orders.filter(o => new Date(o.createdAt) >= new Date(startDate + 'T00:00:00'));
      }
      if (endDate) {
        orders = orders.filter(o => new Date(o.createdAt) <= new Date(endDate + 'T23:59:59'));
      }
      customerFilteredOrders[c.id] = orders;
      allFilteredOrders.push(...orders);
    });

    // If allOrders has more orders (including guests)
    if (allOrders && allOrders.length > 0) {
      let generalFiltered = allOrders;
      if (startDate) {
        generalFiltered = generalFiltered.filter(o => new Date(o.createdAt) >= new Date(startDate + 'T00:00:00'));
      }
      if (endDate) {
        generalFiltered = generalFiltered.filter(o => new Date(o.createdAt) <= new Date(endDate + 'T23:59:59'));
      }
      if (generalFiltered.length > allFilteredOrders.length) {
        allFilteredOrders = generalFiltered;
      }
    }

    // Re-calculate statistics for the chosen period
    const totalOrdersPeriod = allFilteredOrders.length;
    const totalSalesPeriod = allFilteredOrders
      .filter(o => (o.orderStatus || o.status) === 'Delivered')
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    const activeCustomersPeriod = new Set(allFilteredOrders.map(o => o.customerId || o.Customer?.id || o.snapPhone || o.id)).size;
    const discountAmountPeriod = allFilteredOrders.reduce((sum, o) => sum + (parseFloat(o.discountAmount) || 0), 0);
    const avgOrderValuePeriod = totalOrdersPeriod > 0 ? (allFilteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0) / totalOrdersPeriod) : 0;

    // Re-calculate Top Products for the chosen period
    const productSales = {};
    allFilteredOrders.forEach(o => {
      const slots = o.slots || o.items || [];
      slots.forEach(sl => {
        const pId = sl.productId;
        const name = sl.Product?.name || sl.productName || `Product ${pId}`;
        const sold = parseInt(sl.quantity) || 0;
        const rev = (parseFloat(sl.salesPrice) || 0) * sold;
        if (!productSales[pId]) {
          productSales[pId] = { name, totalSold: 0, totalRevenue: 0 };
        }
        productSales[pId].totalSold += sold;
        productSales[pId].totalRevenue += rev;
      });
    });

    const periodTopProducts = Object.values(productSales)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 8);

    // Build Top Products table rows
    const topProdRows = periodTopProducts.map((p, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
      return `<tr>
        <td><span class="rank rank-${rankClass}">${i + 1}</span></td>
        <td><strong>${p.name || '—'}</strong></td>
        <td class="center">${p.totalSold || 0} units</td>
        <td class="right green"><strong>₹${fmt(p.totalRevenue || 0)}</strong></td>
      </tr>`;
    }).join('');

    // Detailed Itemized Orders Table Rows for PDF
    const detailedOrderRows = allFilteredOrders.slice(0, 50).map((o, idx) => {
      const slots = o.slots || o.items || [];
      const itemsStr = slots.map(sl => `${sl.Product?.name || sl.productName || 'Item'} (×${sl.quantity})`).join(', ');
      const status = o.orderStatus || o.status || 'Pending';
      const statusColor = {
        'Delivered': '#15803d',
        'Cancelled': '#c62828',
        'Pending': '#b45309',
        'Shipped': '#1d4ed8',
        'Confirmed': '#047857'
      }[status] || '#12382e';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${o.orderId || o.id}</strong></td>
          <td>
            <strong>${o.Customer?.name || o.snapName || 'Guest'}</strong>
            <div style="font-size:10.5px;color:#64748b">${o.Customer?.phone || o.snapPhone || ''}</div>
          </td>
          <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
          <td>${o.paymentMethod || 'Online'} · <span style="font-weight:700;${o.paymentStatus === 'Paid' ? 'color:#15803d' : 'color:#b45309'}">${o.paymentStatus || 'Pending'}</span></td>
          <td><span class="badge" style="background:#f1f5f9;color:${statusColor};border:1px solid #cbd5e1">${status}</span></td>
          <td style="font-size:11px;color:#475569;max-width:260px">${itemsStr || '—'}</td>
          <td class="right green"><strong>₹${fmt(o.totalAmount || 0)}</strong></td>
        </tr>
      `;
    }).join('');

    // Re-sort customers based on purchase totals during this period
    const sortedPeriodCustomers = [...sortedCustomers]
      .map(c => ({
        ...c,
        periodSpent: (customerFilteredOrders[c.id] || []).reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0),
        periodOrdersCount: (customerFilteredOrders[c.id] || []).length
      }))
      .filter(c => c.periodSpent > 0 || c.periodOrdersCount > 0)
      .sort((a, b) => b.periodSpent - a.periodSpent);

    // Build Customer blocks with purchase lists
    const custBlocks = sortedPeriodCustomers.slice(0, 10).map((c, i) => {
      const orders     = customerFilteredOrders[c.id] || [];
      const totalSpent = c.periodSpent;
      const rankClass  = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
      const delivered  = orders.filter(o => (o.orderStatus || o.status) === 'Delivered').length;
      const cancelled  = orders.filter(o => (o.orderStatus || o.status) === 'Cancelled').length;

      const orderRows = orders.map((o) => {
        const oid    = o.orderId || o.id;
        const status = o.orderStatus || o.status || '—';
        const slots  = o.slots || o.items || [];

        const statusColor = {
          'Delivered':        '#15803d',
          'Cancelled':        '#c62828',
          'Pending':          '#b45309',
          'Shipped':          '#1565c0',
          'Confirmed':        '#283593',
          'Out for Delivery': '#00695c',
        }[status] || '#00044a';

        const statusBg = {
          'Delivered':        '#e8f5e9',
          'Cancelled':        '#ffebee',
          'Pending':          '#fff8e1',
          'Shipped':          '#e3f2fd',
          'Confirmed':        '#e8eaf6',
          'Out for Delivery': '#e0f2f1',
        }[status] || '#f0f4ff';

        const productChips = slots.map(sl =>
          `<span class="chip">${sl.Product?.name || sl.productName || sl.productId} ×${sl.quantity} — ₹${fmt(sl.salesPrice)}</span>`
        ).join('');

        const discountCell = parseFloat(o.discountAmount) > 0
          ? `<span class="disc">-₹${fmt(o.discountAmount)}</span>` : '—';

        return `<tr>
          <td class="oid">${oid}</td>
          <td class="green"><strong>₹${fmt(o.totalAmount)}</strong></td>
          <td>${discountCell}</td>
          <td>${o.paymentMethod || '—'}</td>
          <td><span class="badge" style="background:${statusBg};color:${statusColor}">${status}</span></td>
          <td>${productChips || '—'}</td>
          <td class="muted">${new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        </tr>`;
      }).join('');

      return `
        <div class="cust-block">
          <div class="cust-header">
            <span class="rank rank-${rankClass}">${i + 1}</span>
            <div class="cust-info">
              <strong>${c.name || '—'}</strong>
              <span class="muted">${c.email || '—'} &nbsp;|&nbsp; ${c.phone || '—'}</span>
            </div>
            <div class="cust-pills">
              <span class="pill navy">₹${fmt(totalSpent)} spent</span>
              <span class="pill gray">${orders.length} orders</span>
              <span class="pill green-p">${delivered} delivered</span>
              ${cancelled > 0 ? `<span class="pill red-p">${cancelled} cancelled</span>` : ''}
            </div>
          </div>
          ${orders.length > 0 ? `
          <table class="inner-table">
            <thead><tr>
              <th>Order ID</th><th>Amount</th><th>Discount</th>
              <th>Payment</th><th>Status</th><th>Products</th><th>Date</th>
            </tr></thead>
            <tbody>${orderRows}</tbody>
          </table>` : '<p class="no-orders">No orders found.</p>'}
        </div>`;
    }).join('');

    const periodStr = (startDate || endDate)
      ? `${startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning'} to ${endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}`
      : 'All Time';

    // ── 5. Open print window ──────────────────────────────────────────────
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>BAANI JEWELS — Sales & Performance Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family: Arial, Helvetica, sans-serif;padding:36px 40px;color:#1e293b;background:#fff;font-size:13px;line-height:1.5}
  .report-header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #12382e;padding-bottom:16px;margin-bottom:20px}
  .report-title{font-size:24px;font-weight:800;color:#12382e;letter-spacing:1px;font-family: Arial, Helvetica, sans-serif}
  .report-title span{color:#c9a84c}
  .report-sub{font-size:11px;color:#c9a84c;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
  .report-meta{font-size:11.5px;color:#64748b;text-align:right;line-height:1.6}
  .stats-strip{display:flex;gap:12px;margin:20px 0 28px}
  .stat-box{flex:1;background:#f8fafc;border-left:4px solid #12382e;border-radius:8px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
  .stat-box h3{font-size:20px;color:#12382e;font-weight:700}
  .stat-box p{font-size:9.5px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-top:3px;font-weight:600}
  h2{font-size:14px;font-weight:700;color:#12382e;border-left:4px solid #c9a84c;padding-left:10px;margin:28px 0 14px;text-transform:uppercase;letter-spacing:0.5px}
  h2 small{font-size:10px;color:#64748b;font-weight:400;margin-left:8px;text-transform:none}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  thead tr{background:#12382e}
  th{color:#ffffff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  td{padding:9px 12px;border-bottom:1px solid #eef0f8;vertical-align:middle}
  tr:nth-child(even) td{background:#fafaf9}
  tr:last-child td{border-bottom:none}
  .rank{display:inline-block;font-weight:700;padding:3px 9px;border-radius:6px;font-size:11px;white-space:nowrap}
  .rank-gold{background:rgba(212,175,55,0.18);color:#a07c10}
  .rank-silver{background:rgba(158,158,158,0.15);color:#616161}
  .rank-bronze{background:rgba(188,140,75,0.15);color:#8d5b25}
  .rank-normal{background:rgba(18,56,46,0.07);color:#12382e}
  .cust-block{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:22px;overflow:hidden;page-break-inside:avoid}
  .cust-header{display:flex;align-items:center;gap:12px;background:#f8faff;padding:14px 16px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}
  .cust-info{flex:1;min-width:0}
  .cust-info strong{font-size:14px;color:#12382e;display:block}
  .cust-pills{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
  .pill{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}
  .navy{background:#12382e;color:#c9a84c}
  .gray{background:#f1f5f9;color:#475569}
  .green-p{background:#e8f5e9;color:#15803d}
  .red-p{background:#ffebee;color:#c62828}
  .inner-table{width:100%;border-collapse:collapse;font-size:11px}
  .inner-table th{background:rgba(18,56,46,0.06);color:#12382e;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;font-weight:700}
  .inner-table td{padding:8px 12px;border-bottom:1px solid #f0f0f8;vertical-align:top}
  .inner-table tr:last-child td{border-bottom:none}
  .inner-table tr:nth-child(even) td{background:#fafbff}
  .oid{font-weight:700;color:#12382e;white-space:nowrap}
  .green{color:#15803d}.muted{color:#64748b}
  .center{text-align:center}.right{text-align:right}
  .disc{background:#fef3c7;color:#92400e;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600}
  .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;text-transform:uppercase}
  .chip{display:inline-block;background:#f0fdf4;color:#12382e;border:1px solid #dcfce7;border-radius:5px;padding:2px 7px;font-size:10px;margin:2px 2px 2px 0}
  .no-orders{color:#aaa;font-size:12px;padding:12px 16px;font-style:italic}
  .footer{margin-top:36px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:18px 22px}.cust-block{page-break-inside:avoid}}
</style></head><body>
  <div class="report-header">
    <div>
      <div class="report-title">BAANI <span>JEWELS</span></div>
      <div class="report-sub">Luxury Made Affordable &nbsp;·&nbsp; Performance &amp; Sales Audit</div>
    </div>
    <div class="report-meta">Generated: ${new Date().toLocaleString('en-IN')}<br/>Period: <strong>${periodStr}</strong></div>
  </div>
  <div class="stats-strip">
    <div class="stat-box"><h3>₹${fmt(totalSalesPeriod)}</h3><p>Delivered Revenue</p></div>
    <div class="stat-box"><h3>${fmt(totalOrdersPeriod)}</h3><p>Total Orders</p></div>
    <div class="stat-box"><h3>₹${fmt(avgOrderValuePeriod)}</h3><p>Average Order Value</p></div>
    <div class="stat-box"><h3>₹${fmt(discountAmountPeriod)}</h3><p>Discounts Applied</p></div>
    <div class="stat-box"><h3>${fmt(activeCustomersPeriod)}</h3><p>Active Buyers</p></div>
  </div>

  <h2> Top Selling Products <small>Ranked by units sold during the period</small></h2>
  <table>
    <thead><tr>
      <th style="width:60px">Rank</th>
      <th>Product Name</th>
      <th class="center">Units Sold</th>
      <th class="right">Revenue</th>
    </tr></thead>
    <tbody>${topProdRows || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No product data for this period</td></tr>'}</tbody>
  </table>

  <h2> Itemized Orders &amp; Transactions Log <small>Recent orders in the selected period</small></h2>
  <table>
    <thead><tr>
      <th style="width:50px;text-align:center">S.No</th>
      <th>Order ID</th>
      <th>Customer</th>
      <th>Date</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Products</th>
      <th class="right">Total</th>
    </tr></thead>
    <tbody>${detailedOrderRows || '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:20px">No orders found</td></tr>'}</tbody>
  </table>

  <h2> Top Customers — Purchase Breakdown <small>Sorted by period spend · includes all orders &amp; product slots</small></h2>
  ${custBlocks || '<p style="color:#aaa;text-align:center;padding:20px;font-style:italic">No purchase records found for this period</p>'}
  <div class="footer">BAANI JEWELS &nbsp;|&nbsp; Luxury Made Affordable &nbsp;|&nbsp; Confidential Analytics &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); setDownloading(false); }, 800);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="rpt-container">
      <div className="rpt-loading">
        <RiLoader4Line className="rpt-spin" size={40} />
        <p>Loading reports...</p>
      </div>
    </div>
  );

  // ── Compute Top Customers ─────────────────────────────────────────────────
  const topSpender  = topCustomers.length > 0 ? [...topCustomers].sort((a, b) => (Number(b.totalSpent)  || 0) - (Number(a.totalSpent)  || 0))[0] : null;
  const topRepeater = topCustomers.length > 0 ? [...topCustomers].sort((a, b) => (Number(b.orderCount) || 0) - (Number(a.orderCount) || 0))[0] : null;

  // ── Compute Chart Summary KPIs ────────────────────────────────────────────
  // Revenue chart summaries
  const revValues       = displayRevenue.map(d => d.value);
  const revTotal        = revValues.reduce((s, v) => s + v, 0);
  const revPeak         = revValues.length > 0 ? Math.max(...revValues) : 0;
  const revAvg          = revValues.length > 0 ? revTotal / revValues.length : 0;
  const revPeakPeriod   = displayRevenue.find(d => d.value === revPeak);
  const revOrdersTotal  = displayRevenue.reduce((s, d) => s + (d.orders || 0), 0);

  // Order volume chart summaries
  const ordValues       = displayOrders.map(d => d.count);
  const ordTotal        = ordValues.reduce((s, v) => s + v, 0);
  const ordPeak         = ordValues.length > 0 ? Math.max(...ordValues) : 0;
  const ordAvg          = ordValues.length > 0 ? ordTotal / ordValues.length : 0;
  const ordPeakPeriod   = displayOrders.find(d => d.count === ordPeak);

  // Order status distribution summaries
  const statusTotal     = statusDist.reduce((s, d) => s + d.value, 0);
  const statusDelivered = statusDist.find(d => d.name === 'Delivered')?.value || 0;
  const statusCancelled = statusDist.find(d => d.name === 'Cancelled')?.value  || 0;
  const statusPending   = statusDist.find(d => d.name === 'Pending')?.value    || 0;
  const statusOFD       = statusDist.find(d => d.name === 'Out for Delivery')?.value || 0;
  const deliveredRate   = statusTotal > 0 ? ((statusDelivered / statusTotal) * 100).toFixed(1) : '0.0';
  const cancelRate      = statusTotal > 0 ? ((statusCancelled / statusTotal) * 100).toFixed(1) : '0.0';

  // New Registrations summaries
  const userCounts      = newUsersDaily.map(d => parseInt(d.count) || 0);
  const usersTotal      = userCounts.reduce((s, v) => s + v, 0);
  const usersPeak       = userCounts.length > 0 ? Math.max(...userCounts) : 0;
  const usersAvg        = userCounts.length > 0 ? (usersTotal / userCounts.length).toFixed(1) : '0';
  const usersPeakDay    = newUsersDaily.find((d, i) => userCounts[i] === usersPeak);

  // Top Products summary
  const prodTotalSold   = topProducts.reduce((s, p) => s + (parseInt(p.totalSold) || 0), 0);
  const prodTotalRev    = topProducts.reduce((s, p) => s + (parseFloat(p.totalRevenue) || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rpt-container">

      {/* ── HEADER ── */}
      <div className="rpt-header">
        <div className="rpt-header-left">
          <div className="rpt-icon-wrap"><RiFileChartLine /></div>
          <div>
            <h1 className="rpt-h1">Reports & <span>Analytics</span></h1>
            <p className="rpt-subtext">Complete store performance overview</p>
          </div>
        </div>
        <div className="rpt-header-actions">
          <div className="rpt-date-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="date-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: '#868686', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#fff',
                  fontFamily: 'inherit',
                  color: '#011c15'
                }}
              />
            </div>
            <div className="date-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: '#868686', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#fff',
                  fontFamily: 'inherit',
                  color: '#011c15'
                }}
              />
            </div>
          </div>
          <div className="rpt-range-toggle">
            <button
              className={`rpt-toggle-btn${range === 'monthly' ? ' active' : ''}`}
              onClick={() => setRange('monthly')}
            >
              <RiCalendarLine /> Monthly
            </button>
            <button
              className={`rpt-toggle-btn${range === '7days' ? ' active' : ''}`}
              onClick={() => setRange('7days')}
            >
              <RiTimeLine /> Last 7 Days
            </button>
          </div>
          <button className="rpt-refresh-btn" onClick={fetchAll} title="Refresh">
            <RiRefreshLine />
          </button>
          <button className="rpt-export-btn" onClick={downloadSalesReportCSV} title="Download Itemized Sales Report (CSV)">
            <RiDownloadLine /> Sales Report (CSV)
          </button>
          <button className="rpt-export-btn" onClick={downloadRevenueReportCSV} title="Download Financial & Revenue Summary (CSV)">
            <RiDownloadLine /> Revenue Report (CSV)
          </button>
          <button className="rpt-pdf-btn" onClick={downloadPDF} disabled={downloading}>
            {downloading
              ? <><RiLoader4Line className="rpt-spin" /> Generating...</>
              : <><RiDownloadLine /> Download PDF</>}
          </button>
        </div>
      </div>

      {error && <div className="rpt-error">{error}</div>}

      {/* ── STATS ── */}
      <div className="rpt-stats-grid">
        <div className="rpt-stat gold" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders')}>
          <div className="rpt-stat-icon gold-icon"><RiMoneyDollarCircleLine /></div>
          <div>
            <p>Total Sales (Delivered)</p>
            <h2>₹{fmt(stats.totalSales)}</h2>
          </div>
          <RiArrowUpLine className="rpt-stat-trend" />
        </div>
        <div className="rpt-stat" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders')}>
          <div className="rpt-stat-icon navy-icon"><RiShoppingCartLine /></div>
          <div><p>Total Orders</p><h2>{fmt(stats.totalOrders)}</h2></div>
        </div>
        <div className="rpt-stat" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/customers?view=registered')}>
          <div className="rpt-stat-icon teal-icon"><RiTeamLine /></div>
          <div><p>Registered Users</p><h2>{fmt(stats.totalRegistered)}</h2></div>
        </div>
        <div className="rpt-stat" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/customers?view=purchased&filter=Active')}>
          <div className="rpt-stat-icon purple-icon"><RiUser3Line /></div>
          <div><p>Active Customers</p><h2>{fmt(stats.totalCustomers)}</h2></div>
        </div>
        <div className="rpt-stat blue" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders?filter=today')}>
          <div className="rpt-stat-icon blue-icon"><RiTrophyLine /></div>
          <div><p>New Orders Today</p><h2>{fmt(stats.newOrdersToday)}</h2></div>
        </div>
        <div className="rpt-stat green" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/orders?status=Delivered&filter=today')}>
          <div className="rpt-stat-icon green-icon"><RiTruckLine /></div>
          <div><p>Today Deliveries</p><h2>{fmt(stats.deliveredToday)}</h2></div>
        </div>
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="rpt-charts-row">
        <div className="rpt-card">
          <div className="rpt-card-head">
            <div>
              <h3>Revenue <span className="rpt-badge-delivered">Delivered Orders</span></h3>
              <span className="rpt-card-sub">{range === '7days' ? 'Last 7 days' : 'All months'}</span>
            </div>
          </div>
          {displayRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={displayRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d4af37" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aabcc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="value" name="Revenue"
                  stroke="#d4af37" strokeWidth={2.5} fill="url(#revGrad)"
                  dot={{ r: 4, fill: '#d4af37', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#d4af37' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No revenue data</p>}
          {/* Revenue Summary Strip */}
          <div className="rpt-summary-strip">
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Total Revenue</span>
              <span className="rpt-kpi-value gold">₹{fmt(revTotal)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Peak {range === '7days' ? 'Day' : 'Month'}</span>
              <span className="rpt-kpi-value">{revPeakPeriod?.name || '—'} · ₹{fmt(revPeak)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Avg / {range === '7days' ? 'Day' : 'Month'}</span>
              <span className="rpt-kpi-value">₹{fmt(Math.round(revAvg))}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Orders (Period)</span>
              <span className="rpt-kpi-value navy">{fmt(revOrdersTotal)}</span>
            </div>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-head">
            <div>
              <h3>Order Volume <span className="rpt-badge-all">All Orders</span></h3>
              <span className="rpt-card-sub">{range === '7days' ? 'Last 7 days' : 'By month'}</span>
            </div>
          </div>
          {displayOrders.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={displayOrders} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aabcc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,4,74,0.04)' }} />
                <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {displayOrders.map((_, i) => (
                    <Cell key={i} fill={i === displayOrders.length - 1 ? '#d4af37' : 'rgba(0,4,74,0.18)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No order data</p>}
          {/* Order Volume Summary Strip */}
          <div className="rpt-summary-strip">
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Total Orders</span>
              <span className="rpt-kpi-value navy">{fmt(ordTotal)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Peak {range === '7days' ? 'Day' : 'Month'}</span>
              <span className="rpt-kpi-value">{ordPeakPeriod?.name || '—'} · {ordPeak}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Avg / {range === '7days' ? 'Day' : 'Month'}</span>
              <span className="rpt-kpi-value">{ordAvg.toFixed(1)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Periods Tracked</span>
              <span className="rpt-kpi-value">{displayOrders.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div className="rpt-charts-row">
        <div className="rpt-card">
          <div className="rpt-card-head">
            <h3>Order Status Distribution</h3>
          </div>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusDist} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDist.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: 11, color: '#9aabcc' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No data</p>}
          {/* Status Summary Strip */}
          <div className="rpt-summary-strip">
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Delivered Rate</span>
              <span className="rpt-kpi-value" style={{ color: '#22c55e' }}>{deliveredRate}%</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Cancellation Rate</span>
              <span className="rpt-kpi-value" style={{ color: '#ef4444' }}>{cancelRate}%</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Pending Orders</span>
              <span className="rpt-kpi-value" style={{ color: '#f59e0b' }}>{fmt(statusPending)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Out for Delivery</span>
              <span className="rpt-kpi-value" style={{ color: '#14b8a6' }}>{fmt(statusOFD)}</span>
            </div>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-head">
            <div>
              <h3>New Registrations</h3>
              <span className="rpt-card-sub">Last 30 days — day wise</span>
            </div>
          </div>
          {newUsersDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={newUsersDaily.map(d => ({
                  name:  new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                  count: parseInt(d.count) || 0,
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,74,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9aabcc' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="count" name="New Users"
                  stroke="#7c3aed" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#7c3aed' }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="rpt-empty">No registration data yet</p>}
          {/* New Registrations Summary Strip */}
          <div className="rpt-summary-strip">
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Total (30 Days)</span>
              <span className="rpt-kpi-value purple">{fmt(usersTotal)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Peak Day</span>
              <span className="rpt-kpi-value">
                {usersPeakDay ? new Date(usersPeakDay.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'} · {usersPeak}
              </span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Daily Average</span>
              <span className="rpt-kpi-value">{usersAvg}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Active Days</span>
              <span className="rpt-kpi-value">{userCounts.filter(c => c > 0).length} / {userCounts.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP PRODUCTS ── */}
      <div className="rpt-card-wide">
        <div className="rpt-card-head">
          <div>
            <h3>Top Selling Products</h3>
            <span className="rpt-card-sub">Units sold + revenue</span>
          </div>
          <RiShoppingBag3Line size={22} style={{ color: '#d4af37' }} />
        </div>
        {topProducts.length > 0 ? (
          <div className="rpt-prod-grid">
            {topProducts.map((p, i) => {
              const thumb   = getThumb(p.Product);
              const maxSold = parseInt(topProducts[0]?.totalSold) || 1;
              const pct     = ((parseInt(p.totalSold) || 0) / maxSold) * 100;
              const rankKey = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
              return (
                <div className="rpt-prod-row" key={i}>
                  <span className={`rpt-rank${rankKey ? ` ${rankKey}` : ''}`}>{i + 1}</span>
                  <div className="rpt-prod-thumb-wrap">
                    {thumb
                      ? <img
                          src={IMG + thumb} alt={p.Product?.name}
                          className="rpt-prod-thumb"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      : <div className="rpt-prod-thumb-fallback"><RiShoppingBag3Line /></div>}
                  </div>
                  <div className="rpt-prod-info">
                    <span className="rpt-prod-name">{p.Product?.name || 'Product'}</span>
                    <div className="rpt-bar-track">
                      <div className="rpt-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="rpt-prod-rev">Revenue: ₹{fmt(p.totalRevenue || 0)}</span>
                  </div>
                  <div className="rpt-prod-stats">
                    <span className="rpt-prod-sold-num">{parseInt(p.totalSold) || 0}</span>
                    <span className="rpt-prod-sold-label">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="rpt-empty">No product sales data</p>}
        {topProducts.length > 0 && (
          <div className="rpt-summary-strip" style={{ borderTop: '1px solid rgba(0,4,74,0.08)', marginTop: '4px' }}>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Total Units Sold</span>
              <span className="rpt-kpi-value gold">{fmt(prodTotalSold)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Top Product Revenue</span>
              <span className="rpt-kpi-value">₹{fmt(topProducts[0]?.totalRevenue || 0)}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Combined Revenue</span>
              <span className="rpt-kpi-value gold">₹{fmt(Math.round(prodTotalRev))}</span>
            </div>
            <div className="rpt-summary-kpi">
              <span className="rpt-kpi-label">Products Tracked</span>
              <span className="rpt-kpi-value navy">{topProducts.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── REVENUE TABLE ── */}
      <div className="rpt-card-wide">
        <div className="rpt-card-head">
          <h3>Revenue Breakdown — All Months</h3>
        </div>
        {revenueChart.length > 0 ? (
          <div className="rpt-rev-table-wrap">
            {revenueChart.map((d, i) => {
              const val      = parseFloat(d.val) || 0;
              const maxVal   = Math.max(...revenueChart.map(r => parseFloat(r.val) || 0), 1);
              const curMonth = new Date().getMonth();
              const isActive = parseInt(d.monthNum) - 1 === curMonth;
              const pct      = (val / maxVal) * 100;
              return (
                <div key={i} className="rpt-rev-row">
                  <span className={`rpt-rev-label${isActive ? ' active' : ''}`}>{d.month}</span>
                  <div className="rpt-rev-bar-track">
                    <div className={`rpt-rev-bar-fill${isActive ? ' active' : ''}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="rpt-rev-orders">{d.orderCount || 0} orders</span>
                  <span className="rpt-rev-val">₹{fmt(val)}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="rpt-empty">No monthly data yet</p>}
      </div>

      {/* ── TOP CUSTOMERS BY SPEND ── */}
      <div className="rpt-card-wide">
        <div className="rpt-card-head">
          <div>
            <h3>Top Customers</h3>
            <span className="rpt-card-sub">Top customers sorted by order count</span>
          </div>
          <RiTeamLine size={22} style={{ color: '#d4af37' }} />
        </div>
        {topCustomers.length > 0 ? (
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  {['#', 'Customer', 'Total Spent', 'Orders', 'Joined', 'Highest Purchase', 'Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...topCustomers]
                  .sort((a, b) => {
                    const diffOrders = (parseInt(b.orderCount) || 0) - (parseInt(a.orderCount) || 0);
                    if (diffOrders !== 0) return diffOrders;
                    return parseFloat(b.totalSpent || 0) - parseFloat(a.totalSpent || 0);
                  })
                  .slice(0, 10)
                  .map((c, i) => {
                    const isSelected = selCustomer?.id === c.id;
                    const rankKey    = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                    const totalSpent  = parseFloat(c.totalSpent || 0);
                    return (
                      <React.Fragment key={c.id || i}>
                        <tr
                          className={`rpt-tr${isSelected ? ' selected' : ''}`}
                        >
                          <td>
                            <span className={`rpt-rank-sm${rankKey ? ` ${rankKey}` : ''}`}>{i + 1}</span>
                          </td>
                          <td className="rpt-cust-name">{c.name || '—'}</td>
                          <td className="rpt-cust-value">₹{fmt(totalSpent)}</td>
                          <td>{c.orderCount ?? 0}</td>
                          <td className="rpt-date-cell">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td>₹{fmt(c.highestPurchase || 0)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => loadCustomerOrders(c)}
                              style={{ padding: '6px 12px', fontSize: '11px', background: isSelected ? '#111827' : '#011c15', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              {isSelected ? 'Close Details' : 'View Orders'}
                            </button>
                          </td>
                        </tr>

                        {isSelected && (
                          <tr>
                            <td colSpan={7} className="rpt-drilldown-cell">
                              <div className="rpt-drilldown">
                                <h4> Orders by {c.name}</h4>
                                {custLoading ? (
                                  <div style={{ textAlign: 'center', padding: '20px', color: '#9aabcc' }}>
                                    <RiLoader4Line className="rpt-spin" size={24} />
                                  </div>
                                ) : custOrders.length > 0 ? (
                                  <>
                                    <div className="rpt-cust-summary">
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Total Orders</span>
                                        <strong className="rpt-cust-sum-value">{custOrders.length}</strong>
                                      </div>
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Total Spent</span>
                                        <strong className="rpt-cust-sum-value gold">
                                          ₹{fmt(custOrders.reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0))}
                                        </strong>
                                      </div>
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Delivered</span>
                                        <strong className="rpt-cust-sum-value green">
                                          {custOrders.filter(o => o.orderStatus === 'Delivered' || o.status === 'Delivered').length}
                                        </strong>
                                      </div>
                                      <div className="rpt-cust-sum-item">
                                        <span className="rpt-cust-sum-label">Cancelled</span>
                                        <strong className="rpt-cust-sum-value red">
                                          {custOrders.filter(o => o.orderStatus === 'Cancelled' || o.status === 'Cancelled').length}
                                        </strong>
                                      </div>
                                    </div>

                                    <table className="rpt-inner-table">
                                      <thead>
                                        <tr>
                                          {['Order ID', 'Amount', 'Discount', 'Payment', 'Status', 'Products', 'Date'].map(h => (
                                            <th key={h}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {custOrders.map((o) => {
                                          const oid         = o.orderId || o.id;
                                          const status      = o.orderStatus || o.status;
                                          const slots       = o.slots || o.items || [];
                                          const statusClass = status?.replace(/\s+/g, '-') || 'default';
                                          return (
                                            <tr key={oid}>
                                              <td className="rpt-order-id">{oid}</td>
                                              <td className="rpt-order-amt">₹{fmt(o.totalAmount)}</td>
                                              <td>
                                                {parseFloat(o.discountAmount) > 0
                                                  ? <span className="rpt-disc-badge">-₹{fmt(o.discountAmount)}</span>
                                                  : '—'}
                                              </td>
                                              <td>{o.paymentMethod || '—'}</td>
                                              <td>
                                                <span className={`rpt-status ${statusClass}`}>{status}</span>
                                              </td>
                                              <td>
                                                {slots.map((sl, si) => (
                                                  <div key={si} className="rpt-prod-chip">
                                                    {sl.Product?.name || sl.productName || sl.productId} ×{sl.quantity}
                                                    <span className="rpt-prod-chip-price">&nbsp;₹{fmt(sl.salesPrice)}</span>
                                                  </div>
                                                ))}
                                              </td>
                                              <td className="rpt-date-cell">
                                                {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </>
                                ) : <p className="rpt-empty">No orders for this customer.</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : <p className="rpt-empty">No customers found</p>}
      </div>

      {/* ── DETAILED ORDER & TRANSACTION AUDIT SECTION ── */}
      {(() => {
        const filteredReportOrders = allOrders.filter(o => {
          if (startDate && new Date(o.createdAt) < new Date(startDate + 'T00:00:00')) return false;
          if (endDate && new Date(o.createdAt) > new Date(endDate + 'T23:59:59')) return false;
          if (orderStatusFilter === 'Pre-Booking') {
            if (!o.isPreorder) return false;
          } else if (orderStatusFilter !== 'All') {
            if ((o.orderStatus || o.status) !== orderStatusFilter) return false;
          }
          if (orderSearch.trim()) {
            const q = orderSearch.toLowerCase();
            const matchId = String(o.orderId || o.id).toLowerCase().includes(q);
            const matchName = (o.Customer?.name || o.snapName || '').toLowerCase().includes(q);
            const matchPhone = (o.Customer?.phone || o.snapPhone || '').toLowerCase().includes(q);
            const matchPayId = (o.paymentId || '').toLowerCase().includes(q);
            return matchId || matchName || matchPhone || matchPayId;
          }
          return true;
        });

        const reportOrdersPageSize = 10;
        const totalReportOrderPages = Math.max(1, Math.ceil(filteredReportOrders.length / reportOrdersPageSize));
        const currentReportOrders = filteredReportOrders.slice(
          (orderPage - 1) * reportOrdersPageSize,
          orderPage * reportOrdersPageSize
        );

        const reportTotalRevenue = filteredReportOrders.reduce((acc, o) => acc + (parseFloat(o.totalAmount) || 0), 0);
        const reportDeliveredRevenue = filteredReportOrders
          .filter(o => (o.orderStatus || o.status) === 'Delivered')
          .reduce((acc, o) => acc + (parseFloat(o.totalAmount) || 0), 0);
        const reportTotalDiscounts = filteredReportOrders.reduce((acc, o) => acc + (parseFloat(o.discountAmount) || 0), 0);
        const reportAvgOrderValue = filteredReportOrders.length > 0 ? (reportTotalRevenue / filteredReportOrders.length) : 0;

        return (
          <div className="rpt-card-wide" style={{ marginTop: '28px' }}>
            <div className="rpt-card-head" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <div>
                <h3>Executive Summary &amp; Detailed Order Transactions</h3>
                <span className="rpt-card-sub">Real-time audit log of all store transactions, itemizations, and payment states</span>
              </div>
              <div className="rpt-order-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="rpt-search-wrap" style={{ position: 'relative', minWidth: '280px' }}>
                  <RiSearchLine style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#868686', pointerEvents: 'none', zIndex: 2 }} />
                  <input
                    type="text"
                    placeholder="Search Order ID, Name, Phone..."
                    value={orderSearch}
                    onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }}
                    style={{ width: '100%', padding: '10px 36px 10px 42px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                  {orderSearch && (
                    <RiCloseLine
                      onClick={() => { setOrderSearch(''); setOrderPage(1); }}
                      title="Clear search"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '18px',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                    />
                  )}
                </div>
                <div className="rpt-status-filter-wrap">
                  <select
                    value={orderStatusFilter}
                    onChange={e => { setOrderStatusFilter(e.target.value); setOrderPage(1); }}
                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12.5px', outline: 'none', background: '#fff', fontWeight: 600, color: '#12382e' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pre-Booking">✦ Pre-Booking Orders</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Strip for Filtered Data */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtered Orders</span>
                <h4 style={{ margin: '4px 0 0', fontSize: '18px', color: '#12382e', fontWeight: 700 }}>{filteredReportOrders.length}</h4>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivered Sales</span>
                <h4 style={{ margin: '4px 0 0', fontSize: '18px', color: '#15803d', fontWeight: 700 }}>₹{fmt(reportDeliveredRevenue)}</h4>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Order Value</span>
                <h4 style={{ margin: '4px 0 0', fontSize: '18px', color: '#b45309', fontWeight: 700 }}>₹{fmt(reportTotalRevenue)}</h4>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Order Value</span>
                <h4 style={{ margin: '4px 0 0', fontSize: '18px', color: '#12382e', fontWeight: 700 }}>₹{fmt(reportAvgOrderValue)}</h4>
              </div>
              <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Discounts</span>
                <h4 style={{ margin: '4px 0 0', fontSize: '18px', color: '#ef4444', fontWeight: 700 }}>₹{fmt(reportTotalDiscounts)}</h4>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>S.No</th>
                    <th>Order ID</th>
                    <th>Customer &amp; Contact</th>
                    <th>Date &amp; Time</th>
                    <th>Payment Mode</th>
                    <th>Payment Status</th>
                    <th>Stage Status</th>
                    <th>Items Purchased</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReportOrders.length > 0 ? (
                    currentReportOrders.map((order, idx) => {
                      const isExpanded = expandedReportOrder === (order.orderId || order.id);
                      const slots = order.slots || order.items || [];
                      const statusClass = (order.orderStatus || order.status || 'pending').toLowerCase().replace(/\s+/g, '-');
                      const payClass = (order.paymentStatus || 'pending').toLowerCase();
                      return (
                        <React.Fragment key={order.orderId || order.id || idx}>
                          <tr className={`rpt-tr${isExpanded ? ' selected' : ''}`}>
                            <td>{(orderPage - 1) * reportOrdersPageSize + idx + 1}</td>
                            <td>
                              <strong>{order.orderId || order.id}</strong>
                              {order.isPreorder && (
                                <span style={{ display: 'block', fontSize: '10px', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>
                                  ✦ Pre-Booking
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#12382e' }}>{order.Customer?.name || order.snapName || 'Customer'}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{order.Customer?.phone || order.snapPhone || order.guestEmail || '—'}</div>
                            </td>
                            <td className="rpt-date-cell">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td>{order.paymentMethod || 'Online'}</td>
                            <td>
                              <span className={`rpt-status ${payClass === 'paid' ? 'Delivered' : payClass === 'failed' ? 'Cancelled' : 'Pending'}`} style={{ fontSize: '11px' }}>
                                {order.paymentStatus || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <span className={`rpt-status ${order.orderStatus || order.status}`}>
                                {order.orderStatus || order.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <div style={{ maxWidth: '240px' }}>
                                {slots.slice(0, 2).map((sl, sidx) => (
                                  <div key={sidx} className="rpt-prod-chip" style={{ fontSize: '11px' }}>
                                    {sl.Product?.name || sl.productName || 'Item'} ×{sl.quantity}
                                    <span className="rpt-prod-chip-price">&nbsp;· ₹{fmt(sl.salesPrice)}</span>
                                  </div>
                                ))}
                                {slots.length > 2 && (
                                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                    +{slots.length - 2} more item(s)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#12382e', fontSize: '14px' }}>
                              ₹{fmt(order.totalAmount || 0)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => setExpandedReportOrder(isExpanded ? null : (order.orderId || order.id))}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  background: isExpanded ? '#12382e' : '#f1f5f9',
                                  color: isExpanded ? '#fff' : '#12382e',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={10} style={{ padding: 0, background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                <div style={{ padding: '18px 24px', background: '#fafaf9', borderLeft: '4px solid #c9a84c' }}>
                                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#12382e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Order {order.orderId || order.id} Breakdown &amp; Item Details
                                  </h4>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                    <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Customer &amp; Shipping</p>
                                      <div style={{ fontSize: '12.5px', color: '#1e293b' }}>
                                        <strong>{order.Customer?.name || order.snapName || 'Guest'}</strong><br/>
                                        Email: {order.Customer?.email || order.guestEmail || '—'}<br/>
                                        Phone: {order.Customer?.phone || order.snapPhone || '—'}<br/>
                                        Address: {[order.snapAddressLine, order.snapCity, order.snapState, order.snapPincode].filter(Boolean).join(', ') || '—'}
                                      </div>
                                    </div>
                                    <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Payment &amp; Logistics</p>
                                      <div style={{ fontSize: '12.5px', color: '#1e293b' }}>
                                        Payment Method: {order.paymentMethod || 'Online'}<br/>
                                        Payment Status: <strong>{order.paymentStatus || 'Pending'}</strong><br/>
                                        Payment ID: {order.paymentId || '—'}<br/>
                                      </div>
                                    </div>
                                  </div>

                                  <table style={{ width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                    <thead>
                                      <tr style={{ background: '#12382e', color: '#fff' }}>
                                        <th style={{ padding: '7px 10px', fontSize: '10px', textTransform: 'uppercase' }}>S.No</th>
                                        <th style={{ padding: '7px 10px', fontSize: '10px', textTransform: 'uppercase' }}>Product</th>
                                        <th style={{ padding: '7px 10px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '7px 10px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ padding: '7px 10px', fontSize: '10px', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slots.map((s, sidx) => (
                                        <tr key={sidx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '12px' }}>{sidx + 1}</td>
                                          <td style={{ padding: '8px 10px', fontSize: '12.5px' }}>
                                            <strong>{s.Product?.name || s.productName || 'Product'}</strong>
                                            {s.variantLabel && <small style={{ display: 'block', color: '#64748b' }}>{s.variantLabel}</small>}
                                          </td>
                                          <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '12px' }}>{s.quantity}</td>
                                          <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px' }}>₹{fmt(s.salesPrice)}</td>
                                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#12382e', fontSize: '12.5px' }}>
                                            ₹{fmt(s.salesPrice * s.quantity)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No orders match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalReportOrderPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Showing {(orderPage - 1) * reportOrdersPageSize + 1} to {Math.min(orderPage * reportOrdersPageSize, filteredReportOrders.length)} of {filteredReportOrders.length} orders
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={orderPage === 1}
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: orderPage === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalReportOrderPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalReportOrderPages > 5 && orderPage > 3) {
                      pageNum = orderPage - 2 + i;
                      if (pageNum > totalReportOrderPages) pageNum = totalReportOrderPages - 4 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setOrderPage(pageNum)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: pageNum === orderPage ? '1px solid #12382e' : '1px solid #cbd5e1',
                          background: pageNum === orderPage ? '#12382e' : '#fff',
                          color: pageNum === orderPage ? '#fff' : '#12382e',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={orderPage === totalReportOrderPages}
                    onClick={() => setOrderPage(p => Math.min(totalReportOrderPages, p + 1))}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: orderPage === totalReportOrderPages ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}



