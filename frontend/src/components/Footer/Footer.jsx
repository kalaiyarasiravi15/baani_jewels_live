import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiMapPin, FiPhone, FiMail, FiGlobe, FiChevronRight } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import './Footer.css';

import { API_BASE } from '../../config/apiConfig';
import { getCollectionSlug } from '../../utils/slugHelper';

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [contactData, setContactData] = useState({
    phone: '+91 93453 22621',
    phone2: '+91 81899 44905',
    whatsapp: '919345322621',
    email: 'Baanijewels.ind@gmail.com',
    locationText: 'Chennai, Tamil Nadu, India'
  });

  useEffect(() => {
    // 1. Fetch Categories
    axios.get(`${API_BASE}/api/categories/all`)
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data.categories || []);
        setCategories(arr.filter(c => c.status !== false).slice(0, 6));
      })
      .catch(err => console.warn('Footer categories error:', err));

    // 2. Fetch Collections
    axios.get(`${API_BASE}/api/home-collections/all`)
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data.collections || []);
        setCollections(arr.filter(c => c.status !== false).slice(0, 6));
      })
      .catch(err => console.warn('Footer collections error:', err));

    // 3. Fetch Store Contact Settings
    axios.get(`${API_BASE}/api/settings`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          const settings = res.data.data;
          let parsedContact = {};
          if (settings.CONTACT_PAGE_DATA) {
            try {
              parsedContact = JSON.parse(settings.CONTACT_PAGE_DATA);
            } catch (e) {
              console.error('Error parsing CONTACT_PAGE_DATA in footer:', e);
            }
          }

          setContactData(prev => ({
            ...prev,
            ...parsedContact,
            phone: parsedContact.phone || settings.COMPANY_PHONE || prev.phone,
            phone2: parsedContact.phone2 || prev.phone2,
            whatsapp: parsedContact.whatsapp || prev.whatsapp,
            email: parsedContact.email || settings.COMPANY_EMAIL || prev.email,
            locationText: parsedContact.locationText
              || (parsedContact.addressLine1 ? `${parsedContact.addressLine1}${parsedContact.addressLine2 ? ', ' + parsedContact.addressLine2 : ''}` : '')
              || (settings.COMPANY_CITY ? `${settings.COMPANY_CITY}, ${settings.COMPANY_STATE}` : prev.locationText)
          }));
        }
      })
      .catch(err => console.warn('Footer settings error:', err));
  }, []);

  const cleanWhatsapp = String(contactData.whatsapp || '919345322621').replace(/\D/g, '');

  return (
    <footer className="footer-section">
      <div className="footer-container">
        
        {/* Col 1: Brand Logo & Mission */}
        <div className="footer-brand" data-aos="fade-up">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/assests/baani_logo.png" 
              alt="Baani Jewels" 
              className="footer-logo" 
            />
          </Link>
          <p className="footer-desc">
            Discover the elegance of luxury jewelry. 
            Designed to illuminate your look and celebrate life's most precious moments with timeless grace.
          </p>
          <div className="footer-social-pill">
            <span className="footer-social-tag">✦ Luxury Made Affordable</span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="footer-links" data-aos="fade-up" data-aos-delay="100">
          <h4 className="footer-title">Quick Links</h4>
          <ul>
            <li>
              <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <FiChevronRight className="footer-chevron" /> Home
              </Link>
            </li>
            <li>
              <Link to="/shop" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <FiChevronRight className="footer-chevron" /> Shop
              </Link>
            </li>
            <li>
              <Link to="/collections" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <FiChevronRight className="footer-chevron" /> Collections
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <FiChevronRight className="footer-chevron" /> About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <FiChevronRight className="footer-chevron" /> Contact
              </Link>
            </li>
            <li>
              <Link to="/track-order" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <FiChevronRight className="footer-chevron" /> Track Order
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Dynamic Collections */}
        <div className="footer-links" data-aos="fade-up" data-aos-delay="200">
          <h4 className="footer-title">Our Collections</h4>
          <ul>
            {collections.length > 0 ? (
              collections.map(col => (
                <li key={col.id}>
                  <Link 
                    to={`/collections/${getCollectionSlug(col)}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    <FiChevronRight className="footer-chevron" /> {col.name}
                  </Link>
                </li>
              ))
            ) : (
              categories.map(cat => (
                <li key={cat.id}>
                  <Link 
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    <FiChevronRight className="footer-chevron" /> {cat.name}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Col 4: Get In Touch (Dynamic Store Information) */}
        <div className="footer-touch" data-aos="fade-up" data-aos-delay="300">
          <h4 className="footer-title">Get In Touch</h4>
          
          <div className="footer-touch-list">
            {/* Location */}
            <div className="footer-touch-item">
              <div className="footer-touch-icon"><FiMapPin /></div>
              <div className="footer-touch-text">
                <span className="touch-label">Location</span>
                <p>{contactData.locationText}</p>
              </div>
            </div>

            {/* Instant Connect */}
            <div className="footer-touch-item">
              <div className="footer-touch-icon"><FiPhone /></div>
              <div className="footer-touch-text">
                <span className="touch-label">Instant Connect</span>
                <p>
                  <a href={`tel:${contactData.phone.replace(/\s+/g, '')}`}>{contactData.phone}</a>
                  {contactData.phone2 && (
                    <>
                      <span className="touch-sep"> • </span>
                      <a href={`tel:${contactData.phone2.replace(/\s+/g, '')}`}>{contactData.phone2}</a>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="footer-touch-item">
              <div className="footer-touch-icon"><FaWhatsapp style={{ color: '#25D366' }} /></div>
              <div className="footer-touch-text">
                <span className="touch-label">WhatsApp</span>
                <p>
                  <a 
                    href={`https://wa.me/${cleanWhatsapp}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    +{cleanWhatsapp}
                  </a>
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="footer-touch-item">
              <div className="footer-touch-icon"><FiMail /></div>
              <div className="footer-touch-text">
                <span className="touch-label">Mail Us</span>
                <p>
                  <a href={`mailto:${contactData.email}`}>{contactData.email}</a>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>&copy; {new Date().getFullYear()} Baani Jewellery. All Rights Reserved.</p>
          <div className="footer-policy-links">
            <Link to="/privacy-policy" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Privacy Policy</Link>
            <span className="footer-dot">•</span>
            <Link to="/shipping-policy" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Shipping Policy</Link>
            <span className="footer-dot">•</span>
            <Link to="/terms-conditions" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Terms & Conditions</Link>
          </div>
          <p className="footer-developer-credit">
            Developed by <a href="https://saitechnosolutions.com/" target="_blank" rel="noopener noreferrer">Sai Techno Solutions</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
