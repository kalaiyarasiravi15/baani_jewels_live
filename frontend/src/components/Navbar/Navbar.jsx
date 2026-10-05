import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiHeart, FiShoppingBag, FiUser, FiTruck,
  FiChevronDown, FiGrid, FiMapPin, FiX, FiMenu, FiHome, FiInfo, FiMail, FiLayers
} from 'react-icons/fi';
import { RiSparkling2Line } from 'react-icons/ri';
import axios from 'axios';
import { ShopContext } from '../../context/ShopContext';
import AnnouncementBar from '../AnnouncementBar/AnnouncementBar';
import './Navbar.css';

import { API_BASE } from '../../config/apiConfig';
import { getCollectionSlug } from '../../utils/slugHelper';
const IMG = `${API_BASE}/uploads/`;

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, wishlistItems } = useContext(ShopContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const searchRef = useRef(null);

  // ── Mobile menu state ──────────────────────────────────────────────
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/categories/all`)
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data.categories || []);
        setCategories(arr.filter(c => c.status !== false));
      })
      .catch(err => console.error('Error fetching navbar categories:', err));

    axios.get(`${API_BASE}/api/home-collections/all`)
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data.collections || []);
        setCollections(arr.filter(c => c.status !== false));
      })
      .catch(err => console.error('Error fetching navbar collections:', err));

    axios.get(`${API_BASE}/api/products/all`)
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data.products || []);
        setProducts(arr.filter(p => p.status !== false));
      })
      .catch(err => console.error('Error fetching navbar products:', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileShopOpen(false);
    setMobileCollectionsOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape, and lock body scroll while it's open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('mobile-menu-open');
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isMobileMenuOpen]);

  // If the viewport is resized back up to desktop width, auto-close the mobile menu
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const queryWords = trimmedQuery ? trimmedQuery.split(/\s+/).filter(Boolean) : [];

  const matchedCategories = trimmedQuery
    ? categories.filter(cat =>
        queryWords.some(w => (cat.name || '').toLowerCase().includes(w))
      ).slice(0, 4)
    : [];

  const matchedProducts = trimmedQuery
    ? products.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category?.name || p.Category?.name || (typeof p.category === 'string' ? p.category : '') || '').toLowerCase();
        const pCol = (p.collection?.name || p.Collection?.name || (typeof p.collection === 'string' ? p.collection : '') || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const pSku = (p.sku || '').toLowerCase();
        const pTags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : (typeof p.tags === 'string' ? p.tags.toLowerCase() : '');
        const full = `${pName} ${pCat} ${pCol} ${pDesc} ${pSku} ${pTags}`;
        return queryWords.every(w => full.includes(w));
      }).slice(0, 5)
    : [];

  return (
    <header className={`navbar-container${isSearchOpen ? ' search-open' : ''}`}>
      <AnnouncementBar />
      <div className="navbar-inner">

        {/* Mobile Left Controls: Hamburger + Search Icon (responsive only) */}
        <div className="navbar-left-controls">
          <button
            type="button"
            className={`navbar-hamburger-btn${isMobileMenuOpen ? ' active' : ''}`}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <button
            type="button"
            className={`navbar-icon-btn navbar-search-mobile-btn${isSearchOpen ? ' active' : ''}`}
            aria-label="Search"
            onClick={() => setIsSearchOpen(prev => !prev)}
          >
            <FiSearch />
          </button>
        </div>

        <ul className="navbar-links">
          <li className={isActive('/') ? 'active-link' : ''}>
            <Link to="/">Home</Link>
          </li>

          <li className={`nav-item-dropdown ${isActive('/shop') ? 'active-link' : ''}`}>
            <Link to="/shop" className="nav-dropdown-trigger" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Shop <FiChevronDown className="nav-chevron" />
            </Link>
            <div className="nav-dropdown-menu shop-dropdown">
              <div className="dropdown-panel-card">
                <div className="dropdown-header-bar">
                  <span className="dropdown-label">ALL CATEGORIES ({categories.length})</span>
                  <Link to="/shop" className="dropdown-view-all-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <FiGrid style={{ marginRight: '6px' }} /> Shop All
                  </Link>
                </div>
                <div className="dropdown-categories-grid">
                  {categories.length === 0 ? (
                    <div className="dropdown-loading-txt">
                      <Link to="/shop" style={{ color: 'var(--primary-accent)', textDecoration: 'none' }}>Browse All Categories &rarr;</Link>
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <Link key={cat.id} to={`/shop?category=${encodeURIComponent(cat.name)}`} className="dropdown-category-item" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="dropdown-cat-thumb">
                          {cat.image ? (
                            <img src={IMG + cat.image} alt={cat.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span className="dropdown-cat-fallback">✦</span>
                          )}
                        </div>
                        <span className="dropdown-cat-title">{cat.name}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </li>

          <li className={`nav-item-dropdown ${isActive('/collections') ? 'active-link' : ''}`}>
            <Link to="/collections" className="nav-dropdown-trigger" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Collections <FiChevronDown className="nav-chevron" />
            </Link>
            <div className="nav-dropdown-menu collections-dropdown">
              <div className="dropdown-panel-card">
                <div className="dropdown-header-bar">
                  <span className="dropdown-label">OUR COLLECTIONS ({collections.length})</span>
                  <Link to="/collections" className="dropdown-view-all-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <FiGrid style={{ marginRight: '6px' }} /> View All
                  </Link>
                </div>
                <div className="dropdown-categories-grid">
                  {collections.length === 0 ? (
                    <div className="dropdown-loading-txt">
                      <Link to="/collections" style={{ color: 'var(--primary-accent)', textDecoration: 'none' }}>Browse All Collections</Link>
                    </div>
                  ) : (
                    collections.map((col) => (
                      <Link key={col.id} to={`/collections/${getCollectionSlug(col)}`} className="dropdown-category-item" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="dropdown-cat-thumb">
                          {col.image ? (
                            <img src={IMG + col.image} alt={col.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span className="dropdown-cat-fallback">✦</span>
                          )}
                        </div>
                        <span className="dropdown-cat-title">{col.name}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </li>

          <li className={isActive('/about') ? 'active-link' : ''}>
            <Link to="/about">About Us</Link>
          </li>
          <li className={isActive('/contact') ? 'active-link' : ''}>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>

        <div className="navbar-brand">
          <Link to="/" className="image-logo-link">
            <img src="/assests/baani_logo.png" alt="Baani Jewellery" className="nav-logo" />
          </Link>
        </div>

        <div className="navbar-actions">
          <div className="navbar-actions-icons">
            <button
              type="button"
              className={`navbar-icon-btn navbar-search-trigger navbar-search-desktop-btn${isSearchOpen ? ' active' : ''}`}
              aria-label="Search"
              onClick={() => setIsSearchOpen(prev => !prev)}
            >
              <FiSearch />
            </button>

            <button className="navbar-icon-btn" aria-label="Profile" onClick={() => navigate('/account')}>
              <FiUser />
            </button>

            <button className="navbar-icon-btn" aria-label="Track order" onClick={() => navigate('/track-order')}>
              <FiTruck />
            </button>

            <button className="navbar-icon-btn" aria-label="Wishlist" onClick={() => navigate('/wishlist')}>
              <FiHeart />
              {wishlistItems.length > 0 && <span className="cart-badge">{wishlistItems.length}</span>}
            </button>

            <button className="navbar-icon-btn navbar-cart-btn" aria-label="View cart" onClick={() => navigate('/cart')}>
              <FiShoppingBag />
              <span className="cart-badge">{cartItems.length}</span>
            </button>
          </div>

          <button type="button" className="find-store-btn" onClick={() => navigate('/contact')}>
            <FiMapPin className="find-store-icon" />
            <span>Find Store</span>
          </button>
        </div>

      </div>

      {isSearchOpen && (
        <div className="navbar-search-overlay" ref={searchRef}>
          <div className="navbar-search-overlay-inner">
            <form onSubmit={handleSearchSubmit} className="navbar-search-overlay-form">
              <FiSearch className="overlay-search-icon" />
              <input
                type="text"
                placeholder="Search jewellery, haaram, rings, earrings, bangles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="navbar-search-overlay-input"
              />
              {searchQuery && (
                <button type="button" className="overlay-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                  <FiX />
                </button>
              )}
              <button type="submit" className="overlay-search-submit">Search</button>
              <button type="button" className="overlay-search-close" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} aria-label="Close search">
                <FiX />
              </button>
            </form>

            {trimmedQuery.length > 0 && (
              <div className="navbar-search-suggestions">
                {matchedCategories.length > 0 && (
                  <div className="search-sugg-section">
                    <div className="search-sugg-heading">
                      <FiGrid className="sugg-hd-icon" /> Categories ({matchedCategories.length})
                    </div>
                    <div className="search-sugg-categories">
                      {matchedCategories.map(cat => (
                        <button type="button" key={cat.id} className="search-cat-chip"
                          onClick={() => {
                            navigate(`/shop?category=${encodeURIComponent(cat.name)}`);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}>
                          <span className="search-cat-chip-icon">✦</span>
                          <span className="search-cat-chip-name">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {matchedProducts.length > 0 ? (
                  <div className="search-sugg-section">
                    <div className="search-sugg-heading">
                      <RiSparkling2Line className="sugg-hd-icon" /> Products ({matchedProducts.length})
                    </div>
                    <div className="search-sugg-products-list">
                      {matchedProducts.map(p => {
                        const catName = p.category?.name || p.Category?.name || (typeof p.category === 'string' ? p.category : '');
                        const price = p.salesPrice ?? p.mrpPrice ?? 0;
                        const hasDiscount = p.mrpPrice > 0 && p.salesPrice != null && Number(p.mrpPrice) > Number(p.salesPrice);
                        return (
                          <div key={p.id} className="search-product-item"
                            onClick={() => {
                              navigate(`/product/${p.slug || p.id}`);
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}>
                            <div className="search-prod-thumb">
                              {p.mainImage ? (
                                <img src={`${IMG}${p.mainImage}`} alt={p.name} onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="search-prod-thumb-fallback">✦</div>
                              )}
                            </div>
                            <div className="search-prod-info">
                              <div className="search-prod-name">{p.name}</div>
                              {catName && <span className="search-prod-cat">{catName}</span>}
                            </div>
                            <div className="search-prod-price">
                              <span className="search-prod-sales">Rs.{Number(price).toLocaleString('en-IN')}</span>
                              {hasDiscount && <span className="search-prod-mrp">Rs.{Number(p.mrpPrice).toLocaleString('en-IN')}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : matchedCategories.length === 0 ? (
                  <div className="search-sugg-empty">
                    <p>No results for "<strong>{searchQuery}</strong>"</p>
                    <span>Press <strong>Enter</strong> to search all items</span>
                  </div>
                ) : null}

                <button type="button" className="search-view-all-btn"
                  onClick={() => {
                    navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}>
                  View all matching items in Shop →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Nav Backdrop ─────────────────────────────────────── */}
      <div
        className={`mobile-nav-backdrop${isMobileMenuOpen ? ' open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* ── Mobile Nav Panel (slide-in drawer) ─────────────────────── */}
      <nav
        id="mobile-nav-panel"
        ref={mobileMenuRef}
        className={`mobile-nav-panel${isMobileMenuOpen ? ' open' : ''}`}
        aria-label="Mobile navigation"
      >
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">Navigation</span>
          <button
            type="button"
            className="mobile-nav-close-btn"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          >
            <FiX />
          </button>
        </div>

        <ul className="mobile-nav-links">
          <li className={isActive('/') ? 'mobile-active-link' : ''}>
            <Link to="/" onClick={closeMobileMenu}><FiHome /> Home</Link>
          </li>

          <li className={`mobile-nav-accordion-item ${isActive('/shop') ? 'mobile-active-link' : ''}`}>
            <div className="mobile-nav-accordion-row">
              <Link to="/shop" onClick={closeMobileMenu}><FiShoppingBag /> Shop</Link>
              <button
                type="button"
                className={`mobile-accordion-toggle${mobileShopOpen ? ' open' : ''}`}
                aria-label="Toggle shop categories"
                aria-expanded={mobileShopOpen}
                onClick={() => setMobileShopOpen(prev => !prev)}
              >
                <FiChevronDown />
              </button>
            </div>
            <div className={`mobile-nav-accordion-panel${mobileShopOpen ? ' open' : ''}`}>
              {categories.length === 0 ? (
                <div className="mobile-accordion-empty">Loading categories...</div>
              ) : (
                categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="mobile-accordion-link"
                    onClick={closeMobileMenu}
                  >
                    {cat.image ? (
                      <img src={IMG + cat.image} alt={cat.name} className="mobile-acc-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="mobile-acc-bullet">✦</span>
                    )}
                    <span>{cat.name}</span>
                  </Link>
                ))
              )}
            </div>
          </li>

          <li className={`mobile-nav-accordion-item ${isActive('/collections') ? 'mobile-active-link' : ''}`}>
            <div className="mobile-nav-accordion-row">
              <Link to="/collections" onClick={closeMobileMenu}><RiSparkling2Line /> Collections</Link>
              <button
                type="button"
                className={`mobile-accordion-toggle${mobileCollectionsOpen ? ' open' : ''}`}
                aria-label="Toggle collections"
                aria-expanded={mobileCollectionsOpen}
                onClick={() => setMobileCollectionsOpen(prev => !prev)}
              >
                <FiChevronDown />
              </button>
            </div>
            <div className={`mobile-nav-accordion-panel${mobileCollectionsOpen ? ' open' : ''}`}>
              {collections.length === 0 ? (
                <div className="mobile-accordion-empty">No collections yet</div>
              ) : (
                collections.map((col) => (
                  <Link
                    key={col.id}
                    to={`/collections/${getCollectionSlug(col)}`}
                    className="mobile-accordion-link"
                    onClick={closeMobileMenu}
                  >
                    {col.image ? (
                      <img src={IMG + col.image} alt={col.name} className="mobile-acc-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="mobile-acc-bullet">✦</span>
                    )}
                    <span>{col.name}</span>
                  </Link>
                ))
              )}
            </div>
          </li>

          <li className={isActive('/about') ? 'mobile-active-link' : ''}>
            <Link to="/about" onClick={closeMobileMenu}><FiInfo /> About Us</Link>
          </li>
          <li className={isActive('/contact') ? 'mobile-active-link' : ''}>
            <Link to="/contact" onClick={closeMobileMenu}><FiMail /> Contact Us</Link>
          </li>
        </ul>

        {/* ── Additional Account & Services Section ── */}
        <div className="mobile-nav-section-divider">
          <span>ACCOUNT & SERVICES</span>
        </div>

        <ul className="mobile-nav-links secondary-links">
          <li className={isActive('/account') ? 'mobile-active-link' : ''}>
            <Link to="/account" onClick={closeMobileMenu}><FiUser /> My Profile / Account</Link>
          </li>
          <li className={isActive('/track-order') ? 'mobile-active-link' : ''}>
            <Link to="/track-order" onClick={closeMobileMenu}><FiTruck /> Track My Order</Link>
          </li>
          <li className={isActive('/wishlist') ? 'mobile-active-link' : ''}>
            <Link to="/wishlist" onClick={closeMobileMenu}>
              <FiHeart /> Wishlist
              {wishlistItems.length > 0 && <span className="mobile-badge-inline">{wishlistItems.length}</span>}
            </Link>
          </li>
          <li className={isActive('/cart') ? 'mobile-active-link' : ''}>
            <Link to="/cart" onClick={closeMobileMenu}>
              <FiShoppingBag /> View Cart
              {cartItems.length > 0 && <span className="mobile-badge-inline">{cartItems.length}</span>}
            </Link>
          </li>
          <li>
            <Link to="/contact" onClick={closeMobileMenu} className="mobile-find-store-link">
              <FiMapPin /> Find Store & Showroom
            </Link>
          </li>
        </ul>
      </nav>

      {/* Mobile-only bottom navigation bar */}
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <Link to="/" className={`mobile-bottom-nav-item${isActive('/') ? ' active' : ''}`}>
          <FiHome /><span>Home</span>
        </Link>
        <Link to="/shop" className={`mobile-bottom-nav-item${isActive('/shop') ? ' active' : ''}`}>
          <FiGrid /><span>Shop</span>
        </Link>
        <Link to="/cart" className={`mobile-bottom-nav-item mobile-bottom-cart${isActive('/cart') ? ' active' : ''}`}>
          <FiShoppingBag />
          {cartItems.length > 0 && <b className="mobile-bottom-badge">{cartItems.length}</b>}
          <span>Cart</span>
        </Link>
        <Link to="/wishlist" className={`mobile-bottom-nav-item${isActive('/wishlist') ? ' active' : ''}`}>
          <FiHeart />
          {wishlistItems.length > 0 && <b className="mobile-bottom-badge">{wishlistItems.length}</b>}
          <span>Wishlist</span>
        </Link>
        <button type="button" className={`mobile-bottom-nav-item${isMobileMenuOpen ? ' active' : ''}`} onClick={() => setIsMobileMenuOpen(prev => !prev)} aria-label="Open menu">
          <FiMenu /><span>Menu</span>
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
