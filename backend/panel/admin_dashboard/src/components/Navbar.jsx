import { getSession, savePreference, endSession, sessionFetch } from '../sessionClient';
import React, { useState, useEffect, useRef } from 'react';
import {
  LuBell, LuMessageSquare, LuPackageX,
  LuShoppingBag, LuStar, LuChevronRight,
  LuX, LuPackage, LuUser, LuLayoutGrid, LuTag, LuFileText, LuSparkles,
  LuCheckCheck, LuVolume2, LuVolumeX, LuInfo, LuClock, LuMail
} from "react-icons/lu";
import { RiSearchLine } from "react-icons/ri";
import axios from 'axios';
import './Navbar.css';
import { API, IMG } from '../config';

const ADMIN_PAGES = [
  { id: 'products',         name: 'Products Catalog',    category: 'Page', icon: LuPackage,     desc: 'Manage products & pricing' },
  { id: 'stock',            name: 'Stock & Inventory',  category: 'Page', icon: LuPackageX,    desc: 'Live stock & inventory alerts' },
  { id: 'orders',           name: 'Orders & Sales',     category: 'Page', icon: LuShoppingBag, desc: 'Fulfill & track customer orders' },
  { id: 'customers',        name: 'Customers List',     category: 'Page', icon: LuUser,        desc: 'Customer profiles & history' },
  { id: 'categories',       name: 'Categories',         category: 'Page', icon: LuLayoutGrid,    desc: 'Product categories & subcategories' },
  { id: 'coupons',          name: 'Coupons & Discounts',category: 'Page', icon: LuTag,         desc: 'Promotional discount codes' },
  { id: 'reports',          name: 'Reports & Analytics',category: 'Page', icon: LuFileText,    desc: 'Sales metrics, tax & revenue' },
  { id: 'reviews',          name: 'Customer Reviews',   category: 'Page', icon: LuStar,        desc: 'Moderate product reviews' },
  { id: 'inbox',            name: 'Inbox & Messages',   category: 'Page', icon: LuMessageSquare,desc: 'Customer contact form inquiries' },
];

// Web Audio synthesizer chime for new order arrival
const playOrderChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // Audio autoplay blocked or unsupported
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const Navbar = ({ setActivePage }) => {
  // ── Unread Inquiries / Messages ──
  const [unreadCount,     setUnreadCount]     = useState(0);
  const [recentMessages,  setRecentMessages]  = useState([]);
  const [showInboxDrop,   setShowInboxDrop]   = useState(false);
  const inboxRef = useRef(null);

  // ── Pending Orders ──
  const [newOrderCount,   setNewOrderCount]   = useState(0);
  const [recentOrders,    setRecentOrders]    = useState([]);
  const [showOrderDrop,   setShowOrderDrop]   = useState(false);
  const prevOrderCountRef = useRef(null);
  const orderRef = useRef(null);

  // ── Pending Reviews ──
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingReviews,     setPendingReviews]     = useState([]);
  const [showReviewDrop,     setShowReviewDrop]     = useState(false);
  const reviewRef = useRef(null);

  // ── Stock & Unified Alerts Hub (Bell) ──
  const [lowStockItems,     setLowStockItems]     = useState([]);
  const [showNotifDrop,     setShowNotifDrop]     = useState(false);
  const [stockTab,          setStockTab]          = useState('all');
  const [isSoundMuted,      setIsSoundMuted]      = useState(() => Boolean(getSession()?.preferences?.admin_notif_muted));
  const [dismissedStockIds, setDismissedStockIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_dismissed_stock_ids') || '[]');
    } catch {
      return [];
    }
  });
  const notifRef = useRef(null);

  // ── Top-Bar Icon Badges Dismissal States ──
  const [inboxDismissed,   setInboxDismissed]   = useState(() => localStorage.getItem('admin_inbox_dismissed') === 'true');
  const [ordersDismissed,  setOrdersDismissed]  = useState(() => localStorage.getItem('admin_orders_dismissed') === 'true');
  const [reviewsDismissed, setReviewsDismissed] = useState(() => localStorage.getItem('admin_reviews_dismissed') === 'true');

  // ── Search Bar State ──
  const [searchQuery,      setSearchQuery]      = useState('');
  const [isSearchFocused,  setIsSearchFocused]  = useState(false);
  const [allProductsRaw,   setAllProductsRaw]   = useState([]);
  const searchRef      = useRef(null);
  const searchInputRef = useRef(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // ── 1. Fetch unread messages & recent messages ──
  const fetchUnread = async () => {
    try {
      const r = await axios.get(`${API}/contact/unread-count`);
      const count = r.data.unreadCount || 0;
      setUnreadCount(count);

      const allR = await axios.get(`${API}/contact/all`);
      const msgs = allR.data?.messages || allR.data || [];
      if (Array.isArray(msgs)) {
        const unreadList = msgs.filter(m => !m.isRead).slice(0, 6);
        setRecentMessages(unreadList);
      }
    } catch (e) {
      console.error('Navbar: unread count failed', e);
    }
  };

  useEffect(() => {
    fetchUnread();
    window.addEventListener('unread-messages-updated', fetchUnread);
    const iv = setInterval(fetchUnread, 25000);
    return () => {
      clearInterval(iv);
      window.removeEventListener('unread-messages-updated', fetchUnread);
    };
  }, []);

  // ── 2. Fetch low-stock products ──
  const fetchLowStock = async () => {
    try {
      const res = await axios.get(`${API}/products/all`, { headers: { 'x-admin-request': 'true' } });
      const prods = res.data || [];
      setAllProductsRaw(prods);

      const low = prods
        .flatMap(p => {
          const selectableVariants = (p.variants || []).filter(v => v.variantType && v.variantValue);
          if (selectableVariants.length > 0) {
            return selectableVariants.map(v => ({
              id: `variant-${v.id}`,
              productId: p.id,
              name: `${p.name} — ${v.variantType}: ${v.variantValue}`,
              stock: Number(v.stock || 0),
              image: v.mainImage || p.mainImage,
              isOut: Number(v.stock || 0) === 0,
              price: v.price || p.price,
              sku: p.sku
            }));
          }
          return [{
            id: `product-${p.id}`,
            productId: p.id,
            name: p.name,
            stock: Number(p.stock || 0),
            image: p.mainImage,
            isOut: Number(p.stock || 0) === 0,
            price: p.price,
            sku: p.sku
          }];
        })
        .filter(p => p.stock <= 10)
        .sort((a, b) => {
          if (a.isOut && !b.isOut) return -1;
          if (!a.isOut && b.isOut) return 1;
          return a.stock - b.stock;
        });
      setLowStockItems(low);
    } catch (e) {
      console.error('Navbar: low stock failed', e);
    }
  };

  useEffect(() => {
    fetchLowStock();
    window.addEventListener('stock-updated', fetchLowStock);
    const iv = setInterval(fetchLowStock, 45000);
    return () => {
      clearInterval(iv);
      window.removeEventListener('stock-updated', fetchLowStock);
    };
  }, []);

  // ── 3. Fetch pending orders with audio alert ──
  const fetchNewOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders/all`, {
        params: { status: 'Pending', page: 1, limit: 10 }
      });
      const orders = res.data?.orders || [];
      const total = res.data?.totalOrders || orders.length;
      
      // Play audio chime if new order arrives
      if (prevOrderCountRef.current !== null && total > prevOrderCountRef.current && !isSoundMuted) {
        playOrderChime();
      }
      prevOrderCountRef.current = total;
      
      setNewOrderCount(total);
      setRecentOrders(orders.slice(0, 6));
    } catch (e) {
      console.error('Navbar: orders failed', e);
    }
  };

  useEffect(() => {
    fetchNewOrders();
    const iv = setInterval(fetchNewOrders, 20000);
    return () => clearInterval(iv);
  }, [isSoundMuted]);

  // ── 4. Fetch pending reviews ──
  const fetchPendingReviews = async () => {
    try {
      const res = await axios.get(`${API}/reviews/all`);
      const all = res.data || [];
      const pending = all.filter(r => r.status === 'pending');
      setPendingReviewCount(pending.length);
      setPendingReviews(pending.slice(0, 6));
    } catch (e) {
      console.error('Navbar: reviews failed', e);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
    const iv = setInterval(fetchPendingReviews, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Keyboard Shortcuts (Ctrl+K / Cmd+K / Esc) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Close all dropdowns on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotifDrop(false);
      if (orderRef.current  && !orderRef.current.contains(e.target))  setShowOrderDrop(false);
      if (reviewRef.current && !reviewRef.current.contains(e.target)) setShowReviewDrop(false);
      if (inboxRef.current  && !inboxRef.current.contains(e.target))  setShowInboxDrop(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Navigation Helper ──
  const goTo = (page) => {
    setShowOrderDrop(false);
    setShowReviewDrop(false);
    setShowNotifDrop(false);
    setShowInboxDrop(false);
    setIsSearchFocused(false);
    setActivePage && setActivePage(page);
  };

  const handleToggleSound = (e) => {
    e.stopPropagation();
    const nextVal = !isSoundMuted;
    setIsSoundMuted(nextVal);
    savePreference('admin_notif_muted', nextVal).catch(() => {});
    if (!nextVal) playOrderChime();
  };

  // ── Clear / Dismissal Handlers ──
  const handleClearInbox = async (e) => {
    e.stopPropagation();
    setInboxDismissed(true);
    localStorage.setItem('admin_inbox_dismissed', 'true');
    setUnreadCount(0);
    try {
      await axios.put(`${API}/contact/mark-all-read`);
    } catch (err) {}
  };

  const handleClearOrders = (e) => {
    e.stopPropagation();
    setOrdersDismissed(true);
    localStorage.setItem('admin_orders_dismissed', 'true');
  };

  const handleClearReviews = (e) => {
    e.stopPropagation();
    setReviewsDismissed(true);
    localStorage.setItem('admin_reviews_dismissed', 'true');
  };

  // ── Stock-Only Notifications Calculation (Bell Hub) ──
  const outStockItems = lowStockItems.filter(i => i.isOut);
  const lowStockOnly  = lowStockItems.filter(i => !i.isOut);

  // Stock Alert Items for Bell Dropdown ONLY (Orders, Reviews, Messages removed per request)
  const stockAlerts = [
    ...outStockItems.map(s => ({
      id: `stock-out-${s.id}`,
      type: 'stock',
      stockType: 'out',
      title: s.name,
      subtitle: 'Out of stock (0 units remaining)',
      tag: 'Out of Stock',
      tagType: 'danger',
      image: s.image,
      stock: 0,
      onClick: () => goTo('stock')
    })),
    ...lowStockOnly.map(s => ({
      id: `stock-low-${s.id}`,
      type: 'stock',
      stockType: 'low',
      title: s.name,
      subtitle: `Only ${s.stock} unit${s.stock !== 1 ? 's' : ''} left in inventory`,
      tag: `${s.stock} Left`,
      tagType: 'warning',
      image: s.image,
      stock: s.stock,
      onClick: () => goTo('stock')
    }))
  ];

  // Active un-dismissed stock alerts
  const activeStockAlerts = stockAlerts.filter(a => !dismissedStockIds.includes(a.id));
  const displayStockCount = activeStockAlerts.length;

  const handleClearStockAlerts = (e) => {
    e.stopPropagation();
    const allIds = stockAlerts.map(a => a.id);
    setDismissedStockIds(allIds);
    localStorage.setItem('admin_dismissed_stock_ids', JSON.stringify(allIds));
  };

  const visibleStockAlerts = activeStockAlerts.filter(a => {
    if (stockTab === 'low') return a.stockType === 'low';
    if (stockTab === 'out') return a.stockType === 'out';
    return true;
  });

  const displayInboxCount = inboxDismissed ? 0 : unreadCount;
  const displayOrderCount = ordersDismissed ? 0 : newOrderCount;
  const displayReviewCount = reviewsDismissed ? 0 : pendingReviewCount;

  // ── Search Dropdown Matching Results ──
  const searchLower = searchQuery.trim().toLowerCase();
  const matchingPages = searchLower
    ? ADMIN_PAGES.filter(p => p.name.toLowerCase().includes(searchLower) || p.desc.toLowerCase().includes(searchLower))
    : ADMIN_PAGES.slice(0, 4);

  const getCategoryStr = (cat) => {
    if (!cat) return '';
    if (typeof cat === 'string') return cat;
    if (typeof cat === 'object') return cat.name || cat.categoryName || cat.title || '';
    return String(cat);
  };

  const matchingProducts = searchLower
    ? allProductsRaw.filter(p => {
        const nameMatch = String(p?.name || '').toLowerCase().includes(searchLower);
        const skuMatch  = String(p?.sku || '').toLowerCase().includes(searchLower);
        const catName   = getCategoryStr(p?.category || p?.Category).toLowerCase();
        const catMatch  = catName.includes(searchLower);
        return nameMatch || skuMatch || catMatch;
      }).slice(0, 6)
    : [];

  const matchingOrders = searchLower
    ? recentOrders.filter(o =>
        String(o.orderId || '').toLowerCase().includes(searchLower) ||
        (o.Customer?.name || o.customerName || '').toLowerCase().includes(searchLower)
      ).slice(0, 3)
    : [];

  const hasAnyResults = matchingPages.length > 0 || matchingProducts.length > 0 || matchingOrders.length > 0;

  const StarRow = ({ rating }) => (
    <span className="nav-stars">
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= rating ? '#d4af37' : '#ddd', fontSize: 11 }}>★</span>
      ))}
    </span>
  );

  return (
    <header className="ars-navbar">

      {/* ── Search Bar Container ── */}
      <div className="nav-search-wrapper" ref={searchRef}>
        <div className={`nav-search-bar ${isSearchFocused ? 'is-focused' : ''} ${searchQuery ? 'has-value' : ''}`}>
          <RiSearchLine className="nav-search-icon" />
          <input
            ref={searchInputRef}
            className="nav-search-input"
            type="text"
            placeholder="Search products, orders, stock, pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="nav-search-clear"
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              title="Clear search"
            >
              <LuX size={14} />
            </button>
          ) : (
            <div className="nav-search-shortcut" title="Press Ctrl+K to search">
              <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd>
            </div>
          )}
        </div>

        {/* ── Search Dropdown Results ── */}
        {isSearchFocused && (
          <div className="nav-search-dropdown">

            {!searchLower ? (
              /* Quick Suggestions When Empty */
              <div className="nav-search-quick">
                <div className="nav-search-section-title">
                  <LuSparkles size={13} />
                  <span>QUICK NAVIGATION</span>
                </div>
                <div className="nav-search-quick-grid">
                  {ADMIN_PAGES.slice(0, 4).map(page => {
                    const IconComp = page.icon;
                    return (
                      <div
                        key={page.id}
                        className="nav-search-quick-card"
                        onClick={() => goTo(page.id)}
                      >
                        <div className="nav-search-quick-icon">
                          <IconComp size={16} />
                        </div>
                        <div className="nav-search-quick-text">
                          <span className="quick-title">{page.name}</span>
                          <span className="quick-desc">{page.desc}</span>
                        </div>
                        <LuChevronRight className="quick-arrow" size={14} />
                      </div>
                    );
                  })}
                </div>

                <div className="nav-search-hint">
                  <span>💡 Tip: Type a product name, SKU code (e.g. B0001), order number, or page.</span>
                </div>
              </div>
            ) : !hasAnyResults ? (
              /* No Results State */
              <div className="nav-search-empty">
                <LuPackageX size={32} />
                <p>No matches found for "<strong>{searchQuery}</strong>"</p>
                <span>Try searching for 'Products', 'Orders', 'Stock', or a product code like 'B0001'</span>
              </div>
            ) : (
              /* Filtered Results */
              <div className="nav-search-results-list">

                {/* ── Pages Section ── */}
                {matchingPages.length > 0 && (
                  <div className="nav-search-group">
                    <div className="nav-search-group-header">PAGES</div>
                    {matchingPages.map(page => {
                      const IconComp = page.icon;
                      return (
                        <div
                          key={page.id}
                          className="nav-search-result-item"
                          onClick={() => goTo(page.id)}
                        >
                          <div className="nav-search-item-icon page-icon">
                            <IconComp size={15} />
                          </div>
                          <div className="nav-search-item-info">
                            <span className="nav-search-item-title">{page.name}</span>
                            <span className="nav-search-item-sub">{page.desc}</span>
                          </div>
                          <span className="nav-search-badge page-badge">Jump</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Products Section ── */}
                {matchingProducts.length > 0 && (
                  <div className="nav-search-group">
                    <div className="nav-search-group-header">PRODUCTS & INVENTORY</div>
                    {matchingProducts.map(prod => (
                      <div
                        key={prod.id}
                        className="nav-search-result-item"
                        onClick={() => goTo('products')}
                      >
                        <div className="nav-search-item-thumb">
                          {prod.mainImage ? (
                            <img src={IMG + prod.mainImage} alt={prod.name} onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <LuPackage size={16} />
                          )}
                        </div>
                        <div className="nav-search-item-info">
                          <span className="nav-search-item-title">{prod.name}</span>
                          <span className="nav-search-item-sub">
                            {prod.sku ? `SKU: ${prod.sku} • ` : ''}
                            ₹{Number(prod.price || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className={`nav-search-badge ${Number(prod.stock || 0) === 0 ? 'out-badge' : Number(prod.stock || 0) <= 10 ? 'low-badge' : 'stock-badge'}`}>
                          {Number(prod.stock || 0) === 0 ? 'Out of Stock' : `${prod.stock} in stock`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Orders Section ── */}
                {matchingOrders.length > 0 && (
                  <div className="nav-search-group">
                    <div className="nav-search-group-header">ORDERS</div>
                    {matchingOrders.map(order => (
                      <div
                        key={order.orderId || order.id}
                        className="nav-search-result-item"
                        onClick={() => goTo(`orders?orderId=${order.orderId}`)}
                      >
                        <div className="nav-search-item-icon order-icon">
                          <LuShoppingBag size={15} />
                        </div>
                        <div className="nav-search-item-info">
                          <span className="nav-search-item-title">Order {order.orderId}</span>
                          <span className="nav-search-item-sub">
                            {order.Customer?.name || order.customerName || 'Customer'}
                          </span>
                        </div>
                        <span className="nav-search-badge order-badge">
                          ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            <div className="nav-search-dropdown-footer">
              <div className="nav-search-footer-left">
                <span className="nav-search-footer-hint"><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
                <span className="nav-search-footer-hint"><kbd>↵</kbd> to select</span>
              </div>
              <span className="nav-search-footer-hint">Press <kbd>Esc</kbd> to exit</span>
            </div>

          </div>
        )}

      </div>

      {/* ── Right Side Navigation & Notifications ── */}
      <div className="nav-right" style={{ marginLeft: 'auto' }}>

        {/* ══ 1. INBOX / MESSAGES NOTIFICATION ══ */}
        <div className="notif-wrapper" ref={inboxRef}>
          <div
            className={`nav-icon-btn ${showInboxDrop ? 'active' : ''}`}
            onClick={() => {
              setShowInboxDrop(v => !v);
              setShowOrderDrop(false);
              setShowReviewDrop(false);
              setShowNotifDrop(false);
              setIsSearchFocused(false);
            }}
            title="Customer Inquiries"
          >
            <LuMessageSquare size={19} />
            {displayInboxCount > 0 && (
              <span className="navbar-badge">{displayInboxCount > 9 ? '9+' : displayInboxCount}</span>
            )}
          </div>

          {showInboxDrop && (
            <div className="notif-dropdown">
              <div className="notif-drop-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <LuMessageSquare size={14} />
                  <span className="notif-drop-title">Customer Inquiries</span>
                  <span className="notif-drop-count">{displayInboxCount}</span>
                </div>
                <button
                  type="button"
                  className="notif-mark-read-btn"
                  onClick={handleClearInbox}
                  title="Clear inquiries"
                >
                  <LuCheckCheck size={13} /> Clear
                </button>
              </div>

              {recentMessages.length === 0 || displayInboxCount === 0 ? (
                <div className="notif-empty">
                  <LuMail size={28} />
                  <p>No unread messages</p>
                  <span>All customer inquiries have been addressed</span>
                </div>
              ) : (
                <div className="notif-list">
                  {recentMessages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className="notif-item"
                      onClick={() => goTo('inbox')}
                    >
                      <div className="notif-review-avatar" style={{ background: '#4338ca' }}>
                        {(msg.name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="notif-item-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="notif-item-name">{msg.name || 'Anonymous'}</span>
                          {msg.createdAt && <span className="notif-time-ago">{formatTimeAgo(msg.createdAt)}</span>}
                        </div>
                        <span className="notif-item-sub">
                          {(msg.subject || msg.message || 'New contact inquiry').slice(0, 36)}
                          {(msg.message?.length > 36) ? '…' : ''}
                        </span>
                        {msg.email && <span className="notif-item-product">{msg.email}</span>}
                      </div>
                      <span className="notif-pending-chip" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#ddd6fe' }}>New</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-drop-footer" onClick={() => goTo('inbox')}>
                View all in Inbox <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ══ 2. ORDER NOTIFICATION ══ */}
        <div className="notif-wrapper" ref={orderRef}>
          <div
            className={`nav-icon-btn ${showOrderDrop ? 'active' : ''}`}
            onClick={() => {
              setShowOrderDrop(v => !v);
              setShowInboxDrop(false);
              setShowReviewDrop(false);
              setShowNotifDrop(false);
              setIsSearchFocused(false);
            }}
            title="Pending Orders"
          >
            <LuShoppingBag size={19} />
            {displayOrderCount > 0 && (
              <span className="navbar-badge">{displayOrderCount > 9 ? '9+' : displayOrderCount}</span>
            )}
          </div>

          {showOrderDrop && (
            <div className="notif-dropdown">
              <div className="notif-drop-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <LuShoppingBag size={14} />
                  <span className="notif-drop-title">Pending Orders</span>
                  <span className="notif-drop-count">{displayOrderCount}</span>
                </div>
                <button
                  type="button"
                  className="notif-mark-read-btn"
                  onClick={handleClearOrders}
                  title="Clear order notifications"
                >
                  <LuCheckCheck size={13} /> Clear
                </button>
              </div>

              {recentOrders.length === 0 || displayOrderCount === 0 ? (
                <div className="notif-empty">
                  <LuShoppingBag size={28} />
                  <p>No pending orders</p>
                  <span>All customer orders are up to date</span>
                </div>
              ) : (
                <div className="notif-list">
                  {recentOrders.map((order, i) => (
                    <div
                      key={order.orderId || i}
                      className="notif-item"
                      onClick={() => goTo(`orders?orderId=${order.orderId}`)}
                    >
                      <div className="notif-item-icon-box">
                        <LuShoppingBag size={16} />
                      </div>
                      <div className="notif-item-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="notif-item-name">Order {order.orderId}</span>
                          {order.createdAt && <span className="notif-time-ago">{formatTimeAgo(order.createdAt)}</span>}
                        </div>
                        <span className="notif-item-sub">
                          {order.Customer?.name || order.customerName || 'Customer'}
                        </span>
                        {order.isPreorder && (
                          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>✦ PRE-BOOKING</span>
                        )}
                      </div>
                      <span className="notif-item-amount">
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-drop-footer" onClick={() => goTo('orders')}>
                View all orders <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ══ 3. REVIEW NOTIFICATION (pending only) ══ */}
        <div className="notif-wrapper" ref={reviewRef}>
          <div
            className={`nav-icon-btn ${showReviewDrop ? 'active' : ''}`}
            onClick={() => {
              setShowReviewDrop(v => !v);
              setShowInboxDrop(false);
              setShowOrderDrop(false);
              setShowNotifDrop(false);
              setIsSearchFocused(false);
            }}
            title="Pending Reviews"
          >
            <LuStar size={19} />
            {displayReviewCount > 0 && (
              <span className="navbar-badge">{displayReviewCount > 9 ? '9+' : displayReviewCount}</span>
            )}
          </div>

          {showReviewDrop && (
            <div className="notif-dropdown">
              <div className="notif-drop-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <LuStar size={14} />
                  <span className="notif-drop-title">Pending Reviews</span>
                  <span className="notif-drop-count">{displayReviewCount}</span>
                </div>
                <button
                  type="button"
                  className="notif-mark-read-btn"
                  onClick={handleClearReviews}
                  title="Clear review notifications"
                >
                  <LuCheckCheck size={13} /> Clear
                </button>
              </div>

              {pendingReviews.length === 0 || displayReviewCount === 0 ? (
                <div className="notif-empty">
                  <LuStar size={28} />
                  <p>No pending reviews</p>
                  <span>All submitted reviews have been moderated</span>
                </div>
              ) : (
                <div className="notif-list">
                  {pendingReviews.map((review, i) => (
                    <div
                      key={review.id || i}
                      className="notif-item"
                      onClick={() => goTo('reviews')}
                    >
                      <div className="notif-review-avatar">
                        {(review.customerInfo?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="notif-item-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="notif-item-name">{review.customerInfo?.name || 'Anonymous'}</span>
                          {review.createdAt && <span className="notif-time-ago">{formatTimeAgo(review.createdAt)}</span>}
                        </div>
                        <span className="notif-item-sub">
                          <StarRow rating={Number(review.rating) || 5} />
                          {' '}
                          {(review.feedback || '').slice(0, 26) || 'No comment'}
                          {(review.feedback?.length > 26) ? '…' : ''}
                        </span>
                        {review.productInfo?.name && (
                          <span className="notif-item-product">{review.productInfo.name}</span>
                        )}
                      </div>
                      <span className="notif-pending-chip">Pending</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-drop-footer" onClick={() => goTo('reviews')}>
                View all reviews <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ══ 4. BELL HUB — STOCK NOTIFICATIONS ONLY (Orders & Reviews removed) ══ */}
        <div className="notif-wrapper" ref={notifRef}>
          <div
            className={`nav-icon-btn ${showNotifDrop ? 'active' : ''}`}
            onClick={() => {
              setShowNotifDrop(v => !v);
              setShowInboxDrop(false);
              setShowOrderDrop(false);
              setShowReviewDrop(false);
              setIsSearchFocused(false);
            }}
            title="Stock Notifications"
          >
            <LuBell size={19} />
            {displayStockCount > 0 && (
              <span className="navbar-badge">{displayStockCount > 9 ? '9+' : displayStockCount}</span>
            )}
          </div>

          {showNotifDrop && (
            <div className="notif-dropdown notif-hub-dropdown">
              <div className="notif-drop-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <LuPackageX size={15} />
                  <span className="notif-drop-title">Stock Notifications</span>
                  <span className="notif-drop-count">{displayStockCount}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="notif-sound-btn"
                    onClick={handleToggleSound}
                    title={isSoundMuted ? "Unmute notification sound" : "Mute notification sound"}
                  >
                    {isSoundMuted ? <LuVolumeX size={14} /> : <LuVolume2 size={14} />}
                  </button>
                  <button
                    type="button"
                    className="notif-mark-read-btn"
                    onClick={handleClearStockAlerts}
                    title="Clear stock alerts"
                  >
                    <LuCheckCheck size={14} /> Clear
                  </button>
                </div>
              </div>

              {/* Stock Filter Tabs */}
              <div className="notif-filter-tabs">
                {[
                  { key: 'all', label: 'All Stock', count: activeStockAlerts.length },
                  { key: 'low', label: 'Low Stock', count: activeStockAlerts.filter(a => a.stockType === 'low').length },
                  { key: 'out', label: 'Out of Stock', count: activeStockAlerts.filter(a => a.stockType === 'out').length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`notif-tab ${stockTab === tab.key ? 'active-tab' : ''}`}
                    onClick={() => setStockTab(tab.key)}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="tab-count">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {visibleStockAlerts.length === 0 ? (
                <div className="notif-empty">
                  <LuPackage size={28} />
                  <p>No active stock alerts</p>
                  <span>All product inventory levels are healthy!</span>
                </div>
              ) : (
                <div className="notif-list">
                  {visibleStockAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="notif-item alert-type-stock"
                      onClick={alert.onClick}
                    >
                      {alert.image ? (
                        <div className="notif-item-img">
                          <img src={IMG + alert.image} alt={alert.title} onError={e => { e.target.style.display = 'none'; }} />
                        </div>
                      ) : (
                        <div className="notif-item-icon-box type-stock">
                          <LuPackageX size={16} />
                        </div>
                      )}

                      <div className="notif-item-info">
                        <span className="notif-item-name">{alert.title}</span>
                        <span className="notif-item-sub">{alert.subtitle}</span>
                      </div>

                      {alert.tag && (
                        <span className={`notif-item-badge tag-${alert.tagType || 'default'}`}>
                          {alert.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-drop-footer" onClick={() => goTo('stock')}>
                View Inventory <LuChevronRight size={12} />
              </div>
            </div>
          )}
        </div>

        {/* ── Admin User Chip ── */}
        <div className="admin-chip">
          <div className="avatar">{(getSession()?.admin?.name || 'Admin').charAt(0).toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{getSession()?.admin?.name || 'Admin'}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{getSession()?.admin?.role === 'employee' ? 'Employee' : 'Administrator'}</span>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
