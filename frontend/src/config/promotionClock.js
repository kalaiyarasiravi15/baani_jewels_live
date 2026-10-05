import axios from 'axios';
import { API_BASE } from './apiConfig';

export function startPromotionClock() {
  let disposed = false, timer, running = false, lastSignature;
  const refresh = async () => {
    if (disposed || running) return;
    running = true;
    try {
      const { data } = await axios.get(`${API_BASE}/api/deals/clock`);
      if (disposed) return;
      if (lastSignature !== undefined && lastSignature !== data.signature) window.dispatchEvent(new Event('promotions-changed'));
      lastSignature = data.signature;
      clearTimeout(timer);
      const delay = data.nextChange ? Math.max(100, Math.min(30000, new Date(data.nextChange) - new Date(data.serverTime) + 100)) : 30000;
      timer = setTimeout(refresh, delay);
    } catch {
      if (!disposed) timer = setTimeout(refresh, 30000);
    } finally { running = false; }
  };
  refresh();
  window.addEventListener('focus', refresh);
  return () => { disposed = true; clearTimeout(timer); window.removeEventListener('focus', refresh); };
}
