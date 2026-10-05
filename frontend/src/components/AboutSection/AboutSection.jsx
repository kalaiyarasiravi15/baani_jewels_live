import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { 
  IoSparklesOutline, 
  IoDiamondOutline, 
  IoPricetagOutline, 
  IoHeartOutline, 
  IoGlobeOutline, 
  IoBagHandleOutline 
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import './AboutSection.css';

const mainModel = "/assests/about_page_banner.PNG";
const earringsClose = "/assests/pr12.jpeg";

const AboutSection = () => {
  const navigate = useNavigate();

  return (
    <div className="about-section">
      <div className="about-content">
        <h4 className="about-subtitle" data-aos="fade-right">ABOUT BAANI JEWELS</h4>
        <h2 className="about-title" data-aos="fade-right" data-aos-delay="100">Luxury Made Affordable</h2>
        <p className="about-description" data-aos="fade-up" data-aos-delay="200">
          Baani Jewels brings elegant, trendy and premium-looking jewellery to customers who believe that style should never come with an extravagant price tag. From everyday elegance to special occasions, celebrations and bridal moments, we offer carefully selected designs that add a touch of beauty and sophistication to every look.
        </p>
        
        <div className="about-features" data-aos="fade-up" data-aos-delay="300">
          <div className="feature-item">
            <span className="feature-icon-wrapper"><IoSparklesOutline /></span>
            <span className="feature-text">Trendy & Elegant Designs</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon-wrapper"><IoDiamondOutline /></span>
            <span className="feature-text">Premium-Looking Jewellery</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon-wrapper"><IoPricetagOutline /></span>
            <span className="feature-text">Luxury at Affordable Prices</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon-wrapper"><IoHeartOutline /></span>
            <span className="feature-text">Carefully Selected Collections</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon-wrapper"><IoGlobeOutline /></span>
            <span className="feature-text">Delivery Across the World</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon-wrapper"><IoBagHandleOutline /></span>
            <span className="feature-text">Easy & Convenient Shopping</span>
          </div>
        </div>

        <button className="about-btn" onClick={() => navigate('/about')} data-aos="zoom-in" data-aos-delay="400">
          Know More 
          <span className="btn-icon">
            <FiArrowRight color="#000" />
          </span>
        </button>
      </div>

      <div className="about-images-wrapper">
        <div className="about-images">
          <div className="arch-border" data-aos="fade-left" data-aos-delay="200"></div>
          <img src={mainModel} alt="Baani Jewels - Luxury Made Affordable" className="main-arch-img" data-aos="fade-up" />
          <div className="small-circle-img-wrapper" data-aos="zoom-in-up" data-aos-delay="400">
            <img src={earringsClose} alt="Baani Jewels Craftsmanship Detail" className="small-circle-img" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;
