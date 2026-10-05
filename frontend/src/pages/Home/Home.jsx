import React from 'react';
import HeroBanner from '../../components/HeroBanner/HeroBanner';
import HomeCollections from '../../components/HomeCollections/HomeCollections';
import Highlights from '../../components/Highlights/Highlights';
import Categories from '../../components/Categories/Categories';

import ProductSection from '../../components/ProductSection/ProductSection';
import OfferBanner from '../../components/OfferBanner/OfferBanner';
import DealOfDay from '../../components/DealOfDay/DealOfDay';
import Marquee from '../../components/Marquee/Marquee';
import AboutSection from '../../components/AboutSection/AboutSection';
import Testimonials from '../../components/Testimonials/Testimonials';
import './Home.css';

const Home = () => {
  const [hasHero, setHasHero] = React.useState(true);

  return (
    <div className={`home-page ${!hasHero ? 'without-hero' : ''}`}>
      <div className="global-sparkles-container">
        {Array.from({ length: 20 }).map((_, i) => (
          <div className="sparkle" key={i} style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${10 + Math.random() * 15}s`,
            animationDelay: `${Math.random() * 10}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`
          }}></div>
        ))}
      </div>
      <HeroBanner onBannerCountChange={(count) => setHasHero(count > 0)} />
      <div 
        className="home-scroll-content" 
        style={{ 
          position: 'relative', 
          zIndex: 10, 
          backgroundColor: 'var(--surface, #fff)',
          paddingTop: hasHero ? 0 : '140px' 
        }}
      >
        <HomeCollections />
        <Highlights />
        <Categories />
        <ProductSection />
        <OfferBanner />
        <DealOfDay />
        <Marquee />
        <AboutSection />
        <Testimonials />
      </div>
    </div>
  );
};

export default Home;
