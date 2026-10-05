import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API, IMG } from '../config';
import { RiSave2Fill, RiRefreshLine } from 'react-icons/ri';
import CmsImageUploader, { resolveCmsImage } from '../components/CmsImageUploader';
import './PageSettings.css';

const defaultContactData = {
  feedbackEyebrow: 'THOUGHTS',
  feedbackTitle: 'We Value Feedback',
  feedbackDesc: "We'd love to hear from you. Whether you have a question about our collections, need assistance with your order, or just want to share your thoughts, our team is ready to help.",
  feedbackImg1: '/assests/pr4.jpeg',
  feedbackImg2: '/assests/pr7.jpeg',
  feedbackImg3: '/assests/pr10.jpeg',
  touchEyebrow: 'GET IN TOUCH',
  touchTitle: 'Branching Out For You',
  phone: '+91 93453 22621',
  phone2: '+91 81899 44905',
  whatsapp: '919345322621',
  email: 'Baanijewels@outlook.com',
  sms: '+919345322621',
  locationText: 'Proudly Based in Chennai, TN',
  addressLine1: 'Baani Jewels Atelier',
  addressLine2: 'Chennai, Tamil Nadu, India',
  businessHours: 'Mon – Sat: 9:00 AM – 7:00 PM',
  mapIframe: 'https://maps.google.com/maps?q=Chennai,%20TN&t=&z=13&ie=UTF8&iwloc=&output=embed'
};

const ContactPageSettings = () => {
  const [formData, setFormData] = useState(defaultContactData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      if (res.data && res.data.success && res.data.data.CONTACT_PAGE_DATA) {
        try {
          const parsed = JSON.parse(res.data.data.CONTACT_PAGE_DATA);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error("Error parsing CONTACT_PAGE_DATA", e); }
      }
    } catch (err) {
      toast.error('Failed to load contact settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Enforce ALL fields required
    const requiredChecks = [
      { key: 'feedbackEyebrow', label: 'Section 1 Eyebrow' },
      { key: 'feedbackTitle', label: 'Section 1 Main Title' },
      { key: 'feedbackDesc', label: 'Section 1 Description Text' },
      { key: 'feedbackImg1', label: 'Section 1 Preview Image 1' },
      { key: 'feedbackImg2', label: 'Section 1 Preview Image 2' },
      { key: 'feedbackImg3', label: 'Section 1 Preview Image 3' },
      { key: 'touchEyebrow', label: 'Section 2 Get In Touch Eyebrow' },
      { key: 'touchTitle', label: 'Section 2 Get In Touch Title' },
      { key: 'phone', label: 'Section 2 Primary Phone Number' },
      { key: 'phone2', label: 'Section 2 Secondary Phone Number' },
      { key: 'whatsapp', label: 'Section 2 WhatsApp Number' },
      { key: 'email', label: 'Section 2 Email Address' },
      { key: 'locationText', label: 'Section 2 Location Text' },
      { key: 'addressLine1', label: 'Section 2 Address Line 1' },
      { key: 'addressLine2', label: 'Section 2 Address Line 2' },
      { key: 'mapIframe', label: 'Section 2 Google Maps Embed URL' },
    ];

    for (const item of requiredChecks) {
      const val = formData[item.key];
      if (!val || (typeof val === 'string' && !val.trim())) {
        toast.error(`All fields are required! Please fill in "${item.label}".`);
        return;
      }
    }

    const cleanPhone1 = String(formData.phone || '').replace(/\D/g, '');
    const cleanPhone2 = String(formData.phone2 || '').replace(/\D/g, '');
    const cleanWhatsapp = String(formData.whatsapp || '').replace(/\D/g, '');

    if (/[a-zA-Z]/.test(formData.phone) || cleanPhone1.length < 10 || cleanPhone1.length > 15) {
      toast.error('Primary Phone Number must contain valid digits (10-15 digits, letters not allowed).');
      return;
    }
    if (/[a-zA-Z]/.test(formData.phone2) || cleanPhone2.length < 10 || cleanPhone2.length > 15) {
      toast.error('Secondary Phone Number must contain valid digits (10-15 digits, letters not allowed).');
      return;
    }
    if (/[a-zA-Z]/.test(formData.whatsapp) || cleanWhatsapp.length < 10 || cleanWhatsapp.length > 15) {
      toast.error('WhatsApp Number must contain digits only with country code (10-15 digits, no +, letters not allowed).');
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put(`${API}/settings`, {
        CONTACT_PAGE_DATA: JSON.stringify(formData)
      });
      if (res.data && res.data.success) {
        toast.success('Contact page settings saved successfully!');
      } else {
        toast.error('Failed to save settings.');
      }
    } catch (err) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="ps-page">
      <div className="ps-header">
        <div>
          <h1 className="ps-title">Contact Page Editor</h1>
          <p className="ps-subtitle">Manage details, preview images, and contact channels on the public Contact page (All fields required)</p>
        </div>
        <button type="button" className="ps-add-btn" style={{width:'auto'}} onClick={fetchSettings} disabled={loading || saving}>
          <RiRefreshLine className={loading ? 'sp-spin' : ''} /> Reload
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSave}>
          
          {/* Section 1: Feedback Form & Left Side Info */}
          <div className="ps-card">
            <h2 className="ps-card-title">1. Feedback & Inquiries Section</h2>
            
            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Section Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required value={formData.feedbackEyebrow || 'THOUGHTS'} onChange={e => handleChange('feedbackEyebrow', e.target.value)} />
              </div>
              <div className="ps-group">
                <label className="ps-label">Section Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required value={formData.feedbackTitle || 'We Value Feedback'} onChange={e => handleChange('feedbackTitle', e.target.value)} />
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Feedback Description Text <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea className="ps-input" required style={{minHeight:'70px'}} value={formData.feedbackDesc || ''} onChange={e => handleChange('feedbackDesc', e.target.value)} />
            </div>

            <h3 style={{fontSize:'14px', fontWeight:600, color:'#475569', margin:'20px 0 12px 0'}}>
              3 Square Feedback Preview Images <span style={{ color: '#ef4444' }}>* (All 3 Required)</span>
            </h3>
            <div className="ps-grid-2" style={{gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px'}}>
              
              {/* Image 1 */}
              <div className="ps-dynamic-item" style={{background:'#fff', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                <CmsImageUploader
                  label="Preview Image 1"
                  value={formData.feedbackImg1}
                  onChange={val => handleChange('feedbackImg1', val)}
                  aspectRatio="square"
                  layout="vertical"
                  helperText="Displayed in the 3-image feedback mosaic"
                  required
                />
              </div>

              {/* Image 2 */}
              <div className="ps-dynamic-item" style={{background:'#fff', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                <CmsImageUploader
                  label="Preview Image 2"
                  value={formData.feedbackImg2}
                  onChange={val => handleChange('feedbackImg2', val)}
                  aspectRatio="square"
                  layout="vertical"
                  helperText="Displayed in the 3-image feedback mosaic"
                  required
                />
              </div>

              {/* Image 3 */}
              <div className="ps-dynamic-item" style={{background:'#fff', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                <CmsImageUploader
                  label="Preview Image 3"
                  value={formData.feedbackImg3}
                  onChange={val => handleChange('feedbackImg3', val)}
                  aspectRatio="square"
                  layout="vertical"
                  helperText="Displayed in the 3-image feedback mosaic"
                  required
                />
              </div>

            </div>
          </div>

          {/* Section 2: Get in Touch Cards */}
          <div className="ps-card">
            <h2 className="ps-card-title">2. Get in Touch Section</h2>
            
            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Section Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required value={formData.touchEyebrow || 'GET IN TOUCH'} onChange={e => handleChange('touchEyebrow', e.target.value)} />
              </div>
              <div className="ps-group">
                <label className="ps-label">Section Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required value={formData.touchTitle || 'Branching Out For You'} onChange={e => handleChange('touchTitle', e.target.value)} />
              </div>
            </div>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Primary Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="ps-input"
                  required
                  inputMode="tel"
                  maxLength={20}
                  placeholder="+91 93453 22621"
                  value={formData.phone || ''}
                  onKeyDown={e => {
                    if (e.key.length === 1 && !/[\d+ -]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  onChange={e => handleChange('phone', e.target.value.replace(/[^\d+ -]/g, ''))}
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Secondary Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="ps-input"
                  required
                  inputMode="tel"
                  maxLength={20}
                  placeholder="+91 81899 44905"
                  value={formData.phone2 || ''}
                  onKeyDown={e => {
                    if (e.key.length === 1 && !/[\d+ -]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  onChange={e => handleChange('phone2', e.target.value.replace(/[^\d+ -]/g, ''))}
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">WhatsApp Number (incl. country code, no +) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="ps-input"
                  required
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="919345322621"
                  value={formData.whatsapp || ''}
                  onKeyDown={e => {
                    if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  onChange={e => handleChange('whatsapp', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} />
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Location Text (Card Display) <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="ps-input" required value={formData.locationText || 'Proudly Based in Chennai, TN'} onChange={e => handleChange('locationText', e.target.value)} />
            </div>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Address Line 1 <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required value={formData.addressLine1 || ''} onChange={e => handleChange('addressLine1', e.target.value)} />
              </div>
              <div className="ps-group">
                <label className="ps-label">Address Line 2 <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ps-input" required value={formData.addressLine2 || ''} onChange={e => handleChange('addressLine2', e.target.value)} />
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Google Maps Embed URL (Iframe `src` only) <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea className="ps-input" required style={{minHeight:'70px'}} value={formData.mapIframe || ''} onChange={e => handleChange('mapIframe', e.target.value)} />
            </div>
          </div>
          
          {/* Save Bar */}
          <div className="ps-save-bar">
            <div>
              <h3 style={{margin:0, fontSize:'16px'}}>Unsaved Changes</h3>
              <p style={{margin:0, fontSize:'13px', color:'#64748b'}}>Remember to save your edits</p>
            </div>
            <button type="submit" className="ps-save-btn" disabled={saving}>
              {saving ? <><RiRefreshLine className="sp-spin" /> Saving…</> : <><RiSave2Fill /> Save Changes</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ContactPageSettings;
