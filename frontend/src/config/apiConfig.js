// Centralized API & Media URL Configuration for Frontend

export const API_BASE = import.meta.env.VITE_API_BASE_URL 
  || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '')
  || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? `http://${window.location.hostname}:8000` : (typeof window !== 'undefined' && (window.location.hostname === '172.16.0.191' || window.location.hostname.startsWith('172.16.')) ? 'http://172.16.0.191:8000' : 'https://baaniapi.baanijewels.com'));

export const API_URL = `${API_BASE}/api`;
export const IMG_BASE = `${API_BASE}/uploads/`;

export const getMediaUrl = (rawImg, fallback = '/assests/pr1.jpeg') => {
  if (!rawImg || typeof rawImg !== 'string') return fallback;
  const trimmed = rawImg.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/assests/')) return trimmed;
  if (trimmed.startsWith('/uploads/')) return `${API_BASE}${trimmed}`;
  if (trimmed.startsWith('uploads/')) return `${API_BASE}/${trimmed}`;
  return `${IMG_BASE}${trimmed}`;
};
