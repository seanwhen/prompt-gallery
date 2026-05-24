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

  const usedBytes = storage.used;
  const quotaBytes = storage.quota;

  // 已使用：低于 1GB 用 MB，超过 1GB 用 GB
  const usedStr = usedBytes < 1024 * 1024 * 1024
    ? `${(usedBytes / 1024 / 1024).toFixed(1)}MB`
    : `${(usedBytes / 1024 / 1024 / 1024).toFixed(2)}GB`;

  // 总容量：始终用 GB
  const quotaStr = `${(quotaBytes / 1024 / 1024 / 1024).toFixed(0)}GB`;

  const pct = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

  return { usedStr, quotaStr, pct };
}
