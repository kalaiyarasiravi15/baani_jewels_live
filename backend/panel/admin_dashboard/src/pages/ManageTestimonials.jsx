import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEye, FiEdit2, FiTrash2, FiAlertTriangle, FiPlus, FiStar, FiX, FiUser } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';
import CharCount from '../components/CharCount';
import './ManageTestimonials.css';

const TESTIMONIALS_API = `${API}/testimonials`;

/* Standard Confirm Dialog */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="pp-confirm-overlay">
    <div className="pp-confirm-box">
      <div className="pp-confirm-icon">
        <FiAlertTriangle style={{ fontSize: '32px', color: '#ef4444' }} />
      </div>
      <p className="pp-confirm-msg">{message}</p>
      <div className="pp-confirm-actions">
        <button className="pp-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="pp-confirm-ok" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

/* Star Rating Selector / Display */
const StarRating = ({ value, onChange, readOnly = false }) => {
  return (
    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar
          key={star}
          style={{
            fontSize: readOnly ? '15px' : '22px',
            cursor: readOnly ? 'default' : 'pointer',
            color: star <= value ? '#c9a84c' : '#d1d5db',
            fill: star <= value ? '#c9a84c' : 'transparent',
            transition: 'all 0.15s ease'
          }}
          onClick={() => !readOnly && onChange && onChange(star)}
        />
      ))}
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginLeft: '6px' }}>
        {value}.0
      </span>
    </div>
  );
};

/* Client Avatar (Image or Monogram Initials) */
const ClientAvatar = ({ name, image, size = 44 }) => {
  const getInitials = (n) => {
    if (!n) return 'BJ';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  if (image) {
    return (
      <img
        src={`${IMG}${image}`}
        alt={name}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #c9a84c'
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #12382e 0%, #06281e 100%)',
        color: '#c9a84c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${size * 0.38}px`,
        border: '2px solid #c9a84c',
        letterSpacing: '1px'
      }}
    >
      {getInitials(name)}
    </div>
  );
};

const emptyForm = {
  name: '',
  location: '',
  rating: 5,
  review: '',
  status: true
};

const ManageTestimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Panels
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errors, setErrors] = useState({});

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchTestimonials = async () => {
    setFetchLoading(true);
    try {
      const res = await axios.get(`${TESTIMONIALS_API}/all`);
      setTestimonials(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load testimonials');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFile(null);
    setPreviewUrl('');
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      location: item.location || '',
      rating: Number(item.rating) || 5,
      review: item.review || '',
      status: item.status !== false
    });
    setFile(null);
    setPreviewUrl(item.image ? `${IMG}${item.image}` : '');
    setErrors({});
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        toast.warn('Image size must be under 5MB');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleClearImage = () => {
    setFile(null);
    setPreviewUrl('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Client name is required';
    if (!formData.review.trim()) errs.review = 'Testimonial review text is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', formData.name.trim());
      form.append('location', formData.location.trim());
      form.append('rating', formData.rating);
      form.append('review', formData.review.trim());
      form.append('status', formData.status);
      if (file) {
        form.append('image', file);
      }

      if (editingId) {
        await axios.put(`${TESTIMONIALS_API}/update/${editingId}`, form);
        toast.success('Testimonial updated successfully!');
      } else {
        await axios.post(`${TESTIMONIALS_API}/add`, form);
        toast.success('Testimonial created successfully!');
      }

      setShowModal(false);
      fetchTestimonials();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmMsg('Are you sure you want to delete this testimonial? This action cannot be undone.');
    setConfirmAction(() => async () => {
      try {
        await axios.delete(`${TESTIMONIALS_API}/delete/${id}`);
        toast.success('Testimonial deleted successfully!');
        fetchTestimonials();
      } catch (err) {
        toast.error('Failed to delete testimonial');
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      await axios.put(`${TESTIMONIALS_API}/update/${item.id}`, { status: !item.status });
      toast.success(`Testimonial ${!item.status ? 'activated' : 'deactivated'}`);
      fetchTestimonials();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filtered = testimonials.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.review?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  return (
    <div className="ars-tst-main-container">
      {confirmOpen && (
        <ConfirmDialog
          message={confirmMsg}
          onConfirm={confirmAction}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* ── Page Header ── */}
      <div className="ars-tst-header">
        <div className="ars-tst-title-block">
          <h1>Client <span style={{ color: '#d4af37' }}>Testimonials</span></h1>
          <p>Manage customer stories, reviews, and testimonials displayed on the home page.</p>
        </div>
        <div className="ars-tst-actions">
          <div className="cp-search-box ars-tst-search-box">
            <RiSearchLine className="cp-search-icon" />
            <input
              type="text"
              className="ars-tst-search"
              placeholder="Search testimonials..."
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
          <button className="ars-tst-btn-add" onClick={openAddModal}>
            <FiPlus /> Add Testimonial
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="ars-tst-table-card">
        {fetchLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            Loading testimonials...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            No testimonials found. Click "Add Testimonial" to create the first one!
          </div>
        ) : (
          <>
            <table className="ars-tst-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Client</th>
                  <th>Name &amp; Location</th>
                  <th style={{ width: '130px' }}>Rating</th>
                  <th>Review Feedback</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ClientAvatar name={item.name} image={item.image} size={42} />
                    </td>
                    <td>
                      <div className="tst-client-name">{item.name}</div>
                      <div className="tst-client-sub">{item.location || 'Verified Buyer'}</div>
                    </td>
                    <td>
                      <StarRating value={item.rating || 5} readOnly />
                    </td>
                    <td>
                      <div className="tst-review-excerpt" title={item.review}>
                        "{item.review}"
                      </div>
                    </td>
                    <td>
                      <button
                        className={`tst-status-pill ${item.status ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(item)}
                        title="Click to toggle visibility"
                      >
                        {item.status ? 'Published' : 'Hidden'}
                      </button>
                    </td>
                    <td>
                      <div className="pp-action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="pp-act-btn view"
                          title="View Testimonial"
                          onClick={() => setViewItem(item)}
                        >
                          <FiEye size={15} />
                        </button>
                        <button
                          type="button"
                          className="pp-act-btn edit"
                          title="Edit Testimonial"
                          onClick={() => openEditModal(item)}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="pp-act-btn del"
                          title="Delete Testimonial"
                          onClick={() => handleDelete(item.id)}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length > ADMIN_PAGE_SIZE && (
              <AdminPagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={ADMIN_PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="ars-tst-modal-overlay">
          <div className="ars-tst-modal-box">
            <div className="ars-tst-modal-header">
              <h2>{editingId ? 'Edit Testimonial' : 'Add New Client Testimonial'}</h2>
              <button className="ars-tst-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>

            <form onSubmit={handleSubmit} className="ars-tst-modal-form">
              <div className="ars-tst-form-row">
                <div className="ars-tst-form-group">
                  <label>Client Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Radhika Menon"
                    value={formData.name}
                    maxLength={50}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <CharCount current={formData.name.length} min={2} max={50} />
                  {errors.name && <span className="error-msg">{errors.name}</span>}
                </div>

                <div className="ars-tst-form-group">
                  <label>City / Subtitle <small style={{ color: '#9ca3af' }}>(Optional)</small></label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai or Bridal Client"
                    value={formData.location}
                    maxLength={50}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                  <CharCount current={formData.location.length} min={0} max={50} />
                </div>
              </div>

              <div className="ars-tst-form-group">
                <label>Rating</label>
                <div style={{ marginTop: '4px' }}>
                  <StarRating
                    value={formData.rating}
                    onChange={(r) => setFormData({ ...formData, rating: r })}
                  />
                </div>
              </div>

              <div className="ars-tst-form-group">
                <label>Review / Testimonial Text <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  rows={4}
                  placeholder="Share the customer's feedback, experience, and words about Baani Jewels..."
                  value={formData.review}
                  maxLength={500}
                  onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                />
                <CharCount current={formData.review.length} min={10} max={500} />
                {errors.review && <span className="error-msg">{errors.review}</span>}
              </div>

              {/* Optional Photo Upload */}
              <div className="ars-tst-form-group">
                <label>Client Photo <small style={{ color: '#c9a84c', fontWeight: 600 }}>(Optional)</small></label>
                <p style={{ margin: '2px 0 8px', fontSize: '12px', color: '#6b7280' }}>
                  Upload client picture if available. If skipped, a royal gold monogram avatar with their initials will be automatically displayed.
                </p>

                <div className="tst-img-upload-box">
                  {previewUrl ? (
                    <div className="tst-preview-wrap">
                      <img src={previewUrl} alt="Preview" className="tst-preview-img" />
                      <button type="button" className="tst-remove-img" onClick={handleClearImage}>
                        <FiX /> Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="tst-file-picker">
                      <input
                        type="file"
                        accept="image/*"
                        id="tst-photo-input"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="tst-photo-input" className="tst-file-label">
                        <FiUser style={{ fontSize: '20px', color: '#c9a84c' }} />
                        <span>Choose Client Photo (Optional)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="ars-tst-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  />
                  <span>Publish to Home Page immediately</span>
                </label>
              </div>

              <div className="ars-tst-modal-actions">
                <button type="button" className="pp-confirm-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ars-tst-btn-submit" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Testimonial' : 'Publish Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ── */}
      {viewItem && (
        <div className="ars-tst-modal-overlay">
          <div className="ars-tst-modal-box" style={{ maxWidth: '520px' }}>
            <div className="ars-tst-modal-header">
              <h2>Testimonial Details</h2>
              <button className="ars-tst-modal-close" onClick={() => setViewItem(null)}><FiX /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <ClientAvatar name={viewItem.name} image={viewItem.image} size={70} />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#12382e' }}>{viewItem.name}</h3>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#b58739', fontWeight: 600 }}>
                {viewItem.location || 'Verified Baani Client'}
              </p>
              <StarRating value={viewItem.rating || 5} readOnly />
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: '#fdfbf7',
                border: '1px solid #e8dec8',
                borderRadius: '8px',
                fontStyle: 'italic',
                fontSize: '14px',
                color: '#374151',
                lineHeight: 1.6
              }}>
                "{viewItem.review}"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTestimonials;
