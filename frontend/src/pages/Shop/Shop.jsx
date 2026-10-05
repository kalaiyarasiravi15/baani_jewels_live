import usePromotionRevision from '../../hooks/usePromotionRevision';
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiFilter, FiShoppingCart, FiHeart, FiEye, FiGrid, 
  FiAward, FiStar, FiX, FiZap 
} from 'react-icons/fi';
import { RiSparkling2Line } from 'react-icons/ri';
import axios from 'axios';
import { ShopContext } from '../../context/ShopContext';
import PageBanner from '../../components/PageBanner/PageBanner';
import './Shop.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const Shop = () => {
  const promotionRevision = usePromotionRevision();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, isProductInCart, toggleWishlist, isProductInWishlist } = useContext(ShopContext);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // URL parameters
  const categoryParam = searchParams.get('category');
  const categoryIdParam = searchParams.get('categoryId');
  const collectionParam = searchParams.get('collection');
  const collectionIdParam = searchParams.get('collectionId');
  const searchParam = searchParams.get('search');

  const [activeCategory, setActiveCategory] = useState(categoryParam || 'All Categories');
  const [activeCollection, setActiveCollection] = useState(collectionParam ? collectionParam.toLowerCase() : 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('default');
  const productsPerPage = 12;
  
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Synchronize state whenever URL query params change (e.g. clicked from navbar dropdown or deal banner)
  useEffect(() => {
    if (categoryParam) {
      setActiveCategory(categoryParam);
    } else if (categoryIdParam && categories.length > 0) {
      const match = categories.find(c => String(c.id) === String(categoryIdParam));
      if (match) setActiveCategory(match.name);
    } else if (!categoryIdParam) {
      setActiveCategory('All Categories');
    }

    if (collectionParam) {
      setActiveCollection(collectionParam.toLowerCase());
    } else if (collectionIdParam) {
      axios.get(`${API_BASE}/api/home-collections/all`).then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.collections || []);
        const match = list.find(cl => String(cl.id) === String(collectionIdParam));
        if (match) setActiveCollection(match.name.toLowerCase());
      }).catch(() => {});
    } else {
      setActiveCollection('all');
    }

    setCurrentPage(1);
  }, [categoryParam, categoryIdParam, collectionParam, collectionIdParam, searchParam, categories]);

  // Fetch categories once on mount
  useEffect(() => {
    axios.get(`${API_BASE}/api/categories/all`)
      .then(res => {
        const catArr = Array.isArray(res.data) ? res.data : (res.data.categories || []);
        setCategories(catArr.filter(c => c.status !== false));
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  // Fetch products whenever page or filters change (server-side pagination + filtering)
  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('limit', productsPerPage);

        if (activeCategory && activeCategory !== 'All Categories') {
          params.set('category', activeCategory);
        }
        if (activeCollection && activeCollection !== 'all') {
          params.set('collection', activeCollection);
        }
        if (searchParam && searchParam.trim()) {
          params.set('search', searchParam.trim());
        }
        if (sortOrder && sortOrder !== 'default') {
          params.set('sort', sortOrder);
        }

        const prodRes = await axios.get(`${API_BASE}/api/products/all?${params.toString()}`);
        const data = prodRes.data;
        const productsArr = Array.isArray(data) ? data : (data.products || []);
        setProducts(productsArr);
        setTotalPages(data.totalPages || 1);
        setTotalProducts(data.totalProducts || productsArr.length);
      } catch (err) {
        console.error('Error fetching shop data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [currentPage, activeCategory, activeCollection, searchParam, sortOrder, promotionRevision]);

  const currentProducts = products;



  const handleCategoryChange = (catName) => {
    setActiveCategory(catName);
    setCurrentPage(1);
    setMobileFilterOpen(false);
    const newParams = new URLSearchParams(searchParams);
    if (catName === 'All Categories') {
      newParams.delete('category');
    } else {
      newParams.set('category', catName);
    }
    setSearchParams(newParams);
  };

  const handleCollectionChange = (colKey) => {
    setActiveCollection(colKey);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (colKey === 'all') {
      newParams.delete('collection');
    } else {
      newParams.set('collection', colKey);
    }
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    setActiveCategory('All Categories');
    setActiveCollection('all');
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1);
  };

  // Dynamic Banner Title and Trail
  const getBannerInfo = () => {
    if (activeCollection === 'best-sellers' || activeCollection === 'bestsellers' || activeCollection === 'best-seller') {
      return { 
        title: activeCategory !== 'All Categories' ? `Best Sellers · ${activeCategory}` : 'Best Sellers Collection', 
        trail: 'Collections / Best Sellers' 
      };
    }
    if (activeCollection === 'new-arrivals' || activeCollection === 'newarrivals' || activeCollection === 'new-arrival') {
      return { 
        title: activeCategory !== 'All Categories' ? `New Arrivals · ${activeCategory}` : 'New Arrivals Collection', 
        trail: 'Collections / New Arrivals' 
      };
    }
    if (activeCollection === 'top-rated' || activeCollection === 'toprated' || activeCollection === 'top-rated') {
      return { 
        title: activeCategory !== 'All Categories' ? `Top Rated · ${activeCategory}` : 'Top Rated Collection', 
        trail: 'Collections / Top Rated' 
      };
    }
    if (activeCategory !== 'All Categories') {
      return { title: `${activeCategory} Collection`, trail: `Shop / ${activeCategory}` };
    }
    if (searchParam) {
      return { title: `Search Results: "${searchParam}"`, trail: `Shop / Search` };
    }
    return { title: 'Explore Our Collection', trail: 'Shop' };
  };

  const { title: bannerTitle, trail: bannerTrail } = getBannerInfo();

  const hasActiveFilters = activeCategory !== 'All Categories' || activeCollection !== 'all' || searchParam;

  // Smart responsive pagination window (1 ... 4 5 6 ... 13)
  const getPaginationItems = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items = [1];
    if (currentPage > 3) {
      items.push('ellipsis-1');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    if (currentPage < totalPages - 2) {
      items.push('ellipsis-2');
    }
    items.push(totalPages);
    return items;
  };

  return (
    <main className="shop-page">
      <PageBanner title={bannerTitle} trail={bannerTrail} />

      {/* Main Shop Layout */}
      <section className="shop-main container">
        {/* Mobile Filter Toggle */}
        <button className="mobile-filter-toggle" onClick={() => setMobileFilterOpen(!mobileFilterOpen)}>
          <FiFilter /> {mobileFilterOpen ? 'Close Categories' : 'Filter by Category'}
        </button>

        {/* Left Sidebar: Categories */}
        <aside className={`shop-sidebar ${mobileFilterOpen ? 'open' : ''}`}>
          <div className="sidebar-sticky">
            <div className="explore-card">
              <h3 className="explore-title">ALL CATEGORIES</h3>
              
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading categories...</div>
              ) : (
                <ul className="category-list">
                  <li className="category-item-container">
                    <button 
                      className={`category-btn-stacked ${activeCategory === 'All Categories' ? 'active' : ''}`}
                      onClick={() => handleCategoryChange('All Categories')}
                    >
                      <div className="cat-img-wrapper" style={{ background: '#f8f6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a3020', fontSize: '1.2rem' }}>
                        <FiGrid />
                      </div>
                      <span className="cat-label">All Categories</span>
                    </button>
                  </li>
                  {categories.map(cat => (
                    <li key={cat.id} className="category-item-container">
                      <button 
                        className={`category-btn-stacked ${activeCategory?.trim().toLowerCase() === cat.name?.trim().toLowerCase() ? 'active' : ''}`}
                        onClick={() => handleCategoryChange(cat.name)}
                      >
                        <div className="cat-img-wrapper">
                          {cat.image ? (
                            <img src={IMG + cat.image} alt={cat.name} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '11px' }}>✦</div>
                          )}
                        </div>
                        <span className="cat-label">{cat.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* Right Product Grid */}
        <div className="shop-content">
          
          {/* Top Collection Filter Pills */}
          <div className="collection-pills-bar">
            <button
              className={`collection-pill ${activeCollection === 'all' ? 'active' : ''}`}
              onClick={() => handleCollectionChange('all')}
            >
              All Jewellery
            </button>
            <button
              className={`collection-pill gold-pill ${activeCollection === 'best-sellers' || activeCollection === 'bestsellers' || activeCollection === 'best-seller' ? 'active' : ''}`}
              onClick={() => handleCollectionChange('best-sellers')}
            >
              <FiAward className="pill-icon" /> Best Sellers
            </button>
            <button
              className={`collection-pill green-pill ${activeCollection === 'new-arrivals' || activeCollection === 'newarrivals' || activeCollection === 'new-arrival' ? 'active' : ''}`}
              onClick={() => handleCollectionChange('new-arrivals')}
            >
              <RiSparkling2Line className="pill-icon" /> New Arrivals
            </button>
            <button
              className={`collection-pill star-pill ${activeCollection === 'top-rated' || activeCollection === 'toprated' || activeCollection === 'top-rated' ? 'active' : ''}`}
              onClick={() => handleCollectionChange('top-rated')}
            >
              <FiStar className="pill-icon" /> Top Rated
            </button>
          </div>

          {/* Active Filter Tags Indicator */}
          {hasActiveFilters && (
            <div className="active-filters-bar">
              <span className="active-filters-label">Active Filters:</span>
              
              {activeCollection !== 'all' && (
                <span className="filter-chip">
                  Collection: <strong>{activeCollection.replace('-', ' ').toUpperCase()}</strong>
                  <button onClick={() => handleCollectionChange('all')} aria-label="Remove collection filter"><FiX /></button>
                </span>
              )}

              {activeCategory !== 'All Categories' && (
                <span className="filter-chip">
                  Category: <strong>{activeCategory}</strong>
                  <button onClick={() => handleCategoryChange('All Categories')} aria-label="Remove category filter"><FiX /></button>
                </span>
              )}

              {searchParam && (
                <span className="filter-chip">
                  Search: <strong>"{searchParam}"</strong>
                  <button onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('search');
                    setSearchParams(next);
                  }} aria-label="Remove search filter"><FiX /></button>
                </span>
              )}

              <button className="clear-all-filters-btn" onClick={handleClearAllFilters}>
                Reset All
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="shop-toolbar">
            <p className="results-count">
              Showing <strong>{totalProducts}</strong> {totalProducts === 1 ? 'item' : 'items'}
              {activeCategory !== 'All Categories' && <> in <strong>{activeCategory}</strong></>}
              {activeCollection !== 'all' && <> (<strong>{activeCollection.replace('-', ' ')}</strong>)</>}
            </p>
            <div className="sort-wrapper">
              <label htmlFor="sort">Sort by:</label>
              <select 
                id="sort" 
                value={sortOrder} 
                onChange={handleSortChange}
                className="sort-select"
              >
                <option value="default">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Products Grid or Empty State */}
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>
              <div className="pdp-spinner" style={{ margin: '0 auto 20px', borderColor: '#0a3020', borderTopColor: 'transparent' }}></div>
              Loading products...
            </div>
          ) : totalProducts === 0 ? (
            <div className="empty-state">
              <h3>No products found matching your selection.</h3>
              <p style={{ color: '#666', margin: '8px 0 20px' }}>
                Try selecting another category or view all jewellery.
              </p>
              <button className="reset-btn" onClick={handleClearAllFilters}>View All Jewellery</button>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {currentProducts.map((product, idx) => {
                  const mrp = Number(product.mrpPrice) || 0;
                  const sales = Number(product.salesPrice ?? product.mrpPrice ?? 0);
                  const hasDiscount = mrp > 0 && sales >= 0 && mrp > sales;
                  const discountPercent = hasDiscount ? Math.round(((mrp - sales) / mrp) * 100) : 0;
                  const finalPrice = sales >= 0 ? sales : mrp;
                  const isOutOfStock = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;

                  const isWishlisted = isProductInWishlist(product.id);
                  const inCart = isProductInCart(product.id);

                  return (
                    <div key={product.id} className="bb-card" data-aos="fade-up" data-aos-delay={(idx % 4) * 40}>
                      {/* Media / Image Box */}
                      <div 
                        className="bb-media" 
                        tabIndex={0} 
                        onClick={() => navigate(`/product/${product.slug || product.id}`)}
                      >
                        {/* Highlight Promo Badge or Discount Badge */}
                        {product.promotionSource === 'Deal of the Day' ? (
                          <div className="bb-promo-badge deal">
                            <FiZap className="bb-promo-icon" /> DEAL OF DAY
                          </div>
                        ) : product.promotionSource === 'Offer Banner' ? (
                          <div className="bb-promo-badge offer">
                            <RiSparkling2Line className="bb-promo-icon" /> SPECIAL OFFER
                          </div>
                        ) : discountPercent > 0 ? (
                          <div className="bb-discount-badge">
                            {discountPercent}% OFF
                          </div>
                        ) : null}

                        {/* Out of Stock Badge */}
                        {isOutOfStock && (
                          <div className="bb-stock-badge">
                            OUT OF STOCK
                          </div>
                        )}

                        {/* Wishlist Button */}
                        <button 
                          type="button" 
                          className={`bb-wish-btn ${isWishlisted ? 'active' : ''}`} 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product);
                          }} 
                          aria-label="Save to wishlist"
                          title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M12 20s-7.5-4.6-10-9.2C0.4 7.6 2 4 5.6 4c2 0 3.5 1.1 4.4 2.6C10.9 5.1 12.4 4 14.4 4 18 4 19.6 7.6 18 10.8 15.5 15.4 12 20 12 20z" />
                          </svg>
                        </button>

                        {/* Product Image */}
                        {product.mainImage ? (
                          <img 
                            src={IMG + product.mainImage} 
                            alt={product.name} 
                            className="bb-piece-img" 
                            loading="lazy"
                            onError={(e) => { e.target.src = '/assests/pr1.jpeg'; }}
                          />
                        ) : (
                          <div className="bb-no-img">✦</div>
                        )}

                        {/* Hover Reveal Overlay */}
                        <div className="bb-overlay">
                          <button 
                            type="button" 
                            className="bb-view-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/product/${product.slug || product.id}`);
                            }} 
                            aria-label="View details"
                          >
                            <span className="bb-ring">
                              <svg viewBox="0 0 24 24">
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </span>
                            <span>View details</span>
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div 
                        className="bb-body"
                        onClick={() => navigate(`/product/${product.slug || product.id}`)}
                      >
                        <p className="bb-mat">{product.category?.name || 'Jewellery'}</p>
                        <h3 className="bb-name">{product.name}</h3>
                        <div className="bb-price-row">
                          <span className="bb-price">₹{Number(finalPrice).toLocaleString('en-IN')}</span>
                          {hasDiscount && (
                            <span className="bb-old-price">₹{Number(mrp).toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="bb-footer">
                        {inCart ? (
                          <button 
                            type="button" 
                            className="bb-add-btn added" 
                            onClick={() => navigate('/cart')}
                          >
                            <FiShoppingCart style={{ marginRight: '5px' }} />
                            In Cart
                          </button>
                        ) : isOutOfStock ? (
                          <button 
                            type="button" 
                            className="bb-add-btn preorder" 
                            onClick={() => addToCart({ ...product, isPreorder: true })}
                            title="Item is out of stock - Click to Pre-Book"
                          >
                            ✦ Pre-Book Now
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="bb-add-btn" 
                            onClick={() => addToCart(product)}
                          >
                            Add to cart
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    className="page-btn page-nav-btn" 
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    aria-label="Previous Page"
                  >
                    ‹
                  </button>
                  
                  {getPaginationItems().map((item, idx) => {
                    if (typeof item === 'string') {
                      return (
                        <span key={`ellipsis-${idx}`} className="page-ellipsis">
                          …
                        </span>
                      );
                    }
                    return (
                      <button 
                        key={item}
                        className={`page-btn ${currentPage === item ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPage(item);
                          window.scrollTo({ top: 350, behavior: 'smooth' });
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button 
                    className="page-btn page-nav-btn" 
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    aria-label="Next Page"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default Shop;
