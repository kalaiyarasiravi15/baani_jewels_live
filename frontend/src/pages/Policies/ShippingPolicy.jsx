import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTruck, FiClock, FiGlobe } from 'react-icons/fi';
import PageBanner from '../../components/PageBanner/PageBanner';
import './Policies.css';

const ShippingPolicy = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="policy-page">
      <PageBanner title="Shipping & Delivery Policy" trail="Shipping Policy" />

      <div className="policy-container" data-aos="fade-up">
        <div className="policy-card">
          <div className="policy-header">
            <span className="policy-eyebrow">✦ WORLDWIDE & DOMESTIC LOGISTICS</span>
            <h1 className="policy-title">Shipping & Delivery Policy</h1>
            <span className="policy-last-updated">Last Updated: September 2026</span>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiClock className="section-icon" /> 1. Processing & Dispatch Timeline
            </h2>
            <p className="policy-text">
              Each piece of jewellery at <strong>Baani Jewels</strong> undergoes quality assessment and careful packing before dispatch:
            </p>
            <ul className="policy-list">
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Dispatch Timeline:</strong> Dispatched within <strong>48 to 72 hours</strong> of order confirmation.</span>
              </li>
            </ul>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiTruck className="section-icon" /> 2. Domestic Shipping (India)
            </h2>
            <p className="policy-text">
              We deliver across India with reliable courier partners:
            </p>
            <ul className="policy-list">
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Metro Cities:</strong> Delivered within <strong>3 to 5 business days</strong>.</span>
              </li>
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>ROI (Rest of India):</strong> Delivered within <strong>7 to 8 business days</strong>.</span>
              </li>
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Free Delivery:</strong> Free delivery on purchases of <strong>₹5,000 and above</strong>.</span>
              </li>
            </ul>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiGlobe className="section-icon" /> 3. International Worldwide Shipping
            </h2>
            <p className="policy-text">
              We proudly ship Baani Jewels internationally across the globe:
            </p>
            <ul className="policy-list">
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>International Delivery Partners:</strong> DHL / Aramex / FedEx / UPS / Economy.</span>
              </li>
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>International Delivery TAT:</strong> Delivered within <strong>7 to 12 business days</strong> (subject to customs clearance).</span>
              </li>
            </ul>
          </div>

          <div className="policy-contact-box">
            <div className="policy-contact-text">
              <h4>For any queries or clarifications, please contact us.</h4>
              <p>You can track your order live or reach our support team anytime.</p>
            </div>
            <Link to="/track-order" className="policy-contact-btn">
              <FiTruck /> Track My Order
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ShippingPolicy;
