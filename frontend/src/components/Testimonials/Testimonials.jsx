import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiStar, FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaQuoteLeft } from 'react-icons/fa';
import './Testimonials.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const ClientAvatar = ({ name, image }) => {
  const getInitials = (n) => {
    if (!n) return 'BJ';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  if (image) {
    const src = image.startsWith('http') ? image : `${IMG}${image}`;
    return (
      <img
        src={src}
        alt={name}
        className="tst-avatar-img"
      />
    );
  }

  return (
    <div className="tst-avatar-initials">
      {getInitials(name)}
    </div>
  );
};

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(3);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    axios.get(`${API_BASE}/api/testimonials/active`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTestimonials(list);
      })
      .catch(err => {
        console.error('Error fetching testimonials:', err);
        setTestimonials([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 640) {
        setVisibleCards(1);
      } else if (window.innerWidth <= 1024) {
        setVisibleCards(2);
      } else {
        setVisibleCards(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const total = testimonials.length;
  const maxIndex = Math.max(0, total - visibleCards);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < maxIndex ? prev + 1 : 0));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (loading || testimonials.length === 0) return null;

  const showArrows = total > visibleCards;

  return (
    <section className="testimonials-section" data-aos="fade-up">
      <div className="testimonials-container">
        
        {/* Section Header */}
        <div className="testimonials-header">
          <p className="testimonials-eyebrow">CLIENT LOVE &amp; STORIES</p>
          <h2 className="testimonials-title">
            Words of <span className="testimonials-title-accent">Appreciation</span>
            <span className="testimonials-sparkle">✦</span>
          </h2>
          <p className="testimonials-sub">
            Cherished reflections from patrons who have embraced the timeless grace of Baani Jewels.
          </p>
        </div>

        {/* Testimonials Carousel Wrapper with Left & Right Arrows */}
        <div className="testimonials-carousel-wrapper">
          {showArrows && (
            <button
              type="button"
              className="testimonials-nav-btn prev"
              onClick={handlePrev}
              aria-label="Previous testimonials"
              title="Previous"
            >
              <FiChevronLeft />
            </button>
          )}

          <div
            className="testimonials-track-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="testimonials-track"
              style={{
                transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`
              }}
            >
              {testimonials.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="testimonial-card-slide"
                  style={{
                    flex: `0 0 ${100 / visibleCards}%`,
                    maxWidth: `${100 / visibleCards}%`
                  }}
                >
                  <div className="testimonial-card">
                    <div className="testimonial-card-glow" />
                    <div className="testimonial-quote-icon">
                      <FaQuoteLeft />
                    </div>

                    {/* Star Rating */}
                    <div className="testimonial-stars">
                      {[...Array(Number(item.rating) || 5)].map((_, i) => (
                        <FiStar key={i} className="star-filled" />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="testimonial-text">
                      "{item.review}"
                    </p>

                    {/* Client Profile */}
                    <div className="testimonial-client">
                      <ClientAvatar name={item.name} image={item.image} />
                      <div className="testimonial-client-meta">
                        <h4 className="testimonial-client-name">{item.name}</h4>
                        <div className="testimonial-client-sub">
                          {item.location && <span>{item.location} &bull; </span>}
                          <span className="tst-verified-badge">
                            <FiCheckCircle /> Verified Patron
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showArrows && (
            <button
              type="button"
              className="testimonials-nav-btn next"
              onClick={handleNext}
              aria-label="Next testimonials"
              title="Next"
            >
              <FiChevronRight />
            </button>
          )}
        </div>

        {/* Carousel Pagination Dots */}
        {showArrows && maxIndex > 0 && (
          <div className="testimonials-dots">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`testimonials-dot ${currentIndex === i ? 'active' : ''}`}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to testimonial slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;