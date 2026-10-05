import usePromotionRevision from '../../hooks/usePromotionRevision';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiArrowRight, FiTag, FiClock } from 'react-icons/fi';
import axios from 'axios';
import './DealOfDay.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const DealOfDay = () => {
  const promotionRevision = usePromotionRevision();
  const [deals, setDeals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const autoPlayRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE}/api/deals/active`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.deals || []);
        setDeals(list.filter(d => d.isActive !== false));
      })
      .catch(err => {
        console.error('Error fetching deals of the day:', err);
        setDeals([]);
      })
      .finally(() => setLoading(false));
  }, [promotionRevision]);

  const activeDeals = deals;
  const currentDeal = activeDeals[currentIndex] || activeDeals[0];

  // Auto slide carousel every 6 seconds
  useEffect(() => {
    if (activeDeals.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeDeals.length);
    }, 6000);

    return () => clearInterval(autoPlayRef.current);
  }, [activeDeals.length, currentIndex]);

  // Real-time Countdown Timer for the active deal
  useEffect(() => {
    const updateCountdown = () => {
      if (!currentDeal || !currentDeal.expiryDate) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const diff = new Date(currentDeal.expiryDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setDeals(prev => prev.filter(d => (d.id || d._id) !== (currentDeal.id || currentDeal._id)));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [currentDeal]);

  const handlePrev = (e) => {
    e.stopPropagation();
    clearInterval(autoPlayRef.current);
    setCurrentIndex(prev => (prev === 0 ? activeDeals.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    clearInterval(autoPlayRef.current);
    setCurrentIndex(prev => (prev + 1) % activeDeals.length);
  };

  const handleDotClick = (index, e) => {
    e.stopPropagation();
    clearInterval(autoPlayRef.current);
    setCurrentIndex(index);
  };

  const formatTwoDigits = (num) => (num < 10 ? `0${num}` : num);

  if (loading || deals.length === 0 || !currentDeal) return null;

  const isRemoteImg = currentDeal.image && !currentDeal.image.startsWith('/assests/') && !currentDeal.image.startsWith('http');
  const bgImg = isRemoteImg ? `${IMG}${currentDeal.image}` : (currentDeal.image || '/assests/pr8.jpeg');
  const targetLink = currentDeal.buttonLink || (currentDeal.targetProductId ? `/product/${currentDeal.targetProductId}` : '/shop');
  const targetProd = currentDeal.targetProduct;

  const discountLabel = currentDeal.discountType === 'FLAT' 
    ? `FLAT ₹${Number(currentDeal.discountValue || 0).toLocaleString('en-IN')} OFF`
    : `${currentDeal.discountValue || currentDeal.discountPercentage || 0}% OFF`;

  return (
    <section className="deal-carousel-section" data-aos="fade-up">
      <div className="deal-carousel-container">
        {/* Section Header */}
        <div className="deal-header" data-aos="fade-up">
          <p className="deal-eyebrow-top">LIMITED TIME LUXURY</p>
          <h2 className="deal-heading-title">
            Deal of the <span className="deal-heading-accent">Day</span>
            <span className="deal-heading-sparkle">✦</span>
          </h2>
        </div>

        {/* Deal Slide Card */}
        <div 
          className="deal-slide-card"
          onClick={() => navigate(targetLink)}
        >
          {/* Background Media with Ambient Gradient */}
          <div 
            className="deal-slide-bg" 
            style={{ backgroundImage: `url('${bgImg}')` }}
          />
          <div className="deal-slide-overlay" />
          <div className="deal-slide-glow" />

          {/* Carousel Navigation Arrows */}
          {activeDeals.length > 1 && (
            <>
              <button 
                className="deal-nav-arrow prev" 
                onClick={handlePrev}
                aria-label="Previous Deal"
              >
                <FiChevronLeft />
              </button>
              <button 
                className="deal-nav-arrow next" 
                onClick={handleNext}
                aria-label="Next Deal"
              >
                <FiChevronRight />
              </button>
            </>
          )}

          {/* Main Deal Content Layout */}
          <div className="deal-slide-content">
            {/* Left Content Column */}
            <div className="deal-info-col">
              <div className="deal-badge-row">
                <span className="deal-chip-discount">
                  <FiTag style={{ marginRight: '5px' }} />
                  {discountLabel}
                </span>
                <span className="deal-chip-live">
                  <span className="live-dot" /> LIVE DEAL
                </span>
              </div>

              <p className="deal-eyebrow">{currentDeal.subtitle || 'DEAL OF THE DAY'}</p>
              <h2 className="deal-main-title">{currentDeal.title}</h2>
              {currentDeal.description && (
                <p className="deal-desc">{currentDeal.description}</p>
              )}



              {/* Action Button */}
              <div className="deal-action-row">
                <button 
                  className="deal-claim-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(targetLink);
                  }}
                >
                  {currentDeal.buttonText || 'Claim Deal Now'} 
                  <span className="deal-btn-circle"><FiArrowRight /></span>
                </button>
              </div>
            </div>

            {/* Right Timer Column */}
            <div className="deal-timer-col">
              <div className="deal-timer-card">
                <div className="timer-header">
                  <FiClock className="timer-clock-icon" />
                  <span>DEAL ENDS IN</span>
                </div>

                <div className="deal-countdown-grid">
                  <div className="countdown-box">
                    <span className="countdown-digit">{formatTwoDigits(timeLeft.days)}</span>
                    <span className="countdown-unit">DAYS</span>
                  </div>
                  <span className="countdown-separator">:</span>

                  <div className="countdown-box">
                    <span className="countdown-digit">{formatTwoDigits(timeLeft.hours)}</span>
                    <span className="countdown-unit">HOURS</span>
                  </div>
                  <span className="countdown-separator">:</span>

                  <div className="countdown-box">
                    <span className="countdown-digit">{formatTwoDigits(timeLeft.minutes)}</span>
                    <span className="countdown-unit">MINS</span>
                  </div>
                  <span className="countdown-separator">:</span>

                  <div className="countdown-box">
                    <span className="countdown-digit countdown-seconds">{formatTwoDigits(timeLeft.seconds)}</span>
                    <span className="countdown-unit">SECS</span>
                  </div>
                </div>

                <p className="timer-subtext">✦ Limited artisan stock available at this promotional price</p>
              </div>
            </div>
          </div>

          {/* Carousel Slide Indicator Dots */}
          {activeDeals.length > 1 && (
            <div className="deal-carousel-dots">
              {activeDeals.map((d, idx) => (
                <button
                  key={d.id || idx}
                  className={`deal-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={(e) => handleDotClick(idx, e)}
                  aria-label={`Go to deal slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DealOfDay;
