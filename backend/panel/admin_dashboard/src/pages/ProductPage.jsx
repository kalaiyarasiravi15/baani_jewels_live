import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './ProductPage.css';
import { API, IMG } from '../config';
import { FiEye, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { RiSearchLine, RiCloseLine } from 'react-icons/ri';
import CharCount from '../components/CharCount';

const PER_PAGE = 10;

const emptyFeature = () => ({ heading: '', description: '' });
const emptyVariant = () => ({
  optionKind: 'Size',
  customLabel: '',
  variantValue: '',
  mrpPrice: '',
  salesPrice: '',
  stock: '0',
  status: true
});

/* ─── Custom Confirm Dialog ─── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="pp-confirm-overlay">
    <div className="pp-confirm-box">
      <div className="pp-confirm-icon"><FiAlertTriangle style={{ fontSize: '32px', color: '#ef4444' }} /></div>
      <p className="pp-confirm-msg">{message}</p>
      <div className="pp-confirm-actions">
        <button className="pp-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="pp-confirm-ok" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

const ProductPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const stockFilter = searchParams.get('filter') || 'all';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [panel, setPanel] = useState('list');
  const [editId, setEditId] = useState(null);
  const [viewProd, setViewProd] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFileName, setBulkFileName] = useState('');

  // ── Confirm dialog ──
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Form fields ──
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [mrp, setMrp] = useState('');
  const [sales, setSales] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState(true);
  const [mainFile, setMainFile] = useState(null);
  const [mainPrev, setMainPrev] = useState(null);

  // ── Video ──
  const [videoFile, setVideoFile] = useState(null);
  const [videoPrev, setVideoPrev] = useState(null);
  const [existingVideo, setExistingVideo] = useState(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const videoInput = useRef();

  // ── Thumbnails (Max 10) ──
  const [existingThumbs, setExistingThumbs] = useState([]);
  const [newThumbFiles, setNewThumbFiles] = useState([]);
  const [newThumbPrevs, setNewThumbPrevs] = useState([]);
  const [removedThumbIds, setRemovedThumbIds] = useState([]);

  // ── Collections ──
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isTopRated, setIsTopRated] = useState(false);

  // ── Features (min 3, max 10) ──
  const [features, setFeatures] = useState([emptyFeature(), emptyFeature(), emptyFeature()]);

  // ── Variants ──
  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants] = useState([emptyVariant()]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const thumbInput = useRef();

  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [productLoadError, setProductLoadError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAll(page, debouncedSearch, stockFilter);
  }, [page, debouncedSearch, stockFilter]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setPage(1); }, [location.search, debouncedSearch]);

  const fetchAll = async (pg = 1, searchQuery = debouncedSearch, sf = stockFilter) => {
    setLoading(true);
    setProductLoadError('');
    try {
      let url = `${API}/products/all?page=${pg}&limit=${PER_PAGE}`;
      if (searchQuery && searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (sf && sf !== 'all') {
        url += `&filter=${encodeURIComponent(sf)}`;
      }
      const pRes = await axios.get(url);
      const data = pRes.data;
      setProducts(Array.isArray(data) ? data : (data.products || []));
      setTotalProducts(data.totalProducts || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error('Unable to load admin products:', e);
      setProductLoadError(e.response?.data?.error || e.response?.data?.message || 'Could not load products. Check your admin session and backend connection, then retry.');
    } finally {
      setLoading(false);
    }
    // Product results should remain usable even if the optional collection list fails.
    try {
      const colRes = await axios.get(`${API}/home-collections/all`);
      setCollections(Array.isArray(colRes.data) ? colRes.data : []);
    } catch (e) {
      console.warn('Unable to load product collections:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const cRes = await axios.get(`${API}/categories/all`);
      setCategories(cRes.data);
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setEditId(null); setName(''); setDesc(''); setCatId(''); setCollectionId('');
    setMrp(''); setSales(''); setStock('');
    setStatus(true);
    setMainFile(null); setMainPrev(null);
    setVideoFile(null); setVideoPrev(null); setExistingVideo(null); setRemoveVideo(false);
    setExistingThumbs([]); setNewThumbFiles([]); setNewThumbPrevs([]);
    setRemovedThumbIds([]);
    setIsBestSeller(false); setIsTrending(false); setIsNewArrival(false); setIsTopRated(false);
    setFeatures([emptyFeature(), emptyFeature(), emptyFeature()]);
    setShowVariants(false);
    setVariants([emptyVariant()]);
    setErrors({});
    setPanel('list');
  };

  const getProductStock = (p) => {
    return p.stock || 0;
  };

  // ── Custom confirm ──
  const showConfirm = (message, action) => {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleConfirmYes = () => { setConfirmOpen(false); confirmAction && confirmAction(); };
  const handleConfirmNo = () => { setConfirmOpen(false); setConfirmAction(null); };

  const openAdd = () => { resetForm(); setPanel('form'); };
  const openBulkUpload = () => { setBulkRows([]); setBulkSummary(null); setBulkFileName(''); setPanel('bulk'); };
  const downloadBulkTemplate = () => {
    const csv = 'name,description,category,collection,mrpPrice,salesPrice,stock,status,isBestSeller,isTrending,isNewArrival,isTopRated\nRoyal Vintage Haaram,Handcrafted jewellery,Women,Heritage Collection,1200,999,10,true,false,false,true,false\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'baani-product-bulk-template.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const previewBulkUpload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBulkFileName(file.name);
    const data = new FormData(); data.append('file', file); setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/products/bulk-preview`, data);
      setBulkRows(res.data.rows || []);
      setBulkSummary(res.data.summary);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to read the bulk-upload file.');
    } finally {
      setBulkLoading(false);
    }
  };
  const importBulkProducts = async () => {
    if (!bulkRows.length || bulkSummary?.invalid) return;
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/products/bulk-import`, { rows: bulkRows });
      toast.success(res.data.message);
      await fetchAll();
      setPanel('list');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Bulk import failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const openEdit = async (p) => {
    let full = p;
    try {
      const res = await axios.get(`${API}/products/${p.id}`);
      if (res.data) full = res.data;
    } catch (e) {
      console.warn('Could not fetch full product details, falling back to row data:', e);
    }

    setEditId(full.id); setName(full.name || ''); setDesc(full.description || '');
    setCatId(full.categoryId || ''); setCollectionId(full.collectionId || '');
    setMrp(full.mrpPrice || ''); setSales(full.salesPrice || '');
    setStock(full.stock !== undefined && full.stock !== null ? full.stock : '');
    setStatus(full.status !== false);
    setMainPrev(full.mainImage ? IMG + full.mainImage : null); setMainFile(null);
    setExistingVideo(full.thumbVideo || null); setVideoFile(null); setVideoPrev(full.thumbVideo ? IMG + full.thumbVideo : null); setRemoveVideo(false);
    const uniqueThumbs = [];
    const seenImages = new Set();
    (full.thumbnails || []).forEach(t => {
      if (!seenImages.has(t.image)) {
        seenImages.add(t.image);
        uniqueThumbs.push(t);
      }
    });
    setExistingThumbs(uniqueThumbs);
    setNewThumbFiles([]); setNewThumbPrevs([]); setRemovedThumbIds([]);
    setIsBestSeller(!!full.isBestSeller);
    setIsTrending(!!full.isTrending);
    setIsNewArrival(!!full.isNewArrival);
    setIsTopRated(!!full.isTopRated);

    // Specifications
    const existingFeatures = (full.specifications || []).map(f => ({ heading: f.heading || '', description: f.description || '' }));
    while (existingFeatures.length < 3) existingFeatures.push(emptyFeature());
    setFeatures(existingFeatures);

    // Variants
    const selectableVariants = (full.variants || []).filter(v => v.variantType && v.variantValue);
    if (selectableVariants.length > 0) {
      setShowVariants(true);
      setVariants(selectableVariants.map(v => {
        const knownKind = ['Size', 'Inches'].includes(v.variantType) ? v.variantType : 'Custom';
        return {
          optionKind: knownKind,
          customLabel: knownKind === 'Custom' ? v.variantType : '',
          variantValue: v.variantValue || '',
          mrpPrice: v.mrpPrice !== null && v.mrpPrice !== undefined ? v.mrpPrice : '',
          salesPrice: v.salesPrice !== null && v.salesPrice !== undefined ? v.salesPrice : '',
          stock: v.stock !== null && v.stock !== undefined ? v.stock : '0',
          status: v.status !== false
        };
      }));
    } else {
      setShowVariants(false);
      setVariants([emptyVariant()]);
    }

    setErrors({});
    setPanel('form');
  };

  const openView = async (p) => {
    setViewProd(p);
    setPanel('view');
    try {
      const res = await axios.get(`${API}/products/${p.id}`);
      if (res.data) setViewProd(res.data);
    } catch (e) {
      console.warn('Could not fetch full product view, keeping row data:', e);
    }
  };

  // ── Main image ──
  const handleMainImg = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setMainFile(f); setMainPrev(URL.createObjectURL(f));
    if (errors.mainImage) setErrors(prev => ({ ...prev, mainImage: '' }));
  };

  // ── Thumbnails ──
  const activeExisting = existingThumbs.filter(t => !removedThumbIds.includes(t.id));
  const totalThumbCount = activeExisting.length + newThumbPrevs.length;

  const handleThumbs = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 10 - totalThumbCount;
    if (remaining <= 0) { toast.error('Maximum 10 images allowed!'); return; }
    const toAdd = files.slice(0, remaining);
    setNewThumbFiles(prev => [...prev, ...toAdd]);
    setNewThumbPrevs(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    thumbInput.current.value = '';
  };

  const removeExistingThumb = (id) => setRemovedThumbIds(prev => [...prev, id]);
  const removeNewThumb = (idx) => {
    setNewThumbFiles(prev => prev.filter((_, i) => i !== idx));
    setNewThumbPrevs(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Features ──
  const setFeatureField = (i, key, val) => {
    setFeatures(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
    if (errors.features) setErrors(prev => ({ ...prev, features: '' }));
  };
  const addFeature = () => { if (features.length < 10) setFeatures(prev => [...prev, emptyFeature()]); };
  const removeFeature = (i) => { if (features.length > 3) setFeatures(prev => prev.filter((_, idx) => idx !== i)); };

  // ── Variants ──
  const updateVariant = (index, field, value) => {
    setVariants(prev => prev.map((variant, i) => i === index ? { ...variant, [field]: value } : variant));
    if (errors.variants) setErrors(prev => ({ ...prev, variants: '' }));
  };

  // ── SUBMIT ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Product Name is required.';
      toast.error('Product Name is required.');
    }
    if (!desc.trim()) {
      newErrors.desc = 'Product Description is required.';
      toast.error('Product Description is required.');
    }
    if (!catId) {
      newErrors.catId = 'Category Selection is required.';
      toast.error('Category Selection is required.');
    }

    // Features validation: minimum 3 features must be filled
    const filledFeatures = features.filter(f => (f.heading || '').trim() || (f.description || '').trim());
    if (filledFeatures.length < 3) {
      newErrors.features = 'Please fill in at least 3 product specifications.';
      toast.error('Please fill in at least 3 product specifications.');
    }

    // Main image is always required
    if (!mainFile && !mainPrev) {
      newErrors.mainImage = 'Main Image is required.';
      toast.error('Main Image is required.');
    }

    // Price & Stock or Variant Validation
    if (!showVariants) {
      if (mrp === '' || mrp === null || mrp === undefined) {
        newErrors.mrp = 'MRP Price is required.';
        toast.error('MRP Price is required.');
      } else {
        const mrpVal = parseFloat(mrp);
        if (mrpVal <= 0 || isNaN(mrpVal)) {
          newErrors.mrp = 'MRP Price must be a positive number.';
          toast.error('MRP Price must be a positive number.');
        }
      }

      if (sales === '' || sales === null || sales === undefined) {
        newErrors.sales = 'Sales Price is required.';
        toast.error('Sales Price is required.');
      } else {
        const salesVal = parseFloat(sales);
        const mrpVal = parseFloat(mrp);
        if (isNaN(salesVal) || salesVal <= 0) {
          newErrors.sales = 'Sales Price must be a positive number.';
          toast.error('Sales Price must be a positive number.');
        } else if (!isNaN(mrpVal) && salesVal > mrpVal) {
          newErrors.sales = 'Sales Price cannot exceed MRP Price.';
          toast.error('Sales Price cannot exceed MRP Price.');
        }
      }

      if (stock === '' || stock === null || stock === undefined) {
        newErrors.stock = 'Stock Quantity is required.';
        toast.error('Stock Quantity is required.');
      } else {
        const stockVal = parseInt(stock, 10);
        if (isNaN(stockVal) || stockVal < 0) {
          newErrors.stock = 'Stock Quantity cannot be negative.';
          toast.error('Stock Quantity cannot be negative.');
        }
      }
    } else {
      if (!variants || !variants.length) {
        newErrors.variants = 'Please add at least one variant or turn off variants.';
        toast.error('Please add at least one variant.');
      } else {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          const typeName = v.optionKind === 'Custom' ? (v.customLabel || '').trim() : (v.optionKind || '').trim();
          const valName = (v.variantValue || '').trim();
          const vMrp = parseFloat(v.mrpPrice);
          const vSale = parseFloat(v.salesPrice);
          const vStock = parseInt(v.stock, 10);

          if (!typeName) {
            newErrors.variants = `Variant ${i + 1}: Custom Type Name is required.`;
            toast.error(`Variant ${i + 1}: Custom Type Name is required.`);
            break;
          }
          if (!valName) {
            newErrors.variants = `Variant ${i + 1}: Value is required (e.g. 2.4, 6 inch).`;
            toast.error(`Variant ${i + 1}: Value is required (e.g. 2.4, 6 inch).`);
            break;
          }
          if (isNaN(vMrp) || vMrp <= 0) {
            newErrors.variants = `Variant ${i + 1}: MRP must be a positive number.`;
            toast.error(`Variant ${i + 1}: MRP must be a positive number.`);
            break;
          }
          if (isNaN(vSale) || vSale <= 0) {
            newErrors.variants = `Variant ${i + 1}: Sale price must be a positive number.`;
            toast.error(`Variant ${i + 1}: Sale price must be a positive number.`);
            break;
          }
          if (vSale > vMrp) {
            newErrors.variants = `Variant ${i + 1}: Sale price cannot exceed MRP.`;
            toast.error(`Variant ${i + 1}: Sale price cannot exceed MRP.`);
            break;
          }
          if (isNaN(vStock) || vStock < 0) {
            newErrors.variants = `Variant ${i + 1}: Stock must be 0 or greater.`;
            toast.error(`Variant ${i + 1}: Stock must be 0 or greater.`);
            break;
          }
        }
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', desc);
      fd.append('categoryId', catId);
      fd.append('collectionId', collectionId);

      const parsedVarList = showVariants ? variants.map(v => ({
        variantType: v.optionKind === 'Custom' ? (v.customLabel || '').trim() : v.optionKind,
        variantValue: (v.variantValue || '').trim(),
        mrpPrice: parseFloat(v.mrpPrice) || 0,
        salesPrice: parseFloat(v.salesPrice) || 0,
        stock: parseInt(v.stock, 10) || 0,
        status: v.status !== false
      })) : [];

      if (showVariants && parsedVarList.length > 0) {
        fd.append('mrpPrice', parsedVarList[0].mrpPrice);
        fd.append('salesPrice', parsedVarList[0].salesPrice);
        fd.append('stock', parsedVarList.reduce((sum, v) => sum + v.stock, 0));
      } else {
        fd.append('mrpPrice', mrp);
        fd.append('salesPrice', sales || mrp);
        fd.append('stock', stock);
      }

      fd.append('enteredPrice', mrp);
      fd.append('status', status);
      fd.append('showVariants', showVariants ? 'true' : 'false');
      fd.append('variants', JSON.stringify(parsedVarList));

      if (mainFile) fd.append('mainImage', mainFile);
      if (videoFile) fd.append('thumbVideo', videoFile);
      if (removeVideo) fd.append('removeVideo', 'true');
      newThumbFiles.forEach(f => fd.append('thumbnails', f));
      fd.append('removedThumbIds', JSON.stringify(removedThumbIds));
      fd.append('specifications', JSON.stringify(features));
      fd.append('isBestSeller', isBestSeller);
      fd.append('isTrending', isTrending);
      fd.append('isNewArrival', isNewArrival);
      fd.append('isTopRated', isTopRated);

      if (editId) {
        await axios.put(`${API}/products/update/${editId}`, fd);
        toast.success('Product updated successfully!');
      } else {
        await axios.post(`${API}/products/add`, fd);
        toast.success('Product published successfully!');
      }

      await fetchAll(1);
      resetForm();
      setPage(1);
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  // ── DELETE ──
  const handleDelete = (id, productName) => {
    showConfirm(
      `Delete "${productName || 'this product'}"? This cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API}/products/delete/${id}`);
          toast.success('Product deleted successfully!');
          fetchAll(page, debouncedSearch, stockFilter);
        } catch (e) {
          toast.error('Delete failed: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
        }
      }
    );
  };

  // ── Pagination (server-side with debounced search & filter) ──
  const current = products;
  const safePage = page;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n); return acc;
    }, []);


  // ══════════════════════════════════════════
  // FORM VIEW
  // ══════════════════════════════════════════
  if (panel === 'bulk') return (
    <div className="pp-wrap">
      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={() => setPanel('list')}>← Back</button>
        <div>
          <h2 className="pp-form-title">Bulk Upload Products</h2>
          <p className="bulk-page-subtitle">Add up to 500 products from one spreadsheet.</p>
        </div>
      </div>
      <div className="bulk-upload-card">
        <div className="bulk-intro">
          <div className="bulk-icon">⇧</div>
          <div>
            <h3>Import your product catalogue</h3>
            <p>Upload an Excel or CSV file. We validate every row before anything is added to your store.</p>
          </div>
          <button type="button" className="bulk-template-btn" onClick={downloadBulkTemplate}>↓ Download template</button>
        </div>
        <label className={`bulk-dropzone ${bulkLoading ? 'is-loading' : ''}`}>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={previewBulkUpload} />
          <span className="bulk-upload-icon">☁</span>
          <strong>{bulkFileName || 'Choose an Excel or CSV file'}</strong>
          <span>{bulkFileName ? 'Click to choose another file' : 'XLSX, XLS or CSV · Maximum 10 MB'}</span>
        </label>
        <div className="bulk-columns">
          <strong>Required columns</strong>
          <span>name</span><span>category</span><span>mrpPrice</span><span>salesPrice</span><span>stock</span>
          <em>Optional: description, collection, status and collection flags</em>
        </div>
        {bulkLoading && <div className="bulk-loading">Reading and validating your file…</div>}
        {bulkSummary && <>
          <div style={{ display: 'flex', gap: 16, margin: '14px 0', fontWeight: 700 }}>
            <span>Total: {bulkSummary.total}</span>
            <span style={{ color: '#15803d' }}>Valid: {bulkSummary.valid}</span>
            <span style={{ color: '#dc2626' }}>Errors: {bulkSummary.invalid}</span>
          </div>
          <div className="pp-table-scroll">
            <table className="pp-table">
              <thead><tr><th>Row</th><th>Product</th><th>Result</th></tr></thead>
              <tbody>
                {bulkRows.map(row => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.product?.name || '—'}</td>
                    <td style={{ color: row.valid ? '#15803d' : '#dc2626' }}>{row.valid ? 'Ready to import' : row.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="pp-btn-add"
            disabled={bulkLoading || bulkSummary.invalid > 0 || bulkSummary.valid === 0}
            onClick={importBulkProducts}
            style={{ marginTop: 18 }}
          >
            {bulkLoading ? 'Importing…' : `Import ${bulkSummary.valid} Products`}
          </button>
        </>}
      </div>
    </div>
  );

  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">{editId ? 'Edit Product' : 'New Product'}</h2>
      </div>

      <form className="pp-form-grid" onSubmit={handleSubmit} noValidate>

        {/* ══ LEFT COLUMN: Product Details, Pricing & Variants, Specs ══ */}
        <div className="pp-form-left">

          {/* Basic Info */}
          <div className="pp-section-card">
            <div className="pp-section-label">Basic Info</div>
            <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '-4px', marginBottom: '14px', fontFamily: "'Poppins', sans-serif" }}>
              Enter the product name and a clear description. The description appears on the product detail page.
            </p>
            <input
              className={`pp-input ${errors.name ? 'invalid-input' : ''}`}
              placeholder="Product name *"
              value={name}
              maxLength={80}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
            />
            <CharCount current={name.length} min={3} max={80} />
            {errors.name && <span className="error-msg">{errors.name}</span>}

            <textarea
              className={`pp-input pp-textarea ${errors.desc ? 'invalid-input' : ''}`}
              placeholder="Product description *"
              value={desc}
              maxLength={1000}
              onChange={e => {
                setDesc(e.target.value);
                if (errors.desc) setErrors(prev => ({ ...prev, desc: '' }));
              }}
              rows={3}
              style={{ marginTop: errors.name ? '0px' : '12px' }}
            />
            <CharCount current={desc.length} min={20} max={1000} />
            {errors.desc && <span className="error-msg" style={{ marginBottom: '12px' }}>{errors.desc}</span>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: errors.desc ? '0px' : '12px' }}>
              <div>
                <select
                  className={`pp-input pp-select ${errors.catId ? 'invalid-input' : ''}`}
                  value={catId}
                  onChange={e => {
                    setCatId(e.target.value);
                    if (errors.catId) setErrors(prev => ({ ...prev, catId: '' }));
                  }}
                >
                  <option value="">Select Category *</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.catId && <span className="error-msg">{errors.catId}</span>}
              </div>
              <div>
                <select
                  className="pp-input pp-select"
                  value={collectionId}
                  onChange={e => setCollectionId(e.target.value)}
                >
                  <option value="">Select Collection (Optional)</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label className="pp-field-label" style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Product Status</label>
              <select
                className="pp-input pp-select"
                value={status ? 'true' : 'false'}
                onChange={e => setStatus(e.target.value === 'true')}
              >
                <option value="true">Active (Public)</option>
                <option value="false">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Price & Stock Section */}
          <div className="pp-section-card">
            <div className="pp-price-header-row">
              <div className="pp-section-label" style={{ marginBottom: 0 }}>Price & Stock</div>
              {showVariants && (
                <span className="pp-disabled-notice-badge">Disabled · Using variant pricing</span>
              )}
            </div>
            {showVariants && (
              <p className="pp-variant-active-note">
                Used only when this product has no variants.
              </p>
            )}
            <div className={`pp-price-row ${showVariants ? 'pp-price-row-disabled' : ''}`} style={{ marginTop: '14px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="pp-price-group">
                <label className="pp-price-label">MRP (₹) {!showVariants && '*'}</label>
                <input
                  className={`pp-input pp-price-input ${errors.mrp ? 'invalid-input' : ''}`}
                  type="number"
                  placeholder="0.00"
                  value={mrp}
                  disabled={showVariants}
                  onChange={e => {
                    setMrp(e.target.value);
                    if (errors.mrp) setErrors(prev => ({ ...prev, mrp: '' }));
                    if (errors.sales) setErrors(prev => ({ ...prev, sales: '' }));
                  }}
                />
                {errors.mrp && !showVariants && <span className="error-msg">{errors.mrp}</span>}
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">Sales Price (₹) {!showVariants && '*'}</label>
                <input
                  className={`pp-input pp-price-input ${errors.sales ? 'invalid-input' : ''}`}
                  type="number"
                  placeholder="0.00"
                  value={sales}
                  disabled={showVariants}
                  onChange={e => {
                    setSales(e.target.value);
                    if (errors.sales) setErrors(prev => ({ ...prev, sales: '' }));
                  }}
                />
                {errors.sales && !showVariants && <span className="error-msg">{errors.sales}</span>}
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">Stock quantity {!showVariants && '*'}</label>
                <input
                  className={`pp-input pp-price-input ${errors.stock ? 'invalid-input' : ''}`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={stock}
                  disabled={showVariants}
                  onChange={e => {
                    setStock(e.target.value);
                    if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
                  }}
                />
                {errors.stock && !showVariants && <span className="error-msg">{errors.stock}</span>}
              </div>
            </div>
            {!showVariants && mrp && sales && Number(mrp) > Number(sales) && (
              <div className="pp-discount-badge">{Math.round(((mrp - sales) / mrp) * 100)}% OFF</div>
            )}
          </div>

          {/* Variants Section */}
          <div className="pp-section-card pp-variants-card">
            <div className="pp-variants-header-row">
              <div>
                <div className="pp-section-label" style={{ marginBottom: '4px' }}>Has variants</div>
                <p className="pp-section-hint" style={{ margin: 0 }}>
                  Optional • turn on if this product has size, inch or other choices
                </p>
              </div>
              <label className="pp-switch">
                <input
                  type="checkbox"
                  checked={showVariants}
                  onChange={e => {
                    const checked = e.target.checked;
                    setShowVariants(checked);
                    if (checked && (!variants || variants.length === 0)) {
                      setVariants([emptyVariant()]);
                    }
                  }}
                />
                <span className="pp-slider"></span>
              </label>
            </div>

            {showVariants && (
              <div className="pp-variants-container" style={{ marginTop: '16px' }}>
                <div className="pp-variants-list">
                  {variants.map((variant, index) => (
                    <div className="pp-variant-card-row" key={index}>
                      <div className="pp-variant-row-top">
                        <div className="pp-variant-row-title">
                          <span className="pp-variant-title-text">Variant {index + 1}</span>
                          {index === 0 ? (
                            <span className="pp-variant-badge-default">Default • shown first</span>
                          ) : (
                            <button
                              type="button"
                              className="pp-variant-remove-btn"
                              onClick={() => setVariants(prev => prev.filter((_, i) => i !== index))}
                            >
                              Remove ×
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pp-variant-grid-fields">
                        <div className="pp-vfield-group">
                          <label className="pp-vfield-label">Type</label>
                          <select
                            className="pp-input pp-select"
                            value={variant.optionKind}
                            onChange={e => updateVariant(index, 'optionKind', e.target.value)}
                          >
                            <option value="Size">Size</option>
                            <option value="Inches">Inches</option>
                            <option value="Custom">Custom</option>
                          </select>
                          {variant.optionKind === 'Custom' && (
                            <input
                              className="pp-input"
                              style={{ marginTop: '6px' }}
                              placeholder="Type name (e.g. Weight)"
                              value={variant.customLabel}
                              onChange={e => updateVariant(index, 'customLabel', e.target.value)}
                            />
                          )}
                        </div>

                        <div className="pp-vfield-group">
                          <label className="pp-vfield-label">Value</label>
                          <input
                            className="pp-input"
                            placeholder="e.g. 2.4 / 6 inch / Adjustable"
                            value={variant.variantValue}
                            onChange={e => updateVariant(index, 'variantValue', e.target.value)}
                          />
                        </div>

                        <div className="pp-vfield-group">
                          <label className="pp-vfield-label">MRP (₹)</label>
                          <input
                            className="pp-input"
                            type="number"
                            placeholder="0.00"
                            value={variant.mrpPrice}
                            onChange={e => updateVariant(index, 'mrpPrice', e.target.value)}
                          />
                        </div>

                        <div className="pp-vfield-group">
                          <label className="pp-vfield-label">Sale (₹)</label>
                          <input
                            className="pp-input"
                            type="number"
                            placeholder="0.00"
                            value={variant.salesPrice}
                            onChange={e => updateVariant(index, 'salesPrice', e.target.value)}
                          />
                        </div>

                        <div className="pp-vfield-group">
                          <label className="pp-vfield-label">Stock</label>
                          <input
                            className="pp-input"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={variant.stock}
                            onChange={e => updateVariant(index, 'stock', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pp-variant-footer-bar">
                  {variants.length < 30 ? (
                    <button
                      type="button"
                      className="pp-add-variant-btn"
                      onClick={() => setVariants(prev => [...prev, emptyVariant()])}
                    >
                      + Add extra variant
                    </button>
                  ) : (
                    <span className="pp-variant-limit-reached">Maximum 30 variants reached</span>
                  )}
                  <span className="pp-variant-counter-badge">{variants.length} / 30 variants</span>
                </div>

                {errors.variants && <span className="error-msg" style={{ display: 'block', marginTop: '10px' }}>{errors.variants}</span>}
              </div>
            )}
          </div>

          {/* Features / Specifications */}
          <div className="pp-section-card">
            <div className="pp-section-label">
              <span>Product Specifications</span>
              <span className="pp-feature-count">{features.length}/10</span>
            </div>
            <p className="pp-section-hint">Min 3 – Max 10 specifications. Each heading: 2–60 chars. Description: up to 300 chars.</p>
            <div className="pp-features-list">
              {features.map((f, i) => (
                <div key={i} className="pp-feature-row">
                  <div className="pp-feature-num">{i + 1}</div>
                  <div className="pp-feature-fields">
                    <input
                      className="pp-input pp-feat-heading"
                      placeholder="specification"
                      value={f.heading}
                      maxLength={60}
                      onChange={e => setFeatureField(i, 'heading', e.target.value)}
                    />
                    <CharCount current={f.heading.length} min={0} max={60} />
                    <textarea
                      className="pp-input pp-feat-desc"
                      placeholder="description"
                      value={f.description}
                      maxLength={300}
                      onChange={e => setFeatureField(i, 'description', e.target.value)}
                      rows={2}
                    />
                    <CharCount current={f.description.length} min={0} max={300} />
                  </div>
                  {features.length > 3 && (
                    <button type="button" className="pp-feature-del" onClick={() => removeFeature(i)} title="Remove feature">✕</button>
                  )}
                </div>
              ))}
            </div>
            {errors.features && <span className="error-msg" style={{ marginBottom: '14px', display: 'block' }}>{errors.features}</span>}
            {features.length < 10 && (
              <button type="button" className="pp-add-feature-btn" onClick={addFeature}>
                + Add Specification
              </button>
            )}
          </div>

        </div>

        {/* ══ RIGHT COLUMN: Media, Collections, Save Actions ══ */}
        <div className="pp-form-right">

          {/* Main Image */}
          <div className="pp-section-card">
            <div className="pp-section-label">Main Image</div>
            <div
              className={`pp-main-upload-area ${errors.mainImage ? 'invalid-input' : ''}`}
              onClick={() => document.getElementById('mainImgInput').click()}
            >
              {mainPrev
                ? <img src={mainPrev} alt="main" className="pp-main-preview" />
                : <div className="pp-upload-placeholder"><span className="pp-upload-icon">⬆</span><span>Click to upload main image</span></div>
              }
            </div>
            {errors.mainImage && <span className="error-msg" style={{ marginBottom: '14px' }}>{errors.mainImage}</span>}
            <input id="mainImgInput" type="file" accept="image/*" hidden onChange={handleMainImg} />
          </div>

          {/* Gallery Thumbnails */}
          <div className="pp-section-card">
            <div className="pp-section-label">
              Gallery Images
              <span className={`pp-thumb-count ${totalThumbCount > 10 ? 'warn' : ''}`}>{totalThumbCount}/10</span>
            </div>
            <p className="pp-section-hint">Add up to 10 thumbnail images (optional).</p>
            <div className="pp-thumb-grid">
              {activeExisting.map(t => (
                <div key={`ex-${t.id}`} className="pp-thumb-item">
                  <img src={IMG + t.image} alt="" />
                  <button type="button" className="pp-thumb-del" onClick={() => removeExistingThumb(t.id)}>✕</button>
                </div>
              ))}
              {newThumbPrevs.map((src, i) => (
                <div key={`new-${i}`} className="pp-thumb-item pp-thumb-new">
                  <img src={src} alt="" />
                  <button type="button" className="pp-thumb-del" onClick={() => removeNewThumb(i)}>✕</button>
                  <span className="pp-thumb-badge">New</span>
                </div>
              ))}
              {totalThumbCount < 10 && (
                <div className="pp-thumb-add" onClick={() => thumbInput.current.click()}>
                  <span>+</span>
                  <span className="pp-thumb-add-label">Add</span>
                </div>
              )}
            </div>
            <input ref={thumbInput} type="file" accept="image/*" multiple hidden onChange={handleThumbs} />
            <p className="pp-thumb-hint">{10 - totalThumbCount} slots remaining (optional)</p>
          </div>

          {/* Thumbnail Video */}
          <div className="pp-section-card">
            <div className="pp-section-label">
              <span>Thumbnail Video (Optional)</span>
              {videoPrev && (
                <button type="button" className="pp-variant-del" style={{ fontSize: '13px', padding: '2px 8px' }} onClick={(e) => {
                  e.stopPropagation();
                  setVideoFile(null);
                  setVideoPrev(null);
                  if (existingVideo) setRemoveVideo(true);
                }}>Remove Video</button>
              )}
            </div>
            <div
              className="pp-main-upload-area"
              onClick={() => videoInput.current.click()}
              style={{ height: '140px' }}
            >
              {videoPrev
                ? <video src={videoPrev} controls className="pp-main-preview" style={{ maxHeight: '100%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
                : <div className="pp-upload-placeholder"><span className="pp-upload-icon">🎥</span><span>Click to upload demo video</span></div>
              }
            </div>
            <input ref={videoInput} type="file" accept="video/*" hidden onChange={e => {
              const f = e.target.files[0]; if (!f) return;
              setVideoFile(f); setVideoPrev(URL.createObjectURL(f)); setRemoveVideo(false);
            }} />
          </div>

          {/* Collections */}
          <div className="pp-section-card">
            <div className="pp-section-label">Add to Collections</div>
            <div className="pp-collections-grid">
              <label className={`pp-collection-box ${isBestSeller ? 'active' : ''}`}>
                <input type="checkbox" checked={isBestSeller} onChange={e => setIsBestSeller(e.target.checked)} hidden />
                <span className="pp-col-icon"></span>
                <span className="pp-col-name">Best Seller</span>
                <span className={`pp-col-check ${isBestSeller ? 'on' : ''}`}>{isBestSeller ? '✓' : '+'}</span>
              </label>
              <label className={`pp-collection-box ${isTopRated ? 'active toprated' : ''}`}>
                <input type="checkbox" checked={isTopRated} onChange={e => setIsTopRated(e.target.checked)} hidden />
                <span className="pp-col-icon">⭐</span>
                <span className="pp-col-name">Top Rated</span>
                <span className={`pp-col-check ${isTopRated ? 'on' : ''}`}>{isTopRated ? '✓' : '+'}</span>
              </label>
              <label className={`pp-collection-box ${isNewArrival ? 'active newarrival' : ''}`}>
                <input type="checkbox" checked={isNewArrival} onChange={e => setIsNewArrival(e.target.checked)} hidden />
                <span className="pp-col-icon">🆕</span>
                <span className="pp-col-name">New Arrival</span>
                <span className={`pp-col-check ${isNewArrival ? 'on' : ''}`}>{isNewArrival ? '✓' : '+'}</span>
              </label>
            </div>
            {(isBestSeller || isTopRated || isNewArrival) && (
              <div className="pp-col-selected">
                {isBestSeller && <span className="pp-col-tag best">Best Seller</span>}
                {isTopRated && <span className="pp-col-tag toprated">Top Rated</span>}
                {isNewArrival && <span className="pp-col-tag newarrival">New Arrival</span>}
              </div>
            )}
          </div>

          {/* Save Actions */}
          <div className="pp-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', marginBottom: '20px' }}>
            <button type="button" className="pp-btn-cancel" onClick={resetForm}>Discard</button>
            <button type="submit" className="pp-btn-save" disabled={saving}>
              {saving ? 'Saving...' : (editId ? 'Update Product' : 'Publish Product')}
            </button>
          </div>

        </div>
      </form>
    </div>
  );

  // ══════════════════════════════════════════
  // VIEW PANEL
  // ══════════════════════════════════════════
  if (panel === 'view' && viewProd) return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={() => { setViewProd(null); setPanel('list'); }}>← Back</button>
        <h2 className="pp-form-title">Product Detail</h2>
        <button className="pp-btn-edit-top" onClick={() => openEdit(viewProd)}>✏ Edit</button>
      </div>

      <div className="pp-view-grid">
        {/* Media */}
        <div className="pp-view-media">
          {viewProd.mainImage && <img src={IMG + viewProd.mainImage} className="pp-view-main" alt={viewProd.name} />}
          {viewProd.thumbnails?.length > 0 && (
            <div className="pp-view-thumbs">
              {viewProd.thumbnails.map((t, i) => <img key={i} src={IMG + t.image} className="pp-view-thumb" alt="" />)}
            </div>
          )}
          {viewProd.thumbVideo && (
            <div className="pp-view-video-section" style={{ marginTop: '16px' }}>
              <div className="pp-view-price-label" style={{ marginBottom: '8px' }}>Product Demo Video</div>
              <video src={IMG + viewProd.thumbVideo} controls style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pp-view-info">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="pp-view-cat">{viewProd.category?.name || 'Uncategorised'}</span>
            <span className="pp-view-cat" style={{ background: viewProd.status === false ? '#f1f5f9' : '#dcfce3', color: viewProd.status === false ? '#475569' : '#166534', borderColor: 'transparent' }}>
              {viewProd.status === false ? 'Inactive' : 'Active'}
            </span>
          </div>
          <h2 className="pp-view-name">{viewProd.name}</h2>

          {/* Badges */}
          {(viewProd.isBestSeller || viewProd.isTopRated || viewProd.isNewArrival) && (
            <div className="pp-col-selected" style={{ marginBottom: '14px' }}>
              {viewProd.isBestSeller && <span className="pp-col-tag best">Best Seller</span>}
              {viewProd.isTopRated && <span className="pp-col-tag toprated">Top Rated</span>}
              {viewProd.isNewArrival && <span className="pp-col-tag newarrival">New Arrival</span>}
            </div>
          )}

          <p className="pp-view-desc">{viewProd.description || 'No description.'}</p>

          {/* Pricing */}
          {(viewProd.mrpPrice || viewProd.salesPrice) && (
            <div className="pp-view-pricing">
              <div className="pp-view-price-label">Main Listing Price</div>
              <div className="pp-view-prices">
                {viewProd.mrpPrice && <span className="pp-view-mrp">MRP ₹{Number(viewProd.mrpPrice).toLocaleString('en-IN')}</span>}
                {viewProd.salesPrice && <span className="pp-view-sales">₹{Number(viewProd.salesPrice).toLocaleString('en-IN')}</span>}
                {viewProd.mrpPrice && viewProd.salesPrice && Number(viewProd.mrpPrice) > Number(viewProd.salesPrice) && (
                  <span className="pp-view-off">{Math.round(((viewProd.mrpPrice - viewProd.salesPrice) / viewProd.mrpPrice) * 100)}% off</span>
                )}
              </div>
            </div>
          )}

          {/* Stock */}
          <div className="pp-view-stock-row">
            <span>Total Stock</span>
            <strong>{viewProd.stock || 0} units</strong>
          </div>
          {(viewProd.stock || 0) <= 10 && (
            <div className="pp-out-warn">⚠ {(viewProd.stock || 0) === 0 ? 'Out of Stock' : 'Low Stock — below 10 units'}</div>
          )}

          {/* Variants Table if any */}
          {viewProd.variants?.filter(v => v.variantType && v.variantValue)?.length > 0 && (
            <div className="pp-view-features" style={{ marginTop: '18px' }}>
              <div className="pp-view-price-label" style={{ marginBottom: '12px' }}>Product Variants</div>
              <div className="pp-table-scroll" style={{ border: '1.5px solid #e5e5e5', borderRadius: '8px' }}>
                <table className="pp-table" style={{ minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>S.No</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>MRP</th>
                      <th>Sale Price</th>
                      <th style={{ textAlign: 'center' }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewProd.variants.filter(v => v.variantType && v.variantValue).map((v, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><span className="pp-cat-badge">{v.variantType}</span></td>
                        <td><strong>{v.variantValue}</strong></td>
                        <td>₹{Number(v.mrpPrice || 0).toLocaleString('en-IN')}</td>
                        <td><strong style={{ color: '#c49a20' }}>₹{Number(v.salesPrice || 0).toLocaleString('en-IN')}</strong></td>
                        <td style={{ textAlign: 'center' }}><strong>{v.stock || 0}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Specifications */}
          {viewProd.specifications?.length > 0 && (
            <div className="pp-view-features">
              <div className="pp-view-price-label" style={{ marginBottom: '12px' }}>Product Specifications</div>
              <div className="pp-view-features-list">
                {viewProd.specifications.map((f, i) => (
                  <div key={i} className="pp-view-feature-item">
                    <div className="pp-view-feat-num">{i + 1}</div>
                    <div className="pp-view-feat-body">
                      {f.heading && <div className="pp-view-feat-heading">{f.heading}</div>}
                      {f.description && <div className="pp-view-feat-desc">{f.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════
  // TABLE LIST
  // ══════════════════════════════════════════
  return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-list-topbar">
        <div className="pp-list-title">
          <h2>Products</h2>
          <span className="pp-count-pill">{totalProducts} total</span>
        </div>
        {stockFilter !== 'all' && (
          <div className="pp-filter-pill">
            Showing <strong>{stockFilter === 'outofstock' ? 'Out of Stock' : stockFilter === 'lowstock' ? 'Low Stock' : 'In Stock'}</strong> products
          </div>
        )}
        <div className="pp-list-actions">
          <div className="pp-search-box">
            <RiSearchLine className="pp-search-icon" />
            <input
              placeholder="Search by product, SKU, category, collection, variant or ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <RiCloseLine
                className="cp-search-clear"
                onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
            )}
          </div>
          <button className="pp-btn-cancel" onClick={openBulkUpload}>Bulk Upload</button>
          <button className="pp-btn-add" onClick={openAdd}>+ New Product</button>
        </div>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '65px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '145px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>S.No</th>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th>Collections</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', paddingRight: '16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading products…</td></tr>
              ) : productLoadError ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#b91c1c' }}>
                  <div>{productLoadError}</div>
                  <button type="button" className="pp-btn-cancel" style={{ marginTop: '12px' }} onClick={() => fetchAll(page, debouncedSearch, stockFilter)}>Retry</button>
                </td></tr>
              ) : current.length > 0 ? current.map((p, idx) => {
                const rowNum = (safePage - 1) * PER_PAGE + idx + 1;
                const stock = p.stock || 0;
                const stockStatus = stock > 10 ? 'in' : stock > 0 ? 'low' : 'out';
                const stockLabel = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
                const rowMrp = p.mrpPrice;
                const rowSale = p.salesPrice;
                const variantCount = (p.variants || []).filter(v => v.variantType && v.variantValue).length;

                return (
                  <tr key={p.id}>
                    <td className="pp-td-num">{rowNum}</td>
                    <td className="pp-td-img">
                      {p.mainImage ? (
                        <img
                          src={IMG + p.mainImage}
                          className="pp-tbl-img"
                          alt={p.name || 'Product'}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                          }}
                        />
                      ) : (
                        <div className="pp-tbl-no-img">—</div>
                      )}
                    </td>
                    <td className="pp-td-name">
                      <div className="pp-name-main">{p.name}</div>
                      {variantCount > 0 && (
                        <div style={{ marginTop: '2px' }}>
                          <span className="pp-variant-counter-tag">{variantCount} variants</span>
                        </div>
                      )}
                      {p.description && (
                        <div className="pp-name-desc">{p.description.slice(0, 40)}{p.description.length > 40 ? '…' : ''}</div>
                      )}
                    </td>
                    <td className="pp-td-cat"><span className="pp-cat-badge">{p.category?.name || '—'}</span></td>
                    <td className="pp-td-price">
                      {(!rowMrp && !rowSale) ? (
                        <span className="pp-price-empty">—</span>
                      ) : (
                        <div className="pp-price-stack">
                          {rowSale && <span className="pp-td-sale">₹{Number(rowSale).toLocaleString('en-IN')}</span>}
                          {rowMrp && Number(rowMrp) !== Number(rowSale) && (
                            <span className="pp-td-mrp">₹{Number(rowMrp).toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pp-stock-num">{stock}</span>
                    </td>
                    <td>
                      <div className="pp-tbl-cols">
                        {p.isBestSeller && <span className="pp-tbl-col-tag best">Best</span>}
                        {p.isTopRated && <span className="pp-tbl-col-tag toprated">Top</span>}
                        {p.isNewArrival && <span className="pp-tbl-col-tag newarrival">New</span>}
                        {!p.isBestSeller && !p.isTopRated && !p.isNewArrival && (
                          <span style={{ color: '#b0c4da', fontSize: '12px' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`pp-status-badge ${stockStatus}`}>
                        {stockLabel}
                      </span>
                    </td>
                    <td>
                      <div className="pp-action-btns">
                        <button className="pp-act-btn view" title="View Details" onClick={() => openView(p)}>
                          <FiEye />
                        </button>
                        <button className="pp-act-btn edit" title="Edit Product" onClick={() => openEdit(p)}>
                          <FiEdit2 />
                        </button>
                        <button className="pp-act-btn del" title="Delete Product" onClick={() => handleDelete(p.id, p.name)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#868686' }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pp-pagination">
            <span className="pp-page-info">
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, totalProducts)} of {totalProducts} products
            </span>
            <div className="pp-page-controls">
              <button
                type="button"
                className="pp-page-btn pp-page-nav"
                disabled={safePage === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                ‹ Previous
              </button>
              <div className="pp-page-numbers">
                {pageNumbers.map((num, i) =>
                  num === '...' ? (
                    <span key={i} className="pp-page-dots">…</span>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      className={`pp-page-num ${safePage === num ? 'active' : ''}`}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                className="pp-page-btn pp-page-nav"
                disabled={safePage === totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
