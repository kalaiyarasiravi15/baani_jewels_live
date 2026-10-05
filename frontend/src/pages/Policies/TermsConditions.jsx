import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiAward, FiDollarSign, FiRefreshCw, FiAlertTriangle, FiMail } from 'react-icons/fi';
import PageBanner from '../../components/PageBanner/PageBanner';
import './Policies.css';

const TermsConditions = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="policy-page">
      <PageBanner title="Terms & Conditions" trail="Terms & Conditions" />

      <div className="policy-container" data-aos="fade-up">
        <div className="policy-card">
          <div className="policy-header">
            <span className="policy-eyebrow">✦ LEGAL FRAMEWORK & USER AGREEMENT</span>
            <h1 className="policy-title">Terms & Conditions</h1>
            <span className="policy-last-updated">Last Updated: September 2026</span>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiFileText className="section-icon" /> 1. Introduction & Acceptance
            </h2>
            <p className="policy-text">
              Welcome to <strong>Baani Jewels</strong>. By accessing our website, browsing our collections, or purchasing any jewellery piece, you acknowledge and agree to comply with and be bound by the following terms, conditions, and atelier policies.
            </p>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiAward className="section-icon" /> 2. Product Authenticity & Craftsmanship
            </h2>
            <p className="policy-text">
              We strive to present our jewellery accurately. Subtle variations in stone settings may occur.
            </p>
            <ul className="policy-list">
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Photographic Accuracy:</strong> Product images are rendered under studio lighting; minor color tone variations may occur across different device screens.</span>
              </li>
            </ul>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiDollarSign className="section-icon" /> 3. Pricing, Orders & Payments
            </h2>
            <p className="policy-text">
              All prices displayed on the website are in Indian Rupees (INR) and are inclusive of applicable GST unless explicitly stated otherwise. We reserve the right to revise product prices, promotions, or coupon terms without prior notice.
            </p>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiRefreshCw className="section-icon" /> 4. Returns, Exchanges & Damaged Goods
            </h2>
            <p className="policy-text">
              To request an exchange or report transit damages, customers must notify our support team within <strong>24 hours</strong> of package delivery along with mandatory unboxing video evidence.
            </p>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiAlertTriangle className="section-icon" /> 5. Governing Law & Jurisdiction
            </h2>
            <p className="policy-text">
              These Terms & Conditions are governed by and construed in accordance with the laws of India. Any disputes arising out of or related to our services shall be subject to the exclusive jurisdiction of the courts in <strong>Chennai, Tamil Nadu, India</strong>.
            </p>
          </div>

          <div className="policy-contact-box">
            <div className="policy-contact-text">
              <h4>For any queries or clarifications, please contact us.</h4>
              <p>Our support team is always here to assist you.</p>
            </div>
            <Link to="/contact" className="policy-contact-btn">
              <FiMail /> Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TermsConditions;
