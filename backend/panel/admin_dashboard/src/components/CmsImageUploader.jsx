import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API, IMG } from '../config';
import { 
  RiImageAddFill, 
  RiEyeLine, 
  RiDeleteBinLine, 
  RiRefreshLine, 
  RiCloseLine, 
  RiImage2Line,
  RiCheckLine,
  RiExternalLinkLine,
  RiEditLine,
  RiFileCopyLine
} from 'react-icons/ri';

/**
 * Universal Image URL resolver for Admin CMS pages
 */
export const resolveCmsImage = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  if (str.startsWith('data:') || str.startsWith('blob:')) return str;
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  if (str.startsWith('/assests/') || str.startsWith('/assets/')) return str;
  if (str.startsWith('assests/') || str.startsWith('assets/')) return `/${str}`;

  const fallbackImg = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000/uploads/' : 'https://baanijewelsapi.com/uploads/';
  const baseUrl = (IMG || fallbackImg).replace(/\/$/, '');
  return `${baseUrl}/${clean}`;
};

const CmsImageUploader = ({
  label = 'Image',
  value = '',
  onChange = () => {},
  aspectRatio = 'square', // 'square', 'banner', 'portrait'
  layout = 'horizontal',  // 'horizontal' (side-by-side) or 'vertical' (stacked)
  helperText = '',
  allowManualInput = false,
  required = false
}) => {
  const [localPreview, setLocalPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Sync preview when value changes
  useEffect(() => {
    setLocalPreview(resolveCmsImage(value));
    setHasError(false);
  }, [value]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Optimistic instant local preview
    const tempUrl = URL.createObjectURL(file);
    setLocalPreview(tempUrl);
    setHasError(false);
    setIsUploading(true);

    // 2. Upload to server
    const data = new FormData();
    data.append('images', file);

    try {
      const res = await axios.post(`${API}/settings/upload`, data);
      if (res.data && res.data.success && res.data.imageUrl) {
        onChange(res.data.imageUrl);
        setLocalPreview(resolveCmsImage(res.data.imageUrl));
        toast.success('Image uploaded successfully!');
      } else {
        toast.error('Upload completed but failed to return image path.');
      }
    } catch (err) {
      console.error('Image upload failed', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Image upload failed. Please try again.');
      setLocalPreview(resolveCmsImage(value));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    setLocalPreview('');
    setHasError(false);
    toast.info('Image removed');
  };

  const copyPath = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success('Path copied to clipboard!');
  };

  const previewSrc = localPreview || resolveCmsImage(value);
  const isImagePresent = !!previewSrc && !hasError;
  const fileName = value ? value.split('/').pop() : '';

  // Class for ratio box
  const ratioBoxClass = 
    aspectRatio === 'banner' ? 'cms-thumb-banner' :
    aspectRatio === 'portrait' ? 'cms-thumb-portrait' :
    'cms-thumb-square';

  return (
    <div className={`cms-uploader-wrap ${layout === 'vertical' ? 'is-vertical-layout' : 'is-horizontal-layout'}`}>
      
      {/* ── Section Header ── */}
      {label && (
        <div className="cms-uploader-header">
          <label className="ps-label" style={{ margin: 0 }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <span className={`cms-status-badge ${isImagePresent ? 'is-active' : 'is-empty'}`}>
            <span className="cms-status-dot" />
            {isImagePresent ? 'Active' : 'No Image'}
          </span>
        </div>
      )}

      {/* ── Main Uploader Card ── */}
      <div className={`cms-uploader-card ${isImagePresent ? 'has-file' : 'is-empty'}`}>
        
        {/* Left / Top: Thumbnail Frame */}
        <div className={`cms-thumb-frame ${ratioBoxClass}`}>
          {isImagePresent ? (
            <div className="cms-thumb-inner" onClick={() => setShowLightbox(true)} title="Click to view full image">
              <img
                src={previewSrc}
                alt={label || 'Preview'}
                className="cms-thumb-img"
                onError={() => {
                  console.warn('Image failed to load:', previewSrc);
                  setHasError(true);
                }}
              />
              <div className="cms-thumb-hover-hint">
                <RiEyeLine size={18} />
                <span>Zoom</span>
              </div>
            </div>
          ) : (
            <div className="cms-thumb-placeholder">
              <div className="cms-placeholder-icon">
                <RiImage2Line size={32} />
              </div>
              <span className="cms-placeholder-label">
                {hasError ? 'Failed to load' : 'No preview'}
              </span>
            </div>
          )}

          {/* Uploading progress spinner */}
          {isUploading && (
            <div className="cms-uploading-glass">
              <RiRefreshLine className="sp-spin" size={26} />
              <span>Uploading…</span>
            </div>
          )}
        </div>

        {/* Right / Bottom: Details & Controls */}
        <div className="cms-controls-panel">
          
          {/* File Info Pill (when image exists) */}
          {isImagePresent && (
            <div className="cms-file-info-bar">
              <span className="cms-file-name" title={value}>
                {fileName || 'image.jpg'}
              </span>
              <button
                type="button"
                className="cms-file-copy-btn"
                onClick={copyPath}
                title="Copy file path"
              >
                <RiFileCopyLine size={13} />
              </button>
            </div>
          )}

          {/* Action Buttons Toolbar */}
          <div className="cms-btn-toolbar">
            {/* 1. Upload / Replace Button */}
            <label className={`cms-btn cms-btn-primary ${isUploading ? 'disabled' : ''}`}>
              {isUploading ? (
                <>
                  <RiRefreshLine className="sp-spin" size={15} /> Uploading…
                </>
              ) : isImagePresent ? (
                <>
                  <RiRefreshLine size={15} /> Change Image
                </>
              ) : (
                <>
                  <RiImageAddFill size={15} /> Upload Image
                </>
              )}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>

            {/* 2. Lightbox View Button */}
            {isImagePresent && (
              <button
                type="button"
                className="cms-btn cms-btn-secondary"
                onClick={() => setShowLightbox(true)}
                title="View Full Size"
              >
                <RiEyeLine size={15} /> Preview
              </button>
            )}

            {/* 3. Remove Button */}
            {isImagePresent && (
              <button
                type="button"
                className="cms-btn cms-btn-danger"
                onClick={handleRemove}
                title="Remove this image"
                disabled={isUploading}
              >
                <RiDeleteBinLine size={15} /> Remove
              </button>
            )}
          </div>

          {/* Helper Specification Text */}
          {helperText && (
            <p className="cms-spec-text">{helperText}</p>
          )}

          {/* Optional Manual URL / Path Input */}
          {allowManualInput && (
            <div className="cms-manual-input-area">
              <button
                type="button"
                className="cms-manual-toggle-btn"
                onClick={() => setShowManualInput(v => !v)}
              >
                <RiEditLine size={12} /> {showManualInput ? 'Hide URL input' : 'Edit file URL / path manually'}
              </button>
              {showManualInput && (
                <div style={{ marginTop: '6px' }}>
                  <input
                    className="ps-input"
                    style={{ fontSize: '12px', padding: '7px 10px', height: '34px' }}
                    placeholder="/uploads/... or https://..."
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ── High-Definition Lightbox Modal ── */}
      {showLightbox && (
        <div className="cms-lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <div className="cms-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="cms-lightbox-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RiImage2Line style={{ color: '#dfb76c' }} size={16} />
                <span className="cms-lightbox-title">{label || 'Image Preview'}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cms-lightbox-link"
                  title="Open Original in New Tab"
                >
                  <RiExternalLinkLine size={14} /> Open Full
                </a>
                <button
                  type="button"
                  className="cms-lightbox-close"
                  onClick={() => setShowLightbox(false)}
                  title="Close"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>
            </div>
            <div className="cms-lightbox-body">
              <img src={previewSrc} alt={label || 'Full preview'} className="cms-lightbox-image" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CmsImageUploader;
