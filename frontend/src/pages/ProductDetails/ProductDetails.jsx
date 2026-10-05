import ReviewMedia from '../../components/OrderReviews/ReviewMedia';
import '../../components/OrderReviews/OrderReviews.css';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiHeart, FiShoppingCart, FiArrowRight, FiArrowLeft,
  FiEye, FiChevronDown, FiChevronUp, FiCheck,
  FiPackage, FiShield, FiTruck, FiZoomIn, FiX, FiStar, FiZap, FiPlay,
  FiMinus, FiPlus, FiAlertCircle
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { RiSparkling2Line, RiVideoLine, RiPlayCircleLine } from 'react-icons/ri';
import axios from 'axios';
import { ShopContext } from '../../context/ShopContext';
import './ProductDetails.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [mainImage, setMainImage] = useState('');
  const [activeMedia, setActiveMedia] = useState({ type: 'image', url: '' });
  const [imgRatio, setImgRatio] = useState(1);        // natural aspect ratio of the current image
  const [zoomOpen, setZoomOpen] = useState(false);
  const [activeSpec, setActiveSpec] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // specs | description | video | reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);

  const { addToCart, isProductInCart, toggleWishlist, isProductInWishlist } = useContext(ShopContext);

  useEffect(() => {
    let reviewsActive = true;
    setReviews([]);
    const fetchReviews = async (targetProductId, silent = false) => {
      const pId = targetProductId || id;
      if (!silent) setReviewsLoading(true);
      try {
        const revRes = await axios.get(`${API_BASE}/api/reviews/product/${pId}`);
        if (reviewsActive && Array.isArray(revRes.data)) {
          setReviews(revRes.data);
        }
      } catch (err) {
        console.error('Error fetching product reviews:', err);
      } finally {
        if (reviewsActive) setReviewsLoading(false);
      }
    };

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/api/products/${id}`);
        if (res.data && res.data.success !== false) {
          const p = res.data.product || res.data;
          setProduct(p);
          // If customer accessed via numeric id or un-normalized name, replace URL with clean slug
          if (p.slug && id !== p.slug) {
            navigate(`/product/${p.slug}`, { replace: true });
          }
          fetchReviews(p.id);
          // The first admin-created variant is the product's default choice.
          setSelectedVariant((p.variants || []).find(v => v.variantType && v.variantValue && v.status !== false) || null);
          const initImg = p.mainImage ? IMG + p.mainImage : '';
          setMainImage(initImg);
          setActiveMedia({ type: 'image', url: initImg });
          if (p.categoryId) {
            const relRes = await axios.get(`${API_BASE}/api/products/by-category/${p.categoryId}`);
            let arr = Array.isArray(relRes.data) ? relRes.data : (relRes.data.products || []);
            arr = arr.filter(x => x.id !== p.id).slice(0, 4);
            setRelatedProducts(arr);
          }
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
    const refresh = () => { if (!document.hidden && product?.id) fetchReviews(product.id, true); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { reviewsActive = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [id]);

  useEffect(() => {
    const refreshPrice = async () => {
      try {
        const { data } = await axios.get(API_BASE + '/api/products/' + id);
        setProduct(data);
        setSelectedVariant(previous => previous ? (data.variants || []).find(v => v.id === previous.id) || null : previous);
      } catch { /* Keep current view; checkout always validates on the server. */ }
    };
    window.addEventListener('promotions-changed', refreshPrice);
    return () => window.removeEventListener('promotions-changed', refreshPrice);
  }, [id]);

  // Close the zoom lightbox with Escape
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setZoomOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOpen]);

  // Reset quantity when changing product or variant (MUST be called before any early return)
  useEffect(() => {
    setQty(1);
  }, [id, selectedVariant?.id]);

  // Read the true width/height of whichever image is showing, so the
  // frame around it matches the photo instead of forcing a square and
  // letterboxing the rest with background color.
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setImgRatio(naturalWidth / naturalHeight);
    }
  };

  if (loading) return (
    <div className="pdp-page">
      <div className="pdp-loading"><div className="pdp-spinner" /><p>Loading…</p></div>
    </div>
  );
  if (error || !product) return (
    <div className="pdp-page">
      <div className="pdp-error">
        <p>{error || 'Product not found'}</p>
        <button onClick={() => navigate('/shop')}>Back to shop</button>
      </div>
    </div>
  );

  /* ── helpers ── */
  const selectableVariants = (product.variants || []).filter(v => v.variantType && v.variantValue && v.status !== false);
  const chosenProduct = selectedVariant ? {
    ...product,
    variantId: selectedVariant.id,
    variantLabel: `${selectedVariant.variantType}: ${selectedVariant.variantValue}`,
    mrpPrice: selectedVariant.mrpPrice,
    salesPrice: selectedVariant.salesPrice,
    stock: selectedVariant.stock,
    mainImage: selectedVariant.mainImage || product.mainImage
  } : product;

  const isOutOfStock = chosenProduct.stock !== undefined && chosenProduct.stock !== null && Number(chosenProduct.stock) <= 0;
  const isLowStock = !isOutOfStock && Number(chosenProduct.stock) <= 10;
  const preBookingQuota = Number(chosenProduct.preBookingQty) > 0 ? Number(chosenProduct.preBookingQty) : 5;
  const availableStock = Math.max(0, Number(chosenProduct.stock) || 0);
  const maxQty = isOutOfStock ? preBookingQuota : Math.max(1, availableStock);
  const hasDiscount = Boolean(chosenProduct.mrpPrice && chosenProduct.salesPrice != null && Number(chosenProduct.salesPrice) >= 0 && Number(chosenProduct.mrpPrice) > Number(chosenProduct.salesPrice));
  const finalPrice  = hasDiscount ? chosenProduct.salesPrice : (chosenProduct.salesPrice ?? chosenProduct.mrpPrice);
  const discountPct = hasDiscount
    ? Math.round(((Number(chosenProduct.mrpPrice) - Number(chosenProduct.salesPrice)) / Number(chosenProduct.mrpPrice)) * 100) : 0;

  const categoryName = product.category?.name || 'Jewellery';

  let thumbnails;
  try { thumbnails = Array.isArray(product.thumbnails) ? product.thumbnails : JSON.parse(product.thumbnails || '[]'); } catch (_) { thumbnails = []; }

  let specs;
  try { specs = Array.isArray(product.specifications) ? product.specifications : JSON.parse(product.specifications || '[]'); } catch (_) { specs = []; }

  /* all media for gallery strip (images + demo video) */
  const allMedia = [];
  if (product.mainImage) allMedia.push({ type: 'image', url: IMG + product.mainImage, label: 'Main View' });
  thumbnails.forEach((t, i) => {
    const u = typeof t === 'string' ? t : t.image;
    if (u) allMedia.push({ type: 'image', url: IMG + u, label: `Detail ${i + 1}` });
  });
  if (product.thumbVideo) {
    const vUrl = product.thumbVideo.startsWith('http') ? product.thumbVideo : `${IMG}${product.thumbVideo}`;
    allMedia.push({ type: 'video', url: vUrl, label: 'Product Video' });
  }

  const allImages = allMedia.filter(m => m.type === 'image').map(m => m.url);

  const badges = [];
  if (product.promotionSource === 'Deal of the Day') badges.push({ label: 'Deal of the Day', icon: <FiZap style={{ marginRight: '4px' }} />, cls: 'pdp-badge-deal' });
  if (product.promotionSource === 'Offer Banner')   badges.push({ label: 'Special Offer',   icon: <RiSparkling2Line style={{ marginRight: '4px' }} />, cls: 'pdp-badge-offer' });
  if (product.isBestSeller) badges.push({ label: 'Best seller', cls: 'pdp-badge-best' });
  if (product.isNewArrival) badges.push({ label: 'New arrival', cls: 'pdp-badge-new' });
  if (product.isTopRated)   badges.push({ label: 'Top rated',   cls: 'pdp-badge-top' });

  // Clamp the frame's aspect ratio to sane bounds so a very tall or very
  // wide photo doesn't distort the layout, while everything in between
  // renders at its true proportions (no cropping, no empty bars).
  const frameRatio = Math.min(Math.max(imgRatio, 0.7), 1.3);

  const effectiveReviewsCount = reviews.length;
  const effectiveAvgRating = reviews.length > 0
    ? Number((reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1))
    : 0;

  return (
    <main className="pdp-page">
      <div className="pdp-container">

        {/* ── Back Button ── */}
        <div className="pdp-breadcrumb">
          <button className="pdp-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* ══ MAIN SPLIT ══ */}
        <div className="pdp-layout">

          {/* LEFT — Gallery */}
          <div className="pdp-gallery-new">
            {allMedia.length > 1 && (
              <div className="pdp-thumbs-vertical">
                {allMedia.map((item, i) => (
                  <button
                    key={i}
                    className={`pdp-thumb-v ${activeMedia.url === item.url ? 'active' : ''} ${item.type === 'video' ? 'pdp-thumb-video-btn' : ''}`}
                    onClick={() => {
                      setActiveMedia(item);
                      if (item.type === 'image') setMainImage(item.url);
                    }}
                    aria-label={`View ${item.label || item.type}`}
                  >
                    {item.type === 'video' ? (
                      <div className="pdp-thumb-video-content">
                        <RiVideoLine className="pdp-thumb-vid-ico" />
                        <span>VIDEO</span>
                      </div>
                    ) : (
                      <img src={item.url} alt={`${product.name} view ${i + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="pdp-main-img-wrap" style={{ aspectRatio: frameRatio }}>
              {badges.length > 0 && (
                <div className="pdp-badge-stack">
                  {badges.map((b, i) => (
                    <span key={i} className={`pdp-badge ${b.cls}`}>
                      {b.icon}
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
              {activeMedia.type === 'video' ? (
                <div className="pdp-main-video-wrap">
                  <video
                    src={activeMedia.url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="pdp-main-video-player"
                  />
                  <div className="pdp-video-tag-pill">
                    <RiPlayCircleLine style={{ marginRight: '5px' }} /> Craftsmanship Video
                  </div>
                </div>
              ) : (activeMedia.url || mainImage) ? (
                <button
                  type="button"
                  className="pdp-main-img-btn"
                  onClick={() => setZoomOpen(true)}
                  aria-label="Open full-size image"
                >
                  <img
                    src={activeMedia.url || mainImage}
                    alt={product.name}
                    className="pdp-main-img"
                    onLoad={handleImageLoad}
                  />
                  <span className="pdp-zoom-hint"><FiZoomIn /> View full image</span>
                </button>
              ) : (
                <div className="pdp-no-img">✦</div>
              )}
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="pdp-info-col">
            <h1 className="pdp-title">{product.name}</h1>

            {/* Subtitle / Category & Video Chip */}
            <div className="pdp-category-video-row">
              <p className="pdp-category-line">
                <span>{product.category?.name || 'Heritage Collection'}</span>
              </p>
              {product.thumbVideo && (
                <button
                  type="button"
                  className="pdp-quick-video-chip"
                  onClick={() => {
                    const vUrl = product.thumbVideo.startsWith('http') ? product.thumbVideo : `${IMG}${product.thumbVideo}`;
                    setActiveMedia({ type: 'video', url: vUrl });
                    const gallery = document.querySelector('.pdp-gallery-new');
                    if (gallery) gallery.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  title="Play product video demo"
                >
                  <RiPlayCircleLine className="pdp-chip-ico" /> Watch Video
                </button>
              )}
            </div>


            {/* Active Deal / Offer Highlight Tag Banner */}
            {product.promotionSource === 'Deal of the Day' && (
              <div className="pdp-promo-highlight-banner deal">
                <div className="pdp-phb-left">
                  <span className="pdp-phb-badge"><FiZap style={{ marginRight: '5px' }} /> DEAL OF THE DAY</span>
                  <span className="pdp-phb-title">{product.promotionLabel || 'Limited Time Deal'}</span>
                </div>
                <div className="pdp-phb-right">
                  <span className="pdp-phb-tag">
                    {product.promotionDiscountType === 'FLAT' 
                      ? `FLAT ₹${Number(product.promotionDiscountValue).toLocaleString('en-IN')} OFF` 
                      : `${product.promotionDiscountValue}% OFF`}
                  </span>
                </div>
              </div>
            )}

            {product.promotionSource === 'Offer Banner' && (
              <div className="pdp-promo-highlight-banner offer">
                <div className="pdp-phb-left">
                  <span className="pdp-phb-badge"><RiSparkling2Line style={{ marginRight: '5px' }} /> SPECIAL OFFER</span>
                  <span className="pdp-phb-title">{product.promotionLabel || 'Exclusive Curated Promotion'}</span>
                </div>
                <div className="pdp-phb-right">
                  <span className="pdp-phb-tag">
                    {product.promotionDiscountType === 'FLAT'
                      ? `FLAT ₹${Number(product.promotionDiscountValue).toLocaleString('en-IN')} OFF`
                      : `${product.promotionDiscountValue}% OFF`}
                  </span>
                </div>
              </div>
            )}

            {selectableVariants.length > 0 && (
              <div className="pdp-variant-picker">
                <p className="pdp-variant-label">Choose {Array.from(new Set(selectableVariants.map(v => v.variantType))).join(' / ')} <span>*</span></p>
                <div className="pdp-variant-options">
                  {selectableVariants.map(variant => <button key={variant.id} type="button" onClick={() => setSelectedVariant(variant)} className={`pdp-variant-option ${selectedVariant?.id === variant.id ? 'active' : ''} ${Number(variant.stock) <= 0 ? 'out' : ''}`}>
                    {variant.variantValue}{Number(variant.stock) <= 0 ? ' · Pre-book' : ''}
                  </button>)}
                </div>
                {!selectedVariant && <small className="pdp-variant-required">Select an option to continue.</small>}
              </div>
            )}

            {/* Price */}
            <div className="pdp-price-row">
              <span className="pdp-price-final">₹{Number(finalPrice || 0).toLocaleString('en-IN')}</span>
              {hasDiscount ? (
                <>
                  <span className="pdp-price-mrp">₹{Number(chosenProduct.mrpPrice).toLocaleString('en-IN')}</span>
                  <span className="pdp-off-chip">{discountPct}% off</span>
                </>
              ) : null}
            </div>

            {/* Stock */}
            {isOutOfStock ? (
              <p className="pdp-stock out">
                <span>✦ Available for Pre-Booking</span>
              </p>
            ) : isLowStock ? (
              <p className="pdp-stock low">
                <FiAlertCircle /> Limited Stock Available
              </p>
            ) : (
              <p className="pdp-stock in">
                <FiCheck /> In Stock
              </p>
            )}

            {/* Short description (2 lines + expand) */}
            {product.description && (
              <div className="pdp-desc-block">
                <p className={`pdp-desc-text ${descExpanded ? 'expanded' : ''}`}>
                  {product.description}
                </p>
                {product.description.length > 120 && (
                  <button className="pdp-desc-toggle" onClick={() => setDescExpanded(p => !p)}>
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pdp-qty-wrapper">
              <div className="pdp-qty-row">
                <span className="pdp-qty-label">Quantity:</span>
                <div className="pdp-qty-controls">
                  <button
                    type="button"
                    className="pdp-qty-btn"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <FiMinus />
                  </button>
                  <span className="pdp-qty-display">{qty}</span>
                  <button
                    type="button"
                    className="pdp-qty-btn"
                    onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    aria-label="Increase quantity"
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>
              {qty >= maxQty && (
                <p className="pdp-qty-limit-notice">
                  Maximum available quantity reached
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pdp-actions">
              {isProductInCart(product.id, selectedVariant?.id) ? (
                <button className="pdp-btn-cart in-cart" onClick={() => navigate('/cart')}>
                  <FiShoppingCart /> In Cart &bull; Go to Cart
                </button>
              ) : isOutOfStock ? (
                <button 
                  className="pdp-btn-cart pdp-btn-preorder" 
                  disabled={selectableVariants.length > 0 && !selectedVariant}
                  onClick={() => addToCart({ ...chosenProduct, isPreorder: true }, qty)}
                >
                  <FiShoppingCart /> Add to Cart
                </button>
              ) : (
                <button 
                  className="pdp-btn-cart" 
                  disabled={selectableVariants.length > 0 && !selectedVariant} 
                  onClick={() => addToCart(chosenProduct, qty)}
                >
                  <FiShoppingCart /> Add to Cart
                </button>
              )}
              <button 
                className="pdp-btn-buy" 
                disabled={selectableVariants.length > 0 && !selectedVariant}
                onClick={() => navigate('/checkout', { state: { buyNowItem: { ...chosenProduct, quantity: qty, isPreorder: isOutOfStock } } })}
              >
                {isOutOfStock ? '✦ Pre-Book Now' : 'Buy Now'}
              </button>
              <button
                className={`pdp-btn-wish ${isProductInWishlist(product.id, selectedVariant?.id) ? 'wished active' : ''}`}
                disabled={selectableVariants.length > 0 && !selectedVariant}
                onClick={() => toggleWishlist(chosenProduct)}
                aria-label={isProductInWishlist(product.id, selectedVariant?.id) ? "Remove from wishlist" : "Add to wishlist"}
                title={isProductInWishlist(product.id, selectedVariant?.id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                {isProductInWishlist(product.id, selectedVariant?.id) ? (
                  <>
                    <FaHeart className="wish-heart-icon active" style={{ color: '#e53935', fill: '#e53935' }} />
                    <span className="pdp-wish-btn-label">Wishlisted</span>
                  </>
                ) : (
                  <>
                    <FiHeart className="wish-heart-icon" />
                    <span className="pdp-wish-btn-label">Add to Wishlist</span>
                  </>
                )}
              </button>
            </div>

            {/* Trust strip */}
            <div className="pdp-trust">
              <div className="trust-cell"><FiPackage /><span>Secure packaging</span></div>
              <div className="trust-cell"><FiTruck /><span>Fast delivery</span></div>
            </div>
          </div>
        </div>

        {/* ══ TABBED INFO ══ */}
        <section className="pdp-tabs-section">
          <div className="pdp-tabs-nav" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'specs'}
              className={`pdp-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              Specifications
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'description'}
              className={`pdp-tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            {product.thumbVideo && (
              <button
                role="tab"
                aria-selected={activeTab === 'video'}
                className={`pdp-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <RiVideoLine style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Video Showcase
              </button>
            )}
            <button
              role="tab"
              aria-selected={activeTab === 'reviews'}
              className={`pdp-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews {effectiveReviewsCount > 0 ? `(${effectiveReviewsCount})` : ''}
            </button>
          </div>

          <div className="pdp-tab-panel">
            {activeTab === 'specs' && (
              specs.length > 0 ? (
                <div className="pdp-spec-list">
                  {specs.map((spec, i) => {
                    if (!spec.heading && !spec.description) return null;
                    return (
                      <div key={i} className={`pdp-spec-item ${activeSpec === i ? 'open' : ''}`}>
                        <button className="pdp-spec-trigger" onClick={() => setActiveSpec(activeSpec === i ? null : i)}>
                          <span>{spec.heading || `Detail ${i + 1}`}</span>
                          {activeSpec === i ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                        <div className="pdp-spec-body">
                          <p>{spec.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="pdp-strip-empty">No specifications added yet.</p>
              )
            )}

            {activeTab === 'description' && (
              product.description
                ? <p className="pdp-strip-desc">{product.description}</p>
                : <p className="pdp-strip-empty">No description added.</p>
            )}

            {activeTab === 'video' && product.thumbVideo && (
              <div className="pdp-tab-video-showcase">
                <div className="pdp-tab-video-header">
                  <h4>✦ Live Craftsmanship &amp; Details Demo</h4>
                  <p>Experience the brilliant sparkle, intricate craftsmanship, and luxurious finishing of this piece in high definition.</p>
                </div>
                <div className="pdp-tab-video-frame">
                  <video
                    src={product.thumbVideo.startsWith('http') ? product.thumbVideo : `${IMG}${product.thumbVideo}`}
                    controls
                    autoPlay
                    playsInline
                    className="pdp-tab-video-element"
                  />
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="pdp-reviews-wrap">
                {reviewsLoading ? (
                  <p className="pdp-strip-empty">Loading customer reviews...</p>
                ) : reviews.length > 0 ? (
                  <div className="pdp-reviews-list">
                    {reviews.map((rev) => (
                      <div className="pdp-review-card" key={rev.id}>
                        <div className="pdp-review-card-head">
                          <div className="pdp-reviewer-meta">
                            <strong className="pdp-reviewer-name">
                              {(rev.reviewerName || rev.customerInfo?.name || 'Verified Buyer')
                                .replace(/\s*(registered|guest)\s*customer/gi, '')
                                .trim() || 'Verified Buyer'}
                            </strong>
                            <span className="pdp-review-date">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                            </span>
                          </div>
                          <div className="pdp-review-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <FiStar
                                key={s}
                                className={s <= Number(rev.rating) ? 'star-filled' : 'star-empty'}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="pdp-review-text">{rev.feedback}</p>
                        <ReviewMedia value={rev.images} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pdp-review-placeholder">
                    <p className="pdp-review-msg">No customer reviews yet — be the first to share your thoughts on this piece.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══ RELATED PRODUCTS ══ */}
        <section className="pdp-related">
          <div className="pdp-related-head">
            <div>
              <p className="pdp-rel-eyebrow">More from {categoryName}</p>
              <h2 className="pdp-rel-title">You may also like</h2>
            </div>
          </div>

          <div className="pdp-rel-grid">
            {relatedProducts.length > 0 ? (
              relatedProducts.map(prod => {
                const mrp = Number(prod.mrpPrice) || 0;
                const sales = Number(prod.salesPrice ?? prod.mrpPrice ?? 0);
                const hasDiscount = mrp > 0 && sales >= 0 && mrp > sales;
                const discountPercent = hasDiscount ? Math.round(((mrp - sales) / mrp) * 100) : 0;
                const finalPrice = sales >= 0 ? sales : mrp;
                const isOutOfStock = prod.stock !== undefined && prod.stock !== null && Number(prod.stock) <= 0;
                const inCart = isProductInCart(prod.id);
                const isWishlisted = isProductInWishlist(prod.id);

                return (
                  <div key={prod.id} className="bb-card">
                    {/* Media / Image Box */}
                    <div 
                      className="bb-media" 
                      tabIndex={0} 
                      onClick={() => navigate(`/product/${prod.slug || prod.id}`)}
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

                      {/* Wishlist Button */}
                      <button 
                        type="button" 
                        className={`bb-wish-btn ${isWishlisted ? 'active' : ''}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(prod);
                        }} 
                        aria-label="Save to wishlist"
                        title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 20s-7.5-4.6-10-9.2C0.4 7.6 2 4 5.6 4c2 0 3.5 1.1 4.4 2.6C10.9 5.1 12.4 4 14.4 4 18 4 19.6 7.6 18 10.8 15.5 15.4 12 20 12 20z" />
                        </svg>
                      </button>

                      {/* Product Image */}
                      {prod.mainImage ? (
                        <img 
                          src={IMG + prod.mainImage} 
                          alt={prod.name} 
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
                            navigate(`/product/${prod.slug || prod.id}`);
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
                      onClick={() => navigate(`/product/${prod.slug || prod.id}`)}
                    >
                      <p className="bb-mat">{prod.category?.name || categoryName || 'Jewellery'}</p>
                      <h3 className="bb-name">{prod.name}</h3>
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
                          onClick={() => addToCart({ ...prod, isPreorder: true })}
                          title="Item is out of stock - Click to Pre-Book"
                        >
                          ✦ Pre-Book Now
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          className="bb-add-btn" 
                          onClick={() => addToCart(prod)}
                        >
                          Add to cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="pdp-rel-empty">No other products in this category yet.</p>
            )}
          </div>

          <div className="pdp-view-all-wrap">
            <Link to="/shop" className="pdp-view-all-btn">
              View all products <FiArrowRight />
            </Link>
          </div>
        </section>

      </div>

      {/* ══ FULL-IMAGE ZOOM LIGHTBOX ══ */}
      {zoomOpen && mainImage && (
        <div className="pdp-lightbox" onClick={() => setZoomOpen(false)}>
          <button className="pdp-lightbox-close" onClick={() => setZoomOpen(false)} aria-label="Close">
            <FiX />
          </button>
          <img
            src={mainImage}
            alt={product.name}
            className="pdp-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
};

export default ProductDetails;
