import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomeCollections.css';

import { API_BASE } from '../../config/apiConfig';
import { getCollectionSlug } from '../../utils/slugHelper';

const HomeCollections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE}/api/home-collections/all`)
      .then(r => setCollections(Array.isArray(r.data) ? r.data.filter(c => c.status !== false) : []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || collections.length === 0) return null;

  return (
    <section className="hc-section">
      <div className="hc-container" data-aos="fade-up">
        {/* Header */}
        <div className="hc-header">
          <p className="hc-eyebrow">EXPLORE BY</p>
          <h2 className="hc-title">
            Explore Our <span className="hc-title-accent">Collection</span>
            <span className="hc-sparkle">✦</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="hc-grid">
          {collections.map((col, i) => (
            <div
              key={col.id}
              className="hc-item"
              data-aos="fade-up"
              data-aos-delay={i * 80}
              onClick={() => navigate(`/collections/${getCollectionSlug(col)}`)}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <div className="hc-img-wrap">
                {col.image ? (
                  <img
                    src={`${API_BASE}/uploads/${col.image}`}
                    alt={col.name}
                    className="hc-img"
                  />
                ) : (
                  <div className="hc-img-placeholder" style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}></div>
                )}
                <div className="hc-img-overlay" />
              </div>
              <p className="hc-name">{col.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCollections;
