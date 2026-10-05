import React from 'react';
import { FiAward, FiHeart, FiCheckSquare, FiTruck } from 'react-icons/fi';
import { LuDiamond } from 'react-icons/lu';
import './Highlights.css';

const highlightsData = [
  {
    id: 1,
    icon: <FiAward />,
    title: "Premium Quality",
    subtitle: "Finest materials & craftsmanship"
  },
  {
    id: 2,
    icon: <LuDiamond />,
    title: "Exclusive Designs",
    subtitle: "Unique collections you won't find anywhere else"
  },
  {
    id: 3,
    icon: <FiCheckSquare />,
    title: "Trusted Brand",
    subtitle: "Loved by thousands of happy customers"
  },
  {
    id: 4,
    icon: <FiTruck />,
    title: "Worldwide Delivery",
    subtitle: "Fast & secure shipping across the globe"
  }
];

const Highlights = () => {
  return (
    <div className="highlights-section">
      <div className="highlights-container" data-aos="fade-up">
        {highlightsData.map((item, index) => (
          <React.Fragment key={item.id}>
            <div className="highlight-item">
              <div className="highlight-icon">
                {item.icon}
              </div>
              <div className="highlight-text-block">
                <h4 className="highlight-title">{item.title}</h4>
                <p className="highlight-subtitle">{item.subtitle}</p>
              </div>
            </div>
            {/* Add divider line after all items except the last one */}
            {index < highlightsData.length - 1 && <div className="highlight-divider"></div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Highlights;
