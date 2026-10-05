import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowUpRight } from 'react-icons/fi';
import { 
  IoSparklesOutline, 
  IoDiamondOutline, 
  IoPricetagOutline, 
  IoHeartOutline, 
  IoGlobeOutline, 
  IoBagHandleOutline 
} from 'react-icons/io5';
import axios from 'axios';
import PageBanner from '../../components/PageBanner/PageBanner';
import './About.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const defaultGalleryImages = [
  { id: 1, src: '/assests/pr1.jpeg', label: 'Minimalist Chain' },
  { id: 2, src: '/assests/pr2.jpeg', label: 'Antique Bangles' },
  { id: 3, src: '/assests/pr3.jpeg', label: 'Kundan Choker' },
  { id: 4, src: '/assests/pr4.jpeg', label: 'Royal Haaram' },
  { id: 5, src: '/assests/pr5.jpeg', label: 'Bridal Set' },
  { id: 6, src: '/assests/pr6.jpeg', label: 'Gold Vanki' },
  { id: 7, src: '/assests/pr7.jpeg', label: 'Watch Bracelet' },
  { id: 8, src: '/assests/pr8.jpeg', label: 'Ruby Necklace' },
  { id: 9, src: '/assests/pr9.jpeg', label: 'Gold Vaddanam' },
  { id: 10, src: '/assests/pr10.jpeg', label: 'Emerald Necklace' },
  { id: 11, src: '/assests/pr11.jpeg', label: 'Minimalist Bangles' },
  { id: 12, src: '/assests/pr12.jpeg', label: 'Antique Jhumkas' },
  { id: 13, src: '/assests/pr13.jpeg', label: 'Coin Haaram' },
  { id: 14, src: '/assests/pr14.jpeg', label: 'Nose Rings' },
  { id: 15, src: '/assests/pr15.jpeg', label: 'Maang Tikka' },
  { id: 16, src: '/assests/pr16.jpeg', label: 'Payal Anklets' }
];

const defaultWhyBaaniPoints = [
  {
    title: 'Trendy & Elegant Designs',
    description: 'Contemporary, runway-inspired jewelry curated to match your modern grace and timeless elegance.'
  },
  {
    title: 'Premium-Looking Jewellery',
    description: 'Impeccable craftsmanship and lustrous finishing that rival high-end luxury heirlooms.'
  },
  {
    title: 'Luxury at Affordable Prices',
    description: 'High jewelry aesthetics thoughtfully crafted without extravagant price tags.'
  },
  {
    title: 'Carefully Selected Collections',
    description: 'Each design is hand-selected with discernment for everyday elegance, parties, and bridal moments.'
  },
  {
    title: 'Delivery Across the World',
    description: 'Fast, secure and worldwide shipping bringing Baani Jewels straight to your doorstep wherever you are.'
  },
  {
    title: 'Easy & Convenient Online Shopping',
    description: 'Seamless online experience with hassle-free ordering, dedicated customer care, and safe payments.'
  }
];

const whyIcons = [
  <IoSparklesOutline key="0" />,
  <IoDiamondOutline key="1" />,
  <IoPricetagOutline key="2" />,
  <IoHeartOutline key="3" />,
  <IoGlobeOutline key="4" />,
  <IoBagHandleOutline key="5" />
];

const resolveImage = (imgSrc, fallback) => {
  if (!imgSrc) return fallback;
  if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:')) return imgSrc;
  if (imgSrc.startsWith('/assests/') || imgSrc.startsWith('/assets/')) return imgSrc;
  const clean = imgSrc.replace(/^\/?uploads\//, '').replace(/^\//, '');
  return `${IMG}${clean}`;
};

const About = () => {
  const navigate = useNavigate();
  const [aboutData, setAboutData] = useState({
    aboutEyebrow: 'ABOUT BAANI JEWELS',
    heroTitle: 'Welcome to Baani Jewels',
    heroSubtitle: 'Luxury Made Affordable',
    leadPara: 'Baani Jewels brings elegant, trendy and premium-looking jewellery to customers who believe that style should never come with an extravagant price tag.',
    bodyPara1: 'We are excited to bring Baani Jewels to you through our very own website, making it easier to discover and shop for beautiful jewellery wherever you are in the world.',
    bodyPara2: 'From everyday elegance to special occasions, celebrations and bridal moments, we offer carefully selected designs that add a touch of beauty and sophistication to every look.',
    heroImage: '/assests/about_2nd_banner.jpeg',
    badgeNumber: '100%',
    badgeLabel: 'Luxury Made Affordable',
    philosophyTag: 'OUR PHILOSOPHY',
    philosophyTitle: 'What We Believe',
    philosophyQuote: 'At Baani Jewels, we believe that everyone deserves to feel beautiful, confident and special without having to compromise on style or affordability.',
    philosophySignature: '— Baani Jewels Atelier',
    whyEyebrow: 'DISTINCTIVE CRAFTSMANSHIP',
    whyTitle: 'Why Baani Jewels?',
    whySubtitle: 'Designed for brilliance, created for comfort, priced for everyone.',
    whyCards: defaultWhyBaaniPoints,
    journeyEyebrow: 'OUR JOURNEY',
    journeyHeading: 'Built on Love & Trust',
    journeyBody: 'Our journey has been built on the love and trust of our customers, and we look forward to growing together and reaching jewellery lovers across the world.',
    journeyImage: '/assests/about_model.png',
    journeyHighlight: 'Baani Jewels – Luxury Made Affordable',
    galleryEyebrow: 'The Collection',
    galleryTitle: 'A closer look at our artistry.',
    ctaEyebrow: 'Come, Explore',
    ctaTitle: 'Find the piece that finds you.',
    ctaText: 'Visit our collection and discover jewelry crafted to make you shine on every occasion.',
    ctaButtonText: 'Explore Collection'
  });

  const [galleryList, setGalleryList] = useState(defaultGalleryImages);

  useEffect(() => {
    // Fetch dynamic About page settings and products concurrently
    Promise.all([
      axios.get(`${API_BASE}/api/settings`).catch(err => {
        console.warn('Could not load dynamic about settings:', err);
        return null;
      }),
      axios.get(`${API_BASE}/api/products/all`).catch(err => {
        console.warn('Could not load products for about gallery:', err);
        return null;
      })
    ]).then(([settingsRes, productsRes]) => {
      let parsedSettings = {};
      if (settingsRes?.data?.success && settingsRes?.data?.data?.ABOUT_PAGE_DATA) {
        try {
          parsedSettings = JSON.parse(settingsRes.data.data.ABOUT_PAGE_DATA);
          setAboutData(prev => ({
            ...prev,
            ...parsedSettings,
            heroImage: parsedSettings.heroImage || parsedSettings.storyImage || prev.heroImage,
            leadPara: parsedSettings.leadPara || parsedSettings.storySubtitle || prev.leadPara,
            bodyPara1: parsedSettings.bodyPara1 || (parsedSettings.storyParagraphs ? parsedSettings.storyParagraphs.split('\n\n')[0] : prev.bodyPara1),
            bodyPara2: parsedSettings.bodyPara2 || (parsedSettings.storyParagraphs && parsedSettings.storyParagraphs.split('\n\n')[1] ? parsedSettings.storyParagraphs.split('\n\n')[1] : prev.bodyPara2),
            philosophyQuote: parsedSettings.philosophyQuote || parsedSettings.missionParagraphs || prev.philosophyQuote,
            journeyHeading: parsedSettings.journeyHeading || parsedSettings.missionSubtitle || prev.journeyHeading,
            journeyImage: parsedSettings.journeyImage || parsedSettings.missionImage || prev.journeyImage,
            whyCards: Array.isArray(parsedSettings.whyCards) && parsedSettings.whyCards.length === 6 ? parsedSettings.whyCards : prev.whyCards
          }));
        } catch (e) {
          console.error('Error parsing ABOUT_PAGE_DATA:', e);
        }
      }

      if (productsRes?.data) {
        const prodArr = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.products || []);
        if (prodArr.length > 0) {
          const mode = parsedSettings.artistryMode || 'auto';
          const selectedIds = Array.isArray(parsedSettings.artistryProductIds) ? parsedSettings.artistryProductIds : [];

          let displayProducts = [];
          if (mode === 'selected' && selectedIds.length > 0) {
            const prodMap = new Map(prodArr.map(p => [String(p.id), p]));
            displayProducts = selectedIds
              .map(id => prodMap.get(String(id)))
              .filter(Boolean);
          }

          if (displayProducts.length === 0) {
            displayProducts = prodArr.slice(0, 16);
          }

          const dynamicGallery = displayProducts.map((p, idx) => ({
            id: p.id,
            src: resolveImage(p.mainImage, defaultGalleryImages[idx % defaultGalleryImages.length]?.src || '/assests/pr1.jpeg'),
            label: p.name,
            productId: p.id
          }));
          setGalleryList(dynamicGallery);
        }
      }
    });
  }, []);

  const activeWhyCards = (aboutData.whyCards && aboutData.whyCards.length === 6)
    ? aboutData.whyCards
    : defaultWhyBaaniPoints;

  return (
    <main className="about-page">
      <PageBanner title="About Us" trail="About Us" image="/assests/about_2nd_banner.jpeg" />

      {/* ── 1. Editorial Hero Section with Banner Image ── */}
      <section className="about-editorial container">
        <div className="editorial-left" data-aos="fade-right" data-aos-duration="1000">
          <p className="about-eyebrow">{aboutData.aboutEyebrow || 'ABOUT BAANI JEWELS'}</p>
          <h1 className="editorial-title">
            {aboutData.heroTitle || 'Welcome to Baani Jewels'}<br />
            <em>{aboutData.heroSubtitle || 'Luxury Made Affordable'}</em>
          </h1>

          <div className="editorial-content-box">
            <p className="editorial-lead-para">
              {aboutData.leadPara}
            </p>
            <div className="editorial-line"></div>
            <p className="editorial-body">
              {aboutData.bodyPara1}
            </p>
            {aboutData.bodyPara2 && (
              <p className="editorial-body">
                {aboutData.bodyPara2}
              </p>
            )}
          </div>
        </div>

        <div className="editorial-right" data-aos="fade-left" data-aos-duration="1100">
          <div className="editorial-hero-banner-frame">
            <img 
              src={resolveImage(aboutData.heroImage, '/assests/about_2nd_banner.jpeg')} 
              alt={aboutData.heroTitle || 'Welcome to Baani Jewels'} 
              className="about-main-banner-img"
              onError={(e) => { e.target.src = '/assests/about_2nd_banner.jpeg'; }}
            />
            <div className="editorial-badge">
              <span className="editorial-badge-number">{aboutData.badgeNumber || '100%'}</span>
              <span className="editorial-badge-label">
                {aboutData.badgeLabel ? (
                  aboutData.badgeLabel.includes(' ') ? (
                    <>
                      {aboutData.badgeLabel.split(' ').slice(0, 2).join(' ')}<br />
                      {aboutData.badgeLabel.split(' ').slice(2).join(' ')}
                    </>
                  ) : aboutData.badgeLabel
                ) : (
                  <>Luxury Made<br/>Affordable</>
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. What We Believe (Brand Philosophy) ── */}
      <section className="about-belief container" data-aos="fade-up">
        <div className="belief-box">
          <div className="belief-header">
            <span className="belief-tag">{aboutData.philosophyTag || 'OUR PHILOSOPHY'}</span>
            <h2 className="belief-title">{aboutData.philosophyTitle || 'What We Believe'}</h2>
            <div className="belief-divider"></div>
          </div>
          <blockquote className="belief-quote">
            "{aboutData.philosophyQuote}"
          </blockquote>
          <p className="belief-signature">{aboutData.philosophySignature || '— Baani Jewels Atelier'}</p>
        </div>
      </section>

      {/* ── 3. Why Baani Jewels? ── */}
      <section className="why-baani-section container" data-aos="fade-up">
        <div className="about-gallery-header">
          <p className="about-eyebrow about-eyebrow-dark">{aboutData.whyEyebrow || 'DISTINCTIVE CRAFTSMANSHIP'}</p>
          <h2>{aboutData.whyTitle || 'Why Baani Jewels?'}</h2>
          <p className="section-subtitle-text">
            {aboutData.whySubtitle || 'Designed for brilliance, created for comfort, priced for everyone.'}
          </p>
        </div>

        <div className="why-baani-grid">
          {activeWhyCards.map((item, idx) => (
            <div 
              className="why-card" 
              key={idx}
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <div className="why-icon-wrapper">
                {whyIcons[idx % whyIcons.length]}
              </div>
              <h3 className="why-title">{item.title}</h3>
              <p className="why-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Our Journey & Future Vision ── */}
      <section className="about-journey-section container" data-aos="fade-up">
        <div className="journey-card">
          <div className="journey-text-content">
            <span className="about-eyebrow">{aboutData.journeyEyebrow || 'OUR JOURNEY'}</span>
            <h2 className="journey-heading">
              {aboutData.journeyHeading || 'Built on Love & Trust'}
            </h2>
            <p className="journey-body">
              {aboutData.journeyBody}
            </p>
            <div className="journey-brand-highlight">
              <span className="sparkle-icon">✦</span>
              <strong>{aboutData.journeyHighlight || 'Baani Jewels – Luxury Made Affordable'}</strong>
            </div>
          </div>
          <div className="journey-image-wrapper">
            <img 
              src={resolveImage(aboutData.journeyImage, '/assests/about_model.png')} 
              alt="Baani Jewels Journey of Trust" 
              className="journey-feature-img"
              onError={(e) => { e.target.src = '/assests/about_model.png'; }}
            />
          </div>
        </div>
      </section>

      {/* ── 5. The Curated Collection Gallery (Dynamic Live Products) ── */}
      <section className="about-gallery container" data-aos="fade-up">
        <div className="about-gallery-header">
          <p className="about-eyebrow about-eyebrow-dark">{aboutData.galleryEyebrow || 'The Collection'}</p>
          <h2>{aboutData.galleryTitle || 'A closer look at our artistry.'}</h2>
        </div>
        <div className="gallery-grid">
          {galleryList.map((img) => (
            <div 
              className="gallery-item" 
              key={img.id}
              onClick={() => img.productId ? navigate(`/product/${img.productId}`) : navigate('/shop')}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={img.src} 
                alt={img.label} 
                loading="lazy" 
                onError={(e) => { e.target.src = '/assests/pr1.jpeg'; }}
              />
              <div className="gallery-overlay">
                <div className="gallery-overlay-content">
                  <span>{img.label}</span>
                  <FiArrowUpRight />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Closing Call To Action ── */}
      <section className="about-cta container" data-aos="fade-up">
        <div className="cta-box">
          <p className="about-eyebrow">{aboutData.ctaEyebrow || 'Come, Explore'}</p>
          <h2>{aboutData.ctaTitle || 'Find the piece that finds you.'}</h2>
          <p className="cta-text">
            {aboutData.ctaText || 'Visit our collection and discover jewelry crafted to make you shine on every occasion.'}
          </p>
          <Link to="/shop" className="cta-btn">
            {aboutData.ctaButtonText || 'Explore Collection'} <FiArrowUpRight />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default About;
