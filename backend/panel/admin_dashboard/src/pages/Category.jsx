import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEye, FiEdit2, FiTrash2, FiAlertTriangle, FiArrowLeft, FiLayers, FiPackage, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import './Category.css';
import { API, IMG } from '../config';
import CharCount from '../components/CharCount';

const PER_PAGE = 10;

const CategoryPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [panel, setPanel]           = useState('list');
  const [editId, setEditId]         = useState(null);
  const [viewData, setViewData]     = useState(null);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);

  const [name, setName]                 = useState('');
  const [description, setDescription]   = useState('');
  const [image, setImage]               = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus]             = useState(true);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(null);
  const [errors, setErrors]             = useState({});

  // ── confirm-delete modal state ──
  const [confirmId, setConfirmId]     = useState(null);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories/all`, {
        headers: { 'x-admin-request': 'true' }
      });
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load categories.');
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditId(null); setName(''); setDescription('');
    setImage(null); setImagePreview(null);
    setStatus(true);
    setErrors({});
    setPanel('list');
  };

  const openAdd  = () => { resetForm(); setPanel('form'); };

  const openEdit = (cat) => {
    setEditId(cat.id);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setImagePreview(cat.image ? IMG + cat.image : null);
    setImage(null);
    setStatus(cat.status !== false);
    setErrors({});
    setPanel('form');
  };

  const openView = (cat) => { setViewData(cat); setPanel('view'); };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    if (errors.image) setErrors(prev => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Category Name is required.';
      toast.error('Category Name is required.');
    }
    if (!image && !imagePreview) {
      newErrors.image = 'Category Image is required.';
      toast.error('Category Image is required.');
    }
    if (description) {
      if (description.length < 50 || description.length > 150) {
        newErrors.description = 'Description must be between 50 and 150 characters.';
        toast.error('Description must be between 50 and 150 characters.');
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      if (image) fd.append('image', image);
      fd.append('status', status);

      if (editId) {
        await axios.put(`${API}/categories/update/${editId}`, fd);
        toast.success(` "${name}" updated successfully!`);
      } else {
        await axios.post(`${API}/categories/add`, fd);
        toast.success(` "${name}" added successfully!`);
      }
      await fetchCategories();
      resetForm();
      setPage(1);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error saving. Check backend connection.';
      toast.error(` ${msg}`);
    }
    setSaving(false);
  };

  // step 1: open inline confirm instead of browser alert
  const handleDeleteClick = (cat) => {
    setConfirmId(cat.id);
    setConfirmName(cat.name);
  };

  // step 2: user confirmed → delete
  const handleDeleteConfirm = async () => {
    const id   = confirmId;
    const cname = confirmName;
    setConfirmId(null);
    setConfirmName('');
    setDeleting(id);
    try {
      await axios.delete(`${API}/categories/delete/${id}`);
      await fetchCategories();
      toast.success(` "${cname}" deleted successfully!`);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Delete failed. Try again.';
      toast.error(` ${msg}`);
    }
    setDeleting(null);
  };

  const handleDeleteCancel = () => {
    setConfirmId(null);
    setConfirmName('');
    toast.info('Delete cancelled.');
  };

  const cleanSearch = (search || '').trim().toLowerCase();
  const filtered   = categories.filter(c => !cleanSearch || (c.name || '').toLowerCase().includes(cleanSearch) || (c.description || '').toLowerCase().includes(cleanSearch));
  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const safePage   = page > totalPages ? 1 : page;
  const current    = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);

  // ── FORM ──
  if (panel === 'form') return (
    <div className="cp-wrap">
      <div className="cp-form-topbar">
        <button className="cp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="cp-form-title">{editId ? 'Edit Category' : 'New Category'}</h2>
      </div>

      <div className="cp-form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="cp-section-label">Category Info</div>
          <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '-4px', marginBottom: '14px', fontFamily: "'Poppins', sans-serif" }}>
            Category names appear in the shop navigation and on product pages. Keep names concise and descriptive.
          </p>

          <div className="cp-form-group">
            <label className="cp-field-label">Category Name *</label>
            <input
              className={`cp-input ${errors.name ? 'invalid-input' : ''}`}
              placeholder="e.g. Sarees, Kurtas..."
              value={name}
              maxLength={50}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
            />
            <CharCount current={name.length} min={2} max={50} />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="cp-form-group">
            <label className="cp-field-label">Description</label>
            <textarea
              className={`cp-input ${errors.description ? 'invalid-input' : ''}`}
              rows="3"
              maxLength={160}
              placeholder="e.g. Discover our majestic necklace collection..."
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
            />
            <CharCount current={description.length} min={0} max={160} />
            {errors.description && <span className="error-msg">{errors.description}</span>}
          </div>

          <div className="cp-form-group">
            <label className="cp-field-label">Status</label>
            <select
              className="cp-input"
              value={status ? 'true' : 'false'}
              onChange={e => setStatus(e.target.value === 'true')}
            >
              <option value="true">Active (Public)</option>
              <option value="false">Inactive (Hidden)</option>
            </select>
          </div>

          <div className="cp-form-group">
            <label className="cp-field-label">Category Image *</label>
            <div className={`cp-upload-area ${errors.image ? 'invalid-input' : ''}`} onClick={() => document.getElementById('catImgInput').click()}>
              {imagePreview
                ? <img src={imagePreview} alt="preview" className="cp-upload-preview" />
                : (
                  <div className="cp-upload-placeholder">
                    <span className="cp-upload-icon">⬆</span>
                    <span>Click to upload image</span>
                  </div>
                )
              }
            </div>
            {errors.image && <span className="error-msg">{errors.image}</span>}
            <input id="catImgInput" type="file" accept="image/*" hidden onChange={handleImageChange} />
            {imagePreview && (
              <button type="button" className="cp-remove-img" onClick={() => { setImage(null); setImagePreview(null); if (errors.image) setErrors(prev => ({ ...prev, image: '' })); }}>
                ✕ Remove image
              </button>
            )}
          </div>

          <div className="cp-form-actions">
            <button type="button" className="cp-btn-cancel" onClick={resetForm}>Discard</button>
            <button type="submit" className="cp-btn-save" disabled={saving}>
              {saving ? 'Saving...' : (editId ? 'Update Category' : 'Add Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── VIEW DETAIL PANEL ──
  if (panel === 'view' && viewData) return (
    <div className="cp-wrap">
      {/* ── Inline Delete Confirm Modal ── */}
      {confirmId && (
        <div className="cp-modal-overlay">
          <div className="cp-modal">
            <div className="cp-modal-icon">
              <FiAlertTriangle style={{ fontSize: '32px', color: '#ef4444' }} />
            </div>
            <h3 className="cp-modal-title">Delete Category?</h3>
            <p className="cp-modal-msg">
              You're about to delete <strong>"{confirmName}"</strong>.<br />
              This will also remove all its associated products. This action cannot be undone.
            </p>
            <div className="cp-modal-actions">
              <button className="cp-modal-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="cp-modal-delete" onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="cp-form-topbar">
        <button className="cp-back-btn" onClick={() => { setViewData(null); setPanel('list'); }}>
          <FiArrowLeft style={{ marginRight: '6px' }} /> Back to Categories
        </button>
        <div className="cp-view-header-title-group">
          <span className="cp-view-breadcrumbs">Category Catalog / Detail Overview</span>
          <h2 className="cp-form-title">{viewData.name}</h2>
        </div>
        <div className="cp-view-top-actions">
          <button className="cp-btn-edit-top" onClick={() => openEdit(viewData)}>
            <FiEdit2 style={{ marginRight: '6px' }} /> Edit Category
          </button>
          <button 
            className="cp-btn-del-top" 
            onClick={() => handleDeleteClick(viewData)}
            title="Delete Category"
          >
            <FiTrash2 style={{ marginRight: '6px' }} /> Delete
          </button>
        </div>
      </div>

      {/* Main View Grid (2 Columns: Showcase Image on Left, Details & Stats on Right) */}
      <div className="cp-view-luxury-grid">
        {/* Left Column: Image Card */}
        <div className="cp-view-image-card">
          <div className="cp-view-image-badge">
            <FiLayers style={{ marginRight: '5px' }} /> Catalog Visual
          </div>
          <div className="cp-view-media-container">
            {viewData.image ? (
              <img 
                src={IMG + viewData.image} 
                className="cp-view-showcase-img" 
                alt={viewData.name} 
                onError={e => {
                  e.target.style.display = 'none';
                }} 
              />
            ) : (
              <div className="cp-view-showcase-no-img">
                <FiLayers size={44} style={{ opacity: 0.4, marginBottom: '10px' }} />
                <span>No Category Cover Uploaded</span>
              </div>
            )}
          </div>
          
          <div className={`cp-view-status-banner ${viewData.status !== false ? 'active' : 'inactive'}`}>
            <span className="cp-status-dot"></span>
            <span>{viewData.status !== false ? 'Active in Online Store' : 'Inactive / Hidden from Store'}</span>
          </div>

          <button 
            type="button" 
            className="cp-view-btn-change-media"
            onClick={() => openEdit(viewData)}
          >
            <FiEdit2 size={13} style={{ marginRight: '6px' }} /> Update Cover Image
          </button>
        </div>

        {/* Right Column: Information & Details */}
        <div className="cp-view-content-card">
          <div className="cp-view-badge-row">
            <span className="cp-view-tag-pill">👑 Jewellery Category</span>
            <span className={`cp-view-status-pill ${viewData.status !== false ? 'active' : 'inactive'}`}>
              {viewData.status !== false ? '● Active Status' : '○ Inactive Status'}
            </span>
          </div>

          <h1 className="cp-view-title">{viewData.name}</h1>

          {/* Quick Metrics Grid */}
          <div className="cp-view-stats-grid">
            <div className="cp-stat-box">
              <div className="cp-stat-label">Catalog Section</div>
              <div className="cp-stat-value">Jewellery</div>
              <div className="cp-stat-sub">Main Category</div>
            </div>

            <div className="cp-stat-box">
              <div className="cp-stat-label">Total Products</div>
              <div className="cp-stat-value cp-stat-highlight">
                {viewData.productCount ?? viewData.Products?.length ?? 0}
              </div>
              <div className="cp-stat-sub">Live Products Linked</div>
            </div>

            <div className="cp-stat-box">
              <div className="cp-stat-label">Store Visibility</div>
              <div className={`cp-stat-value ${viewData.status !== false ? 'cp-text-success' : 'cp-text-muted'}`}>
                {viewData.status !== false ? 'Published' : 'Hidden'}
              </div>
              <div className="cp-stat-sub">Customer Browsing</div>
            </div>
          </div>

          {/* Dedicated Description Section */}
          <div className="cp-view-desc-section">
            <div className="cp-view-desc-header">
              <FiInfo style={{ color: '#d4af37', marginRight: '6px' }} />
              <span>Category Description</span>
              {viewData.description && (
                <span className="cp-desc-len-pill">{viewData.description.length} chars</span>
              )}
            </div>
            
            <div className="cp-view-desc-body">
              {viewData.description ? (
                <p className="cp-view-desc-text">{viewData.description}</p>
              ) : (
                <p className="cp-view-desc-empty">
                  <em>No description provided for this category yet. Click "Edit Category" to add a customer-facing summary.</em>
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="cp-view-actions-bar">
            <button 
              type="button" 
              className="cp-view-btn-primary"
              onClick={() => openEdit(viewData)}
            >
              <FiEdit2 style={{ marginRight: '6px' }} /> Edit Category Details
            </button>

            <button 
              type="button" 
              className="cp-view-btn-secondary"
              onClick={() => navigate(`/dashboard/products?categoryId=${viewData.id}`)}
            >
              <FiPackage style={{ marginRight: '6px' }} /> View Products ({viewData.productCount ?? viewData.Products?.length ?? 0})
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── TABLE LIST ──
  return (
    <div className="cp-wrap">

      {/* ── Inline Delete Confirm Modal ── */}
      {confirmId && (
        <div className="cp-modal-overlay">
          <div className="cp-modal">
            <div className="cp-modal-icon">
              <FiAlertTriangle style={{ fontSize: '32px', color: '#ef4444' }} />
            </div>
            <h3 className="cp-modal-title">Delete Category?</h3>
            <p className="cp-modal-msg">
              You're about to delete <strong>"{confirmName}"</strong>.<br />
              This will also remove all its associated products. This action cannot be undone.
            </p>
            <div className="cp-modal-actions">
              <button className="cp-modal-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="cp-modal-confirm" onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="cp-list-topbar">
        <div className="cp-list-title">
          <h2>Categories</h2>
          <span className="cp-count-pill">{filtered.length} total</span>
        </div>
        <div className="cp-list-actions">
          <div className="cp-search-box">
            <RiSearchLine className="cp-search-icon" />
            <input
              placeholder="Search categories..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <RiCloseLine
                className="cp-search-clear"
                onClick={() => { setSearch(''); setPage(1); }}
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
          <button className="cp-btn-add" onClick={openAdd}>+ New Category</button>
        </div>
      </div>

      <div className="cp-table-card">
        <div className="cp-table-scroll">
          <table className="cp-table">
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>S.No</th>
                <th>Image</th>
                <th>Category Name</th>
                <th>Status</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.length > 0 ? current.map((cat, idx) => (
                <tr key={cat.id}>
                  <td className="cp-td-num">{(safePage - 1) * PER_PAGE + idx + 1}</td>
                  <td className="cp-td-img">
                    {cat.image
                      ? <img src={IMG + cat.image} className="cp-tbl-img" alt={cat.name} onError={e => e.target.style.display='none'} />
                      : <div className="cp-tbl-no-img">—</div>
                    }
                  </td>
                  <td className="cp-td-name">
                    <span className="cp-name-main">{cat.name}</span>
                  </td>
                  <td>
                    <span style={cat.status === false ? {background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'} : {background: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'}}>
                      {cat.status !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="cp-prod-count"
                      onClick={() => navigate(`/dashboard/products?categoryId=${cat.id}`)}
                      title={`View products in "${cat.name}"`}
                      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      <span className="cp-prod-count">{cat.productCount ?? cat.Products?.length ?? 0} items</span>
                    </button>
                  </td>
                  <td>
                    <div className="cp-action-btns" style={{ display: 'flex', gap: '8px' }}>
                      <button className="pp-act-btn view" onClick={() => openView(cat)} title="View">
                        <FiEye size={16} />
                      </button>
                      <button className="pp-act-btn edit" onClick={() => openEdit(cat)} title="Edit">
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className="pp-act-btn del"
                        onClick={() => handleDeleteClick(cat)}
                        title="Delete"
                        disabled={deleting === cat.id}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5">
                    <div className="cp-empty">
                      <div className="cp-empty-icon">⊞</div>
                      <div>{search ? 'No categories match your search.' : 'No categories yet. Add your first one!'}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="cp-pagination">
            <span className="cp-page-info">
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} categories
            </span>
            <div className="cp-page-btns">
              <button disabled={safePage === 1} onClick={() => setPage(1)} title="First">«</button>
              <button disabled={safePage === 1} onClick={() => setPage(p => p - 1)} title="Previous">‹</button>
              {pageNumbers.map((n, i) =>
                n === '...'
                  ? <span key={`d${i}`} className="cp-dots">…</span>
                  : <button key={n} className={safePage === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
              )}
              <button disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)} title="Next">›</button>
              <button disabled={safePage === totalPages} onClick={() => setPage(totalPages)} title="Last">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;