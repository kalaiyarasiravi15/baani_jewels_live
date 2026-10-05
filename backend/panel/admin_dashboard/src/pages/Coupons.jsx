import { toScheduleInput, schedulePayload } from '../utils/promotionTime';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import './ProductPage.css';
import './Coupons.css';

import { API } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';
import CharCount from '../components/CharCount';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [couponSearch, setCouponSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [usageDetails, setUsageDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const expiryCheckRef = useRef(null);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    discountValue: '',
    minOrderAmount: 0,
    maxOrderAmount: '',
    startDate: '',
    endDate: '',
    usageLimit: 100,
    status: true,
  });

  /* ── Fetch coupons ── */
  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API}/coupons/all`);
      setCoupons(res.data);
    } catch (err) {
      console.error('Error fetching coupons', err);
    }
  };

  /* ── On mount: fetch ── */
  useEffect(() => { const timer = setInterval(() => { if (!document.hidden) fetchCoupons(); }, 5000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    fetchCoupons();
  }, []);

  /* ── Delete with toast confirmation ── */
  const handleDeleteRequest = (id) => {
    setDeleteTarget(id);
    toast.warn(
      <div style={{ lineHeight: 1.5 }}>
        <strong>Delete this coupon?</strong>
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
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        icon: '🗑️',
      }
    );
  };

  const confirmDelete = async (id) => {
    toast.dismiss();
    setDeleteTarget(null);
    try {
      await axios.delete(`${API}/coupons/${id}`);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTimeDisplay = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await axios.patch(`${API}/coupons/status/${id}`);
      toast.success(res.data.message || 'Status updated successfully');
      fetchCoupons();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleEditRequest = (coupon) => {
    setEditId(coupon._id || coupon.id);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || 0,
      maxOrderAmount: coupon.maxOrderAmount || '',
      startDate: toScheduleInput(coupon.startDate),
      endDate: toScheduleInput(coupon.endDate),
      usageLimit: coupon.usageLimit || 100,
      status: coupon.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleViewUsage = async (coupon) => {
    try {
      const res = await axios.get(`${API}/coupons/${coupon.id || coupon._id}/usage`);
      setUsageDetails(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to load coupon usage details');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'discountValue' && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || (String(formData.type).toLowerCase() === 'percentage' && Number(value) > 100))) return;
    if (['type', 'discountType'].includes(name) && value.toLowerCase() === 'percentage' && Number(formData.discountValue) > 100) { setFormData(prev => ({ ...prev, [name]: value, discountValue: '' })); return; }
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const trimmedCode = (formData.code || '').trim().toUpperCase();
    if (!trimmedCode) {
      newErrors.code = 'Coupon Code is required.';
      toast.error('Coupon Code is required.');
    } else {
      const isDuplicate = coupons.some(c => 
        (c.code || '').trim().toUpperCase() === trimmedCode &&
        (c.id || c._id) !== editId
      );
      if (isDuplicate) {
        newErrors.code = 'This coupon code already exists!';
        toast.error('This coupon code already exists!');
      }
    }
    if (formData.discountValue === '' || formData.discountValue === null || formData.discountValue === undefined) {
      newErrors.discountValue = 'Discount Value is required.';
      toast.error('Discount Value is required.');
    } else {
      const val = parseFloat(formData.discountValue);
      if (!Number.isFinite(val) || val <= 0 || (formData.type === 'percentage' && val > 100)) {
        newErrors.discountValue = formData.type === 'percentage' && val > 100
          ? 'Discount Percentage must be between 1 and 100.'
          : 'Discount Value must be a positive number.';
        toast.error(newErrors.discountValue);
      }
    }
    if (formData.minOrderAmount === '' || formData.minOrderAmount === null || formData.minOrderAmount === undefined) {
      newErrors.minOrderAmount = 'Min Order Amount is required.';
      toast.error('Min Order Amount is required.');
    } else {
      const minOrder = parseFloat(formData.minOrderAmount);
      if (minOrder < 0 || isNaN(minOrder)) {
        newErrors.minOrderAmount = 'Min Order Amount must be a positive number.';
        toast.error('Min Order Amount must be a positive number.');
      }
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start Date is required.';
      toast.error('Start Date is required.');
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End Date is required.';
      toast.error('End Date is required.');
    }
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End Date cannot be before Start Date.';
      toast.error('End Date cannot be before Start Date.');
    }
    if (formData.usageLimit === '' || formData.usageLimit === null || formData.usageLimit === undefined) {
      newErrors.usageLimit = 'Usage Limit is required.';
      toast.error('Usage Limit is required.');
    } else {
      const limit = parseInt(formData.usageLimit);
      if (limit <= 0 || isNaN(limit)) {
        newErrors.usageLimit = 'Usage Limit must be a positive integer.';
        toast.error('Usage Limit must be a positive integer.');
      }
    }
    if (
      formData.maxOrderAmount &&
      parseFloat(formData.maxOrderAmount) > 0 &&
      parseFloat(formData.minOrderAmount) > parseFloat(formData.maxOrderAmount)
    ) {
      newErrors.maxOrderAmount = 'Max Order Amount must be greater than Min Order Amount!';
      toast.error('Max Order Amount must be greater than Min Order Amount!');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      if (editId) {
        await axios.put(`${API}/coupons/update/${editId}`, schedulePayload(formData));
        toast.success('Coupon Updated Successfully!');
      } else {
        await axios.post(`${API}/coupons/add`, schedulePayload(formData));
        toast.success('Coupon Created Successfully!');
      }
      closeAndReset();
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setShowModal(false);
    setEditId(null);
    setFormData({
      code: '', type: 'percentage',
      discountValue: '', minOrderAmount: 0, maxOrderAmount: '',
      startDate: '', endDate: '',
      usageLimit: 100, status: true,
    });
    setErrors({});
  };

  /* ── Helpers ── */
  const isExpired = (endDate) => new Date(endDate) < new Date();
  const totalUsage = coupons.reduce((total, c) => total + (c.usedCount || 0), 0);

  const cleanCouponSearch = (couponSearch || '').trim().toLowerCase();
  const filteredCoupons = coupons.filter(c =>
    !cleanCouponSearch ||
    (c.code || '').toLowerCase().includes(cleanCouponSearch) ||
    (c.type || '').toLowerCase().includes(cleanCouponSearch)
  );

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCoupons = filteredCoupons.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  return (
    <div className="pp-wrap">

      {/* ── Top Bar ── */}
      <div className="pp-list-topbar">
        <div className="pp-list-title">
          <h2>Manage Coupons</h2>
          <span className="pp-count-pill">{filteredCoupons.length} coupons</span>
          <span className="pp-count-pill">{totalUsage} used</span>
        </div>
        <div className="pp-list-actions">
          <div className="cp-search-box">
            <RiSearchLine className="cp-search-icon" />
            <input 
              type="text" 
              placeholder="Search coupon code..." 
              value={couponSearch}
              onChange={(e) => { setCouponSearch(e.target.value); setCurrentPage(1); }}
            />
            {couponSearch && (
              <RiCloseLine
                className="cp-search-clear"
                onClick={() => { setCouponSearch(''); setCurrentPage(1); }}
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
          <button className="pp-btn-add" onClick={() => setShowModal(true)}>
            + Create Coupon
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Order Range</th>
                {/* <th>Usage</th> */}
                <th>Validity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="pp-empty">
                      <div className="pp-empty-icon"></div>
                      No coupons found. Create your first one!
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCoupons.map((c, idx) => {
                  const usedCount    = c.usedCount || 0;
                  const usageLimit   = c.usageLimit || 1;
                  // usageLimit applies to each customer, while usedCount is
                  // only the total store redemption count.
                  const limitReached = false;
                  const expired      = isExpired(c.endDate);
                  const unavailable  = expired || limitReached;

                  return (
                    <tr
                      key={c._id || c.id}
                      style={unavailable ? { opacity: 0.5, background: '#fff5f5' } : {}}
                    >
                      <td style={{ textAlign: 'center' }}><span className="id-txt">{(safePage - 1) * ADMIN_PAGE_SIZE + idx + 1}</span></td>
                      <td>
                        <span className="coupon-code-badge">{c.code}</span>
                        {expired && (
                          <span style={{
                            display: 'block', marginTop: 4,
                            fontSize: 10, fontWeight: 700,
                            color: '#fff', background: '#e53935',
                            borderRadius: 4, padding: '2px 6px',
                            width: 'fit-content'
                          }}>
                            EXPIRED
                          </span>
                        )}
                      </td>

                      <td><span className="pp-type-badge">{c.type}</span></td>

                      <td className="pp-td-sale" style={{ fontWeight: 600 }}>
                        {c.type === 'percentage'
                          ? `${c.discountValue}%`
                          : `₹${c.discountValue}`}
                      </td>

                      <td>
                        <div style={{ fontSize: 13 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Min: </span>
                          <strong>₹{parseFloat(c.minOrderAmount).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ fontSize: 13 }}>
                          {c.maxOrderAmount
                            ? <>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Max: </span>
                                <strong>₹{parseFloat(c.maxOrderAmount).toLocaleString('en-IN')}</strong>
                              </>
                            : <span style={{ color: '#2e7d32', fontSize: 12 }}>No upper limit</span>
                          }
                        </div>
                      </td>

                      {/* <td>
                        <div className="usage-txt" style={{ fontWeight: 600 }}>
                          {usedCount} {usedCount === 1 ? 'time' : 'times'} used
                        </div>
                      </td> */}

                      <td>
                        <div className="date-range" style={{ color: expired ? '#e53935' : undefined, fontSize: '12px' }}>
                          {formatDateTimeDisplay(c.startDate)} –{" "}
                          {formatDateTimeDisplay(c.endDate)}
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={() => !unavailable && handleToggleStatus(c._id || c.id)}
                          disabled={unavailable}
                          className={`pp-status-badge ${c.status && !unavailable ? 'in' : 'out'}`}
                          style={{
                            border: 'none',
                            cursor: unavailable ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            ...(expired ? { background: '#fee2e2', color: '#dc2626' } : {})
                          }}
                          title={expired ? "Expired coupons cannot be toggled" : `Click to toggle status`}
                        >
                          {expired ? 'Expired (Inactive)' : c.status ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td>
                        <div className="pp-action-btns" style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="pp-act-btn view"
                            onClick={() => handleViewUsage(c)}
                            title="View coupon usage"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            className="pp-act-btn edit"
                            onClick={() => handleEditRequest(c)}
                            title="Edit Coupon"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            className="pp-act-btn del"
                            onClick={() => handleDeleteRequest(c._id || c.id)}
                            title="Delete Coupon"
                            disabled={deleteTarget === (c._id || c.id)}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination page={safePage} totalItems={coupons.length} onPageChange={setCurrentPage} label="coupons" />
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="ars-modal-overlay" onClick={closeAndReset}>
          <div className="ars-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="pp-form-title" style={{ fontSize: 20 }}>{editId ? 'Edit Coupon' : 'Add New Coupon'}</h3>
              <button className="close-btn" onClick={closeAndReset}>✕</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit} noValidate>

              <div className="form-field">
                <label className="form-label">Coupon Code *</label>
                <input
                  name="code" type="text" placeholder="e.g. SAVE50"
                  value={formData.code} onChange={handleChange}
                  className={`styled-input ${errors.code ? 'invalid-input' : ''}`}
                />
                <CharCount current={(formData.code || '').length} min={3} max={20} />
                {errors.code && <span className="error-msg">{errors.code}</span>}
              </div>

              <div className="dual-input-row">
                <div className="form-field">
                  <label className="form-label">Discount Type *</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="styled-input">
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Discount Value *</label>
                  <input
                    name="discountValue" type="number"
                    placeholder={formData.type === 'percentage' ? 'e.g. 10 (%)' : 'e.g. 50 (₹)'}
                    value={formData.discountValue} onChange={handleChange}
                    className={`styled-input ${errors.discountValue ? 'invalid-input' : ''}`}
                  />
                  {errors.discountValue && <span className="error-msg">{errors.discountValue}</span>}
                </div>
              </div>

              <div className="dual-input-row">
                <div className="form-field">
                  <label className="form-label">Min Order Amount (₹) *</label>
                  <input
                    name="minOrderAmount" type="number" placeholder="e.g. 300"
                    value={formData.minOrderAmount} onChange={handleChange}
                    className={`styled-input ${errors.minOrderAmount ? 'invalid-input' : ''}`} min="0"
                  />
                  {errors.minOrderAmount && <span className="error-msg">{errors.minOrderAmount}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Max Order Amount (₹)
                    <span style={{ color: '#999', fontSize: 11, marginLeft: 4 }}>optional</span>
                  </label>
                  <input
                    name="maxOrderAmount" type="number"
                    placeholder="e.g. 500 (empty = no limit)"
                    value={formData.maxOrderAmount} onChange={handleChange}
                    className="styled-input" min="0"
                  />
                </div>
              </div>

              <div className="dual-input-row">
                <div className="form-field">
                  <label className="form-label">Start Date & Time (IST) *</label>
                  <input
                    name="startDate" type="datetime-local"
                    value={formData.startDate} onChange={handleChange}
                    className={`styled-input ${errors.startDate ? 'invalid-input' : ''}`}
                  />
                  {errors.startDate && <span className="error-msg">{errors.startDate}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">End Date & Time (IST) *</label>
                  <input
                    name="endDate" type="datetime-local"
                    value={formData.endDate} onChange={handleChange}
                    className={`styled-input ${errors.endDate ? 'invalid-input' : ''}`}
                  />
                  {errors.endDate && <span className="error-msg">{errors.endDate}</span>}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Usage Limit *</label>
                <input
                  name="usageLimit" type="number" placeholder="e.g. 100"
                  value={formData.usageLimit} onChange={handleChange}
                  className={`styled-input ${errors.usageLimit ? 'invalid-input' : ''}`} min="1"
                />
                {errors.usageLimit && <span className="error-msg">{errors.usageLimit}</span>}
              </div>

              <div className="modal-footer">
                <button type="button" className="pp-btn-cancel" onClick={closeAndReset}>Cancel</button>
                <button type="submit" className="pp-btn-save" disabled={loading}>
                  {loading ? 'Saving...' : editId ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {usageDetails && (
        <div className="ars-modal-overlay" onClick={() => setUsageDetails(null)}>
          <div className="ars-modal" style={{ maxWidth: 760, width: '92vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c89c4a', fontWeight: 700 }}>Coupon Redemptions</span>
                <h3 className="pp-form-title" style={{ fontSize: 22, margin: '2px 0 0', color: 'var(--thm-primary-color)' }}>
                  Code: <span style={{ color: '#d4af37' }}>{usageDetails.coupon.code}</span>
                </h3>
              </div>
              <button className="close-btn" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }} onClick={() => setUsageDetails(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#475569', fontSize: 13, fontWeight: 500 }}>
                Total Orders Redeemed: <strong>{usageDetails.orders.length}</strong>
              </span>
              <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: '20px', fontSize: 12, fontWeight: 600 }}>
                {usageDetails.coupon.type === 'percentage' ? `${usageDetails.coupon.discountValue}% OFF` : `₹${usageDetails.coupon.discountValue} FLAT OFF`}
              </span>
            </div>

            {usageDetails.orders.length === 0 ? (
              <div className="pp-empty" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
                No customer has used this coupon yet.
              </div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
                {usageDetails.orders.map(order => (
                  <div key={order.orderId} style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--thm-primary-color)', fontSize: 14 }}>{order.orderId}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>· {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontSize: 12, fontWeight: 600 }}>
                          Discount: ₹{Number(order.discountAmount || 0).toLocaleString('en-IN')}
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontSize: 12, fontWeight: 600 }}>
                          Total: ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 6, lineHeight: 1.7 }}>
                      👤 <strong>{order.Customer?.name || order.snapName || 'Guest Customer'}</strong> {(order.Customer?.phone || order.snapPhone) ? `(${order.Customer?.phone || order.snapPhone})` : ''} {(order.Customer?.email || order.guestEmail) ? `· ${order.Customer?.email || order.guestEmail}` : ''}
                      {(order.snapAddressLine || order.snapCity || order.snapState || order.snapPincode) && (
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          📍 {[order.snapAddressLine, order.snapCity, order.snapDistrict, order.snapState, order.snapPincode].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    
                    {(order.slots || []).length > 0 && (
                      <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', marginTop: 6 }}>
                        📦 {(order.slots || []).map(s => `${s.productName || 'Product'}${s.variantLabel ? ` (${s.variantLabel})` : ''} × ${s.quantity}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
