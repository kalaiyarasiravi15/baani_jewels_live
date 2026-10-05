import { getSession, savePreference } from '../../config/sessionClient';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiZap, FiCheck, FiX, FiTag, FiArrowRight, 
  FiAward, FiShield, FiClock, FiShoppingBag 
} from 'react-icons/fi';
import { 
  RiSparkling2Line, RiCoupon3Line, RiFileCopyLine, 
  RiFireFill, RiGiftLine, RiGift2Fill, RiTicket2Fill 
} from 'react-icons/ri';
import './AnnouncementBar.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const AnnouncementBar = () => {
  const [messages, setMessages] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [activeDeal, setActiveDeal] = useState(null);
  const [isDealPopupOpen, setIsDealPopupOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const [dealsRes, offersRes, couponsRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/deals/active`),
          axios.get(`${API_BASE}/api/offer-banners/all`),
          axios.get(`${API_BASE}/api/coupons/list`)
        ]);

        const items = [];

        // 1. Deals of the Day (Dynamic live from DB)
        if (dealsRes.status === 'fulfilled' && dealsRes.value?.data) {
          const list = Array.isArray(dealsRes.value.data)
            ? dealsRes.value.data
            : (dealsRes.value.data.deals || []);
          const activeDeals = list.filter(d => d.isActive !== false);

          if (activeDeals.length > 0) {
            const topDeal = activeDeals[0];
            setActiveDeal(topDeal);
            // Open deal popup banner on initial website visit until user closes it
            const hasDismissed = getSession()?.preferences?.dealDismissed;
            if (!hasDismissed) {
              setIsDealPopupOpen(true);
            }
          }

          activeDeals.forEach(d => {
            const val = Number(d.discountValue || d.discountPercentage || 0);
            const isFlat = d.discountType === 'FLAT';
            const cleanTitle = (d.title || '')
              .replace(/^deal of the day\s*[:–-]?\s*/i, '')
              .trim();
            
            let text = '';
            if (isFlat && val > 0) {
              text = cleanTitle
                ? `${cleanTitle} — Flat ₹${val.toLocaleString('en-IN')} OFF for your purchase • Offer Now!`
                : `Flat ₹${val.toLocaleString('en-IN')} OFF for your purchase — Offer Now!`;
            } else if (val > 0) {
              text = cleanTitle
                ? `${cleanTitle} — Deal Live: Get ${val}% OFF for your purchase • Offer Now!`
                : `Deal Live — Get ${val}% OFF for your purchase • Offer Now!`;
            } else {
              text = `${cleanTitle || d.title || 'Special Deal'} — Offer Now!`;
            }

            items.push({
              type: 'deal',
              iconType: 'deal',
              tagLabel: 'DEAL LIVE',
              text,
              rawDeal: d,
              link: d.buttonLink || (d.targetProductId ? `/product/${d.targetProductId}` : '/shop')
            });
          });
        }

        // 2. Active Offer Banners (Dynamic live from DB)
        if (offersRes.status === 'fulfilled' && offersRes.value?.data) {
          const list = Array.isArray(offersRes.value.data)
            ? offersRes.value.data
            : (offersRes.value.data.offerBanners || []);
          list.filter(o => o.status !== false).slice(0, 4).forEach(o => {
            const val = Number(o.discountValue || o.discountPercentage || 0);
            const isFlat = o.discountType === 'FLAT';
            const rawTag = o.discountTag?.trim();
            const tagLabel = rawTag ? rawTag.toUpperCase() : 'OFFER NOW';

            let text = '';
            if (isFlat && val > 0) {
              text = o.title 
                ? `${o.title} — Flat ₹${val.toLocaleString('en-IN')} OFF for your purchase • Offer Now!`
                : `Flat ₹${val.toLocaleString('en-IN')} OFF for your purchase — Offer Now!`;
            } else if (val > 0) {
              text = o.title
                ? `${o.title} — Deal Live: Get ${val}% OFF for your purchase • Offer Now!`
                : `Deal Live — Get ${val}% OFF for your purchase • Offer Now!`;
            } else {
              text = `${o.title || 'Special Festive Offer'} — Offer Now!`;
            }

            items.push({
              type: 'offer',
              iconType: 'offer',
              tagLabel,
              text,
              link: o.link || (o.productId ? `/product/${o.productId}` : '/shop')
            });
          });
        }

        // 3. Coupons list for the Available Coupons Modal & Ticker Highlights
        let activeCoupons = [];
        if (couponsRes.status === 'fulfilled' && couponsRes.value?.data) {
          const cList = Array.isArray(couponsRes.value.data)
            ? couponsRes.value.data
            : (couponsRes.value.data.coupons || []);
          activeCoupons = cList.filter(c => c.status !== false);
          setCouponsList(activeCoupons);
        } else {
          const fallbackRes = await axios.get(`${API_BASE}/api/coupons/all`).catch(() => null);
          if (fallbackRes?.data) {
            const arr = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data.coupons || []);
            activeCoupons = arr.filter(c => c.status !== false);
            setCouponsList(activeCoupons);
          }
        }

        // Optional: include top active coupon in ticker if available
        if (activeCoupons.length > 0) {
          const topCoupon = activeCoupons[0];
          const isFlatCoupon = String(topCoupon.type || '').toLowerCase() === 'flat';
          const cVal = Number(topCoupon.discountValue || 0);
          if (cVal > 0) {
            items.push({
              type: 'coupon',
              iconType: 'coupon',
              tagLabel: 'COUPON',
              text: isFlatCoupon 
                ? `Use Code ${topCoupon.code} — Flat ₹${cVal.toLocaleString('en-IN')} OFF on your purchase!`
                : `Use Code ${topCoupon.code} — Get ${cVal}% OFF for your purchase!`,
              isCouponAction: true
            });
          }
        }

        // 4. Core Brand USP: Luxury Made Affordable
        items.push({
          type: 'luxury',
          iconType: 'luxury',
          tagLabel: 'LUXURY',
          text: 'Luxury Made Affordable',
          link: '/about'
        });

        setMessages(items);
      } catch (err) {
        console.error('Error fetching announcement data:', err);
      }
    };

    fetchPromos();
  }, []);

  // Countdown timer for active deal
  useEffect(() => {
    if (!activeDeal || !activeDeal.expiryDate) return;
    const interval = setInterval(() => {
      const diff = new Date(activeDeal.expiryDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const hours = Math.floor((diff / (1000 * 60 * 60)));
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeDeal]);

  const brandUsps = [
    { type: 'luxury', iconType: 'luxury', tagLabel: 'LUXURY', text: 'Luxury Made Affordable', link: '/about' },
    { type: 'offer', iconType: 'offer', tagLabel: 'OFFER NOW', text: 'Discover Elegant Jewellery at Affordable Luxury', link: '/shop' }
  ];

  const displayList = messages.length > 0 ? messages : brandUsps;
  const marqueeItems = [...displayList, ...displayList, ...displayList];

  const renderIcon = (type) => {
    switch (type) {
      case 'deal':
        return <FiZap className="ann-react-icon deal-icon" />;
      case 'offer':
        return <FiTag className="ann-react-icon offer-icon" />;
      case 'coupon':
        return <RiCoupon3Line className="ann-react-icon coupon-icon" />;
      case 'luxury':
        return <RiSparkling2Line className="ann-react-icon luxury-icon" />;
      case 'artisan':
        return <FiAward className="ann-react-icon artisan-icon" />;
      default:
        return <RiSparkling2Line className="ann-react-icon check-icon" />;
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const closeDealPopup = () => {
    setIsDealPopupOpen(false);
    savePreference('dealDismissed', true).catch(() => {});
  };

  const handleClaimDeal = () => {
    closeDealPopup();
    if (activeDeal) {
      const target = activeDeal.buttonLink || (activeDeal.targetProductId ? `/product/${activeDeal.targetProductId}` : (activeDeal.targetProduct?.id ? `/product/${activeDeal.targetProduct.id}` : '/shop'));
      navigate(target);
    } else {
      navigate('/shop');
    }
  };

  return (
    <>
      <div className="announcement-top-bar">
        <div className="announcement-bar-inner">
          
          {/* Continuous Running Marquee Ticker (Only Deals, Offers, USPs) */}
          <div className="announcement-ticker-wrap">
            <div className="announcement-track">
              {marqueeItems.map((item, i) => (
                <span
                  key={i}
                  className={`announcement-pill ${item.type}`}
                  onClick={() => {
                    if (item.type === 'deal' && item.rawDeal) {
                      setActiveDeal(item.rawDeal);
                      setIsDealPopupOpen(true);
                    } else if (item.isCouponAction) {
                      setIsModalOpen(true);
                    } else if (item.link) {
                      navigate(item.link);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`ann-tag-chip ${item.type}`}>
                    {renderIcon(item.iconType)}
                    <span className="ann-tag-label">{item.tagLabel}</span>
                  </span>
                  <span className="ann-text">{item.text}</span>
                  <span className="ann-divider">✦</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right Action: Available Coupons Button */}
          <div className="announcement-right-badges">
            <button
              className="ann-coupons-btn"
              onClick={() => setIsModalOpen(true)}
              title="Click to view all available coupons & promo codes"
              type="button"
            >
              <RiGift2Fill className="btn-icon coupon-gift-icon" />
              <span>Available Coupons</span>
              {couponsList.length > 0 && (
                <span className="ann-coupon-badge">{couponsList.length}</span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ── Active Deal of the Day Popup Banner Modal ── */}
      {isDealPopupOpen && activeDeal && (
        <div className="ann-deal-popup-overlay" onClick={closeDealPopup}>
          <div 
            className="ann-deal-popup-card" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button 
              className="ann-deal-close-btn" 
              onClick={closeDealPopup}
              aria-label="Close deal popup"
              title="Close"
            >
              <FiX />
            </button>

            <div className="ann-deal-popup-grid">
              {/* Left: Product / Deal Image */}
              <div className="ann-deal-popup-media">
                <div className="ann-deal-img-wrap">
                  <img 
                    src={
                      activeDeal.image 
                        ? (activeDeal.image.startsWith('http') || activeDeal.image.startsWith('/') ? activeDeal.image : `${IMG}${activeDeal.image}`)
                        : (activeDeal.targetProduct?.mainImage ? `${IMG}${activeDeal.targetProduct.mainImage}` : '/assests/pr4.jpeg')
                    } 
                    alt={activeDeal.title || 'Exclusive Deal'}
                    className="ann-deal-main-img"
                    onError={(e) => { e.target.src = '/assests/pr4.jpeg'; }}
                  />
                  <div className="ann-deal-flash-badge">
                    <FiZap /> LIMITED DEAL
                  </div>
                </div>
              </div>

              {/* Right: Deal Details & Action */}
              <div className="ann-deal-popup-info">
                <div className="ann-deal-eyebrow">
                  <RiSparkling2Line /> TODAY'S EXCLUSIVE OFFER
                </div>
                
                <h3 className="ann-deal-title">{activeDeal.title || 'Special Deal of the Day'}</h3>
                
                <p className="ann-deal-desc">
                  {activeDeal.description || 'Grab this jewellery piece at an unbeatable special price. Limited time only!'}
                </p>

                {/* Discount Tag */}
                <div className="ann-deal-discount-badge">
                  <FiTag />
                  <span>
                    {activeDeal.discountType === 'FLAT' 
                      ? `FLAT ₹${Number(activeDeal.discountValue || 0).toLocaleString('en-IN')} OFF` 
                      : `${Number(activeDeal.discountValue || activeDeal.discountPercentage || 0)}% OFF DISCOUNT`}
                  </span>
                </div>

                {/* Countdown Timer */}
                {activeDeal.expiryDate && (
                  <div className="ann-deal-timer-wrap">
                    <span className="timer-label"><FiClock /> Ends in:</span>
                    <div className="timer-boxes">
                      <div className="timer-box">
                        <span className="timer-val">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="timer-unit">HRS</span>
                      </div>
                      <span className="timer-colon">:</span>
                      <div className="timer-box">
                        <span className="timer-val">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="timer-unit">MIN</span>
                      </div>
                      <span className="timer-colon">:</span>
                      <div className="timer-box">
                        <span className="timer-val">{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="timer-unit">SEC</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Claim CTA */}
                <div className="ann-deal-actions">
                  <button className="ann-deal-claim-btn" onClick={handleClaimDeal}>
                    <FiShoppingBag />
                    <span>Claim Deal &amp; Shop Now</span>
                    <FiArrowRight />
                  </button>
                  <button className="ann-deal-dismiss-btn" onClick={closeDealPopup}>
                    Continue to Website
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Coupons Modal Popup */}
      {isModalOpen && (
        <div className="ann-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="ann-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="ann-modal-header">
              <div className="ann-modal-title-group">
                <div className="ann-modal-badge">
                  <RiCoupon3Line /> Exclusive Offers
                </div>
                <h3>Available Store Coupons</h3>
                <p>Click any coupon code below to copy and apply instantly at checkout!</p>
              </div>
              <button
                className="ann-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </div>

            {/* Modal Body: Coupon List */}
            <div className="ann-modal-body">
              {couponsList.length === 0 ? (
                <div className="ann-no-coupons">
                  <RiSparkling2Line className="empty-sparkle-icon" />
                  <h4>No Active Coupons Right Now</h4>
                  <p>Check back during festive collections and seasonal sales for special codes!</p>
                </div>
              ) : (
                <div className="ann-coupons-grid">
                  {couponsList.map((coupon) => {
                    const isPercentage = String(coupon.type || coupon.discountType || '').toLowerCase() === 'percentage';
                    const val = Number(coupon.discountValue || 0);
                    const discountDisplay = isPercentage ? `${val}% OFF` : `₹${val.toLocaleString('en-IN')} OFF`;
                    const minOrder = Number(coupon.minOrderAmount || coupon.minimumOrderAmount || 0);
                    const maxOrder = Number(coupon.maxOrderAmount || 0);
                    const isCopied = copiedCode === coupon.code;

                    return (
                      <div key={coupon.id || coupon.code} className="ann-coupon-card">
                        <div className="ann-coupon-card-left">
                          <div className="ann-coupon-discount-tag">
                            <FiTag className="tag-icon" />
                            <span>{discountDisplay}</span>
                          </div>
                          <div className="ann-coupon-code-pill">
                            <span className="code-label">CODE:</span>
                            <span className="code-text">{coupon.code}</span>
                          </div>
                          <div className="ann-coupon-criteria">
                            {minOrder > 0 ? (
                              <span>Min order: ₹{minOrder.toLocaleString('en-IN')}</span>
                            ) : (
                              <span>Valid on all orders</span>
                            )}
                            {maxOrder > 0 && (
                              <span> • Max order: ₹{maxOrder.toLocaleString('en-IN')}</span>
                            )}
                            {coupon.endDate && (
                              <span className="ann-expiry">
                                 • Valid till {new Date(coupon.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          {coupon.description && (
                            <p className="ann-coupon-desc">{coupon.description}</p>
                          )}
                        </div>

                        <div className="ann-coupon-card-right">
                          <button
                            className={`ann-copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopyCode(coupon.code)}
                            type="button"
                          >
                            {isCopied ? (
                              <>
                                <FiCheck className="copy-icon" />
                                <span>Copied! ✓</span>
                              </>
                            ) : (
                              <>
                                <RiFileCopyLine className="copy-icon" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="ann-modal-footer">
              <span className="ann-footer-hint">Coupons automatically apply discount at checkout.</span>
              <button
                className="ann-modal-shop-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  navigate('/shop');
                }}
              >
                <span>Browse Products &amp; Shop</span>
                <FiArrowRight />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementBar;
