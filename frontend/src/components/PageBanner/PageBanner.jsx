import React from 'react';
import { Link } from 'react-router-dom';
import './PageBanner.css';

const DEFAULT_BANNER_IMAGE = '/assests/about_page_banner.PNG';

const PageBanner = ({ title, trail, image }) => {
  const bgImage = image || DEFAULT_BANNER_IMAGE;

  return (
    <section className="page-banner" style={{ '--page-banner-image': `url(${bgImage})` }}>
      <div className="page-banner-overlay" />
      <div className="page-banner-content" data-aos="fade-down" data-aos-duration="700">
        <div className="page-banner-badge">
          <span className="badge-gem">✦</span>
          <span className="badge-text">BAANI JEWELS</span>
          <span className="badge-gem">✦</span>
        </div>
        <h1 className="page-banner-title">{title}</h1>
        <nav className="page-banner-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{trail}</span>
        </nav>
      </div>
    </section>
  );
};

export default PageBanner;
