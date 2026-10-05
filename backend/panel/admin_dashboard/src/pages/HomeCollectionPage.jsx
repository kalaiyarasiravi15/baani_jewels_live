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

/* ── View Modal ── */
const ViewModal = ({ col, onClose, onEdit, onDelete, imgBase }) => {
  if (!col) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: '#00251a' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '16px', fontWeight: 600 }}>Collection Details</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <FiX size={16} />
          </button>
        </div>
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: '#faf9f6' }}>
          <div style={{ width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #c19b6c', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <img src={imgBase + col.image} alt={col.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2 style={{ fontSize: '18px', color: '#00251a', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>{col.name}</h2>
          <span style={{ background: col.status !== false ? '#dcfce7' : '#f3f4f6', color: col.status !== false ? '#166534' : '#4b5563', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            {col.status !== false ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end' }}>
          <button onClick={() => { onClose(); onDelete(col.id, col.name); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            <FiTrash2 size={14} /> Delete
          </button>
          <button onClick={() => { onClose(); onEdit(col); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#00251a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            <FiEdit2 size={14} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── HomeCollectionPage ── */
const HomeCollectionPage = () => {
  const [collections, setCollections] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch]           = useState('');
  const [panel, setPanel]   = useState('list');
  const [editId, setEditId] = useState(null);
  const [name, setName]     = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState(true);
  const [imgFile, setImgFile]   = useState(null);
  const [imgPrev, setImgPrev]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [confirmMsg, setConfirmMsg]       = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [viewCol, setViewCol]             = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const r = await axios.get(`${API}/home-collections/all-admin`);
      setCollections(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
      setCollections([]);
    }
  };

  const resetForm = () => {
    setEditId(null); setName(''); setSortOrder(0); setStatus(true);
    setImgFile(null); setImgPrev(null);
    setPanel('list');
  };

  const openEdit = (col) => {
    setEditId(col.id); setName(col.name); setSortOrder(col.sortOrder || 0);
    setStatus(col.status !== false);
    setImgPrev(IMG + col.image); setImgFile(null);
    setPanel('form');
  };

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { setImgFile(f); setImgPrev(ev.target.result); };
    reader.readAsDataURL(f);
  };

  const showConfirm = (msg, action) => {
    setConfirmMsg(msg);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleYes = () => { setConfirmOpen(false); confirmAction?.(); };
  const handleNo  = () => { setConfirmOpen(false); setConfirmAction(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Collection name is required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('sortOrder', sortOrder);
      fd.append('status', status);
      if (imgFile) fd.append('image', imgFile);
      if (editId) {
        await axios.put(`${API}/home-collections/update/${editId}`, fd);
        toast.success('Collection updated!');
      } else {
        await axios.post(`${API}/home-collections/add`, fd);
        toast.success('Collection added!');
      }
      await fetchAll();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
    setSaving(false);
  };

  const deleteCol = (id, colName) => {
    showConfirm(`Delete "${colName || 'this collection'}"? This cannot be undone.`, async () => {
      try {
        await axios.delete(`${API}/home-collections/delete/${id}`);
        toast.success('Collection deleted!');
        fetchAll();
      } catch (err) {
        toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
      }
    });
  };

  /* ── FORM PANEL ── */
  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleYes} onCancel={handleNo} />}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>&#8592; Back</button>
        <h2 className="pp-form-title">{editId ? 'Edit Collection' : 'New Collection'}</h2>
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', maxWidth: '900px' }}>
        <div style={{ flex: '1', maxWidth: '480px' }}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="pp-section-card">
              <div className="pp-section-label">Collection Details</div>
              <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '-4px', marginBottom: '14px', fontFamily: "'Poppins', sans-serif" }}>
                Home collections appear as circular tiles on the homepage. Use a short, clear name (e.g. "For Women", "Kids Special").
              </p>

              {/* Name */}
              <div className="pp-field">
                <label className="pp-price-label">Collection Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="pp-input"
                  placeholder="e.g. For Women"
                  value={name}
                  maxLength={50}
                  onChange={e => setName(e.target.value)}
                />
                <CharCount current={name.length} min={2} max={50} />
              </div>

              {/* Sort Order */}
              <div className="pp-field">
                <label className="pp-price-label">Display Order <span className="pp-optional">(lower = first)</span></label>
                <input
                  className="pp-input"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="pp-field">
                <label className="pp-price-label">Status</label>
                <select className="pp-input" value={status ? 'true' : 'false'} onChange={e => setStatus(e.target.value === 'true')}>
                  <option value="true">Active (Visible on site)</option>
                  <option value="false">Inactive (Hidden)</option>
                </select>
              </div>

              {/* Image — circular */}
              <div className="pp-field">
                <label className="pp-price-label">
                  Collection Image <span style={{ color: '#ef4444' }}>*</span>
                  {editId && <span className="pp-optional"> (leave blank to keep current)</span>}
                </label>
                <div
                  style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', border: '3px dashed #c19b6c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#faf9f6', position: 'relative' }}
                  onClick={() => document.getElementById('colImg').click()}
                >
                  {imgPrev
                    ? <img src={imgPrev} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Click to upload<br />circular image</span>
                  }
                </div>
                <input id="colImg" type="file" accept="image/*" hidden onChange={handleImg} />
              </div>
            </div>

            <div className="pp-form-actions">
              <button type="button" className="pp-btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="pp-btn-save" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Collection' : 'Add Collection'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div style={{ flex: '1', position: 'sticky', top: '20px' }}>
          <div className="pp-section-label" style={{ marginBottom: '15px' }}>Frontend Preview</div>
          <div style={{ background: '#faf9f6', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '30px 20px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '11px', color: '#c19b6c', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>EXPLORE BY</p>
            <h2 style={{ fontSize: '24px', color: '#00251a', fontWeight: 300, marginBottom: '24px' }}>
              Explore Our <span style={{ color: '#c19b6c', fontStyle: 'italic', fontWeight: 600 }}>Collection</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', background: '#e5e7eb', border: '4px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}>
                {imgPrev && <img src={imgPrev} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#333', margin: 0 }}>{name || 'COLLECTION NAME'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── LIST PANEL ── */
  const safeList = Array.isArray(collections) ? collections : [];
  const cleanSearch = (search || '').trim().toLowerCase();
  const filtered = safeList.filter(c => !cleanSearch || (c.name || '').toLowerCase().includes(cleanSearch));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleYes} onCancel={handleNo} />}
      {viewCol && <ViewModal col={viewCol} onClose={() => setViewCol(null)} onEdit={openEdit} onDelete={deleteCol} imgBase={IMG} />}

      <div className="pp-list-topbar">
        <div className="pp-list-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Home Collections</h2>
          <span className="pp-count-pill">{filtered.length} total</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="cp-search-box" style={{ minWidth: '240px', position: 'relative' }}>
            <RiSearchLine className="cp-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              placeholder="Search collections..."
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
          <button className="pp-btn-add" onClick={() => setPanel('form')}>+ Add Collection</button>
        </div>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                <th>Preview</th>
                <th>Name</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeList.length > 0 ? paginated.map((col, i) => (
                <tr key={col.id}>
                  <td className="pp-td-num">{(safePage - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                  <td>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                      <img src={IMG + col.image} alt={col.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </td>
                  <td><span style={{ fontWeight: 600, color: '#00251a', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>{col.name}</span></td>
                  <td style={{ color: '#888', fontSize: '13px' }}>{col.sortOrder || 0}</td>
                  <td>
                    <span style={col.status !== false
                      ? { background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }
                      : { background: '#f3f4f6', color: '#4b5563', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      {col.status !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button title="View" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', border: 'none', cursor: 'pointer' }} onClick={() => setViewCol(col)}>
                        <FiEye size={16} />
                      </button>
                      <button title="Edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#f3f4f6', color: '#111', border: 'none', cursor: 'pointer' }} onClick={() => openEdit(col)}>
                        <FiEdit2 size={16} />
                      </button>
                      <button title="Delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }} onClick={() => deleteCol(col.id, col.name)}>
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6">
                    <div className="pp-empty">
                      <div>No collections yet. Add your first one!</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination page={safePage} totalItems={safeList.length} onPageChange={setCurrentPage} label="collections" />
      </div>
    </div>
  );
};

export default HomeCollectionPage;
