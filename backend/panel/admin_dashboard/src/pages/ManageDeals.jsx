import { toScheduleInput, schedulePayload } from '../utils/promotionTime';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiAlertTriangle, FiPower } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';
import CharCount from '../components/CharCount';

const DEALS_API = `${API}/deals`;

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="pp-confirm-overlay">
    <div className="pp-confirm-box">
      <div className="pp-confirm-icon">
        <FiAlertTriangle style={{ fontSize: '32px', color: '#ef4444' }} />
      </div>
      <p className="pp-confirm-msg">{message}</p>
      <div className="pp-confirm-actions">
        <button className="pp-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="pp-confirm-ok" onClick={onConfirm}>Remove</button>
      </div>
    </div>
  </div>
);

const getLocalISOTime = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return toScheduleInput(new Date());
};

const FormField = ({ label, required, fieldName, errors, children }) => {
  const state = errors[fieldName] ? 'invalid' : '';
  return (
    <div className={`pp-field pp-field--state-${state}`}>
      <label className="pp-price-label">
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {state === 'invalid' && errors[fieldName] && (
        <span className="error-msg">{errors[fieldName]}</span>
      )}
    </div>
  );
};

const ManageDeals = () => {
  const [deals, setDeals]               = useState([]);
  const [offers, setOffers]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [file, setFile]                 = useState(null);
  const [existingImage, setExistingImage] = useState('');
  const [editingId, setEditingId]       = useState(null);
  const [errors, setErrors]             = useState({});
  const [currentPage, setCurrentPage]   = useState(1);
  const [search, setSearch]             = useState('');
  const [panel, setPanel]               = useState('list');

  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [confirmMsg, setConfirmMsg]       = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);

  const [formData, setFormData] = useState({
    title:       '',
    description: '',
    startDate:   '',
    expiryDate:  '',
    buttonText:  'SHOP NOW',
    buttonLink:  '/shop',
    discountPercentage: '',
    isActive:    true,
    discountType: '',
    discountValue: '',
    targetType: 'SHOP',
    targetProductId: '', targetCategoryId: '', targetCollectionId: ''
  });

  const fetchDealsAndProducts = useCallback(async () => {
    setFetchLoading(true);
    try {
      const [resDeals, resOffers, resProducts, resCategories, resCollections] = await Promise.all([
        axios.get(`${DEALS_API}/all`),
        axios.get(`${API}/offer-banners/admin/all`),
        axios.get(`${API}/products/all`), axios.get(`${API}/categories/all`), axios.get(`${API}/home-collections/all-admin`)
      ]);
      setDeals(resDeals.data || []);
      setOffers(resOffers.data || []);
      setProducts(resProducts.data || []);
      setCategories(resCategories.data || []);
      setCollections(resCollections.data || []);
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => { const timer = setInterval(() => { if (!document.hidden) fetchDealsAndProducts(); }, 5000); return () => clearInterval(timer); }, []);
  useEffect(() => { fetchDealsAndProducts(); }, [fetchDealsAndProducts]);

  const now = new Date();
  const hasActiveShopDeal = deals.some(d => {
    const isEditingThis = editingId && (d.id === editingId || d._id === editingId);
    return d.isActive && d.targetType === 'SHOP' && (!d.startDate || new Date(d.startDate) <= now) && new Date(d.expiryDate) > now && !isEditingThis;
  });

  const activeProductDealIds = new Set(deals.filter(d => {
    const isEditingThis = editingId && (d.id === editingId || d._id === editingId);
    return d.isActive && d.targetType === 'PRODUCT' && (!d.startDate || new Date(d.startDate) <= now) && new Date(d.expiryDate) > now && !isEditingThis;
  }).map(d => parseInt(d.targetProductId)));
  const activeCategoryDealIds = new Set(deals.filter(d => d.isActive && d.targetType === 'CATEGORY' && new Date(d.expiryDate) > now && (!d.startDate || new Date(d.startDate) <= now) && !(editingId && d.id === editingId)).map(d => Number(d.targetCategoryId)));
  const activeCollectionDealIds = new Set(deals.filter(d => d.isActive && d.targetType === 'COLLECTION' && new Date(d.expiryDate) > now && (!d.startDate || new Date(d.startDate) <= now) && !(editingId && d.id === editingId)).map(d => Number(d.targetCollectionId)));
  const isLiveOffer = (o) => o.status && (!o.startDate || new Date(o.startDate) <= now) && (!o.expiryDate || new Date(o.expiryDate) > now);
  const activeOfferProductIds = new Set(offers.filter(o => isLiveOffer(o) && o.targetType === 'PRODUCT').map(o => Number(o.productId)));
  const activeOfferCategoryIds = new Set(offers.filter(o => isLiveOffer(o) && o.targetType === 'CATEGORY').map(o => Number(o.targetCategoryId)));
  const activeOfferCollectionIds = new Set(offers.filter(o => isLiveOffer(o) && o.targetType === 'COLLECTION').map(o => Number(o.targetCollectionId)));
  const hasActiveShopOffer = offers.some(o => isLiveOffer(o) && o.targetType === 'SHOP');

  const cleanSearch = (search || '').trim().toLowerCase();
  const filteredDeals = deals.filter(d =>
    !cleanSearch ||
    (d.title || '').toLowerCase().includes(cleanSearch) ||
    (d.description || '').toLowerCase().includes(cleanSearch) ||
    (d.targetType || '').toLowerCase().includes(cleanSearch) ||
    (d.buttonText || '').toLowerCase().includes(cleanSearch)
  );
  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDeals = filteredDeals.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'discountValue' && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || (String(formData.discountType).toLowerCase() === 'percentage' && Number(value) > 100))) return;
    if (['type', 'discountType'].includes(name) && value.toLowerCase() === 'percentage' && Number(formData.discountValue) > 100) { setFormData(prev => ({ ...prev, [name]: value, discountValue: '' })); return; }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', startDate: '', expiryDate: '', buttonText: 'SHOP NOW', buttonLink: '/shop', discountPercentage: '', isActive: true, discountType: '', discountValue: '', targetType: 'SHOP', targetProductId: '', targetCategoryId: '', targetCollectionId: '' });
    setFile(null);
    setExistingImage('');
    setErrors({});
    setPanel('list');
  };

  const handleEdit = (deal) => {
    setEditingId(deal.id || deal._id);
    setExistingImage(deal.image || '');
    setFormData({
      title:       deal.title,
      description: deal.description,
      startDate:   deal.startDate ? toScheduleInput(deal.startDate) : '',
      expiryDate:  deal.expiryDate ? toScheduleInput(deal.expiryDate) : '',
      buttonText:  deal.buttonText,
      buttonLink:  deal.buttonLink,
      discountPercentage: deal.discountPercentage || '',
      discountType: deal.discountType || 'PERCENTAGE',
      discountValue: deal.discountValue || '',
      targetType: deal.targetType || 'SHOP',
      targetProductId: deal.targetProductId || '',
      targetCategoryId: deal.targetCategoryId || '',
      targetCollectionId: deal.targetCollectionId || '',
      isActive:    deal.isActive
    });
    setErrors({});
    setPanel('form');
  };

  const showConfirm = (message, action) => {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleConfirmYes = () => {
    setConfirmOpen(false);
    confirmAction && confirmAction();
  };
  const handleConfirmNo = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.buttonText || !formData.buttonText.trim()) {
      formData.buttonText = "SHOP NOW";
    }
    
    if (formData.targetType === 'PRODUCT' && formData.targetProductId) {
      const p = products.find(prod => String(prod.id) === String(formData.targetProductId));
      formData.buttonLink = `/product/${p?.slug || formData.targetProductId}`;
    } else if (formData.targetType === 'CATEGORY' && formData.targetCategoryId) {
      const c = categories.find(cat => String(cat.id) === String(formData.targetCategoryId));
      formData.buttonLink = `/shop?category=${encodeURIComponent(c?.name || '')}&categoryId=${formData.targetCategoryId}`;
    } else if (formData.targetType === 'COLLECTION' && formData.targetCollectionId) {
      const col = collections.find(cl => String(cl.id) === String(formData.targetCollectionId));
      formData.buttonLink = `/shop?collection=${encodeURIComponent(col?.name || '')}&collectionId=${formData.targetCollectionId}`;
    } else {
      formData.buttonLink = "/shop";
    }

    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Deal Title is required.';
    }
    if (formData.targetType === 'PRODUCT' && !formData.targetProductId) {
      newErrors.targetProductId = 'Product Selection is required.';
    }
    if (formData.targetType === 'CATEGORY' && !formData.targetCategoryId) newErrors.targetCategoryId = 'Category Selection is required.';
    if (formData.targetType === 'COLLECTION' && !formData.targetCollectionId) newErrors.targetCollectionId = 'Collection Selection is required.';
    if (!formData.discountType) {
      newErrors.discountType = 'Discount Type is required.';
    }
    if (formData.discountValue === '' || formData.discountValue === null || formData.discountValue === undefined) {
      newErrors.discountValue = 'Discount Value is required.';
    } else {
      const val = parseFloat(formData.discountValue);
      if (val <= 0 || isNaN(val)) {
        newErrors.discountValue = 'Discount Value must be greater than 0.';
      } else if (formData.discountType === 'PERCENTAGE' && val > 100) {
        newErrors.discountValue = 'Discount Percentage must be between 1 and 100.';
      }
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start Date is required.';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry Date is required.';
    }
    if (formData.startDate && formData.expiryDate && new Date(formData.startDate) >= new Date(formData.expiryDate)) {
      newErrors.expiryDate = 'Expiry Date must be after Start Date.';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    }
    if (!file && !editingId) {
      newErrors.image = 'Banner Image is required.';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        toast.error("Please fill all required fields correctly.");
        return;
    }

    formData.discountPercentage = formData.discountType === 'PERCENTAGE' ? parseInt(formData.discountValue) : 0;

    setLoading(true);
    const data = new FormData();
    Object.entries(schedulePayload(formData)).forEach(([key, value]) => data.append(key, value));
    if (file) data.append('image', file);

    try {
      if (editingId) {
        await axios.put(`${DEALS_API}/update/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Deal updated successfully!");
      } else {
        await axios.post(`${DEALS_API}/add`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("New deal activated!");
      }
      resetForm();
      fetchDealsAndProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Remove this deal from the live site?",
      async () => {
        try {
          await axios.delete(`${DEALS_API}/${id}`);
          toast.success("Deal removed successfully!");
          fetchDealsAndProducts();
        } catch (err) {
          toast.error("Delete failed: " + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  const toggleDealStatus = async (deal) => {
    const data = new FormData();
    data.append('isActive', deal.isActive === false ? 'true' : 'false');
    try {
      await axios.put(`${DEALS_API}/update/${deal.id || deal._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(deal.isActive === false ? 'Deal enabled.' : 'Deal disabled; its discount and link are now inactive.');
      await fetchDealsAndProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not change deal status.');
    }
  };

  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">{editingId ? 'Edit Deal' : 'New Deal'}</h2>
      </div>

      <div style={{ maxWidth: '650px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="pp-section-card">
            <div className="pp-section-label">Deal Details</div>
            <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '-4px', marginBottom: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Create a limited-time deal with a discount on a product, category, or collection. The deal title and description appear on the frontend deal banner.
            </p>

            <FormField label="Deal Title" required fieldName="title" errors={errors}>
              <input className={`pp-input ${errors.title ? 'invalid-input' : ''}`} type="text" name="title" value={formData.title} onChange={handleInputChange} maxLength={60} />
              <CharCount current={(formData.title || '').length} min={3} max={60} />
            </FormField>

            <FormField label="Description" required fieldName="description" errors={errors}>
              <textarea className={`pp-input ${errors.description ? 'invalid-input' : ''}`} style={{ resize: 'vertical', minHeight: '80px' }} name="description" value={formData.description} onChange={handleInputChange} maxLength={200} />
              <CharCount current={(formData.description || '').length} min={10} max={200} />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Discount Type" required fieldName="discountType" errors={errors}>
                  <select className={`pp-input ${errors.discountType ? 'invalid-input' : ''}`} name="discountType" value={formData.discountType} onChange={handleInputChange}>
                    <option value="">Select Discount Type *</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </FormField>
                <FormField label="Discount Value" required fieldName="discountValue" errors={errors}>
                  <input className={`pp-input ${errors.discountValue ? 'invalid-input' : ''}`} type="number" min="0" name="discountValue" value={formData.discountValue} onChange={handleInputChange} placeholder="e.g. 20" />
                </FormField>
            </div>

            <FormField label="Target Type" fieldName="targetType" errors={errors}>
              <select className="pp-input" name="targetType" value={formData.targetType} onChange={handleInputChange}>
                <option value="SHOP" disabled={hasActiveShopDeal || hasActiveShopOffer}>
                  Entire Shop {(hasActiveShopDeal || hasActiveShopOffer) ? '(Promotion Active)' : ''}
                </option>
                <option value="PRODUCT">Particular Product</option>
                <option value="CATEGORY">Category</option>
                <option value="COLLECTION">Collection</option>
              </select>
            </FormField>

            {formData.targetType === 'PRODUCT' && (
              <FormField label="Select Target Product" required fieldName="targetProductId" errors={errors}>
                <select className={`pp-input ${errors.targetProductId ? 'invalid-input' : ''}`} name="targetProductId" value={formData.targetProductId} onChange={handleInputChange}>
                  <option value="">-- Choose a Product --</option>
                  {products.map(p => {
                    const isDisabled = activeProductDealIds.has(parseInt(p.id)) || activeOfferProductIds.has(Number(p.id));
                    return (
                      <option key={p.id} value={p.id} disabled={isDisabled}>
                        {p.name} {isDisabled ? '(Promotion Active)' : ''}
                      </option>
                    );
                  })}
                </select>
              </FormField>
            )}
            {formData.targetType === 'CATEGORY' && <FormField label="Select Category" required fieldName="targetCategoryId" errors={errors}><select className="pp-input" name="targetCategoryId" value={formData.targetCategoryId} onChange={handleInputChange}><option value="">-- Choose a Category --</option>{categories.map(c => { const locked = activeOfferCategoryIds.has(Number(c.id)) || activeCategoryDealIds.has(Number(c.id)); return <option key={c.id} value={c.id} disabled={locked}>{c.name} {locked ? '(Promotion Active)' : ''}</option>; })}</select></FormField>}
            {formData.targetType === 'COLLECTION' && <FormField label="Select Collection" required fieldName="targetCollectionId" errors={errors}><select className="pp-input" name="targetCollectionId" value={formData.targetCollectionId} onChange={handleInputChange}><option value="">-- Choose a Collection --</option>{collections.map(c => { const locked = activeOfferCollectionIds.has(Number(c.id)) || activeCollectionDealIds.has(Number(c.id)); return <option key={c.id} value={c.id} disabled={locked}>{c.name} {locked ? '(Promotion Active)' : ''}</option>; })}</select></FormField>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Start Date & Time (IST)" required fieldName="startDate" errors={errors}>
                  <input className={`pp-input ${errors.startDate ? 'invalid-input' : ''}`} type="datetime-local" name="startDate" min={getLocalISOTime()} value={formData.startDate} onChange={handleInputChange} />
                </FormField>
                <FormField label="Expiry Date & Time (IST)" required fieldName="expiryDate" errors={errors}>
                  <input className={`pp-input ${errors.expiryDate ? 'invalid-input' : ''}`} type="datetime-local" name="expiryDate" min={formData.startDate || getLocalISOTime()} value={formData.expiryDate} onChange={handleInputChange} />
                </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Button Text" fieldName="buttonText" errors={errors}>
                  <input className="pp-input" type="text" name="buttonText" value={formData.buttonText} onChange={handleInputChange} />
                </FormField>
                <FormField label="Status" fieldName="isActive" errors={errors}>
                  <select className="pp-input" name="isActive" value={formData.isActive ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}>
                    <option value="true">Active (Live)</option>
                    <option value="false">Inactive</option>
                  </select>
                </FormField>
            </div>

            <FormField label={`Banner Image ${!editingId ? '*' : '(Optional)'}`} fieldName="image" errors={errors}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(file || (editingId && existingImage)) && (
                  <div style={{ position: 'relative', width: 'fit-content' }}>
                    <img
                      src={file ? URL.createObjectURL(file) : `${IMG}${existingImage}`}
                      alt="Deal Preview"
                      style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input id="dealBannerImg" type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files[0]); if(errors.image) setErrors(prev => ({...prev, image: ''})); }} />
                  <button type="button" className="pp-btn-cancel" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => document.getElementById('dealBannerImg').click()}>
                    {file || (editingId && existingImage) ? 'Replace Image' : 'Choose Image'}
                  </button>
                  {file && <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>{file.name}</span>}
                </div>
              </div>
            </FormField>
          </div>

          <div className="pp-form-actions">
            <button type="button" className="pp-btn-cancel" onClick={resetForm}>Cancel</button>
            <button type="submit" className="pp-btn-save" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Live Deal' : 'Activate Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-list-topbar">
        <div className="pp-list-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Deal of the Day</h2>
          <span className="pp-count-pill">{filteredDeals.length} total</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="cp-search-box" style={{ minWidth: '240px', position: 'relative' }}>
            <RiSearchLine className="cp-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              placeholder="Search deals..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '8px 36px 8px 36px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            />
            {search && (
              <RiCloseLine
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af', fontSize: '18px' }}
                title="Clear search"
              />
            )}
          </div>
          <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Deal</button>
        </div>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th><th>Preview</th><th>Title</th>
                <th>Discount</th><th>Type</th><th>Ends At</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetchLoading ? (
                <tr><td colSpan="8"><div className="pp-empty">Loading...</div></td></tr>
              ) : deals.length > 0 ? paginatedDeals.map((d, i) => (
                <tr key={d.id || d._id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td style={{ width: '100px' }}>
                    <img
                      src={`${IMG}${d.image}`} alt={d.title}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </td>
                  <td><span style={{ color: '#00044a', fontWeight: 600, fontSize: '13px' }}>{d.title || '—'}</span></td>
                  <td>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      {d.discountType === 'FLAT' ? `₹${d.discountValue}` : `${d.discountValue || d.discountPercentage || 0}%`}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', textTransform: 'capitalize', color: '#475569' }}>
                      {d.targetType === 'PRODUCT' ? 'Product' : d.targetType === 'CATEGORY' ? 'Category' : d.targetType === 'COLLECTION' ? 'Collection' : 'All Shop'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>
                    {d.expiryDate ? new Date(d.expiryDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                  </td>
                  <td>
                    {d.expiryDate && new Date(d.expiryDate) < new Date() ? (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        Expired (Inactive)
                      </span>
                    ) : d.isActive === false ? (
                      <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '3px 8px', borderRadius: '12px', fontSize: '12px' }}>
                        Inactive
                      </span>
                    ) : (
                      <span style={{ background: '#dcfce3', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        Live
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="pp-action-btns" style={{ display: 'flex', gap: '8px' }}>
                      <button className="pp-act-btn" onClick={() => toggleDealStatus(d)} title={d.isActive === false ? 'Enable deal' : 'Disable deal'} aria-label={d.isActive === false ? 'Enable deal' : 'Disable deal'} style={{ color: d.isActive === false ? '#15803d' : '#b45309' }}>
                        <FiPower size={16} />
                      </button>
                      <button className="pp-act-btn edit" onClick={() => handleEdit(d)} title="Edit">
                        <FiEdit2 size={16} />
                      </button>
                      <button className="pp-act-btn del" onClick={() => handleDelete(d.id || d._id)} title="Delete">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className="pp-empty">
                      <div className="pp-empty-icon" style={{ fontSize: '32px', color: '#d4af37' }}>○</div>
                      <div>No deals yet. Click "+ Add Deal" above to create one.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={filteredDeals.length} onPageChange={setCurrentPage} label="deals" />
      </div>
    </div>
  );
};

export default ManageDeals;
