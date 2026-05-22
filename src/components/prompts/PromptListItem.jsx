import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getThumb, getMedia } from '../../db';
import { formatDate } from '../../utils/format';

export default function PromptListItem({ item, onOpenEdit }) {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [thumbUrl, setThumbUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    getThumb(item.id).then((url) => {
      if (cancelled) return;
      if (url) {
        setThumbUrl(url);
      } else {
        getMedia(item.id).then((full) => {
          if (!cancelled && full) setThumbUrl(full);
        });
      }
    });
    return () => { cancelled = true; };
  }, [item.id]);

  const handleCopy = () => {
    if (!item.prompt) return;
    navigator.clipboard.writeText(item.prompt).then(() => {
      setCopied(true);
      showToast('已复制到剪贴板');
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = item.prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      showToast('已复制到剪贴板');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="bg-surface border border-border rounded-[10px] p-3.5 mb-2.5 flex gap-3.5 items-start">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg shrink-0 bg-[#111] overflow-hidden relative flex items-center justify-center">
        {thumbUrl ? (
          item.type === 'video' ? (
            <>
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#333"><polygon points="5,3 19,12 5,21"/></svg>
                </div>
              </div>
            </>
          ) : (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="w-full h-full bg-surface2 animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {item.type === 'audio' ? (
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
            </svg>
            <span className="text-[13px] text-text">{item.fileName || '未命名音频'}</span>
          </div>
        ) : item.prompt ? (
          <div className="text-[13px] leading-relaxed text-text whitespace-pre-wrap break-words">
            {item.prompt}
          </div>
        ) : (
          <div className="text-[13px] text-text3 italic">未添加提示词</div>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {item.tags.map((t) => (
              <span key={t} className="text-[11px] bg-surface2 px-2 py-[2px] rounded-full text-text3">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-text3">{formatDate(item.createdAt)}</span>
          <button
            onClick={handleCopy}
            className={`px-3.5 py-1.5 rounded-md text-xs cursor-pointer transition-all
              ${copied
                ? 'bg-success text-white'
                : 'bg-accent text-white hover:bg-accent-hover'
              }
            `}
          >
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={() => onOpenEdit(item.id)}
            className="px-3 py-1.5 rounded-md bg-transparent text-text2 border border-border-light text-xs cursor-pointer transition-all hover:bg-surface2 hover:text-text"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
