import { toScheduleInput, schedulePayload } from '../utils/promotionTime';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiAlertTriangle, FiPower } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';
import CharCount from '../components/CharCount';

const OFFER_BANNERS_API = `${API}/offer-banners`;

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

const ManageOfferBanners = () => {
  const [banners, setBanners]           = useState([]);
  const [deals, setDeals]               = useState([]);
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [collections, setCollections]   = useState([]);
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

  const [formData, setFormData] = useState({
    title:          '',
    subtitle:       '',
    buttonText:     'SHOP NOW',
    link:           '',
    discountTag:    '',
    targetType:     'PRODUCT',
    productId:      '',
    targetCategoryId: '',
    targetCollectionId: '',
    startDate:      '',
    expiryDate:     '',
    status:         true,
    discountType:   '',
    discountValue:  ''
  });

  const fetchBanners = useCallback(async () => {
    setFetchLoading(true);
    try {
      const [res, dealRes] = await Promise.all([axios.get(`${OFFER_BANNERS_API}/admin/all`), axios.get(`${API}/deals/all`)]);
      setBanners(res.data || []);
      setDeals(dealRes.data || []);
    } catch (err) {
      console.error("Fetch banners error:", err.message);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const [res, cats, cols] = await Promise.all([axios.get(`${API}/products/all`), axios.get(`${API}/categories/all`), axios.get(`${API}/home-collections/all-admin`)]);
      setProducts(res.data || []);
      setCategories(cats.data || []);
      setCollections(cols.data || []);
    } catch (err) {
      console.error("Fetch products error:", err.message);
    }
  }, []);

  useEffect(() => { const timer = setInterval(() => { if (!document.hidden) fetchBanners(); }, 5000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    fetchBanners();
    fetchProducts();
  }, [fetchBanners, fetchProducts]);

  const cleanSearch = (search || '').trim().toLowerCase();
  const filteredBanners = banners.filter(b =>
    !cleanSearch ||
    (b.title || '').toLowerCase().includes(cleanSearch) ||
    (b.subtitle || '').toLowerCase().includes(cleanSearch) ||
    (b.discountTag || '').toLowerCase().includes(cleanSearch) ||
    (b.buttonText || '').toLowerCase().includes(cleanSearch) ||
    (b.targetType || '').toLowerCase().includes(cleanSearch)
  );
  const totalPages = Math.max(1, Math.ceil(filteredBanners.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBanners = filteredBanners.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);
  const now = new Date();
  const isLiveDeal = (d) => d.isActive && (!d.startDate || new Date(d.startDate) <= now) && new Date(d.expiryDate) > now && !(editingId && Number(d.id) === Number(editingId));
  const liveDealProducts = new Set(deals.filter(d => isLiveDeal(d) && d.targetType === 'PRODUCT').map(d => Number(d.targetProductId)));
  const liveDealCategories = new Set(deals.filter(d => isLiveDeal(d) && d.targetType === 'CATEGORY').map(d => Number(d.targetCategoryId)));
  const liveDealCollections = new Set(deals.filter(d => isLiveDeal(d) && d.targetType === 'COLLECTION').map(d => Number(d.targetCollectionId)));
  const liveShopDeal = deals.some(d => isLiveDeal(d) && d.targetType === 'SHOP');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'discountValue' && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || (String(formData.discountType).toLowerCase() === 'percentage' && Number(value) > 100))) return;
    if (['type', 'discountType'].includes(name) && value.toLowerCase() === 'percentage' && Number(formData.discountValue) > 100) { setFormData(prev => ({ ...prev, [name]: value, discountValue: '' })); return; }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleProductChange = (e) => {
    const pid = e.target.value;
    const selectedProd = products.find(p => String(p.id) === String(pid));
    setFormData(prev => ({
      ...prev,
      productId: pid,
      link: selectedProd ? `/product/${selectedProd.id}` : ''
    }));
    if (errors.productId) setErrors(prev => ({ ...prev, productId: '' }));
    if (errors.link) setErrors(prev => ({ ...prev, link: '' }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title:          '',
      subtitle:       '',
      buttonText:     'SHOP NOW',
      link:           '',
      discountTag:    '',
      targetType:     'PRODUCT',
      productId:      '',
      targetCategoryId: '', targetCollectionId: '',
      startDate:      '',
      expiryDate:     '',
      status:         true,
      discountType:   '',
      discountValue:  ''
    });
    setFile(null);
    setExistingImage('');
    setErrors({});
    setPanel('list');
  };

  const handleEdit = (banner) => {
    setEditingId(banner.id || banner._id);
    setExistingImage(banner.image || '');
    setFormData({
      title:          banner.title,
      subtitle:       banner.subtitle || '',
      buttonText:     banner.buttonText || 'SHOP NOW',
      link:           banner.link || '',
      discountTag:    banner.discountTag || '',
      targetType:     banner.targetType || (banner.productId ? 'PRODUCT' : 'SHOP'),
      productId:      banner.productId || '',
      targetCategoryId: banner.targetCategoryId || '',
      targetCollectionId: banner.targetCollectionId || '',
      startDate:      banner.startDate ? toScheduleInput(banner.startDate) : '',
      expiryDate:     banner.expiryDate ? toScheduleInput(banner.expiryDate) : '',
      status:         banner.status !== undefined ? banner.status : true,
      discountType:   banner.discountType || '',
      discountValue:  banner.discountValue !== undefined ? banner.discountValue : ''
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

    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Offer Title is required.';
    }
    if (!formData.subtitle.trim()) {
      newErrors.subtitle = 'Subtitle/Description is required.';
    }
    if (!formData.discountTag.trim()) {
      newErrors.discountTag = 'Discount Tag is required.';
    }
    if (formData.targetType === 'PRODUCT' && !formData.productId) {
      newErrors.productId = 'Product Selection is required.';
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
    if (!file && !editingId) {
      newErrors.image = 'Banner Image is required.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        toast.error("Please fill all required fields correctly.");
        return;
    }
    if (formData.targetType === 'PRODUCT' && formData.productId) {
      const p = products.find(prod => String(prod.id) === String(formData.productId));
      formData.link = `/product/${p?.slug || formData.productId}`;
    } else if (formData.targetType === 'CATEGORY' && formData.targetCategoryId) {
      const c = categories.find(cat => String(cat.id) === String(formData.targetCategoryId));
      formData.link = `/shop?category=${encodeURIComponent(c?.name || '')}&categoryId=${formData.targetCategoryId}`;
    } else if (formData.targetType === 'COLLECTION' && formData.targetCollectionId) {
      const col = collections.find(cl => String(cl.id) === String(formData.targetCollectionId));
      formData.link = `/shop?collection=${encodeURIComponent(col?.name || '')}&collectionId=${formData.targetCollectionId}`;
    } else {
      formData.link = "/shop";
    }

    setLoading(true);
    const data = new FormData();
    Object.entries(schedulePayload(formData)).forEach(([key, value]) => data.append(key, value));
    if (file) data.append('image', file);

    try {
      if (editingId) {
        await axios.put(`${OFFER_BANNERS_API}/update/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Offer Banner updated successfully!");
      } else {
        await axios.post(`${OFFER_BANNERS_API}/add`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("New Offer Banner activated!");
      }
      resetForm();
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Remove this Offer Banner from the live site?",
      async () => {
        try {
          await axios.delete(`${OFFER_BANNERS_API}/delete/${id}`);
          toast.success("Offer Banner removed successfully!");
          fetchBanners();
        } catch (err) {
          toast.error("Delete failed: " + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  const toggleBannerStatus = async (banner) => {
    const data = new FormData();
    data.append('status', banner.status === false ? 'true' : 'false');
    try {
      await axios.put(`${OFFER_BANNERS_API}/update/${banner.id || banner._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(banner.status === false ? 'Offer banner enabled.' : 'Offer banner disabled; its discount and link are now inactive.');
      await fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not change offer banner status.');
    }
  };

  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">{editingId ? 'Edit Offer Banner' : 'New Offer Banner'}</h2>
      </div>

      <div style={{ maxWidth: '650px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="pp-section-card">
            <div className="pp-section-label">Offer Details</div>

            <FormField label="Offer Title" required fieldName="title" errors={errors}>
              <input className={`pp-input ${errors.title ? 'invalid-input' : ''}`} type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Healthy Cooking" />
              <CharCount current={(formData.title || '').length} min={3} max={60} />
            </FormField>

            <FormField label="Subtitle / Description" required fieldName="subtitle" errors={errors}>
              <input className={`pp-input ${errors.subtitle ? 'invalid-input' : ''}`} type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="e.g. Brass retains nutrients..." />
              <CharCount current={(formData.subtitle || '').length} min={5} max={120} />
            </FormField>

            <FormField label="Discount Tag" required fieldName="discountTag" errors={errors}>
              <input className={`pp-input ${errors.discountTag ? 'invalid-input' : ''}`} type="text" name="discountTag" value={formData.discountTag} onChange={handleInputChange} placeholder="e.g. Bestseller" />
              <CharCount current={(formData.discountTag || '').length} min={2} max={30} />
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

            <FormField label="Apply Offer To" required fieldName="targetType" errors={errors}>
              <select className="pp-input" name="targetType" value={formData.targetType} onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value, productId: e.target.value === 'SHOP' ? '' : prev.productId, link: e.target.value === 'SHOP' ? '/shop' : prev.link }))}>
                <option value="PRODUCT">Particular Product</option>
                <option value="CATEGORY">Category</option>
                <option value="COLLECTION">Collection</option>
                <option value="SHOP" disabled={liveShopDeal}>Entire Shop {liveShopDeal ? '(Deal Active)' : ''}</option>
              </select>
            </FormField>
            {formData.targetType === 'PRODUCT' && (
              <FormField label="Product Selection" required fieldName="productId" errors={errors}>
                <select className={`pp-input ${errors.productId ? 'invalid-input' : ''}`} name="productId" value={formData.productId} onChange={handleProductChange}>
                  <option value="">Select a Product *</option>
                  {products.map(p => <option key={p.id} value={p.id} disabled={liveDealProducts.has(Number(p.id))}>{p.name} {liveDealProducts.has(Number(p.id)) ? '(Deal Active)' : ''}</option>)}
                </select>
              </FormField>
            )}
            {formData.targetType === 'CATEGORY' && <FormField label="Category Selection" required fieldName="targetCategoryId" errors={errors}><select className="pp-input" name="targetCategoryId" value={formData.targetCategoryId} onChange={handleInputChange}><option value="">Select a Category *</option>{categories.map(c => <option key={c.id} value={c.id} disabled={liveDealCategories.has(Number(c.id))}>{c.name} {liveDealCategories.has(Number(c.id)) ? '(Deal Active)' : ''}</option>)}</select></FormField>}
            {formData.targetType === 'COLLECTION' && <FormField label="Collection Selection" required fieldName="targetCollectionId" errors={errors}><select className="pp-input" name="targetCollectionId" value={formData.targetCollectionId} onChange={handleInputChange}><option value="">Select a Collection *</option>{collections.map(c => <option key={c.id} value={c.id} disabled={liveDealCollections.has(Number(c.id))}>{c.name} {liveDealCollections.has(Number(c.id)) ? '(Deal Active)' : ''}</option>)}</select></FormField>}
            {formData.targetType === 'SHOP' && <p style={{ margin: '-6px 0 12px', color: '#475569', fontSize: 13 }}>Entire-shop offer cannot run with an entire-shop deal. Product promotions remain allowed and take priority.</p>}

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
                <FormField label="Status" fieldName="status" errors={errors}>
                  <select className="pp-input" name="status" value={formData.status ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value === 'true' }))}>
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
                      alt="Offer Preview"
                      style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input id="offerBannerImg" type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files[0]); if(errors.image) setErrors(prev => ({...prev, image: ''})); }} />
                  <button type="button" className="pp-btn-cancel" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => document.getElementById('offerBannerImg').click()}>
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
              {loading ? 'Saving...' : editingId ? 'Update Offer Banner' : 'Activate Offer Banner'}
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
          <h2>Deal / Offer Banners</h2>
          <span className="pp-count-pill">{filteredBanners.length} total</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="cp-search-box" style={{ minWidth: '240px', position: 'relative' }}>
            <RiSearchLine className="cp-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              placeholder="Search offer banners..."
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
          <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Deal Offer</button>
        </div>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th><th>Preview</th><th>Title</th>
                <th>Discount</th><th>Ends At</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetchLoading ? (
                <tr><td colSpan="7"><div className="pp-empty">Loading...</div></td></tr>
              ) : filteredBanners.length > 0 ? paginatedBanners.map((b, i) => (
                <tr key={b.id || b._id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td style={{ width: '100px' }}>
                    <img
                      src={`${IMG}${b.image}`} alt={b.title}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </td>
                  <td><span style={{ color: '#00044a', fontWeight: 600, fontSize: '13px' }}>{b.title || '—'}</span></td>
                  <td>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      {b.discountType === 'FLAT' ? `₹${b.discountValue}` : `${b.discountValue}%`}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>
                    {b.expiryDate ? new Date(b.expiryDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                  </td>
                  <td>
                    {b.expiryDate && new Date(b.expiryDate) < new Date() ? (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        Expired (Inactive)
                      </span>
                    ) : b.status === false ? (
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
                      <button className="pp-act-btn" onClick={() => toggleBannerStatus(b)} title={b.status === false ? 'Enable offer banner' : 'Disable offer banner'} aria-label={b.status === false ? 'Enable offer banner' : 'Disable offer banner'} style={{ color: b.status === false ? '#15803d' : '#b45309' }}>
                        <FiPower size={16} />
                      </button>
                      <button className="pp-act-btn edit" onClick={() => handleEdit(b)} title="Edit">
                        <FiEdit2 size={16} />
                      </button>
                      <button className="pp-act-btn del" onClick={() => handleDelete(b.id || b._id)} title="Delete">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">
                    <div className="pp-empty">
                      <div className="pp-empty-icon" style={{ fontSize: '32px', color: '#d4af37' }}>◇</div>
                      <div>No offer banners yet. Click "+ Add Deal Offer" above to create one.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={filteredBanners.length} onPageChange={setCurrentPage} label="offer banners" />
      </div>
    </div>
  );
};

export default ManageOfferBanners;
