import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  RiSettings4Fill,
  RiSave2Fill,
  RiRefreshLine,
  RiTruckLine,
  RiInformationLine,
  RiCheckboxCircleFill,
} from 'react-icons/ri';
import './SettingsPage.css';
import { API } from '../config';

const SettingsPage = () => {
  const [codActive, setCodActive] = useState(false);
  const [codThreshold, setCodThreshold] = useState('');
  
  const [onlineActive, setOnlineActive] = useState(false);
  const [onlineThreshold, setOnlineThreshold] = useState('');
  const [companyState, setCompanyState] = useState('Tamil Nadu');

  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [errors, setErrors]       = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      if (res.data && res.data.success) {
        const config = res.data.data;
        setCodActive(config.FREE_SHIPPING_COD_ACTIVE === 'true');
        setCodThreshold(config.FREE_SHIPPING_COD_THRESHOLD || '1000');
        
        setOnlineActive(config.FREE_SHIPPING_ONLINE_ACTIVE === 'true');
        setOnlineThreshold(config.FREE_SHIPPING_ONLINE_THRESHOLD || '500');
        setCompanyState(config.COMPANY_STATE || 'Tamil Nadu');
        
        setErrors({});
      } else {
        toast.error('Failed to load settings.');
      }
    } catch (err) {
      toast.error('Could not reach the settings API.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    const onlineNum = parseFloat(onlineThreshold);
    
    if (onlineThreshold === '' || isNaN(onlineNum) || onlineNum < 0) {
      errs.onlineThreshold = 'Please enter a valid amount (e.g. 500).';
    }
    if (!companyState.trim()) errs.companyState = 'Company state is required for GST split invoices.';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await axios.put(`${API}/settings`, {
        FREE_SHIPPING_COD_ACTIVE: 'false',
        FREE_SHIPPING_COD_THRESHOLD: '0',
        FREE_SHIPPING_ONLINE_ACTIVE: onlineActive ? 'true' : 'false',
        FREE_SHIPPING_ONLINE_THRESHOLD: onlineThreshold,
        COMPANY_STATE: companyState.trim(),
      });
      if (res.data && res.data.success) {
        toast.success('Settings saved successfully!');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(res.data?.error || 'Failed to save settings.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to save settings.';
      toast.error(msg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const codNum = parseFloat(codThreshold) || 0;
  const onlineNum = parseFloat(onlineThreshold) || 0;

  return (
    <div className="sp-page">

      {/* ── Page Header ── */}
      <div className="sp-header">
        <div className="sp-header__left">
          <div className="sp-header__icon-wrap">
            <RiSettings4Fill className="sp-header__icon" />
          </div>
          <div>
            <h1 className="sp-header__title">System Settings</h1>
            <p className="sp-header__subtitle">Manage global business rules &amp; configurations</p>
          </div>
        </div>
        <button
          type="button"
          className="sp-reload-btn"
          onClick={fetchSettings}
          disabled={loading || saving}
          title="Reload settings from database"
        >
          <RiRefreshLine className={loading ? 'sp-spin' : ''} />
          Reload
        </button>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="sp-breadcrumb">
        <span>Admin</span>
        <span className="sp-breadcrumb__sep">›</span>
        <span className="sp-breadcrumb__active">Settings</span>
      </div>

      {loading ? (
        <div className="sp-skeleton-wrap">
          <div className="sp-skeleton-card">
            <div className="sp-skeleton-bar w-40" />
            <div className="sp-skeleton-bar w-60 mt-12" />
            <div className="sp-skeleton-inputs">
              <div className="sp-skeleton-input" style={{ maxWidth: '340px' }} />
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="sp-form" noValidate>

          {/* ── Shipping Card ── */}
          <div className="sp-card">

            {/* Card Header */}
            <div className="sp-card__header">
              <div className="sp-card__header-left">
                <div className="sp-card__icon-wrap">
                  <RiTruckLine className="sp-card__icon" />
                </div>
                <div>
                  <h2 className="sp-card__title">Free Shipping Settings</h2>
                  <p className="sp-card__subtitle">Configure free shipping thresholds based on payment method</p>
                </div>
              </div>
              <span className="sp-card__badge">Global Rule</span>
            </div>

            {/* Divider */}
            <div className="sp-card__divider" />

            {/* Card Body */}
            <div className="sp-card__body">

              {/* Info Alert */}
              <div className="sp-info-alert">
                <RiInformationLine className="sp-info-alert__icon" />
                <p>
                  When active, online orders with a cart total at or above this threshold qualify for free shipping. When inactive or below the threshold, the delivery state's shipping zone charge applies. Click Save Configuration to apply changes.
                </p>
              </div>

              <div style={{ maxWidth: '560px' }}>
                {/* ── ONLINE SETTINGS ── */}
                <div className="sp-settings-section" style={{ background: '#f0fdf4', padding: '24px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Free Shipping Threshold (Online Payment)</h3>
                  
                  {/* Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={onlineActive} 
                        onChange={(e) => setOnlineActive(e.target.checked)} 
                      />
                      <span className="slider round"></span>
                    </label>
                    <span style={{ fontWeight: 500, color: onlineActive ? '#16a34a' : '#64748b' }}>
                      {onlineActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Input */}
                  <div className={`sp-field-group ${errors.onlineThreshold ? 'has-error' : ''}`} style={{ opacity: onlineActive ? 1 : 0.6, pointerEvents: onlineActive ? 'auto' : 'none' }}>
                    <label className="sp-label" htmlFor="onlineThreshold">
                      Online Free Shipping Threshold
                      <span className="sp-required">*</span>
                    </label>
                    <div className="sp-input-wrapper sp-input-large">
                      <span className="sp-input-prefix">₹</span>
                      <input
                        id="onlineThreshold"
                        type="number"
                        className="sp-input"
                        value={onlineThreshold}
                        onChange={(e) => {
                          setOnlineThreshold(e.target.value);
                          setErrors(p => ({ ...p, onlineThreshold: '' }));
                        }}
                        placeholder="e.g. 500"
                        min="0"
                        step="1"
                        disabled={!onlineActive}
                      />
                    </div>
                    {errors.onlineThreshold
                      ? <span className="sp-field-error">{errors.onlineThreshold}</span>
                      : !onlineActive ? <span className="sp-field-hint">Free shipping is inactive. State-wise shipping zone charges apply.</span>
                      : <span className="sp-field-hint">
                          Cart total <strong>₹{onlineNum.toLocaleString('en-IN') || '—'} and above</strong> → Shipping is <strong style={{ color: '#16a34a' }}>FREE</strong>
                        </span>
                    }
                  </div>
                </div>
              </div>

            </div>

            {/* Card Footer */}
            <div className="sp-card__footer">
              <div className="sp-footer-left">
                {saved && (
                  <div className="sp-saved-indicator">
                    <RiCheckboxCircleFill />
                    Settings saved successfully
                  </div>
                )}
              </div>
              <button type="submit" className="sp-save-btn" disabled={saving}>
                {saving ? (
                  <><RiRefreshLine className="sp-spin" /> Saving…</>
                ) : (
                  <><RiSave2Fill /> Save Configuration</>
                )}
              </button>
            </div>

          </div>

          <div className="sp-card">
            <div className="sp-card__header">
              <div className="sp-card__header-left">
                <div className="sp-card__icon-wrap"><RiInformationLine className="sp-card__icon" /></div>
                <div><h2 className="sp-card__title">GST Invoice Settings</h2><p className="sp-card__subtitle">Used to select CGST + SGST or IGST from the delivery state.</p></div>
              </div>
              <span className="sp-card__badge">GST</span>
            </div>
            <div className="sp-card__divider" />
            <div className="sp-card__body">
              <div className={`sp-field-group ${errors.companyState ? 'has-error' : ''}`} style={{ maxWidth: '420px' }}>
                <label className="sp-label" htmlFor="companyState">Company Registered State<span className="sp-required">*</span></label>
                <input id="companyState" className="sp-input" value={companyState} onChange={(e) => { setCompanyState(e.target.value); setErrors(p => ({ ...p, companyState: '' })); }} placeholder="e.g. Tamil Nadu" />
                {errors.companyState && <span className="sp-field-error">{errors.companyState}</span>}
              </div>
            </div>
          </div>

        </form>
      )}
    </div>
  );
};

export default SettingsPage;
