import { useEffect, useRef, useState } from 'react';
import { getMedia, getThumb } from '../../db';

function formatDuration(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatRatio(w, h) {
  if (!w || !h) return '';
  const r = w / h;
  if (Math.abs(r - 16/9) < 0.05) return '16:9';
  if (Math.abs(r - 9/16) < 0.05) return '9:16';
  if (Math.abs(r - 4/3) < 0.05) return '4:3';
  if (Math.abs(r - 3/4) < 0.05) return '3:4';
  if (Math.abs(r - 1) < 0.05) return '1:1';
  return `${w}:${h}`;
}

export default function MediaLightbox({ item, onClose }) {
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [refImageUrl, setRefImageUrl] = useState('');
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!item) { setMediaUrl(''); setRefImageUrl(''); setThumbUrl(''); return; }
    let cancelled = false;
    getMedia(item.id).then((url) => {
      if (!cancelled && url) setMediaUrl(url);
    });
    // Load reference image: use database reference_image_path if exists, otherwise fallback to thumbnail
    if (item.referenceImage) {
      // item.referenceImage contains the path from database (full-resolution first frame)
      setRefImageUrl(`/api/media/${item.id}/ref`);
    } else if (item.type === 'video') {
      // Fallback to thumbnail for videos without reference_image_path
      getThumb(item.id).then((url) => {
        if (!cancelled && url) setRefImageUrl(url);
      });
    } else {
      setRefImageUrl('');
    }
    if (item.type === 'video') {
      getThumb(item.id).then((url) => {
        if (!cancelled && url) setThumbUrl(url);
      });
    }
    return () => { cancelled = true; };
  }, [item]);

  // Block video fullscreen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.requestFullscreen = () => Promise.resolve();
    video.webkitRequestFullscreen = () => Promise.resolve();
    video.msRequestFullscreen = () => Promise.resolve();

    const exitFS = () => {
      if (document.fullscreenElement === video) document.exitFullscreen?.();
      if (document.webkitFullscreenElement === video) document.webkitExitFullscreen?.();
    };
    video.addEventListener('fullscreenchange', exitFS);
    video.addEventListener('webkitfullscreenchange', exitFS);

    const blockDbl = (e) => e.preventDefault();
    video.addEventListener('dblclick', blockDbl, true);

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnded = () => setPlaying(false);
    const handleTimeUpdate = () => {
      if (video.duration) setProgress((video.currentTime / video.duration) * 100);
    };
    const handleLoadedMetadata = () => setDuration(video.duration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('dblclick', blockDbl, true);
      video.removeEventListener('fullscreenchange', exitFS);
      video.removeEventListener('webkitfullscreenchange', exitFS);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    video.currentTime = pct * video.duration;
  };

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const copyPrompt = () => {
    if (!item?.prompt) return;
    navigator.clipboard.writeText(item.prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    }).catch(() => {});
  };

  if (!item) return null;

  const hasInfo = item.prompt || (item.tags && item.tags.length > 0) || (item.type === 'video' && refImageUrl) || item.videoMeta;
  const meta = item.videoMeta;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 border-none text-white/70 text-lg cursor-pointer flex items-center justify-center hover:bg-white/20 hover:text-white transition-all z-[101]"
      >
        ×
      </button>

      {/* Content */}
      <div className="flex items-center justify-center gap-5 max-w-[92vw] max-h-[92vh]">
        {/* Media */}
        <div className="flex items-center justify-center shrink-0">
          {mediaUrl ? (
            item.type === 'video' ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  poster={thumbUrl || undefined}
                  autoPlay
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  className="max-w-[70vw] max-h-[88vh] rounded-md cursor-pointer"
                  onClick={togglePlay}
                />
                {!playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer" onClick={togglePlay}>
                    <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21"/></svg>
                    </div>
                  </div>
                )}
                {/* Progress bar */}
                <div
                  onClick={handleSeek}
                  className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 cursor-pointer group/seek hover:h-2.5 transition-all rounded-b-md overflow-hidden"
                >
                  <div
                    className="h-full bg-white/80 transition-[width] duration-75 pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="absolute bottom-3.5 right-3 text-[11px] text-white/60 pointer-events-none select-none">
                  {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
                </div>
              </div>
            ) : (
              <img
                src={mediaUrl}
                alt={item.fileName || ''}
                className="max-w-[70vw] max-h-[88vh] rounded-md object-contain"
              />
            )
          ) : (
            <div className="w-[400px] h-[300px] bg-white/5 rounded-md animate-pulse" />
          )}
        </div>

        {/* Info panel */}
        {hasInfo && (
          <div className="w-[280px] shrink-0 bg-white/5 rounded-xl border border-white/10 flex flex-col" style={{ maxHeight: '88vh' }}>
            {/* Fixed header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/5">
              <h3 className="text-sm font-medium text-white/90 truncate">
                {item.type === 'audio' ? (item.fileName || '未命名音频') : (item.fileName || '未命名')}
              </h3>
              <p className="text-[11px] text-white/30 mt-0.5">Details</p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 min-h-0">
              {/* Prompt */}
              {item.prompt && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-white/30 uppercase tracking-wider">Prompt</span>
                    <button
                      onClick={copyPrompt}
                      className="text-white/30 hover:text-white/60 transition-colors cursor-pointer bg-transparent border-none p-0"
                      title="复制提示词"
                    >
                      {promptCopied ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h11"/></svg>
                      )}
                    </button>
                  </div>
                  <p className={`text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap break-words ${!showFullPrompt ? 'line-clamp-5' : ''}`}>
                    {item.prompt}
                  </p>
                  {item.prompt.length > 150 && (
                    <button
                      onClick={() => setShowFullPrompt(!showFullPrompt)}
                      className="text-[12px] text-white/40 hover:text-white/60 mt-1 bg-transparent border-none cursor-pointer p-0"
                    >
                      {showFullPrompt ? '收起' : 'See More'}
                    </button>
                  )}
                </div>
              )}

              {/* Reference image - only for video */}
              {item.type === 'video' && refImageUrl && (
                <div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider mb-2">参考图</div>
                  <div className="relative inline-block">
                    <img
                      src={refImageUrl}
                      alt="参考图"
                      className="w-16 h-16 rounded-lg object-cover border border-white/10"
                    />
                    <a
                      href={refImageUrl}
                      download={`ref_${item.id}.jpg`}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 rounded-lg transition-all opacity-0 hover:opacity-100"
                      title="下载参考图"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {/* Settings / Video metadata */}
              {item.type === 'video' && meta && (
                <div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Settings</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {meta.duration > 0 && (
                      <span className="text-[11px] bg-white/10 text-white/60 px-2.5 py-1 rounded-md">
                        {formatDuration(meta.duration)}
                      </span>
                    )}
                    {meta.width > 0 && meta.height > 0 && (
                      <span className="text-[11px] bg-white/10 text-white/60 px-2.5 py-1 rounded-md">
                        {formatRatio(meta.width, meta.height)}
                      </span>
                    )}
                    {meta.width > 0 && (
                      <span className="text-[11px] bg-white/10 text-white/60 px-2.5 py-1 rounded-md">
                        {meta.height}p
                      </span>
                    )}
                    <span className="text-[11px] bg-white/10 text-white/60 px-2.5 py-1 rounded-md">
                      {meta.hasAudio ? 'Audio On' : 'No Audio'}
                    </span>
                  </div>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Tags</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {item.tags.map((t) => (
                      <span key={t} className="text-[11px] bg-white/10 text-white/60 px-2.5 py-[3px] rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
