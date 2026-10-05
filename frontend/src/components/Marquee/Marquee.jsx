import React from 'react';
import './Marquee.css';

const SparkleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="marquee-star">
    <path d="M12 0L12.5 10.5L24 12L12.5 13.5L12 24L11.5 13.5L0 12L11.5 10.5L12 0Z" fill="#fff" />
  </svg>
);

const Marquee = () => {
  const items = [
    "Discover The Art Of Luxury",
    "Where Elegance Meets Excellence",
    "Crafted To Perfection",
    "Baani Jewellery Exclusives",
    "Unveil Your Perfect Gem",
  ];

  return (
    <div className="marquee-container">
      <div className="marquee-content">
        {/* First group */}
        <div className="marquee-group">
          {items.map((item, idx) => (
            <React.Fragment key={`a-${idx}`}>
              <span className="marquee-text">{item}</span>
              <SparkleIcon />
            </React.Fragment>
          ))}
        </div>
        {/* Duplicate group for seamless infinite scrolling */}
        <div className="marquee-group" aria-hidden="true">
          {items.map((item, idx) => (
            <React.Fragment key={`b-${idx}`}>
              <span className="marquee-text">{item}</span>
              <SparkleIcon />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marquee;
