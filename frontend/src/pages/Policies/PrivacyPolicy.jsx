import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiLock, FiEye, FiCheckCircle, FiMail, FiPhoneCall } from 'react-icons/fi';
import PageBanner from '../../components/PageBanner/PageBanner';
import './Policies.css';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="policy-page">
      <PageBanner title="Privacy Policy" trail="Privacy Policy" />

      <div className="policy-container" data-aos="fade-up">
        <div className="policy-card">
          <div className="policy-header">
            <span className="policy-eyebrow">✦ SECURITY & TRANSPARENCY</span>
            <h1 className="policy-title">Privacy Policy</h1>
            <span className="policy-last-updated">Last Updated: September 2026</span>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiShield className="section-icon" /> 1. Commitment to Your Privacy
            </h2>
            <p className="policy-text">
              At <strong>Baani Jewels</strong>, your trust is the cornerstone of our craftsmanship. We are committed to protecting your personal information and ensuring your privacy is safeguarded across our atelier website and concierge services.
            </p>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiEye className="section-icon" /> 2. Information We Collect
            </h2>
            <p className="policy-text">
              We only collect information necessary to provide you with an exceptional shopping and bespoke jewellery experience:
            </p>
            <ul className="policy-list">
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Personal Details:</strong> Name, delivery address, contact mobile number, and email address when placing orders or submitting inquiries.</span>
              </li>
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Transaction Records:</strong> Order references, purchased items, invoice details, and secure payment token confirmations (we never store raw card or banking credentials).</span>
              </li>
              <li>
                <span className="bullet-icon">✦</span>
                <span><strong>Browsing Insights:</strong> Device type, IP location, and browsing preferences to enhance your personalized atelier experience.</span>
              </li>
            </ul>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiLock className="section-icon" /> 3. How We Protect Your Data
            </h2>
            <p className="policy-text">
              We implement industry-standard 256-bit SSL encryption, hardened firewall architectures, and strict role-based access protocols to prevent unauthorized access or disclosure of your data.
            </p>
            <div className="policy-highlight-box">
              <strong>Guaranteed Discretion:</strong> We will never sell, lease, or rent your personal information to third-party marketing companies. Data is only shared with verified courier partners (for delivery) and PCI-DSS certified payment gateways.
            </div>
          </div>

          <div className="policy-section">
            <h2 className="policy-section-title">
              <FiCheckCircle className="section-icon" /> 4. Your Rights & Preferences
            </h2>
            <p className="policy-text">
              You have the right to request access to the personal data we hold about you, request corrections to inaccurate information, or ask for the deletion of your account records at any time.
            </p>
          </div>

          <div className="policy-contact-box">
            <div className="policy-contact-text">
              <h4>Have Questions About Your Privacy?</h4>
              <p>Our dedicated privacy officer is here to assist you with any inquiries.</p>
            </div>
            <Link to="/contact" className="policy-contact-btn">
              <FiMail /> Contact Atelier
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
