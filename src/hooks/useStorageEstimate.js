import { useState, useEffect } from 'react';

export function useStorageEstimate() {
  const [storage, setStorage] = useState({ used: 0, quota: 0 });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/storage');
        if (res.ok) {
          const data = await res.json();
          setStorage({
            used: data.used || 0,
            quota: data.quota || 0,
          });
        }
      } catch {}
    }
    load();
  }, []);

  const usedMB = (storage.used / 1024 / 1024).toFixed(1);
  const quotaMB = (storage.quota / 1024 / 1024).toFixed(0);
  const pct = storage.quota > 0 ? (storage.used / storage.quota) * 100 : 0;

  return { usedMB, quotaMB, pct };
}
