import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEye } from 'react-icons/fi';
import {
    RiEyeLine, RiSearchLine, RiCloseLine,
    RiUserLine, RiMapPinLine, RiProfileLine,
    RiArrowLeftSLine, RiArrowRightSLine,
    RiArrowDownSLine, RiArrowUpSLine,
    RiShoppingBag3Line, RiDeleteBin6Line,
    RiPhoneLine, RiMailLine, RiTimeLine,
    RiShieldUserLine, RiGlobalLine, RiGiftLine,
} from "react-icons/ri";
import './CustomerPage.css';
import { API, IMG } from '../config';
import AdminPagination from '../components/AdminPagination';

const STATUS_COLOR = {
    Pending:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    Confirmed: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    Packed:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    Shipped:   { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
    Delivered: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
    Cancelled: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};

const CustomerPage = () => {
    const [customers,   setCustomers]   = useState([]);
    const [guestCustomers, setGuestCustomers] = useState([]);
    const [searchTerm,  setSearchTerm]  = useState('');
    const [selectedCust, setSelectedCust] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [customerView, setCustomerView] = useState('all');
    const [customerOrders, setCustomerOrders] = useState([]);
    const [custStats, setCustStats] = useState(null);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState(null);

    const customersPerPage = 10;
    const location = useLocation();

    useEffect(() => { fetchCustomers(); }, []);

    const query = new URLSearchParams(location.search);
    const filterQuery = query.get('filter');
    const viewQuery = query.get('view');

    useEffect(() => {
        if (['all', 'registered', 'purchased', 'guest', 'deleted'].includes(viewQuery)) {
            setCustomerView(viewQuery);
            setCurrentPage(1);
        }
    }, [viewQuery]);

    const fetchCustomers = async () => {
        try {
            const [registeredRes, guestsRes] = await Promise.all([
                axios.get(`${API}/customers/all`),
                axios.get(`${API}/customers/guests`)
            ]);
            setCustomers(registeredRes.data);
            setGuestCustomers(Array.isArray(guestsRes.data) ? guestsRes.data : []);
        } catch (err) {
            toast.error('Failed to load customers');
            console.error(err);
        }
    };

    const handleDeleteRequest = (id) => {
        toast.warn(
            <div style={{ lineHeight: 1.5 }}>
                <strong>Delete this customer?</strong>
                <p style={{ margin: '4px 0 8px 0', fontSize: 12 }}>This will soft-delete their account but preserve past order data.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => confirmDelete(id)}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                    >Yes, Delete</button>
                    <button
                        onClick={() => toast.dismiss()}
                        style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >Cancel</button>
                </div>
            </div>,
            { autoClose: false, closeOnClick: false, closeButton: false, icon: '' }
        );
    };

    const confirmDelete = async (id) => {
        toast.dismiss();
        try {
            await axios.delete(`${API}/customers/delete/${id}`);
            toast.success('Customer deleted successfully');
            fetchCustomers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete customer');
        }
    };

    const toggleExpand = (custId) =>
        setExpandedRow(prev => prev === custId ? null : custId);

    const openCustomerDetails = async (customer) => {
        setSelectedCust(customer);
        setCustomerOrders([]);
        setCustStats(null);
        setExpandedOrder(null);
        setOrdersLoading(true);
        try {
            const isGuest = customer.customerType === 'GUEST' || customer.isGuest;
            const ordersParams = isGuest
                ? { search: customer.email || customer.phone, page: 1, limit: 1000 }
                : { customerId: customer.id, email: customer.email, page: 1, limit: 1000 };

            const [ordersRes, statsRes] = await Promise.all([
                axios.get(`${API}/orders/all`, { params: ordersParams }),
                axios.get(`${API}/customers/${customer.id}/stats`).catch(() => ({ data: { stats: null } }))
            ]);
            const orders = ordersRes.data?.orders || [];
            setCustomerOrders(orders);
            setCustStats(statsRes.data?.stats || {
                totalOrders: customer.orderCount || orders.length || 0,
                successfulOrders: orders.filter(o => o.orderStatus === 'Delivered').length || 0,
                canceledOrders: orders.filter(o => o.orderStatus === 'Cancelled').length || 0,
                totalSpend: customer.totalSpent || orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? Number(o.totalAmount || 0) : 0), 0) || 0
            });
        } catch (err) {
            toast.error('Failed to load customer details');
        } finally {
            setOrdersLoading(false);
        }
    };

    const sourceCustomers = customerView === 'guest' ? guestCustomers : customers;

    const filtered = sourceCustomers.filter(c => {
        let matchesSearch = true;
        let matchesActive = true;
        let matchesView = true;

        const q = (searchTerm || '').trim().toLowerCase();
        if (q) {
            matchesSearch = (c.name || '').toLowerCase().includes(q) ||
                            (c.id?.toString() || '').toLowerCase().includes(q) ||
                            (c.email || '').toLowerCase().includes(q) ||
                            (c.phone || '').toLowerCase().includes(q);
        }
        if (filterQuery === 'Active') {
            matchesActive = !c.deletedAt && Number(c.orderCount || 0) > 0;
        }
        const orders = Number(c.orderCount || 0);
        if (customerView === 'all') matchesView = !c.deletedAt;
        else if (customerView === 'purchased') matchesView = !c.deletedAt && orders > 0;
        else if (customerView === 'deleted') matchesView = Boolean(c.deletedAt);
        else if (customerView === 'guest') matchesView = true;
        // Registered tab is for customers who registered but have not yet placed an order
        else matchesView = !c.deletedAt && orders === 0;

        return matchesSearch && matchesActive && matchesView;
    });

    const allCount        = customers.filter(c => !c.deletedAt).length;
    const registeredCount = customers.filter(c => !c.deletedAt && Number(c.orderCount || 0) === 0).length;
    const purchasedCount  = customers.filter(c => !c.deletedAt && Number(c.orderCount || 0) > 0).length;
    const deletedCount    = customers.filter(c => c.deletedAt).length;
    const guestCount      = guestCustomers.length;

    const totalPages   = Math.ceil(filtered.length / customersPerPage) || 1;
    const safePage     = currentPage > totalPages ? 1 : currentPage;
    const currentItems = filtered.slice((safePage - 1) * customersPerPage, safePage * customersPerPage);

    const getInitials = (name = '') => {
        const parts = name.trim().split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : (name.charAt(0) || '?').toUpperCase();
    };

    const avatarColor = (name = '') => {
        const colors = ['#12382e', '#1e40af', '#7c3aed', '#0369a1', '#065f46', '#9a3412'];
        return colors[name.charCodeAt(0) % colors.length] || '#12382e';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="ars-customer-wrapper">
            <div className="ars-main-card">

                {/* HEADER */}
                <div className="card-header">
                    <div className="title-area">
                        <h1>Customer <span className="gold-text">Database</span></h1>
                        <p>{filtered.length} records</p>
                    </div>
                    <div className="cp-search-box search-bar-curved">
                        <RiSearchLine className="cp-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by Name, Email or Phone..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            style={{ paddingLeft: '42px', paddingRight: '36px' }}
                        />
                        {searchTerm && (
                            <RiCloseLine
                                className="cp-search-clear"
                                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
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
                </div>

                {/* FILTER TABS */}
                <div className="customer-filter-tabs">
                    <button
                        className={customerView === 'all' ? 'is-active' : ''}
                        onClick={() => { setCustomerView('all'); setCurrentPage(1); }}
                    >
                        <RiUserLine /> All <span>{allCount}</span>
                    </button>
                    <button
                        className={customerView === 'registered' ? 'is-active' : ''}
                        onClick={() => { setCustomerView('registered'); setCurrentPage(1); }}
                    >
                        <RiShieldUserLine /> Registered <span>{registeredCount}</span>
                    </button>
                    <button
                        className={customerView === 'purchased' ? 'is-active' : ''}
                        onClick={() => { setCustomerView('purchased'); setCurrentPage(1); }}
                    >
                        <RiShoppingBag3Line /> With Orders <span>{purchasedCount}</span>
                    </button>
                    <button
                        className={customerView === 'guest' ? 'is-active' : ''}
                        onClick={() => { setCustomerView('guest'); setCurrentPage(1); }}
                    >
                        <RiGlobalLine /> Guest Buyers <span>{guestCount}</span>
                    </button>
                    <button
                        className={`is-deleted ${customerView === 'deleted' ? 'is-active' : ''}`}
                        onClick={() => { setCustomerView('deleted'); setCurrentPage(1); }}
                    >
                        <RiDeleteBin6Line /> Deleted <span>{deletedCount}</span>
                    </button>
                </div>

                {/* TABLE */}
                <div className="table-responsive">
                    <table className="ars-premium-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60, textAlign: 'center' }}>S.No</th>
                                <th>CUSTOMER</th>
                                <th>CONTACT INFO</th>
                                <th>JOINED</th>
                                <th>ORDERS</th>
                                <th style={{ textAlign: 'center' }}>VIEW</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map((cust, idx) => (
                                <React.Fragment key={cust.id}>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="id-txt">{(safePage - 1) * customersPerPage + idx + 1}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: '50%',
                                                    background: avatarColor(cust.name),
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    flexShrink: 0
                                                }}>
                                                    {getInitials(cust.name)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                                                        {cust.name || 'Unnamed'}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                        {cust.customerType === 'GUEST' || cust.isGuest ? (
                                                            <span style={{ padding: '2px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                                                Guest Buyer
                                                            </span>
                                                        ) : (
                                                            <span style={{ padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                                                Registered
                                                            </span>
                                                        )}
                                                        {cust.deletedAt && (
                                                            <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                                                Deleted
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                                                    <RiMailLine style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{cust.email || '—'}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                                                    <RiPhoneLine style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                    {cust.phone || '—'}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#64748b' }}>
                                                <RiTimeLine style={{ color: '#94a3b8' }} />
                                                {formatDate(cust.createdAt)}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    background: Number(cust.orderCount) > 0 ? '#f0fdf4' : '#f8fafc',
                                                    color: Number(cust.orderCount) > 0 ? '#15803d' : '#94a3b8',
                                                    border: `1px solid ${Number(cust.orderCount) > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                                                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600
                                                }}>
                                                    <RiShoppingBag3Line />
                                                    {cust.orderCount || 0} {Number(cust.orderCount) === 1 ? 'order' : 'orders'}
                                                </span>
                                                {cust.ShippingAddresses?.length > 0 && (
                                                    <button
                                                        className={`ship-expand-btn ${expandedRow === cust.id ? 'active' : ''}`}
                                                        onClick={() => toggleExpand(cust.id)}
                                                        title="View addresses"
                                                    >
                                                        <RiMapPinLine />
                                                        {cust.ShippingAddresses.length}
                                                        {expandedRow === cust.id ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="action-cell">
                                            <button className="pp-act-btn view" onClick={() => openCustomerDetails(cust)} title="View full profile & order history">
                                                <FiEye size={16} />
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedRow === cust.id && (
                                        <tr className="expanded-sub-row">
                                            <td colSpan={6} style={{ padding: 0 }}>
                                                <div className="shipping-expand-panel">
                                                    <div className="sep-header">
                                                        <RiMapPinLine className="sep-icon" />
                                                        Saved Shipping Addresses for <strong>&nbsp;{cust.name}</strong>
                                                        <span className="sep-count">{cust.ShippingAddresses.length} saved</span>
                                                    </div>
                                                    <div className="sa-list">
                                                        {cust.ShippingAddresses.map((addr, i) => (
                                                            <div className="sa-row" key={addr.id}>
                                                                <div className="sa-row-left">
                                                                    <span className="sa-num">{i + 1}</span>
                                                                    <div className="sa-details">
                                                                        <span className="sa-name">{addr.name}</span>
                                                                        <span className="sa-phone">{addr.phone}</span>
                                                                        <span className="sa-addr">
                                                                            {[addr.addressLine, addr.city, addr.district, addr.state].filter(Boolean).join(', ')}
                                                                            {addr.pincode ? ` - ${addr.pincode}` : ''}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="empty-row">
                                        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                                            <RiUserLine style={{ fontSize: '48px', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                                            No customers found.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <AdminPagination
                    page={safePage}
                    totalItems={filtered.length}
                    pageSize={customersPerPage}
                    onPageChange={setCurrentPage}
                    label="customers"
                />
            </div>

            {/* ── CUSTOMER DETAIL MODAL ── */}
            {selectedCust && (
                <div className="ars-overlay" onClick={() => setSelectedCust(null)}>
                    <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '900px', width: '96vw', maxHeight: '90vh', overflowY: 'auto' }}>

                        {/* Modal Header */}
                        <div className="modal-header-black">
                            <div className="cust-identity">
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: avatarColor(selectedCust.name),
                                    color: '#c9a84c', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0
                                }}>
                                    {getInitials(selectedCust.name)}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        {selectedCust.name}
                                        
                                        {(selectedCust.customerType === 'GUEST' || selectedCust.isGuest) ? (
                                            <span style={{ padding: '2px 10px', background: 'rgba(224,242,254,0.2)', color: '#7dd3fc', borderRadius: '12px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(125,211,252,0.3)' }}>
                                                Guest Buyer
                                            </span>
                                        ) : (
                                            <span style={{ padding: '2px 10px', background: 'rgba(167,243,208,0.2)', color: '#6ee7b7', borderRadius: '12px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(110,231,183,0.3)' }}>
                                                Registered
                                            </span>
                                        )}
                                    </h3>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <span><RiMailLine style={{ verticalAlign: 'middle', marginRight: '4px' }} />{selectedCust.email}</span>
                                        {selectedCust.phone && <span><RiPhoneLine style={{ verticalAlign: 'middle', marginRight: '4px' }} />{selectedCust.phone}</span>}
                                    </div>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedCust(null)}>
                                <RiCloseLine size={18} />
                            </button>
                        </div>

                        {/* Analytics Stats */}
                        {custStats && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Orders</div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>{custStats.totalOrders}</div>
                                </div>
                                <div style={{ background: '#ecfdf5', padding: '14px 16px', borderRadius: '10px', border: '1px solid #d1fae5', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Delivered</div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#065f46' }}>{custStats.successfulOrders}</div>
                                </div>
                                <div style={{ background: '#fffbeb', padding: '14px 16px', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Spend</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#78350f' }}>₹{Number(custStats.totalSpend).toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        )}

                        <div className="modal-body-grid">
                            {/* Customer Info */}
                            <div className="address-section register-box">
                                <h4 className="sub-heading">
                                    <RiUserLine /> Customer Info
                                </h4>
                                <div className="addr-details">
                                    <p><strong>Name</strong> {selectedCust.name || '—'}</p>
                                    <p><strong>Email</strong> {selectedCust.email || '—'}</p>
                                    <p><strong>Phone</strong> {selectedCust.phone || '—'}</p>
                                    <p><strong>Type</strong> {(selectedCust.customerType === 'GUEST' || selectedCust.isGuest) ? 'Guest Buyer' : 'Registered'}</p>
                                    <p><strong>Joined</strong> {formatDate(selectedCust.createdAt)}</p>
                                    {selectedCust.deletedAt && <p style={{ color: '#ef4444' }}><strong>Deleted</strong> {formatDate(selectedCust.deletedAt)}</p>}
                                </div>
                            </div>

                            {/* Shipping Addresses */}
                            <div className="address-section shipping-box">
                                <h4 className="sub-heading">
                                    <RiMapPinLine /> Shipping Addresses
                                    <span className="ship-count-inline">({selectedCust.ShippingAddresses?.length || 0})</span>
                                </h4>
                                {selectedCust.ShippingAddresses?.length > 0 ? (
                                    <div className="shipping-list">
                                        {selectedCust.ShippingAddresses.map((addr, i) => (
                                            <div className="shipping-card" key={addr.id}>
                                                <div className="shipping-card-num">Address {i + 1}</div>
                                                <div className="addr-details">
                                                    {addr.name        && <p><strong>Name</strong>    {addr.name}</p>}
                                                    {addr.phone       && <p><strong>Phone</strong>   {addr.phone}</p>}
                                                    {addr.addressLine && <p><strong>Address</strong> {addr.addressLine}</p>}
                                                    {addr.city        && <p><strong>City</strong>    {addr.city}</p>}
                                                    {addr.district    && <p><strong>District</strong>{addr.district}</p>}
                                                    {addr.state       && <p><strong>State</strong>   {addr.state}</p>}
                                                    {addr.pincode     && <p><strong>Pincode</strong> {addr.pincode}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="no-data">No shipping addresses saved yet.</p>}
                            </div>
                        </div>

                        {/* Order History */}
                        <section className="customer-order-history">
                            <div className="customer-order-history__head">
                                <h4><RiShoppingBag3Line /> Complete Order History</h4>
                                <span>{ordersLoading ? 'Loading...' : `${customerOrders.length} orders`}</span>
                            </div>

                            {ordersLoading ? (
                                <p className="no-data" style={{ padding: '30px', textAlign: 'center' }}>Loading order history...</p>
                            ) : customerOrders.length === 0 ? (
                                <p className="no-data" style={{ padding: '30px', textAlign: 'center' }}>No orders placed yet.</p>
                            ) : (
                                <div className="customer-order-history__list">
                                    {customerOrders.map(order => {
                                        const statusStyle = STATUS_COLOR[order.orderStatus] || STATUS_COLOR.Pending;
                                        const isOpen = expandedOrder === order.orderId;
                                        return (
                                            <article className="customer-history-order" key={order.orderId}>
                                                <div
                                                    className="customer-history-order__meta"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setExpandedOrder(isOpen ? null : order.orderId)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                                                        <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: '#12382e' }}>{order.orderId}</strong>
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(order.createdAt)}</span>
                                                        {order.isPreorder && <em style={{ color: '#7c3aed', fontSize: '12px' }}>Pre-booking</em>}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                                                            {order.orderStatus || 'Pending'}
                                                        </span>
                                                        <strong style={{ color: '#12382e', fontSize: '14px' }}>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</strong>
                                                        {isOpen ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                                                    </div>
                                                </div>

                                                {isOpen && (
                                                    <div className="customer-history-items" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                                                        {(order.shippingSnapshot || order.shippingAddress) && (
                                                            <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                                                                <strong style={{ color: '#12382e', display: 'block', marginBottom: '4px' }}> Delivery Address</strong>
                                                                {(() => {
                                                                    const snap = order.shippingSnapshot || order.shippingAddress || {};
                                                                    return [snap.name, snap.phone, snap.addressLine, snap.city, snap.district, snap.state, snap.pincode].filter(Boolean).join(', ');
                                                                })()}
                                                            </div>
                                                        )}

                                                        {(order.slots || order.items || []).map(item => {
                                                            const image = item.Product?.mainImage || item.productImage;
                                                            const imageSrc = image ? (image.startsWith('http') ? image : `${IMG}/${image}`) : null;
                                                            return (
                                                                <div className="customer-history-item" key={item.id} style={{ alignItems: 'flex-start', gap: '14px', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                                                                    {imageSrc
                                                                        ? <img src={imageSrc} alt={item.Product?.name || item.productName} style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }} />
                                                                        : <div style={{ width: '56px', height: '56px', background: '#f1f5f9', borderRadius: '8px', flexShrink: 0 }} />
                                                                    }
                                                                    <div style={{ flex: 1 }}>
                                                                        <strong style={{ display: 'block', color: '#1e293b', fontSize: '13px' }}>{item.Product?.name || item.productName || 'Product'}</strong>
                                                                        <span style={{ color: '#64748b', fontSize: '12px' }}>{item.variantLabel || item.selectedSubOption || 'Standard'} · Qty {item.quantity}</span>
                                                                    </div>
                                                                    <b style={{ color: '#12382e', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>₹{Number(item.salesPrice || 0).toLocaleString('en-IN')}</b>
                                                                </div>
                                                            );
                                                        })}

                                                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', fontSize: '13px' }}>
                                                            {Number(order.shippingAmount) > 0 && (
                                                                <div style={{ color: '#64748b' }}>Shipping ({order.shippingType || 'Standard'}): <strong>₹{Number(order.shippingAmount).toLocaleString('en-IN')}</strong></div>
                                                            )}
                                                            {order.giftWrap ? <div style={{ color: '#64748b' }}> Gift Wrapping: <strong>₹30</strong></div> : null}
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#12382e', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                                                                Total Paid: ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <div className="modal-footer-info">
                            <span>{selectedCust.email}</span>
                            <span>{selectedCust.phone}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage;
