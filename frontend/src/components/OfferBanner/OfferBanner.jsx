import usePromotionRevision from '../../hooks/usePromotionRevision';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import axios from 'axios';
import './OfferBanner.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const OfferBanner = () => {
  const promotionRevision = usePromotionRevision();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE}/api/offer-banners/all`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.offerBanners || []);
        setBanners(list.filter(b => b.status !== false));
      })
      .catch(err => {
        console.error('Error fetching offer banners:', err);
        setBanners([]);
      })
      .finally(() => setLoading(false));
  }, [promotionRevision]);

  if (loading || banners.length === 0) return null;

  return (
    <div className="offer-banner-section">
      <div className="offer-header" data-aos="fade-up">
        <p className="offer-eyebrow">EXCLUSIVE PROMOTIONS</p>
        <h2 className="offer-main-heading">
          Special Curated <span className="offer-heading-accent">Offers</span>
          <span className="offer-sparkle">✦</span>
        </h2>
      </div>
      <div className="offer-container">
        {banners.map((offer, index) => {
          const isRemote = offer.image && !offer.image.startsWith('/assests/') && !offer.image.startsWith('http');
          const bgImg = isRemote ? `${IMG}${offer.image}` : (offer.image || '/assests/pr5.jpeg');
          const targetLink = offer.link || (offer.productId ? `/product/${offer.productId}` : '/shop');
          const canNavigate = offer.status !== false && (!offer.startDate || new Date(offer.startDate) <= Date.now()) && (!offer.expiryDate || new Date(offer.expiryDate) > Date.now());

          return (
            <div 
              key={offer.id || index}
              className="offer-card" 
              data-aos={index === 0 ? "fade-right" : "fade-left"}
              onClick={() => canNavigate && navigate(targetLink)}
              role={canNavigate ? 'link' : undefined}
              tabIndex={canNavigate ? 0 : undefined}
              aria-disabled={!canNavigate}
              onKeyDown={(e) => { if (canNavigate && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigate(targetLink); } }}
              style={{ cursor: canNavigate ? 'pointer' : 'default' }}
            >
              <div 
                className="offer-bg" 
                style={{ backgroundImage: `url('${bgImg}')` }}
              ></div>
              <div className="offer-gradient-overlay"></div>
              
              <div className="offer-content">
                {offer.discountTag && (
                  <span className="offer-tag-chip">
                    {offer.discountTag}
                  </span>
                )}
                <h4 className="offer-subtitle">{offer.subtitle || 'EXCLUSIVE COLLECTION'}</h4>
                <h2 className="offer-title">{offer.title}</h2>
                <button
                  className="offer-btn"
                  type="button"
                  disabled={!canNavigate}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canNavigate) navigate(targetLink);
                  }}
                >
                  {offer.buttonText || 'Shop Now'} <span className="btn-icon"><FiArrowRight /></span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OfferBanner;
