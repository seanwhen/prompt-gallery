import { useState, useEffect } from 'react';

export function useStorageEstimate() {
  const [storage, setStorage] = useState({ used: 0, quota: 0 });

  useEffect(() => {
    async function load() {
      try {
        const estimate = await navigator.storage.estimate();
        setStorage({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      } catch {}
    }
    load();
  }, []);

  const usedMB = (storage.used / 1024 / 1024).toFixed(1);
  const quotaMB = (storage.quota / 1024 / 1024).toFixed(0);
  const pct = storage.quota > 0 ? (storage.used / storage.quota) * 100 : 0;

  return { usedMB, quotaMB, pct };
}
