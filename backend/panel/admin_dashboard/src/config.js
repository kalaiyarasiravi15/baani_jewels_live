const getLocalApiBase = () => {
  if (typeof window === 'undefined') return 'https://baanijewelsapi.com';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return `http://${window.location.hostname}:8000`;
  if (window.location.hostname === '172.16.0.191' || window.location.hostname.startsWith('172.16.')) return 'http://172.16.0.191:8000';
  return 'https://baanijewelsapi.com';
};
export const API = import.meta.env.VITE_API_URL || `${getLocalApiBase()}/api`;
export const IMG = import.meta.env.VITE_IMG_URL || `${getLocalApiBase()}/uploads/`;
