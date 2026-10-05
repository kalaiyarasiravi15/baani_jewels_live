import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiShoppingCart, FiArrowRight, FiHeart } from 'react-icons/fi';
import { ShopContext } from '../../context/ShopContext';
import PageBanner from '../../components/PageBanner/PageBanner';
import './Wishlist.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, addToCart, isProductInCart } = useContext(ShopContext);
  const navigate = useNavigate();

  return (
    <div className="wishlist-page">
      <PageBanner title="Your Wishlist" trail="Wishlist" />
      <div className="container wishlist-container">
        <div className="wishlist-header" data-aos="fade-down">
          <p className="wishlist-count-text">
            You have <strong>{wishlistItems.length}</strong> saved {wishlistItems.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="empty-wishlist" data-aos="fade-up">
            <div className="empty-icon-circle"><FiHeart /></div>
            <h2>Your wishlist is empty</h2>
            <p>Save your favorite bridal, antique, and daily wear designs to easily find and purchase them anytime.</p>
            <Link to="/shop" className="btn-continue-shopping">
              Explore Collections <FiArrowRight />
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid" data-aos="fade-up">
            {wishlistItems.map((item) => {
              const mrp = Number(item.mrpPrice) || Number(item.price) || 0;
              const sales = Number(item.salesPrice ?? item.mrpPrice ?? 0);
              const hasDiscount = mrp > 0 && sales >= 0 && mrp > sales;
              const discountPercent = hasDiscount ? Math.round(((mrp - sales) / mrp) * 100) : 0;
              const finalPrice = sales >= 0 ? sales : mrp;
              const isOutOfStock = item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0;
              const inCart = isProductInCart(item.id);
              const imgSrc = item.mainImage ? IMG + item.mainImage : item.image;
              const catName = item.category?.name || (Array.isArray(item.categories) ? item.categories[0] : 'Jewellery');

              return (
                <div className="bb-card" key={item.id}>
                  {/* Media / Image Box */}
                  <div 
                    className="bb-media" 
                    tabIndex={0} 
                    onClick={() => navigate(`/product/${item.slug || item.id}`)}
                  >
                    {discountPercent > 0 && (
                      <div className="bb-discount-badge">
                        {discountPercent}% OFF
                      </div>
                    )}

                    {isOutOfStock && (
                      <div className="bb-stock-badge">
                        OUT OF STOCK
                      </div>
                    )}

                    {/* Remove from Wishlist Button */}
                    <button 
                      type="button" 
                      className="bb-wish-btn active" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(item.id);
                      }} 
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <FiTrash2 style={{ width: '14px', height: '14px', color: '#c53030' }} />
                    </button>

                    {imgSrc ? (
                      <img 
                        src={imgSrc} 
                        alt={item.name} 
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
                          navigate(`/product/${item.slug || item.id}`);
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
                    onClick={() => navigate(`/product/${item.slug || item.id}`)}
                  >
                    <p className="bb-mat">{catName}</p>
                    <h3 className="bb-name">{item.name}</h3>
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
                        onClick={() => addToCart({ ...item, isPreorder: true })}
                        title="Item is out of stock - Click to Pre-Book"
                      >
                        ✦ Pre-Book Now
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        className="bb-add-btn" 
                        onClick={() => addToCart(item)}
                      >
                        <FiShoppingCart style={{ marginRight: '5px' }} />
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default Wishlist;
