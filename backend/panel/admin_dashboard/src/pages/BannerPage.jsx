import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API, IMG } from '../config';
import { FiEye, FiEdit2, FiTrash2, FiAlertTriangle, FiX } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';
import CharCount from '../components/CharCount';

/* ── Confirm Dialog ── */
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

/* ── View Details Modal ── */
const ViewModal = ({ banner, onClose, onEdit, onDelete, imgBase }) => {
  if (!banner) return null;
  const words = (banner.title || '').split(' ');
  const lastWord = words.length > 1 ? words.pop() : '';
  const mainText = words.join(' ');
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '760px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f0f0f0', background: '#00251a' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '16px', fontWeight: 600 }}>Banner Details</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <FiX size={16} />
          </button>
        </div>

        {/* Preview */}
        <div style={{ background: '#faf9f6', padding: '28px 24px', display: 'flex', gap: '28px', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
            <div style={{ width: '155px', aspectRatio: '3/4', borderRadius: '110px 110px 0 0', overflow: 'hidden', background: '#e5e7eb' }}>
              <img src={imgBase + banner.image} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
            </div>
            {banner.secondaryImage && (
              <div style={{ position: 'absolute', bottom: '-8px', right: '8px', width: '65px', height: '65px', borderRadius: '50%', border: '4px solid #faf9f6', overflow: 'hidden', background: '#e5e7eb', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                <img src={imgBase + banner.secondaryImage} alt="secondary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '24px', height: '2px', background: '#c19b6c' }}></div>
              <span style={{ color: '#c19b6c', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>{banner.subtitle || 'BAANI JEWELS'}</span>
            </div>
            <h2 style={{ fontSize: '26px', color: '#00251a', fontWeight: 300, lineHeight: 1.2, margin: '0 0 12px 0' }}>
              {mainText} {lastWord && <span style={{ fontWeight: 700, color: '#c19b6c', fontStyle: 'italic' }}>{lastWord}</span>}
            </h2>
            <p style={{ color: '#555', fontSize: '13px', lineHeight: 1.6, margin: '0 0 18px 0' }}>{banner.description || '—'}</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#00251a', color: '#fff', padding: '9px 20px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {banner.buttonText || 'Shop Now'} <span>→</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
            <span style={{ background: banner.status !== false ? '#dcfce7' : '#f3f4f6', color: banner.status !== false ? '#166534' : '#4b5563', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {banner.status !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Navigation Link</div>
            <span style={{ fontSize: '13px', color: '#0284c7', fontWeight: 500 }}>{banner.link || '/'}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { onClose(); onDelete(banner.id, banner.title); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <FiTrash2 size={14} /> Delete
          </button>
          <button
            onClick={() => { onClose(); onEdit(banner); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#00251a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <FiEdit2 size={14} /> Edit Banner
          </button>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────
   Validators  (module-level — never recreated)
──────────────────────────────────────────────── */
const validators = {
  title: (v) => (!v.trim() ? 'Banner title is required.' : ''),
  description: (v) => {
    if (!v.trim()) return 'Description is required.';
    if (v.length < 100) return `Description must be at least 100 characters (currently ${v.length}).`;
    if (v.length > 152) return `Description must be maximum 152 characters (currently ${v.length}).`;
    return '';
  }
};

/* ────────────────────────────────────────────────
   FormField wrapper  (module-level — fixes focus-loss bug)
──────────────────────────────────────────────── */
const FormField = ({ label, required, fieldName, errors, touched, children }) => {
  const state = !touched[fieldName] ? '' : errors[fieldName] ? 'invalid' : 'valid';
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

/* ────────────────────────────────────────────────
   BannerPage
──────────────────────────────────────────────── */
const BannerPage = () => {
  const [banners, setBanners]       = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch]           = useState('');
  const [panel, setPanel]           = useState('list');
  const [editId, setEditId]         = useState(null);
  const [title, setTitle]           = useState('');
  const [subtitle, setSubtitle]     = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('Shop Now');
  const [link, setLink]             = useState('/shop');
  const [status, setStatus]         = useState(true);
  const [imgFile, setImgFile]       = useState(null);
  const [imgPrev, setImgPrev]       = useState(null);
  const [secImgFile, setSecImgFile] = useState(null);
  const [secImgPrev, setSecImgPrev] = useState(null);
  const [saving, setSaving]         = useState(false);

  /* validation state */
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});

  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [confirmMsg, setConfirmMsg]       = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [viewBanner, setViewBanner]       = useState(null);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const r = await axios.get(`${API}/banners/all`);
      setBanners(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
      setBanners([]);
    }
  };

  const resetForm = () => {
    setEditId(null); setTitle(''); setSubtitle(''); setDescription('');
    setButtonText('Shop Now'); setLink('/shop');
    setStatus(true);
    setImgFile(null); setImgPrev(null);
    setSecImgFile(null); setSecImgPrev(null);
    setErrors({}); setTouched({});
    setPanel('list');
  };

  const openEdit = (b) => {
    setEditId(b.id); setTitle(b.title || ''); setSubtitle(b.subtitle || '');
    setDescription(b.description || '');
    setButtonText(b.buttonText || 'Shop Now'); setLink(b.link || '/shop');
    setStatus(b.status !== false);
    setImgPrev(IMG + b.image); setImgFile(null);
    if (b.secondaryImage) { setSecImgPrev(IMG + b.secondaryImage); } else { setSecImgPrev(null); }
    setSecImgFile(null);
    setErrors({}); setTouched({});
    setPanel('form');
  };

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImgFile(f);
      setImgPrev(event.target.result);
      setErrors((prev) => ({ ...prev, image: '' }));
      setTouched((prev) => ({ ...prev, image: true }));
      toast.success('Banner image selected');
    };
    reader.readAsDataURL(f);
  };

  const handleSecImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSecImgFile(f);
      setSecImgPrev(event.target.result);
      toast.success('Secondary image selected');
    };
    reader.readAsDataURL(f);
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (validators[field]) {
      setErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field] && validators[field]) {
      setErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  const showConfirm = (message, action) => {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleConfirmYes = () => { setConfirmOpen(false); confirmAction?.(); };
  const handleConfirmNo  = () => { setConfirmOpen(false); setConfirmAction(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newTouched = { title: true, description: true, image: true };
    setTouched(newTouched);
    const newErrors = {
      title: validators.title(title),
      description: validators.description(description),
      image: (!editId && !imgFile) ? 'Banner image is required.' : '',
    };
    setErrors(newErrors);
    const hasError = Object.values(newErrors).some(Boolean);
    if (hasError) {
      if (newErrors.title) toast.error(newErrors.title);
      if (newErrors.description) toast.error(newErrors.description);
      if (newErrors.image) toast.error(newErrors.image);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('subtitle', subtitle);
      fd.append('description', description);
      fd.append('buttonText', buttonText || 'Shop Now');
      fd.append('link', link);
      fd.append('status', status);
      if (imgFile) fd.append('image', imgFile);
      if (secImgFile) fd.append('secondaryImage', secImgFile);

      if (editId) {
        await axios.put(`${API}/banners/update/${editId}`, fd);
        toast.success('Banner updated successfully!');
      } else {
        await axios.post(`${API}/banners/add`, fd);
        toast.success('Banner added successfully!');
      }
      await fetchBanners();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
    setSaving(false);
  };

  const deleteBanner = (id, bannerTitle) => {
    showConfirm(
      `Delete "${bannerTitle || 'this banner'}"? This cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API}/banners/delete/${id}`);
          toast.success('Banner deleted successfully!');
          fetchBanners();
        } catch (err) {
          toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  const imgState = !touched.image ? '' : errors.image ? 'invalid' : 'valid';

  /* ── FORM PANEL ── */
  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}
      {viewBanner && (
        <ViewModal banner={viewBanner} onClose={() => setViewBanner(null)} onEdit={openEdit} onDelete={deleteBanner} imgBase={IMG} />
      )}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>&#8592; Back</button>
        <h2 className="pp-form-title">{editId ? 'Edit Banner' : 'New Banner'}</h2>
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1', maxWidth: '580px' }}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="pp-section-card">
              <div className="pp-section-label">Banner Details</div>
              <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '-4px', marginBottom: '14px', fontFamily: "'Poppins', sans-serif" }}>
                Fill in the banner title, subtitle, and description. These appear as the hero text on the homepage banner carousel.
              </p>

              {/* Title */}
              <FormField label="Banner Title" required fieldName="title" errors={errors} touched={touched}>
                <input
                  className={`pp-input ${touched.title && errors.title ? 'invalid-input' : ''}`}
                  placeholder="e.g. Summer Collection 2026"
                  value={title}
                  maxLength={60}
                  onChange={(e) => handleChange('title', e.target.value, setTitle)}
                  onBlur={(e) => handleBlur('title', e.target.value)}
                />
                <CharCount current={title.length} min={5} max={60} />
              </FormField>

              {/* Subtitle / Eyebrow */}
              <div className="pp-field">
                <label className="pp-price-label">Eyebrow / Subtitle <span className="pp-optional">(e.g. BAANI JEWELS)</span></label>
                <input
                  className="pp-input"
                  placeholder="e.g. BAANI JEWELS"
                  value={subtitle}
                  maxLength={40}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
                <CharCount current={subtitle.length} min={3} max={40} />
              </div>

              {/* Description */}
              <FormField label="Description" required fieldName="description" errors={errors} touched={touched}>
                <textarea
                  className={`pp-input ${touched.description && errors.description ? 'invalid-input' : ''}`}
                  placeholder="e.g. At Baani Jewels, we create high-quality imitation jewellery..."
                  value={description}
                  rows={3}
                  maxLength={200}
                  onChange={(e) => handleChange('description', e.target.value, setDescription)}
                  onBlur={(e) => handleBlur('description', e.target.value)}
                />
                <CharCount current={description.length} min={10} max={200} />
              </FormField>

              {/* Button Text */}
              <div className="pp-field">
                <label className="pp-price-label">Button Text <span className="pp-optional">(optional)</span></label>
                <input
                  className="pp-input"
                  placeholder="Shop Now"
                  value={buttonText}
                  maxLength={25}
                  onChange={(e) => setButtonText(e.target.value)}
                />
                <CharCount current={buttonText.length} min={2} max={25} />
              </div>

              {/* Link Dropdown */}
              <div className="pp-field">
                <label className="pp-price-label">Link Navigation</label>
                <select
                  className="pp-input"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                >
                  <option value="/shop">Shop Page</option>
                  <option value="/contact">Contact Page</option>
                  <option value="/about">About Page</option>
                  <option value="/collections">Collection Page</option>
                </select>
              </div>

              {/* Status */}
              <div className="pp-field">
                <label className="pp-price-label">Status</label>
                <select
                  className="pp-input"
                  value={status ? 'true' : 'false'}
                  onChange={e => setStatus(e.target.value === 'true')}
                >
                  <option value="true">Active (Public)</option>
                  <option value="false">Inactive (Hidden)</option>
                </select>
              </div>

              {/* Banner Image */}
              <div className={`pp-field pp-field--state-${imgState}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="pp-price-label" style={{ margin: 0 }}>
                    Banner Image {!editId && <span style={{ color: '#ef4444' }}>*</span>}
                    {editId && <span className="pp-optional"> (leave blank to keep current)</span>}
                  </label>
                </div>
                <div
                  className={`pp-main-upload-area ${imgState === 'invalid' ? 'invalid-input' : ''}`}
                  style={{ aspectRatio: '1682/540', maxHeight: '280px' }}
                  onClick={() => document.getElementById('bannerImg').click()}
                >
                  {imgPrev
                    ? <img src={imgPrev} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <div className="pp-upload-placeholder">
                        <span style={{ fontSize: '28px' }}>&#8679;</span>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Click to upload banner image</span>
                      </div>
                    )
                  }
                </div>
                <input id="bannerImg" type="file" accept="image/*" hidden onChange={handleImg} />
                {imgState === 'invalid' && errors.image && (
                  <span className="error-msg">{errors.image}</span>
                )}
                {imgState === 'valid' && (
                  <span className="pp-field-success" style={{ display: 'inline-block', marginTop: '6px' }}>&#10003; Image selected</span>
                )}
              </div>

              {/* Secondary Image */}
              <div className="pp-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="pp-price-label" style={{ margin: 0 }}>
                    Secondary Image (Circle) <span className="pp-optional">(optional)</span>
                  </label>
                </div>
                <div
                  className="pp-main-upload-area"
                  style={{ aspectRatio: '1/1', maxHeight: '200px', maxWidth: '200px', borderRadius: '50%' }}
                  onClick={() => document.getElementById('secBannerImg').click()}
                >
                  {secImgPrev
                    ? <img src={secImgPrev} alt="secondary" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : (
                      <div className="pp-upload-placeholder" style={{ borderRadius: '50%' }}>
                        <span style={{ fontSize: '24px' }}>&#8679;</span>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center' }}>Upload Secondary Image</span>
                      </div>
                    )
                  }
                </div>
                <input id="secBannerImg" type="file" accept="image/*" hidden onChange={handleSecImg} />
                {secImgPrev && (
                  <span className="pp-field-success" style={{ display: 'inline-block', marginTop: '6px' }}>&#10003; Secondary image selected</span>
                )}
              </div>
            </div>

            <div className="pp-form-actions">
              <button type="button" className="pp-btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="pp-btn-save" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Banner' : 'Add Banner'}
              </button>
            </div>
          </form>
        </div>

        {/* LIVE PREVIEW */}
        <div style={{ flex: '1', position: 'sticky', top: '20px' }}>
          <div className="pp-section-label" style={{ marginBottom: '15px' }}>Live Frontend Preview</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#faf9f6', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <div style={{ width: '180px', aspectRatio: '3/4', borderRadius: '150px 150px 0 0', overflow: 'hidden', background: '#e5e7eb' }}>
                  {imgPrev && <img src={imgPrev} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ position: 'absolute', bottom: '-10px', right: '10px', width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #faf9f6', overflow: 'hidden', background: '#e5e7eb', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                  {secImgPrev && <img src={secImgPrev} alt="Secondary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ width: '30px', height: '2px', background: '#c19b6c' }}></div>
                  <div style={{ color: '#c19b6c', fontSize: '10px', fontWeight: 600, letterSpacing: '2px' }}>{subtitle || 'BAANI JEWELS'}</div>
                </div>
                <h2 style={{ fontSize: '28px', color: '#00251a', fontWeight: 300, lineHeight: 1.2, marginBottom: '15px', fontFamily: 'sans-serif' }}>
                  {title ? (() => {
                    const words = title.split(' ');
                    const last = words.length > 1 ? words.pop() : '';
                    return <>{words.join(' ')} <br /><span style={{ fontWeight: 600, color: '#c19b6c', fontStyle: 'italic' }}>{last || title}</span></>;
                  })() : <>Where Luxury <br /><span style={{ fontWeight: 600, color: '#c19b6c', fontStyle: 'italic' }}>Affordability</span></>}
                </h2>
                <p style={{ color: '#666', fontSize: '12px', lineHeight: 1.5, marginBottom: '20px', minHeight: '40px' }}>
                  {description || 'At Baani Jewels, we create high-quality imitation jewellery that beautifully blends traditional craftsmanship, timeless elegance and contemporary style.'}
                </p>
                <button style={{ background: '#00251a', color: '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                  {buttonText || 'Discover Collection'} <span>&#8594;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── LIST PANEL ── */
  const safeBanners = Array.isArray(banners) ? banners : [];
  const cleanSearch = (search || '').trim().toLowerCase();
  const filteredBanners = safeBanners.filter(b =>
    !cleanSearch ||
    (b.title || '').toLowerCase().includes(cleanSearch) ||
    (b.subtitle || '').toLowerCase().includes(cleanSearch) ||
    (b.description || '').toLowerCase().includes(cleanSearch) ||
    (b.buttonText || '').toLowerCase().includes(cleanSearch)
  );
  const totalPages = Math.max(1, Math.ceil(filteredBanners.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBanners = filteredBanners.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  return (
    <div className="pp-wrap">
      {confirmOpen && (
        <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}
      {viewBanner && (
        <ViewModal banner={viewBanner} onClose={() => setViewBanner(null)} onEdit={openEdit} onDelete={deleteBanner} imgBase={IMG} />
      )}

      <div className="pp-list-topbar">
        <div className="pp-list-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Banners</h2>
          <span className="pp-count-pill">{filteredBanners.length} total</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="cp-search-box" style={{ minWidth: '240px', position: 'relative' }}>
            <RiSearchLine className="cp-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              placeholder="Search banners..."
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
          <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Banner</button>
        </div>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th><th>Preview</th><th>Title</th>
                <th>Subtitle</th><th>Status</th><th>Button</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanners.length > 0 ? paginatedBanners.map((b, i) => (
                <tr key={b.id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td style={{ width: '120px' }}>
                    <img
                      src={IMG + b.image} alt={b.title}
                      style={{ width: '110px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #222' }}
                    />
                  </td>
                  <td><span style={{ color: '#00044a', fontWeight: 500 }}>{b.title || '—'}</span></td>
                  <td style={{ color: '#555', fontSize: '12px', maxWidth: '180px' }}>{b.subtitle || '—'}</td>
                  <td>
                    <span style={b.status === false
                      ? { background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }
                      : { background: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {b.status !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td><span className="pp-cat-badge">{b.buttonText || 'Shop Now'}</span></td>
                  <td>
                    <div className="pp-action-btns" style={{ display: 'flex', gap: '8px' }}>
                      {/* Eye — opens View modal inside admin */}
                      <button
                        title="View Details"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', border: 'none', cursor: 'pointer' }}
                        onClick={() => setViewBanner(b)}
                      >
                        <FiEye size={16} />
                      </button>
                      {/* Edit */}
                      <button
                        title="Edit"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#f3f4f6', color: '#111', border: 'none', cursor: 'pointer' }}
                        onClick={() => openEdit(b)}
                      >
                        <FiEdit2 size={16} />
                      </button>
                      {/* Delete */}
                      <button
                        title="Delete"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                        onClick={() => deleteBanner(b.id, b.title)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">
                    <div className="pp-empty">
                      <div>No banners yet. Add your first one!</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={filteredBanners.length} onPageChange={setCurrentPage} label="banners" />
      </div>
    </div>
  );
};

export default BannerPage;
