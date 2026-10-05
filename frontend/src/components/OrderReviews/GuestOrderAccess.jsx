import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../../config/apiConfig';
export default function GuestOrderAccess({ orderId, onVerified }) {
 const [sent, setSent] = useState(false), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
 const act = async verify => {
  setBusy(true); setMessage('');
  try {
   const { data } = await axios.post(API_BASE + '/api/session/order/' + (verify ? 'verify-access' : 'request-access'), { orderId, otp: code });
   if (verify) await onVerified(); else { setSent(true); setMessage(data.message); }
  } catch (error) { setMessage(error.response?.data?.message || 'Please try again.'); } finally { setBusy(false); }
 };
 return <div className="track-search-card"><p>Verify the email used for your guest order to view its details.</p>{message && <p role="status">{message}</p>}<div className="track-search-form"><button className="btn-track-submit" type="button" disabled={busy} onClick={() => act(false)}>{sent ? 'Resend code' : 'Send verification code'}</button>{sent && <><input aria-label="Order verification code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))} /><button className="btn-track-submit" type="button" disabled={busy || code.length !== 6} onClick={() => act(true)}>Verify</button></>}</div></div>;
}
