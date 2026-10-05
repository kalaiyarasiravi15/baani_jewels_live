import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RiSearchLine, RiDeleteBin6Line, RiCloseLine, RiWhatsappFill } from 'react-icons/ri';
import './InboxPage.css';

import { API, IMG } from '../config';
import AdminPagination, { ADMIN_PAGE_SIZE } from '../components/AdminPagination';


let _toastTimer = null;
const showToast = (message, type = 'success') => {
  let el = document.getElementById('__ars_toast__');
  if (!el) {
    el = document.createElement('div');
    el.id = '__ars_toast__';
    Object.assign(el.style, {
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 99999,
      padding: '12px 20px', borderRadius: '10px', fontSize: '14px',
      fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: '8px',
      transition: 'opacity 0.3s', opacity: '0', pointerEvents: 'none',
      fontFamily: 'inherit',
    });
    document.body.appendChild(el);
  }
  const colors = {
    success: { bg: '#e8f5e9', color: '#1a7a3f', icon: '✓' },
    error:   { bg: '#fdecea', color: '#c62828', icon: '✕' },
  };
  const c = colors[type] || colors.success;
  el.style.background = c.bg;
  el.style.color = c.color;
  el.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
};

// ── Inline confirm card (replaces window.confirm) ───────────────────────────
const ConfirmCard = ({ onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', bottom: 28, right: 28, zIndex: 99998,
    background: '#fff', borderRadius: 12, padding: '16px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220,
  }}>
    <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
      Delete this message?
    </span>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onConfirm} style={{
        flex: 1, background: '#d32f2f', color: '#fff', border: 'none',
        borderRadius: 7, padding: '7px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13,
      }}>Delete</button>
      <button onClick={onCancel} style={{
        flex: 1, background: '#f0f0f0', color: '#333', border: 'none',
        borderRadius: 7, padding: '7px 0', cursor: 'pointer', fontWeight: 600, fontSize: 13,
      }}>Cancel</button>
    </div>
  </div>
);

const InboxPage = () => {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = ADMIN_PAGE_SIZE;
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null); // holds { id } when open

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/contact/all`);
      const data = r.data;
      if (Array.isArray(data)) {
        setMessages(data);
      } else if (data && Array.isArray(data.data)) {
        setMessages(data.data);
      } else if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (e) {
      showToast('Failed to load messages', 'error');
    }
    setLoading(false);
  };

  const openMessage = async (msg) => {
    setSelected(msg);
    showToast(`Viewing message from ${msg.name}`, 'success');
    if (!msg.isRead) {
      try {
        await axios.put(`${API}/contact/read/${msg.id}`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
        // Update navbar & sidebar counts instantly
        window.dispatchEvent(new Event('unread-messages-updated'));
      } catch (e) {}
    }
  };

  const resolveImage = (imgSrc) => {
    if (!imgSrc) return '';
    if (imgSrc.startsWith('http') || imgSrc.startsWith('/')) return imgSrc;
    const clean = imgSrc.replace(/^\/?uploads\//, '');
    return `${IMG.replace(/\/$/, '')}/${clean}`;
  };

  const getWhatsAppUrl = (phone, name) => {
    if (!phone) return '#';
    const cleanDigits = phone.replace(/\D/g, '');
    const formatted = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const msg = `Hello ${name || 'Customer'}, thank you for reaching out to Baani Jewels! How may we assist you with your jewellery enquiry?`;
    return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`;
  };

  const askDelete  = (id) => setConfirm({ id });
  const cancelDelete = () => setConfirm(null);

  const confirmDelete = async () => {
    const id = confirm.id;
    setConfirm(null);
    try {
      await axios.delete(`${API}/contact/delete/${id}`);
      if (selected?.id === id) setSelected(null);
      fetchMessages();
      showToast('Message deleted', 'success');
    } catch (e) {
      showToast('Failed to delete message', 'error');
    }
  };

  const cleanSearch = (search || '').trim().toLowerCase();
  const filtered = messages.filter(m =>
    !cleanSearch ||
    (m.name || '').toLowerCase().includes(cleanSearch) ||
    (m.email || '').toLowerCase().includes(cleanSearch) ||
    (m.subject || '').toLowerCase().includes(cleanSearch) ||
    (m.message || '').toLowerCase().includes(cleanSearch)
  );

  const unreadCount = messages.filter(m => !m.isRead).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMessages = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="inbox-wrapper">

      {/* ── Confirm card ── */}
      {confirm && (
        <ConfirmCard onConfirm={confirmDelete} onCancel={cancelDelete} />
      )}

      {/* ── Top Bar ── */}
      <div className="inbox-topbar">
        <div className="inbox-title-area">
          <h2>Inbox <span>Messages</span></h2>
          <span className="inbox-count-pill">{messages.length} total</span>
          {unreadCount > 0 && (
            <span className="inbox-unread-pill">{unreadCount} unread</span>
          )}
        </div>
        <div className="inbox-search">
          <RiSearchLine />
          <input
            placeholder="Search messages..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          {search && (
            <RiCloseLine
              className="cp-search-clear"
              onClick={() => { setSearch(''); setCurrentPage(1); }}
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

      {/* ── Layout ── */}
      <div className={`inbox-layout ${selected ? 'split' : 'single'}`}>

        {/* ── Message List ── */}
        <div className="inbox-list-card">
          <div className="inbox-list-header">
            <span>All Messages</span>
          </div>

          {loading ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">⏳</div>
              <div>Loading messages...</div>
            </div>
          ) : paginatedMessages.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">📭</div>
              <div>No messages yet.</div>
            </div>
          ) : (
            paginatedMessages.map(msg => (
              <div
                key={msg.id}
                className={`inbox-msg-row ${!msg.isRead ? 'unread' : ''} ${selected?.id === msg.id ? 'active' : ''}`}
                onClick={() => openMessage(msg)}
              >
                {!msg.isRead && <span className="inbox-unread-dot" />}

                <div className="inbox-row-top">
                  <span className={`inbox-sender-name ${!msg.isRead ? 'bold' : ''}`}>
                    {msg.name}
                  </span>
                  <span className="inbox-date">
                    {new Date(msg.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div className="inbox-email">
                  {msg.email} {msg.phone && <span style={{ marginLeft: 6, color: '#64748b' }}>• 📞 {msg.phone}</span>}
                </div>

                <div className={`inbox-preview ${!msg.isRead ? 'unread-text' : ''}`}>
                  {msg.subject && (
                    <span className="inbox-subject-tag">{msg.subject}</span>
                  )}
                  {msg.image && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: '#fef3c7',
                      color: '#92400e',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      marginRight: '6px'
                    }}>
                      📷 Photo Attached
                    </span>
                  )}
                  {msg.message?.slice(0, 55)}...
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Message Detail ── */}
        {selected && (
          <div className="inbox-detail-card">

            <div className="inbox-detail-header">
              <span className="inbox-detail-label">Message Detail</span>
              <div className="inbox-detail-actions">
                <button
                  className="inbox-act-btn del"
                  onClick={() => askDelete(selected.id)}
                  title="Delete"
                >
                  <RiDeleteBin6Line />
                </button>
                <button
                  className="inbox-act-btn"
                  onClick={() => setSelected(null)}
                  title="Close"
                >
                  <RiCloseLine />
                </button>
              </div>
            </div>

            <div className="inbox-detail-body">

              {/* Meta Grid */}
              <div className="inbox-meta-grid">
                <div className="inbox-meta-item">
                  <div className="inbox-meta-label">From</div>
                  <div className="inbox-meta-value">{selected.name}</div>
                </div>
                <div className="inbox-meta-item">
                  <div className="inbox-meta-label">Email</div>
                  <div className="inbox-meta-value sm">
                    <a href={`mailto:${selected.email}`} style={{ color: '#12382e', textDecoration: 'none', fontWeight: 600 }}>
                      {selected.email}
                    </a>
                  </div>
                </div>
                {selected.phone && (
                  <div className="inbox-meta-item">
                    <div className="inbox-meta-label">Phone</div>
                    <div className="inbox-meta-value">
                      <a href={`tel:${selected.phone}`} style={{ color: '#12382e', textDecoration: 'none', fontWeight: 600 }}>
                        {selected.phone}
                      </a>
                    </div>
                  </div>
                )}
                <div className="inbox-meta-item">
                  <div className="inbox-meta-label">Date</div>
                  <div className="inbox-meta-value sm">
                    {new Date(selected.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Quick Actions - WhatsApp */}
              {selected.phone && (
                <div style={{ marginTop: 18, marginBottom: 18 }}>
                  <a 
                    href={getWhatsAppUrl(selected.phone, selected.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#25D366',
                      color: '#ffffff',
                      padding: '10px 20px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 13.5,
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 211, 102, 0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 211, 102, 0.3)'; }}
                  >
                    <RiWhatsappFill style={{ fontSize: 19 }} /> WhatsApp
                  </a>
                </div>
              )}



              {/* Subject */}
              {selected.subject && (
                <div className="inbox-subject-block">
                  <div className="inbox-meta-label">Subject</div>
                  <span className="inbox-subject-value">{selected.subject}</span>
                </div>
              )}

              {/* Message */}
              <div>
                <div className="inbox-msg-label">Message</div>
                <div className="inbox-msg-body">{selected.message}</div>
              </div>

              {/* Attached Image / Design Reference */}
              {selected.image && (
                <div style={{ marginTop: 22, borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
                  <div className="inbox-msg-label">Attached Design Reference / Photo</div>
                  <div style={{
                    marginTop: 8,
                    padding: 14,
                    background: '#fdfbf7',
                    border: '1px solid rgba(200, 156, 74, 0.35)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <a 
                      href={resolveImage(selected.image)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="Click to view full image"
                    >
                      <img 
                        src={resolveImage(selected.image)} 
                        alt="Customer Reference" 
                        style={{
                          width: 110,
                          height: 110,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1.5px solid #c9a84c',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          cursor: 'pointer'
                        }}
                      />
                    </a>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#011c15', marginBottom: 4 }}>
                        Customer Attached Design Photo
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
                        {selected.image}
                      </p>
                      <a 
                        href={resolveImage(selected.image)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#011c15',
                          color: '#c9a84c',
                          padding: '7px 14px',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 12.5,
                          textDecoration: 'none',
                          border: '1px solid #c9a84c'
                        }}
                      >
                        View Full-Size Image ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
        </div>
      <AdminPagination page={safePage} totalItems={filtered.length} onPageChange={setCurrentPage} label="messages" />
      </div>
    );
};
export default InboxPage;
