import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FiMapPin, 
  FiMail, 
  FiArrowRight, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiShield, 
  FiTruck, 
  FiFileText,
  FiPhoneCall,
  FiUploadCloud,
  FiImage,
  FiTrash2,
  FiCheck
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';
import PageBanner from '../../components/PageBanner/PageBanner';
import { COUNTRIES } from '../../utils/countries';
import './Contact.css';

import { API_BASE } from '../../config/apiConfig';
const IMG = `${API_BASE}/uploads/`;

const resolveImage = (imgSrc, fallback) => {
  if (!imgSrc) return fallback;
  if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:')) return imgSrc;
  if (imgSrc.startsWith('/assests/') || imgSrc.startsWith('/assets/')) return imgSrc;
  const clean = imgSrc.replace(/^\/?uploads\//, '').replace(/^\//, '');
  return `${IMG}${clean}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const Contact = () => {
  const [countryCode, setCountryCode] = useState('+91');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [contactData, setContactData] = useState({
    feedbackEyebrow: 'THOUGHTS',
    feedbackTitle: 'We Value Feedback',
    feedbackDesc: "We'd love to hear from you. Whether you have a question about our collections, need assistance with your order, or just want to share your thoughts, our concierge team is ready to help.",
    feedbackImg1: '/assests/pr4.jpeg',
    feedbackImg2: '/assests/pr7.jpeg',
    feedbackImg3: '/assests/pr10.jpeg',
    touchEyebrow: 'GET IN TOUCH',
    touchTitle: 'Branching Out For You',
    phone: '+91 93453 22621',
    phone2: '+91 81899 44905',
    whatsapp: '919345322621',
    email: 'Baanijewels.ind@gmail.com',
    locationText: 'Proudly Based in Chennai, TN',
    addressLine1: 'Baani Jewels Atelier',
    addressLine2: 'Chennai, Tamil Nadu, India',
    mapIframe: 'https://maps.google.com/maps?q=Chennai,%20TN&t=&z=13&ie=UTF8&iwloc=&output=embed'
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Fetch dynamic store contact settings from backend
    axios.get(`${API_BASE}/api/settings`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          const settings = res.data.data;
          let parsedContact = {};
          if (settings.CONTACT_PAGE_DATA) {
            try {
              parsedContact = JSON.parse(settings.CONTACT_PAGE_DATA);
            } catch (e) {
              console.error('Error parsing CONTACT_PAGE_DATA:', e);
            }
          }

          setContactData(prev => ({
            ...prev,
            ...parsedContact,
            feedbackEyebrow: parsedContact.feedbackEyebrow || prev.feedbackEyebrow,
            feedbackTitle: parsedContact.feedbackTitle || prev.feedbackTitle,
            feedbackDesc: parsedContact.feedbackDesc || prev.feedbackDesc,
            feedbackImg1: parsedContact.feedbackImg1 || prev.feedbackImg1,
            feedbackImg2: parsedContact.feedbackImg2 || prev.feedbackImg2,
            feedbackImg3: parsedContact.feedbackImg3 || prev.feedbackImg3,
            touchEyebrow: parsedContact.touchEyebrow || prev.touchEyebrow,
            touchTitle: parsedContact.touchTitle || prev.touchTitle,
            phone: parsedContact.phone || settings.COMPANY_PHONE || prev.phone,
            phone2: parsedContact.phone2 || prev.phone2,
            whatsapp: parsedContact.whatsapp || prev.whatsapp,
            email: parsedContact.email || settings.COMPANY_EMAIL || prev.email,
            locationText: parsedContact.locationText
              || (parsedContact.addressLine1 ? `${parsedContact.addressLine1}${parsedContact.addressLine2 ? ', ' + parsedContact.addressLine2 : ''}` : '')
              || (settings.COMPANY_CITY ? `${settings.COMPANY_CITY}, ${settings.COMPANY_STATE}` : prev.locationText),
            mapIframe: parsedContact.mapIframe || prev.mapIframe
          }));
        }
      })
      .catch(err => {
        console.warn('Could not load dynamic contact settings:', err);
      });
  }, []);

  const validateField = (name, value, code = countryCode) => {
    switch (name) {
      case 'name': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Full Name is required.';
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
          return 'Name can only contain letters, spaces, dots, and hyphens.';
        }
        if (trimmed.length < 2) return 'Full Name must be at least 2 characters.';
        return '';
      }
      case 'phone': {
        const digits = (value || '').replace(/\D/g, '');
        if (!digits) return 'Phone number is required.';
        if (code === '+91') {
          if (digits.length !== 10) {
            return 'Please enter a valid 10-digit Indian mobile number.';
          }
        } else {
          if (digits.length < 7 || digits.length > 15) {
            return 'Please enter a valid international phone number (7 to 15 digits).';
          }
        }
        return '';
      }
      case 'email': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Email Address is required.';
        if (!trimmed.includes('@')) {
          return "Email must include an '@' symbol (e.g. name@example.com).";
        }
        const parts = trimmed.split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          return "Please enter a valid mailbox name before and domain after '@'.";
        }
        const domain = parts[1];
        if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
          return "Email domain must include an extension (e.g., .com, .in).";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(trimmed)) {
          return "Please enter a valid email address (e.g. name@example.com).";
        }
        return '';
      }
      case 'subject': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Subject is required.';
        if (trimmed.length < 3) return 'Subject must be at least 3 characters.';
        return '';
      }
      case 'message': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Please write your message.';
        if (trimmed.length < 5) return 'Message must be at least 5 characters.';
        return '';
      }
      case 'image': {
        if (!value) return 'Please upload a jewellery design photo or reference image.';
        return '';
      }
      default:
        return '';
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFieldErrors(prev => ({ ...prev, image: 'Please select a valid image file (JPG, PNG, WEBP).' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, image: 'File size must be under 10MB.' }));
      return;
    }
    setImageFile(file);
    setFieldErrors(prev => ({ ...prev, image: '' }));
    if (status.message) setStatus({ type: '', message: '' });

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setImageFile(null);
    setImagePreview(null);
    if (touched.image) {
      setFieldErrors(prev => ({ ...prev, image: 'Please upload a jewellery design photo or reference image.' }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setTouched(prev => ({ ...prev, image: true }));
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Only allow digits for phone number — completely prevent typing letters/symbols
  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    const maxLen = countryCode === '+91' ? 10 : 15;
    const sliced = digitsOnly.slice(0, maxLen);
    
    setFormData(prev => ({ ...prev, phone: sliced }));

    if (touched.phone) {
      setFieldErrors(prev => ({ ...prev, phone: validateField('phone', sliced, countryCode) }));
    }
    if (status.message) setStatus({ type: '', message: '' });
  };

  const handlePhoneKeyDown = (e) => {
    // Allow navigation/editing keys
    if (
      ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', 'Home', 'End'].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }
    // Block non-digit keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleCountryCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    if (formData.phone && touched.phone) {
      setFieldErrors(prev => ({ ...prev, phone: validateField('phone', formData.phone, newCode) }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value, countryCode) }));
    }
    if (status.message) setStatus({ type: '', message: '' });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value, countryCode) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {
      name: validateField('name', formData.name),
      phone: validateField('phone', formData.phone, countryCode),
      email: validateField('email', formData.email),
      subject: validateField('subject', formData.subject),
      message: validateField('message', formData.message),
      image: validateField('image', imageFile)
    };

    setFieldErrors(errors);
    setTouched({ name: true, phone: true, email: true, subject: true, message: true, image: true });

    const hasErrors = Object.values(errors).some(err => Boolean(err));
    if (hasErrors) {
      setStatus({ type: 'error', message: 'Please fix all highlighted errors and upload a design reference photo before submitting.' });
      return;
    }

    const fullPhone = `${countryCode} ${formData.phone.trim()}`;

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const fd = new FormData();
      fd.append('name', formData.name.trim());
      fd.append('phone', fullPhone);
      fd.append('email', formData.email.trim());
      fd.append('subject', formData.subject.trim());
      fd.append('message', formData.message.trim());
      fd.append('image', imageFile);

      const response = await axios.post(`${API_BASE}/api/contact/send`, fd, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.success) {
        setStatus({
          type: 'success',
          message: 'Submitted successfully! Thank you for reaching out, our jewellery concierge will contact you soon.'
        });
        setFormData({
          name: '',
          phone: '',
          email: '',
          subject: '',
          message: ''
        });
        setImageFile(null);
        setImagePreview(null);
        setFieldErrors({});
        setTouched({});
      } else {
        setStatus({
          type: 'error',
          message: response.data?.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to send message. Please check your connection and try again.';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const cleanWhatsapp = String(contactData.whatsapp || '919345322621').replace(/\D/g, '');

  return (
    <main className="contact-page">
      {/* 1. Page Banner */}
      <PageBanner title="Contact Us" trail="Contact" />

      {/* 2. Main Feedback & Inquiry Section */}
      <section className="contact-feedback container">
        
        {/* Left Column: Brand Story & Jewellery Visuals */}
        <div className="feedback-left" data-aos="fade-right">
          <p className="contact-eyebrow">{contactData.feedbackEyebrow || 'THOUGHTS'}</p>
          <h2>{contactData.feedbackTitle || 'We Value Feedback'}</h2>
          <p className="feedback-desc">
            {contactData.feedbackDesc}
          </p>

          <div className="feedback-images-wrapper">
            <span className="feedback-images-label">✦ Jewellery Collection</span>
            <div className="feedback-images">
              <div className="f-img-frame">
                <img 
                  src={resolveImage(contactData.feedbackImg1, '/assests/pr4.jpeg')} 
                  alt="Baani Jewellery Details" 
                  className="f-img" 
                  onError={(e) => { e.target.src = '/assests/pr4.jpeg'; }}
                />
              </div>
              <div className="f-img-frame">
                <img 
                  src={resolveImage(contactData.feedbackImg2, '/assests/pr7.jpeg')} 
                  alt="Baani Jewellery Details" 
                  className="f-img" 
                  onError={(e) => { e.target.src = '/assests/pr7.jpeg'; }}
                />
              </div>
              <div className="f-img-frame">
                <img 
                  src={resolveImage(contactData.feedbackImg3, '/assests/pr10.jpeg')} 
                  alt="Baani Jewellery Details" 
                  className="f-img" 
                  onError={(e) => { e.target.src = '/assests/pr10.jpeg'; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Form Card with Prominent Heading */}
        <div className="feedback-right" data-aos="fade-left">
          <div className="form-card-header">
            <span className="form-card-eyebrow">✦ ATELIER INQUIRY</span>
            <h3 className="form-card-title">Send Us a Message</h3>
            <p className="form-card-subtitle">
              All fields marked with (<span className="gold-asterisk">*</span>) are required.
            </p>
          </div>

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            {status.message && (
              <div className={`contact-status-alert ${status.type}`}>
                {status.type === 'success' ? (
                  <FiCheckCircle className="status-icon success" />
                ) : (
                  <FiAlertCircle className="status-icon error" />
                )}
                <span className="status-text">{status.message}</span>
              </div>
            )}

            <div className="form-row">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-field-label">
                  Full Name <span className="gold-asterisk">*</span>
                </label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="e.g. your name" 
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={fieldErrors.name ? 'invalid-field' : ''}
                  autoComplete="name"
                  required 
                />
                {fieldErrors.name && (
                  <span className="contact-field-error">
                    <FiAlertCircle className="field-err-icon" /> {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Phone Number with International Country Support */}
              <div className="form-group">
                <label className="form-field-label">
                  Phone Number <span className="gold-asterisk">*</span>
                </label>
                <div className={`contact-phone-input-wrap ${fieldErrors.phone ? 'invalid-field' : ''}`}>
                  <select
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="contact-country-select"
                    disabled={loading}
                    aria-label="Country Code"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.iso + c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    name="phone"
                    placeholder={countryCode === '+91' ? '10-digit mobile number' : 'Phone digits (numbers only)'} 
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    onKeyDown={handlePhoneKeyDown}
                    onBlur={handleBlur}
                    maxLength={countryCode === '+91' ? 10 : 15}
                    disabled={loading}
                    className="contact-phone-digits"
                    autoComplete="tel"
                    required 
                  />
                </div>
                {fieldErrors.phone && (
                  <span className="contact-field-error">
                    <FiAlertCircle className="field-err-icon" /> {fieldErrors.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              {/* Email Address */}
              <div className="form-group">
                <label className="form-field-label">
                  Email Address <span className="gold-asterisk">*</span>
                </label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="e.g. youremail@example.com" 
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={fieldErrors.email ? 'invalid-field' : ''}
                  autoComplete="email"
                  required 
                />
                {fieldErrors.email && (
                  <span className="contact-field-error">
                    <FiAlertCircle className="field-err-icon" /> {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="form-field-label">
                  Subject <span className="gold-asterisk">*</span>
                </label>
                <input 
                  type="text" 
                  name="subject"
                  placeholder="e.g. Order issue or Custom Ring Inquiry" 
                  value={formData.subject}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  className={fieldErrors.subject ? 'invalid-field' : ''}
                  required 
                />
                {fieldErrors.subject && (
                  <span className="contact-field-error">
                    <FiAlertCircle className="field-err-icon" /> {fieldErrors.subject}
                  </span>
                )}
              </div>
            </div>

            {/* Your Message (Accepts numbers, digits, special characters, all text) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-field-label">
                  Your Message <span className="gold-asterisk">*</span>
                </label>
                <span className="char-counter">
                  {formData.message.length} / 1000
                </span>
              </div>
              <textarea 
                name="message"
                placeholder="Write your message here... (Numbers, digits, letters, and all special characters accepted)" 
                rows="5" 
                maxLength={1000}
                value={formData.message}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                className={fieldErrors.message ? 'invalid-field' : ''}
                required
              ></textarea>
              {fieldErrors.message && (
                <span className="contact-field-error">
                  <FiAlertCircle className="field-err-icon" /> {fieldErrors.message}
                </span>
              )}
            </div>

            {/* Upload Design / Photo (Required) */}
            <div className="form-group">
              <label className="form-field-label">
                Upload Jewellery Design / Photo <span className="gold-asterisk">*</span>
              </label>

              {!imagePreview ? (
                <div
                  className={`contact-dropzone ${isDragging ? 'dragging' : ''} ${fieldErrors.image ? 'invalid-field' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('contact-file-input').click()}
                >
                  <input
                    type="file"
                    id="contact-file-input"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      setTouched(prev => ({ ...prev, image: true }));
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="dropzone-icon-wrap">
                    <FiUploadCloud className="dropzone-icon" />
                  </div>
                  <div className="dropzone-text-group">
                    <span className="dropzone-title">Click to upload or drag &amp; drop jewellery photo</span>
                    <span className="dropzone-sub">Supports JPG, PNG, WEBP (Max 10MB)</span>
                  </div>
                </div>
              ) : (
                <div className="contact-image-preview-box">
                  <div className="preview-thumbnail-wrap">
                    <img src={imagePreview} alt="Selected preview" className="preview-img-thumb" />
                  </div>
                  <div className="preview-info-wrap">
                    <div className="preview-badge-status">
                      <FiCheck className="preview-check-icon" /> Photo Attached
                    </div>
                    <div className="preview-filename">{imageFile?.name || 'Uploaded photo'}</div>
                    <div className="preview-filesize">{formatFileSize(imageFile?.size)}</div>
                    
                    <div className="preview-actions">
                      <button
                        type="button"
                        className="preview-change-btn"
                        onClick={() => document.getElementById('contact-file-input-replace').click()}
                      >
                        <FiImage /> Change Photo
                      </button>
                      <button
                        type="button"
                        className="preview-remove-btn"
                        onClick={handleRemoveFile}
                        title="Remove photo"
                      >
                        <FiTrash2 /> Remove
                      </button>
                      <input
                        type="file"
                        id="contact-file-input-replace"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {fieldErrors.image && (
                <span className="contact-field-error">
                  <FiAlertCircle className="field-err-icon" /> {fieldErrors.image}
                </span>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Sending Inquiry...' : 'Send Message'} <FiArrowRight className="btn-arrow" />
            </button>
          </form>
        </div>
      </section>

      {/* 3. Get in Touch Direct Concierge Cards */}
      <section className="contact-info container">
        <div className="info-header" data-aos="fade-up">
          <p className="contact-eyebrow">{contactData.touchEyebrow || 'GET IN TOUCH'}</p>
          <h2>{contactData.touchTitle || 'Branching Out For You'}</h2>
          <p className="info-header-sub">Direct access to our customer care and boutique team.</p>
        </div>
        
        <div className="info-grid">
          {/* Location — opens Google Maps */}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(contactData.locationText || 'Chennai, TN')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="info-card"
            data-aos="fade-up"
            data-aos-delay="0"
          >
            <div className="info-icon"><FiMapPin /></div>
            <div className="info-text">
              <h4>Atelier Location</h4>
              <p>{contactData.locationText}</p>
              <span className="card-action-link">Open in Maps ↗</span>
            </div>
          </a>

          {/* Phone — opens dialer */}
          <div className="info-card" data-aos="fade-up" data-aos-delay="100">
            <div className="info-icon"><FiPhoneCall /></div>
            <div className="info-text">
              <h4>Instant Connect</h4>
              <p>
                <a href={`tel:${contactData.phone.replace(/\s+/g, '')}`}>{contactData.phone}</a>
                {contactData.phone2 && (
                  <>
                    <br />
                    <a href={`tel:${contactData.phone2.replace(/\s+/g, '')}`}>{contactData.phone2}</a>
                  </>
                )}
              </p>
              <span className="card-action-link">Tap to Call ↗</span>
            </div>
          </div>

          {/* WhatsApp — opens chat */}
          <a
            href={`https://wa.me/${cleanWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="info-card whatsapp-card"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <div className="info-icon whatsapp-icon"><FaWhatsapp /></div>
            <div className="info-text">
              <h4>WhatsApp Concierge</h4>
              <p>+{cleanWhatsapp}</p>
              <span className="card-action-link whatsapp-text">Chat with Us ↗</span>
            </div>
          </a>

          {/* Mail — opens email client */}
          <a
            href={`mailto:${contactData.email}`}
            className="info-card"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            <div className="info-icon"><FiMail /></div>
            <div className="info-text">
              <h4>Email Desk</h4>
              <p>{contactData.email}</p>
              <span className="card-action-link">Send Email ↗</span>
            </div>
          </a>
        </div>
      </section>

      {/* 4. Store Policies & Reassurance Section */}
      <section className="contact-policies container" data-aos="fade-up">
        <div className="policies-header">
          <span className="contact-eyebrow">✦ TRUST & TRANSPARENCY</span>
          <h2>Our Guarantees & Store Policies</h2>
          <p className="policies-header-sub">
            Learn more about our shipping timelines, customer data protections, and transparent terms of service.
          </p>
        </div>

        <div className="policies-grid">
          {/* Privacy Policy Card */}
          <Link to="/privacy-policy" className="policy-teaser-card">
            <div className="policy-teaser-icon"><FiShield /></div>
            <div className="policy-teaser-content">
              <h3>Privacy Policy</h3>
              <p>256-bit SSL encrypted data protection, confidential transactions, and zero third-party sharing.</p>
              <span className="policy-read-more">Read Policy <FiArrowRight /></span>
            </div>
          </Link>

          {/* Shipping Policy Card */}
          <Link to="/shipping-policy" className="policy-teaser-card">
            <div className="policy-teaser-icon"><FiTruck /></div>
            <div className="policy-teaser-content">
              <h3>Shipping & Delivery Policy</h3>
              <p>Insured domestic and international delivery with tamper-proof packaging and live tracking.</p>
              <span className="policy-read-more">Read Policy <FiArrowRight /></span>
            </div>
          </Link>

          {/* Terms & Conditions Card */}
          <Link to="/terms-conditions" className="policy-teaser-card">
            <div className="policy-teaser-icon"><FiFileText /></div>
            <div className="policy-teaser-content">
              <h3>Terms & Conditions</h3>
              <p>Product details, warranty, and return information.</p>
              <span className="policy-read-more">Read Policy <FiArrowRight /></span>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. Map Section */}
      <section className="contact-map container" data-aos="fade-up">
        <div className="map-frame">
          <iframe 
            src={contactData.mapIframe || "https://maps.google.com/maps?q=Chennai,%20TN&t=&z=13&ie=UTF8&iwloc=&output=embed"} 
            width="100%" 
            height="420" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Baani Jewellery Location"
          ></iframe>
        </div>
      </section>
    </main>
  );
};

export default Contact;