import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ShopContext } from '../../context/ShopContext';
import { API_BASE } from '../../config/apiConfig';
import ReviewMedia, { parseReviewMedia, isReviewVideo } from './ReviewMedia';
import './OrderReviews.css';
const endpoint = API_BASE + '/api/reviews';

export default function OrderReviews({ order }) {
  const { token } = useContext(ShopContext);
  const orderId = order.orderId || order.id;
  const delivered = (order.orderStatus || order.status) === 'Delivered';
  const [accessVersion, setAccessVersion] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [editing, setEditing] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [files, setFiles] = useState([]);
  const [retained, setRetained] = useState([]);
  const [cancelId, setCancelId] = useState(null);
  const headers = useMemo(() => ({}), [token, accessVersion]);
  const products = [...new Map((order.items || order.slots || []).filter(item => item.productId).map(item => [String(item.productId), item])).values()];
  useEffect(() => {
    setEditing(null); setCodeSent(false); setOtp(''); setReviews([]); setVerified(false);
  }, [orderId]);
  useEffect(() => {
    if (!delivered) return;
    let active = true;
    setFetching(true);
    const refresh = () => axios.get(endpoint + '/order/' + encodeURIComponent(orderId), { headers }).then(({ data }) => {
      if (active) { setReviews(data); setVerified(true); setError(''); }
    }).catch(err => { if (active) { setVerified(false); if (err.response?.status !== 401) setError(err.response?.data?.message || 'Unable to load reviews.'); } }).finally(() => { if (active) setFetching(false); });
    refresh();
    const onFocus = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', onFocus);
    const timer = setInterval(onFocus, 30000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [orderId, headers, delivered]);
  if (!delivered) return null;
  const run = async action => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (err) { setError(err.response?.data?.message || err.message || 'Please try again.'); } finally { setBusy(false); }
  };
  const startEdit = productId => {
    const review = reviews.find(row => String(row.productId) === String(productId));
    setEditing(productId); setRating(Number(review?.rating) || 5); setFeedback(review?.feedback || ''); setRetained(parseReviewMedia(review?.images)); setFiles([]); setError(''); setMessage('');
  };
  const save = () => run(async () => {
    const current = reviews.find(row => String(row.productId) === String(editing));
    const data = new FormData(); data.append('rating', rating); data.append('feedback', feedback); data.append('retainedMedia', JSON.stringify(retained));
    files.forEach(file => data.append('images', file));
    const { data: review } = await axios({ url: endpoint + '/order/' + encodeURIComponent(orderId) + '/product/' + editing, method: current ? 'put' : 'post', data, headers });
    setReviews(previous => [...previous.filter(row => String(row.productId) !== String(editing)), review]);
    setEditing(null); setMessage('Review submitted successfully! Thank you for sharing your feedback.');
  });
  return <section className="order-reviews" aria-label="Product reviews">
    <h3>Review your delivered products</h3>
    <p>Review each product separately. Photos and videos are optional.</p>
    {error && <p role="alert" className="review-error">{error}</p>}
    {message && <p role="status" className="review-message">{message}</p>}
    {fetching ? <p>Loading reviews...</p> : !verified ? <div className="review-verification">
      <p>Sign in with the account that placed this order, or verify a guest order using its delivery email.</p>
      <button type="button" disabled={busy} onClick={() => run(async () => { const { data } = await axios.post(`${API_BASE}/api/session/order/request-access`, { orderId }); setCodeSent(true); setMessage(data.message); })}>Send guest verification code</button>
      {codeSent && <div><label>Verification code<input inputMode="numeric" maxLength={6} pattern="[0-9]*" autoComplete="one-time-code" value={otp} onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><button type="button" disabled={busy || otp.length !== 6} onClick={() => run(async () => { await axios.post(`${API_BASE}/api/session/order/verify-access`, { orderId, otp }); setAccessVersion(v => v + 1); setCodeSent(false); setOtp(''); setMessage('Order verified successfully!'); })}>Verify order</button></div>}
    </div> : products.map(item => {
      const review = reviews.find(row => String(row.productId) === String(item.productId));
      const isEditing = String(editing) === String(item.productId);
      return <article className="order-review-item" key={item.productId}>
        <h4>{item.productName || item.Product?.name || 'Product'}</h4>
        {review && !isEditing && <>
          <p>
            <span className="review-stars" aria-label={review.rating + ' out of 5 stars'}>
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </span>
          </p>
          <p className="review-feedback">{review.feedback}</p>
          <ReviewMedia value={review.images} />
        </>}
        {!isEditing ? <div className="review-actions"><button type="button" disabled={busy} onClick={() => startEdit(item.productId)}>{review ? 'Edit review' : 'Add review'}</button>{review && <button type="button" disabled={busy} onClick={() => setCancelId(item.productId)}>Cancel review</button>}</div> : <div className="review-editor">
          <label>Rating<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}</select></label>
          <label>Your review<textarea maxLength={5000} rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} /></label>
          {retained.length > 0 && <div className="review-retained">{retained.map((file, index) => <label key={file}><input type="checkbox" checked onChange={() => setRetained(previous => previous.filter(value => value !== file))} /> Keep {isReviewVideo(file) ? 'video' : 'photo'} {index + 1}</label>)}</div>}
          <label>Photos / videos (optional)<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e => {
            const chosen = Array.from(e.target.files || []);
            if (chosen.length + retained.length > 5 || chosen.some(file => file.size > 10 * 1024 * 1024)) { setError('Up to 5 attachments, maximum 10 MB each.'); e.target.value = ''; setFiles([]); return; }
            setError(''); setFiles(chosen);
          }} /></label>
          <small>JPG, PNG, WebP, MP4 or WebM. Up to 5 files, 10 MB each.</small>
          <div className="review-actions"><button type="button" disabled={busy || !feedback.trim()} onClick={save}>{busy ? 'Saving...' : 'Submit Review'}</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Discard changes</button></div>
        </div>}
        {String(cancelId) === String(item.productId) && <div role="alert"><p>Cancel this review and remove it from the product page?</p><button type="button" disabled={busy} onClick={() => run(async () => { await axios.delete(endpoint + '/order/' + encodeURIComponent(orderId) + '/product/' + item.productId, { headers }); setReviews(previous => previous.filter(row => String(row.productId) !== String(item.productId))); setCancelId(null); setEditing(null); setMessage('Review cancelled.'); })}>Yes, cancel review</button><button type="button" disabled={busy} onClick={() => setCancelId(null)}>Keep review</button></div>}
      </article>;
    })}
  </section>;
}
