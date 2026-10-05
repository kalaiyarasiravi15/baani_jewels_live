import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import axios from 'axios';
import './Categories.css';

import { API_BASE } from '../../config/apiConfig';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch categories from the admin dashboard API
    axios.get(`${API_BASE}/api/categories/all`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.categories || []);
        const activeCats = list.filter(c => c.status !== false);
        setCategories(activeCats);
      })
      .catch(err => {
        console.error("Error fetching categories:", err);
      });
  }, []);

  if (categories.length === 0) return null;

  const handleCategoryClick = (catName) => {
    navigate(`/shop?category=${encodeURIComponent(catName)}`);
  };

  const handleItemClick = (catName, index) => {
    if (active === index) {
      handleCategoryClick(catName);
    } else {
      setActive(index);
    }
  };

  return (
    <div className="categories-section">
      <div className="categories-container" data-aos="fade-up">
        {categories.map((cat, index) => (
          <div 
            key={cat.id} 
            className={`category-item ${active === index ? 'active' : ''}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => handleItemClick(cat.name, index)}
            role="button"
            tabIndex={0}
            aria-label={`Explore ${cat.name}`}
          >
            <div className="category-bg">
              {cat.image ? (
                <img 
                  src={`${API_BASE}/uploads/${cat.image}`} 
                  alt={cat.name} 
                  className="category-img" 
                />
              ) : (
                <div className="category-img-placeholder"></div>
              )}
              <div className="category-overlay"></div>
            </div>

            <div className="inactive-content">
              <h3 className="inactive-title">{cat.name}</h3>
            </div>

            <div className="active-content">
              <h2 className="active-title">* {cat.name} *</h2>
              <p className="active-desc">{cat.description || ""}</p>
              <p className="active-explore">( Explore Items )</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile & Tablet: View All Categories CTA */}
      <div className="categories-view-all-wrap">
        <button 
          type="button" 
          className="categories-view-all-btn"
          onClick={() => navigate('/shop')}
          aria-label="View all categories"
        >
          <span>View All Categories</span>
          <FiArrowRight className="view-all-arrow" />
        </button>
      </div>
    </div>
  );
};

export default Categories;
