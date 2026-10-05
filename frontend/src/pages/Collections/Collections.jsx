import React, { useState, useEffect, useContext } from 'react';
import usePromotionRevision from '../../hooks/usePromotionRevision';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiShoppingCart, FiArrowRight, FiGrid } from 'react-icons/fi';
import axios from 'axios';
import { ShopContext } from '../../context/ShopContext';
import PageBanner from '../../components/PageBanner/PageBanner';
import { slugify, getCollectionSlug } from '../../utils/slugHelper';
import './Collections.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const Collections = () => {
  const promotionRevision = usePromotionRevision();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, isProductInCart, toggleWishlist, isProductInWishlist } = useContext(ShopContext);

  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read URL params (?id=... | ?collection=... | ?type=...)
  const selectedColId = searchParams.get('id');
  const selectedColName = searchParams.get('collection') || searchParams.get('type') || searchParams.get('slug');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch collections and first batch of products (paginated for speed)
        const [colRes, prodRes] = await Promise.all([
          axios.get(`${API_BASE}/api/home-collections/all`),
          axios.get(`${API_BASE}/api/products/all?page=1&limit=100`)
        ]);

        const colArr = Array.isArray(colRes.data)
          ? colRes.data
          : (colRes.data.collections || []);
        setCollections(colArr.filter(c => c.status !== false));

        const data = prodRes.data;
        const prodArr = Array.isArray(data) ? data : (data.products || []);
        setProducts(prodArr);
      } catch (err) {
        console.error('Error fetching collections data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [promotionRevision]);


  // Helper to get products for a specific collection
  const getProductsForCollection = (col) => {
    if (!col) return [];
    const colNameLower = String(col.name || '').trim().toLowerCase();
    const cleanWord = colNameLower.replace(/collection|collections/gi, '').trim();

    return products.filter(p => {
      // 1. Direct collectionId match
      if (p.collectionId && Number(p.collectionId) === Number(col.id)) return true;
      // 2. Direct collection object match
      if (p.collection && (p.collection.id === col.id || String(p.collection.name || '').toLowerCase() === colNameLower)) return true;
      // 3. Built-in collection flags
      if (colNameLower.includes('trend') && (p.isTrending || p.trending)) return true;
      if (colNameLower.includes('best') && (p.isBestSeller || p.bestSeller)) return true;
      if ((colNameLower.includes('new') || colNameLower.includes('arrival')) && (p.isNewArrival || p.newArrival)) return true;
      if ((colNameLower.includes('top') || colNameLower.includes('rated')) && (p.isTopRated || p.topRated)) return true;
      // 4. Category match fallback
      if (p.category && String(p.category.name || '').toLowerCase() === colNameLower) return true;
      // 5. Keyword match in name or description
      if (cleanWord && cleanWord.length >= 3) {
        if (String(p.name || '').toLowerCase().includes(cleanWord)) return true;
        if (String(p.description || '').toLowerCase().includes(cleanWord)) return true;
      }
      return false;
    });
  };

  // Determine active collection if filtered by slug or query param
  const currentActiveCol = collections.find(c => {
    const colSlug = getCollectionSlug(c);
    if (slug) {
      if (colSlug.toLowerCase() === slug.toLowerCase()) return true;
      if (String(c.id) === slug) return true;
      if (slugify(c.name) === slugify(slug)) return true;
    }
    if (selectedColId && String(c.id) === String(selectedColId)) return true;
    if (selectedColName) {
      if (colSlug.toLowerCase() === selectedColName.toLowerCase()) return true;
      if (slugify(c.name) === slugify(selectedColName)) return true;
      if (String(c.name).toLowerCase() === String(selectedColName).toLowerCase()) return true;
    }
    return false;
  });

  // If accessed via query params like ?id=1 or ?collection=..., cleanly replace URL with slug
  useEffect(() => {
    if (!loading && currentActiveCol && (selectedColId || selectedColName) && !slug) {
      navigate(`/collections/${getCollectionSlug(currentActiveCol)}`, { replace: true });
    }
  }, [loading, currentActiveCol, selectedColId, selectedColName, slug, navigate]);

  const isAllSelected = !currentActiveCol;

  // Dynamic Banner Title & Trail
  const bannerTitle = currentActiveCol ? currentActiveCol.name.toUpperCase() : 'OUR COLLECTIONS';
  const bannerTrail = currentActiveCol
    ? `Our Collections / ${currentActiveCol.name}`
    : 'Our Collections';

  const handleSelectCollection = (col) => {
    if (!col) {
      navigate('/collections');
    } else {
      navigate(`/collections/${getCollectionSlug(col)}`);
    }
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Render a reusable product card with the Universal luxury .bb-card design
  const renderProductCard = (product) => {
    const mrp = Number(product.mrpPrice) || 0;
    const sales = Number(product.salesPrice ?? product.mrpPrice ?? 0);
    const hasDiscount = mrp > 0 && sales >= 0 && mrp > sales;
    const discountPercent = hasDiscount ? Math.round(((mrp - sales) / mrp) * 100) : 0;
    const finalPrice = sales >= 0 ? sales : mrp;
    const isOutOfStock = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;

    const inCart = isProductInCart(product.id);
    const inWishlist = isProductInWishlist(product.id);

    return (
      <div className="bb-card" key={product.id}>
        {/* Media / Image Box */}
        <div 
          className="bb-media" 
          tabIndex={0} 
          onClick={() => navigate(`/product/${product.slug || product.id}`)}
        >
          {/* Discount Percentage Badge */}
          {discountPercent > 0 && (
            <div className="bb-discount-badge">
              {discountPercent}% OFF
            </div>
          )}

          {/* Out of Stock Badge */}
          {isOutOfStock && (
            <div className="bb-stock-badge">
              OUT OF STOCK
            </div>
          )}

          {/* Wishlist Button */}
          <button 
            type="button" 
            className={`bb-wish-btn ${inWishlist ? 'active' : ''}`} 
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }} 
            aria-label="Save to wishlist"
            title={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
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
          <p className="bb-mat">{product.category?.name || product.collection?.name || 'Jewellery'}</p>
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
  };

  return (
    <main className="collections-page">
      {/* Hero Banner with Dynamic Title */}
      <PageBanner title={bannerTitle} trail={bannerTrail} />

      <div className="collections-container container">
        {/* Dynamic Navigation Tabs Bar */}
        <div className="collections-tabs-bar" data-aos="fade-up">
          <button
            className={`col-tab-btn ${isAllSelected ? 'active' : ''}`}
            onClick={() => handleSelectCollection(null)}
          >
            All Collections ({collections.length})
          </button>
          {collections.map(col => {
            const colProds = getProductsForCollection(col);
            const isActive = currentActiveCol?.id === col.id;
            return (
              <button
                key={col.id}
                className={`col-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectCollection(col)}
              >
                {col.name} ({colProds.length})
              </button>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="collections-loading">
            <div className="col-spinner"></div>
            <p>Curating luxury collections...</p>
          </div>
        ) : (
          <div className="collections-content">
            
            {/* Visual Featured Collections Showcase Cards (Matching Reference Circular Design) */}
            {collections.length > 0 && (
              <div className="col-explore-showcase-section" data-aos="fade-up">
                <div className="col-explore-header">
                  <p className="col-explore-eyebrow">EXPLORE BY</p>
                  <h2 className="col-explore-title">
                    Explore Our <span className="col-explore-accent">Collection</span> <span className="col-explore-sparkle">✦</span>
                  </h2>
                </div>

                <div className="col-circle-showcase-grid">
                  {collections.map((col, idx) => {
                    const isSelected = currentActiveCol?.id === col.id;
                    return (
                      <div 
                        key={col.id} 
                        className={`col-circle-item ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectCollection(col)}
                        role="button"
                        tabIndex={0}
                        data-aos="fade-up"
                        data-aos-delay={idx * 60}
                      >
                        <div className="col-circle-frame">
                          {col.image ? (
                            <img 
                              src={IMG + col.image} 
                              alt={col.name} 
                              className="col-circle-img"
                              onError={(e) => { e.target.src = '/assests/pr1.jpeg'; }}
                            />
                          ) : (
                            <div className="col-circle-placeholder">✦</div>
                          )}
                          <div className="col-circle-overlay" />
                        </div>
                        <p className="col-circle-name">{col.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If a specific collection is selected */}
            {!isAllSelected && currentActiveCol && (() => {
              const colProds = getProductsForCollection(currentActiveCol);
              return (
                <section className="col-section" data-aos="fade-up">
                  <div className="col-section-header">
                    <div className="col-section-title-wrap">
                      <h2 className="col-section-title">{currentActiveCol.name}</h2>
                      <div className="col-section-bar"></div>
                    </div>
                    <button 
                      className="col-view-all-btn"
                      onClick={() => handleSelectCollection(null)}
                    >
                      <FiGrid /> View All Collections
                    </button>
                  </div>

                  {colProds.length > 0 ? (
                    <div className="col-products-grid">
                      {colProds.map(item => renderProductCard(item))}
                    </div>
                  ) : (
                    <div className="col-empty-state">
                      <h3>No items currently found in {currentActiveCol.name}.</h3>
                      <p>Explore our entire catalogue to discover exquisite jewellery.</p>
                      <Link to="/shop" className="col-empty-btn">Explore Shop</Link>
                    </div>
                  )}
                </section>
              );
            })()}

            {/* If All Collections is selected: Render sections for each collection */}
            {isAllSelected && (
              <>
                {collections.map(col => {
                  const colProds = getProductsForCollection(col);
                  if (colProds.length === 0) return null;

                  return (
                    <section className="col-section" key={col.id} data-aos="fade-up">
                      <div className="col-section-header">
                        <div className="col-section-title-wrap">
                          <h2 className="col-section-title">{col.name}</h2>
                          <div className="col-section-bar"></div>
                        </div>
                        <button 
                          className="col-view-all-btn"
                          onClick={() => handleSelectCollection(col)}
                        >
                          View Only {col.name} <FiArrowRight />
                        </button>
                      </div>

                      <div className="col-products-grid">
                        {colProds.slice(0, 10).map(item => renderProductCard(item))}
                      </div>
                    </section>
                  );
                })}

                {/* If no collections or 0 products matched in all collections */}
                {collections.length === 0 && (
                  <div className="col-empty-state">
                    <h3>No Collections Available</h3>
                    <p>New luxury collections will be released soon. Browse our complete catalogue in the meantime.</p>
                    <Link to="/shop" className="col-empty-btn">Explore Shop</Link>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </main>
  );
};

export default Collections;
