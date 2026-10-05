import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import axios from 'axios';
import './HeroBanner.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const HeroBanner = ({ onBannerCountChange }) => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState('next');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const autoPlayRef = useRef(null);

  // 1. Fetch Dynamic Banners from DB
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/banners/all`);
        const dbBanners = Array.isArray(response.data) ? response.data.filter(b => b.status !== false) : [];
        setSlides(dbBanners);
        if (onBannerCountChange) {
          onBannerCountChange(dbBanners.length);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
        setSlides([]);
        if (onBannerCountChange) {
          onBannerCountChange(0);
        }
      }
    };

    fetchBanners();
  }, [onBannerCountChange]);

  // 2. Autoplay Timer (5s) with Smart Pause on Hover
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    autoPlayRef.current = setInterval(() => {
      setDirection('next');
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [slides.length, isPaused, currentSlide]);

  const handlePrev = () => {
    setDirection('prev');
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection('next');
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index) => {
    setDirection(index > currentSlide ? 'next' : 'prev');
    setCurrentSlide(index);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (slides.length === 0) return null;

  const current = slides[currentSlide] || slides[0];

  const getImgSrc = (imgProp) => {
    if (!imgProp) return '';
    if (imgProp.startsWith('/') || imgProp.startsWith('http')) return imgProp;
    return IMG + imgProp;
  };

  const mainImage = getImgSrc(current.image);
  const secondaryImage = getImgSrc(current.secondaryImage);

  const title = current.title || '';
  const words = title.split(' ');
  const lastWord = words.length > 1 ? words.pop() : '';
  const mainText = words.join(' ');

  return (
    <section 
      className="hero-editorial-section"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Main Active Slide Content Container ── */}
      <div className={`hero-editorial-container slide-dir-${direction}`} key={currentSlide}>
        
        {/* Left: Text Content with Staggered Entrance Animations */}
        <div className="hero-text-content">
          <div className="hero-eyebrow-wrapper">
            <span className="eyebrow-line"></span>
            <p className="hero-eyebrow-text">{current.subtitle || 'TIMELESS BEAUTY'}</p>
          </div>
          
          <h1 className="hero-main-title">
            {mainText} {lastWord && <><br /><span className="title-accent">{lastWord}</span></>}
            {!lastWord && <span className="title-accent">{title}</span>}
          </h1>
          
          <p className="hero-editorial-desc">
            {current.description || 'Sparkle and Save: Enjoy our stunning jewelry collection at exclusive discounted prices!'}
          </p>
          
          <div className="hero-actions">
            <button 
              className="btn-discover" 
              onClick={() => navigate(current.link || '/shop')}
            >
              {current.buttonText || 'Shop Now'} <FiArrowRight className="btn-icon-right" />
            </button>
          </div>
        </div>

        {/* Right: Model Image Composition with Elegant Arched Frame */}
        <div className="hero-image-stack">
          <div className="main-image-arch">
            {mainImage ? (
              <img src={mainImage} alt={current.title} className="slide-model-img" />
            ) : (
              <div className="img-placeholder">✦</div>
            )}
          </div>

          {secondaryImage && (
            <div className="secondary-image-circle">
              <img src={secondaryImage} alt="Secondary Detail" />
            </div>
          )}
        </div>

      </div>

      {/* ── Navigation Arrows ── */}
      {slides.length > 1 && (
        <>
          <button 
            className="hero-nav-arrow arrow-prev" 
            onClick={handlePrev}
            aria-label="Previous Slide"
          >
            <FiChevronLeft />
          </button>

          <button 
            className="hero-nav-arrow arrow-next" 
            onClick={handleNext}
            aria-label="Next Slide"
          >
            <FiChevronRight />
          </button>

          {/* ── Pagination Dots ── */}
          <div className="hero-slider-dots">
            {slides.map((slide, idx) => (
              <button
                key={slide.id || idx}
                className={`slider-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => handleDotClick(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              >
                <span className="dot-inner"></span>
              </button>
            ))}
          </div>
        </>
      )}

    </section>
  );
};

export default HeroBanner;
