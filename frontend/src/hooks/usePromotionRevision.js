import { useEffect, useState } from 'react';

// Prices are refreshed when the server's promotion clock crosses a boundary.
export default function usePromotionRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('promotions-changed', refresh);
    return () => window.removeEventListener('promotions-changed', refresh);
  }, []);
  return revision;
}
