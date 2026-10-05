import React, { useState, useEffect, useContext } from 'react';
import usePromotionRevision from '../../hooks/usePromotionRevision';
import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiZap } from 'react-icons/fi';
import { RiSparkling2Line } from 'react-icons/ri';
import axios from 'axios';
import { ShopContext } from '../../context/ShopContext';
import './ProductSection.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const tabs = [
  { name: "New Arrivals", key: "newArrivals" },
  { name: "Best Sellers", key: "bestSellers" },
  { name: "Top Rated",    key: "topRated" }
];

const ProductSection = () => {
  const promotionRevision = usePromotionRevision();
  const [activeTab, setActiveTab] = useState(tabs[0].name);
  const [productsData, setProductsData] = useState({});
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { addToCart, isProductInCart, toggleWishlist, isProductInWishlist } = useContext(ShopContext);

  useEffect(() => {
    const fetchAllCollections = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/collections/all`);
        const data = res.data || {};
        const formatList = (arr) => (Array.isArray(arr) ? arr : [])
          .map(item => item.product || item.Product || item)
          .filter(p => p && p.id && p.name && p.status !== false);

        const loaded = {
          "New Arrivals": formatList(data.newArrivals),
          "Best Sellers": formatList(data.bestSellers),
          "Top Rated":    formatList(data.topRated)
        };
        setProductsData(loaded);

        // If the default activeTab is empty, switch to the first tab that has products
        const firstAvailableTab = tabs.find(t => (loaded[t.name] || []).length > 0);
        if (firstAvailableTab) {
          setActiveTab(firstAvailableTab.name);
        }
      } catch (err) {
        console.error('Error fetching collections:', err);
        setProductsData({});
      } finally {
        setLoading(false);
      }
    };

    fetchAllCollections();
  }, [promotionRevision]);

  const totalProducts = Object.values(productsData).reduce((sum, list) => sum + (list ? list.length : 0), 0);
  if (!loading && totalProducts === 0) return null;

  const currentProducts = productsData[activeTab] || [];

  return (
    <div className="product-section">
      <div className="product-header" data-aos="fade-down">
        <h4 className="product-subtitle">UNVEIL YOUR PERFECT GEM</h4>
        <div className="product-title-wrapper">
          <h2 className="product-title">Choose Your Ideal Jewel</h2>
        </div>
      </div>

      <div className="product-tabs" data-aos="fade-up">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            className={`tab-btn ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {loading && <div className="bb-grid-msg">Curating luxury gems...</div>}
        {!loading && currentProducts.length === 0 && (
          <div className="bb-grid-msg">No products found in this collection.</div>
        )}
        {!loading && currentProducts.map((product) => {
           const mrp = Number(product.mrpPrice) || 0;
           const sales = Number(product.salesPrice ?? product.mrpPrice ?? 0);
           const hasDiscount = mrp > 0 && sales >= 0 && mrp > sales;
           const discountPercent = hasDiscount ? Math.round(((mrp - sales) / mrp) * 100) : 0;
           const finalPrice = sales >= 0 ? sales : mrp;
           const isOutOfStock = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;

           const isWishlisted = isProductInWishlist(product.id);
           const inCart = isProductInCart(product.id);

           return (
            <div key={product.id} className="bb-card" data-aos="fade-up">
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
                    onError={(e) => { e.target.style.display = 'none'; }}
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
                      navigate(`/product/${product.slug || product.id}`, { state: { product: { ...product, categories: [activeTab] } } });
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
                <p className="bb-mat">{product.category?.name || activeTab || 'Jewellery'}</p>
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
                    onClick={() => addToCart({ ...product, isPreorder: true, categories: [activeTab] })}
                    title="Item is out of stock - Click to Pre-Book"
                  >
                    ✦ Pre-Book Now
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="bb-add-btn" 
                    onClick={() => addToCart({ ...product, categories: [activeTab] })}
                  >
                    Add to cart
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductSection;
