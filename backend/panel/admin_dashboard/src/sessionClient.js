import axios from 'axios';
import { API } from './config';
const base = API;
const channel = 'admin';
const transport = axios.create({ withCredentials: true, headers: { 'X-Client-Type': channel } });
let snapshot = null, pending = null;
const listeners = new Set();
export const getSession = () => snapshot;
export const subscribeSession = callback => { listeners.add(callback); return () => listeners.delete(callback); };
const publish = value => { snapshot = value; listeners.forEach(callback => callback()); return value; };
export async function refreshSession() {
  try {
    const { data } = await transport.get(base + '/session');
    return publish(data);
  } catch (err) {
    console.warn('Session refresh failed:', err.message);
    const fallback = snapshot || { customer: null, admin: null, csrfToken: '', preferences: {} };
    return publish(fallback);
  }
}
export function ensureSession() {
 if (snapshot) return Promise.resolve(snapshot);
 if (!pending) pending = refreshSession().finally(() => { pending = null; });
 return pending;
}
axios.interceptors.request.use(async config => {
 if (!String(config.url || '').startsWith(base)) return config;
 const session = await ensureSession();
 config.withCredentials = true;
 config.headers['X-Client-Type'] = channel;
 delete config.headers.Authorization;
 delete config.headers['x-admin-request'];
 if (!['get','head','options'].includes(String(config.method || 'get').toLowerCase())) config.headers['X-CSRF-Token'] = session.csrfToken;
 return config;
});
axios.interceptors.response.use(
 response => {
  if (response.headers['x-csrf-token'] && snapshot) publish({ ...snapshot, csrfToken: response.headers['x-csrf-token'] });
  return response;
 },
 async error => {
  const originalRequest = error.config;
  if (error.response?.data?.code === 'CSRF_FAILED' && originalRequest && !originalRequest._retried) {
   originalRequest._retried = true;
   try {
    const newSession = await refreshSession();
    if (newSession?.csrfToken) {
     originalRequest.headers['X-CSRF-Token'] = newSession.csrfToken;
     return axios(originalRequest);
    }
   } catch (_) {
    return Promise.reject(error);
   }
  }
  return Promise.reject(error);
 }
);
export async function savePreference(key, value) {
 const { data } = await axios.put(base + '/session/preferences', { [key]: value });
 publish({ ...snapshot, preferences: data });
}
export async function endSession() {
 await axios.post(base + '/session/logout');
 return refreshSession();
}
export async function sessionFetch(url, options = {}) {
 const session = await ensureSession();
 const result = await fetch(url, { ...options, credentials: 'include', headers: { ...options.headers, 'X-Client-Type': channel, 'X-CSRF-Token': session.csrfToken } });
 return result;
}
// One-time import only. No new business data or credentials are written to browser storage.
async function importBrowserStorageOnce() {
 await ensureSession();
 const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
 const guestTokens = {};
 for (let n = 0; n < localStorage.length; n++) { const key = localStorage.key(n); if (key?.startsWith('orderReviewAccess:')) guestTokens[key.slice(18)] = localStorage.getItem(key); }
 const keys = ['adminToken','adminId','adminName','adminRole','admin_notif_muted','admin_notif_dismissed_time'];
 const hasData = keys.some(key => localStorage.getItem(key) !== null) || Object.keys(guestTokens).length || sessionStorage.getItem('baani_deal_popup_dismissed');
 if (!hasData) return snapshot;
 const { data } = await axios.post(base + '/session/import-legacy', {
  token: localStorage.getItem('adminToken'), guestTokens,
  orderHints: read('guestOrderHistory') || [],
  legacyCustomerId: read('customer')?.id || null,
  cartItems: read('cartItems') || [], wishlistItems: read('wishlistItems') || [],
  preferences: { dealDismissed: sessionStorage.getItem('baani_deal_popup_dismissed') === 'true', admin_notif_muted: localStorage.getItem('admin_notif_muted') === 'true', admin_notif_dismissed_time: Number(localStorage.getItem('admin_notif_dismissed_time') || 0) }
 });
 if (data.success) {
  keys.forEach(key => localStorage.removeItem(key));
  Object.keys(guestTokens).forEach(id => localStorage.removeItem('orderReviewAccess:' + id));
  sessionStorage.removeItem('baani_deal_popup_dismissed');
 }
 return refreshSession();
}

let migrationPending;
export function migrateBrowserStorage() {
 if (!migrationPending) migrationPending = importBrowserStorageOnce().finally(() => { migrationPending = null; });
 return migrationPending;
}
