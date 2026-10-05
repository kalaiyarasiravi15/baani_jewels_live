import React from 'react';
import { FaInstagram, FaFacebookF, FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import './FloatingSocials.css';

const FloatingSocials = () => {
  return (
    <div className="floating-socials" aria-label="Social and contact links">
      <a 
        href="https://wa.me/919345322621?text=Hello%20Baani%20Jewels,%20I%20would%20like%20to%20inquire%20about%20your%20jewellery%20collection." 
        target="_blank" 
        rel="noopener noreferrer" 
        className="social-btn whatsapp"
        title="WhatsApp Chat"
        aria-label="WhatsApp Chat"
      >
        <FaWhatsapp />
      </a>

      <a 
        href="tel:+919345322621" 
        className="social-btn phone"
        title="Call Us: +91 93453 22621"
        aria-label="Call Us"
      >
        <FaPhoneAlt />
      </a>

      <a 
        href="https://www.instagram.com/bani_jewels_?igsi=ZndnYzEwanh6anpr" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="social-btn instagram"
        title="Instagram Profile"
        aria-label="Instagram Profile"
      >
        <FaInstagram />
      </a>

      <a 
        href="https://www.facebook.com/share/14nFk8MpceQ/?mibextid=wwXIfr" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="social-btn facebook"
        title="Facebook Page"
        aria-label="Facebook Page"
      >
        <FaFacebookF />
      </a>
    </div>
  );
};

export default FloatingSocials;
