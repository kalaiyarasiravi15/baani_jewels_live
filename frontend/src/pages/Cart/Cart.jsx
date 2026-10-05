import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiArrowRight, FiZap, FiShoppingBag, FiGlobe, FiMinus, FiPlus } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { RiSparkling2Line } from 'react-icons/ri';
import { ShopContext } from '../../context/ShopContext';
import PageBanner from '../../components/PageBanner/PageBanner';
import './Cart.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, customer } = useContext(ShopContext);
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    navigate('/checkout');
  };

  const cartIntlWhatsAppMessage = [
    'Hello Baani Jewellery,',
    'I would like to place an order for international delivery. Please provide the shipping details and quote.',
    '',
    'Cart Items:',
    ...cartItems.map((item, index) => {
      const name = item.name || item.productName || 'Jewellery item';
      const quantity = Number(item.quantity || 1);
      const variant = item.variantLabel || item.variantName || '';
      const unitPrice = Number(item.finalPrice ?? item.salesPrice ?? item.price ?? 0);
      const itemTotal = unitPrice * quantity;
      return `${index + 1}. ${name}${variant ? ` (${variant})` : ''} × ${quantity}${itemTotal > 0 ? ` - ₹${itemTotal.toLocaleString('en-IN')}` : ''}`;
    }),
    '',
    `Total: ₹${Number(cartTotal).toLocaleString('en-IN')}`,
    '',
    'Thank you!'
  ].filter(Boolean).join('\n');

  const totalQuantity = cartItems.reduce((acc, item) => acc + Math.max(1, Number(item.quantity || 1)), 0);

  return (
    <div className="cart-page">
      <PageBanner title="Your Shopping Cart" trail="Cart" />
      <div className="container">
        <div className="cart-header" data-aos="fade-down">
          <p>{totalQuantity} item{totalQuantity === 1 ? '' : 's'} in your bag</p>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart" data-aos="fade-up">
            <div className="empty-icon-circle"><FiShoppingBag /></div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any handcrafted jewellery pieces to your cart yet.</p>
            <Link to="/shop" className="btn-continue-shopping">
              Start Shopping <FiArrowRight />
            </Link>
          </div>
        ) : (
          <div className="cart-content" data-aos="fade-up">
            <div className="cart-items">
              <div className="cart-items-header">
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Action</span>
              </div>

              {cartItems.map((item) => {
                const finalPrice = item.salesPrice ?? item.mrpPrice ?? item.price ?? 0;
                const imgSrc = item.mainImage ? IMG + item.mainImage : item.image;
                const catName = item.category?.name || item.categories?.[0] || 'Jewellery';
                const currentQty = Math.max(1, Number(item.quantity || 1));
                const maxStock = Number(item.stock || 0);
                const itemId = item.id || item.productId;

                return (
                  <div className="cart-item" key={`${itemId}-${item.variantId || 'base'}`}>
                    <div className="cart-item-product">
                      <img src={imgSrc} alt={item.name} />
                      <div className="cart-item-product-info">
                        <h4 title={item.name}>
                          {item.name}
                          {item.promotionSource === 'Deal of the Day' && (
                            <span className="cart-promo-tag deal">
                              <FiZap style={{ marginRight: '4px' }} /> {item.promotionLabel || 'Deal of Day'} · {item.promotionDiscountType === 'FLAT' ? `₹${Number(item.promotionDiscountValue || 0).toLocaleString('en-IN')} OFF` : `${item.promotionDiscountValue || item.discountPercentage || 0}% OFF`}
                            </span>
                          )}
                          {item.promotionSource === 'Offer Banner' && (
                            <span className="cart-promo-tag offer">
                              <RiSparkling2Line style={{ marginRight: '4px' }} /> {item.promotionLabel || 'Special Offer'} · {item.promotionDiscountType === 'FLAT' ? `₹${Number(item.promotionDiscountValue || 0).toLocaleString('en-IN')} OFF` : `${item.promotionDiscountValue || item.discountPercentage || 0}% OFF`}
                            </span>
                          )}
                          {(item.isPreorder || (item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0)) && (
                            <span style={{
                              display: 'inline-block',
                              marginLeft: '8px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              textTransform: 'uppercase'
                            }}>
                              Pre-Booking
                            </span>
                          )}
                        </h4>
                        <p>{catName}</p>
                        {item.variantLabel && <p style={{ color: '#8a6d3b', fontSize: '12px', marginTop: '3px' }}>{item.variantLabel}</p>}
                      </div>
                    </div>
                    <div className="cart-item-price">
                      <span className="cip-current">₹{Number(finalPrice * currentQty).toLocaleString('en-IN')}</span>
                      {item.mrpPrice && Number(item.mrpPrice) > Number(finalPrice) && (
                        <span className="cip-original">₹{Number(item.mrpPrice * currentQty).toLocaleString('en-IN')}</span>
                      )}
                      {currentQty > 1 && (
                        <span className="cip-unit">(₹{Number(finalPrice).toLocaleString('en-IN')} each)</span>
                      )}
                    </div>
                    <div className="cart-item-quantity">
                      <div className="qty-control" aria-label="Quantity selector">
                        <button
                          type="button"
                          className="qty-btn qty-dec"
                          onClick={() => {
                            if (currentQty > 1) {
                              updateQuantity(itemId, item.variantId, currentQty - 1);
                            } else {
                              removeFromCart(itemId, item.variantId);
                            }
                          }}
                          title={currentQty <= 1 ? "Remove item" : "Decrease quantity"}
                          aria-label="Decrease quantity"
                        >
                          <FiMinus />
                        </button>
                        <span className="qty-display" aria-live="polite">{currentQty}</span>
                        <button
                          type="button"
                          className="qty-btn qty-inc"
                          onClick={() => {
                            if (maxStock > 0 && currentQty >= maxStock) return;
                            updateQuantity(itemId, item.variantId, currentQty + 1);
                          }}
                          disabled={maxStock > 0 && currentQty >= maxStock}
                          title={maxStock > 0 && currentQty >= maxStock ? "Maximum available stock reached" : "Increase quantity"}
                          aria-label="Increase quantity"
                        >
                          <FiPlus />
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-action">
                      <button className="btn-remove" onClick={() => removeFromCart(itemId, item.variantId)}>
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h3>Order summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <button className="btn-checkout" onClick={handleProceedToCheckout}>
                Proceed to checkout
              </button>

              <div className="cart-intl-card">
                <div className="cart-intl-header">
                  <FiGlobe className="cart-intl-icon" />
                  <div>
                    <h4 className="cart-intl-title">International Orders?</h4>
                    <p className="cart-intl-sub">Worldwide delivery via DHL / FedEx</p>
                  </div>
                </div>
                <p className="cart-intl-text">
                  For deliveries outside India, proceed directly via our WhatsApp Concierge.
                </p>
                <a
                  href={`https://wa.me/919345322621?text=${encodeURIComponent(cartIntlWhatsAppMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cart-btn-intl-whatsapp"
                >
                  <FaWhatsapp style={{ fontSize: '18px', color: '#25D366' }} /> Proceed to WhatsApp Checkout
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
