import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API, IMG } from '../config';
import { RiSave2Fill, RiRefreshLine, RiSparklingLine, RiSearchLine, RiCheckLine, RiAddLine, RiCloseLine } from 'react-icons/ri';
import CmsImageUploader, { resolveCmsImage } from '../components/CmsImageUploader';
import './PageSettings.css';

const defaultAboutData = {
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
  whyCards: [
    { title: 'Trendy & Elegant Designs', description: 'Contemporary, runway-inspired jewelry curated to match your modern grace and timeless elegance.' },
    { title: 'Premium-Looking Jewellery', description: 'Impeccable craftsmanship and lustrous finishing that rival high-end luxury heirlooms.' },
    { title: 'Luxury at Affordable Prices', description: 'High jewelry aesthetics thoughtfully crafted without extravagant price tags.' },
    { title: 'Carefully Selected Collections', description: 'Each design is hand-selected with discernment for everyday elegance, parties, and bridal moments.' },
    { title: 'Delivery Across the World', description: 'Fast, secure and worldwide shipping bringing Baani Jewels straight to your doorstep wherever you are.' },
    { title: 'Easy & Convenient Online Shopping', description: 'Seamless online experience with hassle-free ordering, dedicated customer care, and safe payments.' }
  ],
  journeyEyebrow: 'OUR JOURNEY',
  journeyHeading: 'Built on Love & Trust',
  journeyBody: 'Our journey has been built on the love and trust of our customers, and we look forward to growing together and reaching jewellery lovers across the world.',
  journeyImage: '/assests/about_model.png',
  journeyHighlight: 'Baani Jewels – Luxury Made Affordable',
  galleryEyebrow: 'The Collection',
  galleryTitle: 'A closer look at our artistry.',
  artistryMode: 'auto',
  artistryProductIds: [],
  ctaEyebrow: 'Come, Explore',
  ctaTitle: 'Find the piece that finds you.',
  ctaText: 'Visit our collection and discover jewelry crafted to make you shine on every occasion.',
  ctaButtonText: 'Explore Collection'
};

const AboutPageSettings = () => {
  const [formData, setFormData] = useState(defaultAboutData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    try {
      const res = await axios.get(`${API}/products/all`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
      setAllProducts(list.filter(p => p.status !== false));
    } catch (err) {
      console.error('Error fetching products for artistry selector:', err);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      if (res.data && res.data.success && res.data.data?.ABOUT_PAGE_DATA) {
        try {
          const parsed = JSON.parse(res.data.data.ABOUT_PAGE_DATA);
          setFormData(prev => ({
            ...prev,
            ...parsed,
            artistryMode: parsed.artistryMode || 'auto',
            artistryProductIds: Array.isArray(parsed.artistryProductIds) ? parsed.artistryProductIds : [],
            whyCards: Array.isArray(parsed.whyCards) && parsed.whyCards.length === 6 ? parsed.whyCards : prev.whyCards
          }));
        } catch (e) {
          console.error('Error parsing ABOUT_PAGE_DATA', e);
        }
      }
    } catch (err) {
      toast.error('Failed to load About page settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Enforce ALL fields required
    const requiredChecks = [
      { key: 'aboutEyebrow', label: 'Section 1 Header Eyebrow' },
      { key: 'heroTitle', label: 'Section 1 Main Title' },
      { key: 'heroSubtitle', label: 'Section 1 Hero Subtitle' },
      { key: 'badgeNumber', label: 'Section 1 Badge Number' },
      { key: 'badgeLabel', label: 'Section 1 Badge Label' },
      { key: 'leadPara', label: 'Section 1 Lead Paragraph' },
      { key: 'bodyPara1', label: 'Section 1 Body Paragraph 1' },
      { key: 'bodyPara2', label: 'Section 1 Body Paragraph 2' },
      { key: 'heroImage', label: 'Section 1 Hero Banner Image' },
      { key: 'philosophyTag', label: 'Section 2 Philosophy Eyebrow Tag' },
      { key: 'philosophyTitle', label: 'Section 2 Philosophy Heading' },
      { key: 'philosophyQuote', label: 'Section 2 Philosophy Quote Text' },
      { key: 'philosophySignature', label: 'Section 2 Philosophy Signature Attribution' },
      { key: 'whyEyebrow', label: 'Section 3 Why Baani Eyebrow' },
      { key: 'whyTitle', label: 'Section 3 Why Baani Main Title' },
      { key: 'whySubtitle', label: 'Section 3 Why Baani Subtitle' },
      { key: 'journeyEyebrow', label: 'Section 4 Journey Eyebrow' },
      { key: 'journeyHeading', label: 'Section 4 Journey Heading' },
      { key: 'journeyBody', label: 'Section 4 Journey Story Description' },
      { key: 'journeyImage', label: 'Section 4 Model Photo Image' },
      { key: 'ctaEyebrow', label: 'Section 5 CTA Eyebrow' },
      { key: 'ctaTitle', label: 'Section 5 CTA Heading' },
      { key: 'ctaText', label: 'Section 5 CTA Subtitle Description' },
      { key: 'ctaButtonText', label: 'Section 5 CTA Button Label' },
    ];

    for (const item of requiredChecks) {
      const val = formData[item.key];
      if (!val || (typeof val === 'string' && !val.trim())) {
        toast.error(`All fields are required! Please fill in "${item.label}".`);
        return;
      }
    }

    if (!Array.isArray(formData.whyCards) || formData.whyCards.length !== 6) {
      toast.error('All 6 Craftsmanship feature pillars are required.');
      return;
    }

    for (let i = 0; i < 6; i++) {
      const card = formData.whyCards[i];
      if (!card?.title?.trim() || !card?.description?.trim()) {
        toast.error(`Pillar 0${i + 1} requires both a title and description.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await axios.put(`${API}/settings`, {
        ABOUT_PAGE_DATA: JSON.stringify(formData)
      });
      if (res.data && res.data.success) {
        toast.success('About page settings saved successfully!');
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

  const toggleArtistryProduct = (productId) => {
    setFormData(prev => {
      const currentList = Array.isArray(prev.artistryProductIds) ? prev.artistryProductIds : [];
      const exists = currentList.includes(productId);
      const updated = exists
        ? currentList.filter(id => id !== productId)
        : [...currentList, productId];
      return { ...prev, artistryProductIds: updated };
    });
  };

  const handleWhyCardChange = (index, subField, value) => {
    setFormData(prev => {
      const nextCards = [...(prev.whyCards || defaultAboutData.whyCards)];
      nextCards[index] = { ...nextCards[index], [subField]: value };
      return { ...prev, whyCards: nextCards };
    });
  };

  return (
    <div className="ps-page">
      <div className="ps-header">
        <div>
          <h1 className="ps-title">About Page CMS Editor</h1>
          <p className="ps-subtitle">Customize editorial stories, banners, core philosophy, and 6 craftsmanship pillars dynamically</p>
        </div>
        <button type="button" className="ps-add-btn" style={{ width: 'auto' }} onClick={fetchSettings} disabled={loading || saving}>
          <RiRefreshLine className={loading ? 'sp-spin' : ''} /> Reload
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading About Page Settings...</div>
      ) : (
        <form onSubmit={handleSave}>

          {/* ── Section 1: Hero / Editorial Banner ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">
              <RiSparklingLine style={{ color: '#c9a84c' }} /> 1. Editorial Hero &amp; Brand Story
            </h2>
            
            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Header Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.aboutEyebrow || ''} 
                  onChange={e => handleChange('aboutEyebrow', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Main Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.heroTitle || ''} 
                  onChange={e => handleChange('heroTitle', e.target.value)} 
                />
              </div>
            </div>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Hero Subtitle (Italicized Accent) <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.heroSubtitle || ''} 
                  onChange={e => handleChange('heroSubtitle', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Badge Overlay Text <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input 
                    className="ps-input" 
                    style={{ maxWidth: 100 }}
                    placeholder="100%"
                    required
                    value={formData.badgeNumber || ''} 
                    onChange={e => handleChange('badgeNumber', e.target.value)} 
                  />
                  <input 
                    className="ps-input" 
                    placeholder="Luxury Made Affordable"
                    required
                    value={formData.badgeLabel || ''} 
                    onChange={e => handleChange('badgeLabel', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Lead Highlight Paragraph <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea 
                className="ps-input" 
                style={{ minHeight: '75px' }} 
                required
                value={formData.leadPara || ''} 
                onChange={e => handleChange('leadPara', e.target.value)} 
              />
            </div>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Body Paragraph 1 <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea 
                  className="ps-input" 
                  style={{ minHeight: '90px' }} 
                  required
                  value={formData.bodyPara1 || ''} 
                  onChange={e => handleChange('bodyPara1', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Body Paragraph 2 <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea 
                  className="ps-input" 
                  style={{ minHeight: '90px' }} 
                  required
                  value={formData.bodyPara2 || ''} 
                  onChange={e => handleChange('bodyPara2', e.target.value)} 
                />
              </div>
            </div>

            {/* Hero Image */}
            <div className="ps-group" style={{ marginTop: '10px' }}>
              <CmsImageUploader
                label="Editorial Hero Banner Image"
                value={formData.heroImage}
                onChange={val => handleChange('heroImage', val)}
                aspectRatio="banner"
                helperText="High-resolution landscape banner shown at the top of the About page"
                allowManualInput={true}
                required
              />
            </div>
          </div>

          {/* ── Section 2: What We Believe (Brand Philosophy) ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">2. Brand Philosophy &amp; Mission Quote</h2>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Philosophy Eyebrow Tag <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.philosophyTag || ''} 
                  onChange={e => handleChange('philosophyTag', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Philosophy Heading <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.philosophyTitle || ''} 
                  onChange={e => handleChange('philosophyTitle', e.target.value)} 
                />
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Brand Philosophy Quote Text <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea 
                className="ps-input" 
                style={{ minHeight: '80px', fontSize: '15px' }} 
                required
                value={formData.philosophyQuote || ''} 
                onChange={e => handleChange('philosophyQuote', e.target.value)} 
              />
            </div>

            <div className="ps-group">
              <label className="ps-label">Signature / Author Attribution <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                className="ps-input" 
                required
                value={formData.philosophySignature || ''} 
                onChange={e => handleChange('philosophySignature', e.target.value)} 
              />
            </div>
          </div>

          {/* ── Section 3: Why Baani Jewels (6 Distinctive Craftsmanship Pillars) ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">3. Why Baani Jewels? (6 Craftsmanship Pillars)</h2>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Section Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.whyEyebrow || ''} 
                  onChange={e => handleChange('whyEyebrow', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Section Main Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.whyTitle || ''} 
                  onChange={e => handleChange('whyTitle', e.target.value)} 
                />
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Subtitle Description <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                className="ps-input" 
                required
                value={formData.whySubtitle || ''} 
                onChange={e => handleChange('whySubtitle', e.target.value)} 
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label className="ps-label" style={{ margin: 0 }}>
                  6 Craftsmanship Feature Pillars <span style={{ color: '#ef4444' }}>* (Fixed at 6 Pillars — All Required)</span>
                </label>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                  6 / 6 Pillars Active
                </span>
              </div>

              <div className="ps-grid-2" style={{ gap: 16 }}>
                {(formData.whyCards || []).slice(0, 6).map((card, idx) => (
                  <div key={idx} className="ps-dynamic-item" style={{ background: '#fff', padding: 16, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#c89c4a', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Pillar 0{idx + 1}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Required</span>
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <label className="ps-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                          Pillar Title <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="ps-input" 
                          style={{ fontWeight: 600 }}
                          placeholder={`Pillar 0${idx + 1} Title`}
                          required
                          value={card.title || ''} 
                          onChange={e => handleWhyCardChange(idx, 'title', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="ps-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                          Pillar Description <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea 
                          className="ps-input" 
                          style={{ minHeight: '65px', fontSize: '13px' }}
                          placeholder={`Pillar 0${idx + 1} Promise Description...`}
                          required
                          value={card.description || ''} 
                          onChange={e => handleWhyCardChange(idx, 'description', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 4: Built on Love & Trust (Our Journey) ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">4. Built on Love &amp; Trust (Journey &amp; Model)</h2>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Journey Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.journeyEyebrow || ''} 
                  onChange={e => handleChange('journeyEyebrow', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Journey Heading <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.journeyHeading || ''} 
                  onChange={e => handleChange('journeyHeading', e.target.value)} 
                />
              </div>
            </div>

            <div className="ps-group">
              <label className="ps-label">Journey Story Description <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea 
                className="ps-input" 
                style={{ minHeight: '85px' }} 
                required
                value={formData.journeyBody || ''} 
                onChange={e => handleChange('journeyBody', e.target.value)} 
              />
            </div>

            <div className="ps-group" style={{ marginTop: '10px' }}>
              <CmsImageUploader
                label="Model Photo / Journey Feature Image"
                value={formData.journeyImage}
                onChange={val => handleChange('journeyImage', val)}
                aspectRatio="portrait"
                helperText="Vertical portrait or model feature photo for the brand journey story"
                allowManualInput={true}
                required
              />
            </div>
          </div>

          {/* ── Section 5: Artistry Showcase Gallery ('A closer look at our artistry') ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">
              <RiSparklingLine style={{ color: '#c9a84c' }} /> 5. Artistry Showcase Collection ("A closer look at our artistry.")
            </h2>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">Section Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.galleryEyebrow || 'The Collection'} 
                  onChange={e => handleChange('galleryEyebrow', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">Section Heading <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.galleryTitle || 'A closer look at our artistry.'} 
                  onChange={e => handleChange('galleryTitle', e.target.value)} 
                />
              </div>
            </div>

            <div className="ps-group" style={{ marginTop: 12 }}>
              <label className="ps-label">Artistry Gallery Display Mode</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#12382e' }}>
                  <input 
                    type="radio" 
                    name="artistryMode" 
                    value="auto" 
                    checked={(formData.artistryMode || 'auto') === 'auto'} 
                    onChange={e => handleChange('artistryMode', e.target.value)} 
                  />
                  <span>Automatic (Showcase Latest Uploaded Products)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#12382e' }}>
                  <input 
                    type="radio" 
                    name="artistryMode" 
                    value="selected" 
                    checked={formData.artistryMode === 'selected'} 
                    onChange={e => handleChange('artistryMode', e.target.value)} 
                  />
                  <span>Custom Selected Products Showcase</span>
                </label>
              </div>
            </div>

            {/* Product Picker Grid when Selected mode is active */}
            {formData.artistryMode === 'selected' && (
              <div style={{ marginTop: 20, background: '#fcfbf7', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#12382e' }}>
                      Select Products to Display in "A closer look at our artistry"
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '2px 10px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                      {(formData.artistryProductIds || []).length} Selected
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ position: 'relative', minWidth: 240 }}>
                      <RiSearchLine style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                      <input 
                        className="ps-input" 
                        style={{ paddingLeft: 32, fontSize: 12, height: 36 }}
                        placeholder="Search product name or category..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                      />
                    </div>
                    {(formData.artistryProductIds || []).length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => handleChange('artistryProductIds', [])}
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RiCloseLine /> Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, maxHeight: 360, overflowY: 'auto', paddingRight: 6 }}>
                  {allProducts
                    .filter(p => !productSearch || (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || (p.category?.name || '').toLowerCase().includes(productSearch.toLowerCase()))
                    .map(product => {
                      const isSelected = (formData.artistryProductIds || []).includes(product.id);
                      return (
                        <div 
                          key={product.id}
                          onClick={() => toggleArtistryProduct(product.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: isSelected ? '#f5efe3' : '#ffffff',
                            border: isSelected ? '1.5px solid #c89c4a' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(200, 156, 74, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, display: 'grid', placeItems: 'center', border: '1px solid #cbd5e1' }}>
                            {product.mainImage ? (
                              <img src={`${IMG}${product.mainImage}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: 12, color: '#c89c4a' }}>✦</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#12382e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {product.category?.name || 'Jewellery'} · ₹{Number(product.salesPrice || product.mrpPrice || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: isSelected ? '#12382e' : '#f1f5f9',
                            color: isSelected ? '#d4af37' : '#94a3b8',
                            display: 'grid', placeItems: 'center', fontSize: 12, flexShrink: 0,
                            border: isSelected ? 'none' : '1px solid #cbd5e1'
                          }}>
                            {isSelected ? <RiCheckLine /> : <RiAddLine />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* ── Section 6: Call to Action (CTA Banner) ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">6. Bottom Call to Action (CTA) Banner</h2>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">CTA Eyebrow <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.ctaEyebrow || ''} 
                  onChange={e => handleChange('ctaEyebrow', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">CTA Heading <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.ctaTitle || ''} 
                  onChange={e => handleChange('ctaTitle', e.target.value)} 
                />
              </div>
            </div>

            <div className="ps-grid-2">
              <div className="ps-group">
                <label className="ps-label">CTA Subtitle Description <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.ctaText || ''} 
                  onChange={e => handleChange('ctaText', e.target.value)} 
                />
              </div>
              <div className="ps-group">
                <label className="ps-label">CTA Button Label <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  className="ps-input" 
                  required
                  value={formData.ctaButtonText || ''} 
                  onChange={e => handleChange('ctaButtonText', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Save Action Sticky / Bottom Bar */}
          <div className="ps-save-bar">
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>About Page CMS</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Changes update the public About page in real-time</p>
            </div>
            <button 
              type="submit" 
              className="ps-save-btn" 
              disabled={saving}
              style={{ padding: '12px 32px', fontSize: '14px', fontWeight: 700 }}
            >
              {saving ? <><RiRefreshLine className="sp-spin" /> Saving…</> : <><RiSave2Fill /> Save About Page CMS</>}
            </button>
          </div>

        </form>
      )}
    </div>
  );
};

export default AboutPageSettings;
