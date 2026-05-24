import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useApp } from '../../context/AppContext';
import { getMedia, getThumb } from '../../db';
import { formatDate } from '../../utils/format';

const MediaCard = memo(function MediaCard({ item, onOpenEdit, onOpenLightbox }) {
  const { state, dispatch, showToast, removeItem } = useApp();
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [hovering, setHovering] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const cardRef = useRef(null);

  const isSelected = state.selectedIds.includes(item.id);
  const isCurrentAudioPlaying = state.currentlyPlayingAudioId === item.id;

  // IntersectionObserver: load when enters viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
          setHovering(false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load media URL when visible
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    getMedia(item.id).then((url) => {
      if (!cancelled && url) setFullUrl(url);
    });
    if (item.type === 'video') {
      getThumb(item.id).then((url) => {
        if (!cancelled && url) setThumbUrl(url);
      });
    }
    return () => { cancelled = true; };
  }, [isVisible, item.id]);

  const loadFullMedia = useCallback(async () => {
    if (fullUrl) return;
    const url = await getMedia(item.id);
    if (url) setFullUrl(url);
  }, [item.id, fullUrl]);

  // Hover preview: play muted on enter, pause + reset on leave
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fullUrl) return;
    video.muted = muted;
    if (hovering) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [hovering, fullUrl, muted]);

  const toggleMute = (e) => {
    e.stopPropagation();
    setMuted((prev) => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

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

  const handleDelete = () => {
    if (!confirm('确定要删除这条记录吗？')) return;
    removeItem(item.id);
    showToast('已删除');
  };

  // Audio player handlers
  const toggleAudioPlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
      dispatch({ type: 'SET_CURRENT_AUDIO', audioId: null });
    } else {
      audio.play().catch(() => {});
      setAudioPlaying(true);
      dispatch({ type: 'SET_CURRENT_AUDIO', audioId: item.id });
    }
  };

  // Stop audio when another audio starts playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isCurrentAudioPlaying && audioPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setAudioPlaying(false);
      setAudioProgress(0);
    }
  }, [isCurrentAudioPlaying, audioPlaying]);

  const handleAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setAudioProgress(audio.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setAudioDuration(audio.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setAudioPlaying(false);
    setAudioProgress(0);
    dispatch({ type: 'SET_CURRENT_AUDIO', audioId: null });
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = percentage * audio.duration;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayUrl = fullUrl;
  const meta = item.videoMeta;
  const videoRatio = meta && meta.width > 0 && meta.height > 0
    ? `${meta.width} / ${meta.height}` : null;

  return (
    <div
      ref={cardRef}
      className={`group bg-surface rounded-card border overflow-hidden transition-all duration-200 cursor-default relative
        ${isSelected ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]' : 'border-border'}
        hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]
      `}
      data-id={item.id}
    >
      {state.selectionMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'TOGGLE_SELECT_ID', id: item.id });
          }}
          className={`absolute top-2 left-2 z-[5] w-[22px] h-[22px] rounded-[6px] border-2 cursor-pointer flex items-center justify-center transition-all
            ${isSelected
              ? 'bg-accent border-accent'
              : 'border-white/40 bg-black/40 hover:border-accent hover:bg-accent/30'
            }
          `}
        >
          {isSelected && (
            <div className="w-[10px] h-[6px] border-l-2 border-b-2 border-white rotate-[-45deg] translate-y-[-1px]" />
          )}
        </div>
      )}

      {/* Media */}
      <div
        className="relative bg-[#111] flex items-center justify-center overflow-hidden"
        style={videoRatio ? { aspectRatio: videoRatio } : undefined}
      >
        {isVisible ? (
          displayUrl ? (
            item.type === 'audio' ? (
              // Audio player card
              <div
                className="w-full aspect-[4/3] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex flex-col items-center justify-center p-4 relative"
              >
                <audio
                  ref={audioRef}
                  src={fullUrl || undefined}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                  onEnded={handleAudioEnded}
                  preload="metadata"
                />

                {/* Decorative circles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
                </div>

                {/* Play button */}
                <button
                  onClick={toggleAudioPlay}
                  className="relative z-10 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:bg-white/20 hover:scale-105 active:scale-95 mb-3"
                >
                  {audioPlaying ? (
                    // Pause icon
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                  ) : (
                    // Play icon
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="ml-1">
                      <polygon points="6,3 20,12 6,21"/>
                    </svg>
                  )}
                </button>

                {/* Progress bar */}
                <div className="w-full max-w-[80%] relative z-10">
                  <div
                    className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-100"
                      style={{ width: audioDuration ? `${(audioProgress / audioDuration) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-white/50">{formatTime(audioProgress)}</span>
                    <span className="text-[10px] text-white/50">{formatTime(audioDuration)}</span>
                  </div>
                </div>

                {/* Music note decoration */}
                <div className="absolute bottom-3 right-3 text-white/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
                  </svg>
                </div>
              </div>
            ) : item.type === 'video' ? (
              <div
                className="relative w-full"
                onMouseEnter={() => {
                  setHovering(true);
                  loadFullMedia();
                }}
                onMouseLeave={() => setHovering(false)}
                onClick={() => onOpenLightbox?.(item)}
              >
                {/* All videos: show first frame via preload=metadata, play on hover */}
                <video
                  ref={videoRef}
                  src={fullUrl || undefined}
                  poster={thumbUrl || undefined}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full block cursor-pointer"
                />
                {!hovering && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21"/></svg>
                    </div>
                  </div>
                )}
                {hovering && (
                  <button
                    onClick={toggleMute}
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border-none cursor-pointer flex items-center justify-center z-[2] hover:bg-black/70 transition-colors"
                  >
                    {muted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                        <line x1="23" y1="9" x2="17" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="17" y1="9" x2="23" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                        <path d="M15.54 8.46a5 5 0 010 7.07" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M19.07 4.93a10 10 0 010 14.14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <img
                src={displayUrl}
                alt={item.fileName || ''}
                loading="lazy"
                decoding="async"
                className="w-full block cursor-pointer"
                onClick={() => onOpenLightbox?.(item)}
              />
            )
          ) : (
            <div className="w-full h-full bg-surface2 animate-pulse" />
          )
        ) : (
          <div className="w-full h-full bg-surface2 animate-pulse" />
        )}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-[11px] px-2 py-[3px] rounded z-[1]">
          {item.type === 'video' ? '视频' : item.type === 'audio' ? '音频' : '图片'}
        </span>
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 bg-black/60 border-none text-white w-7 h-7 rounded-full cursor-pointer flex items-center justify-center text-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger z-[1]"
          title="删除"
        >
          ×
        </button>
      </div>

      {/* Card body */}
      <div className="p-3.5">
        {item.type === 'audio' ? (
          <div className="flex items-center gap-2">
            <div className="text-[13px] text-text truncate flex-1" title={item.fileName}>{item.fileName || '未命名音频'}</div>
          </div>
        ) : item.prompt ? (
          <div className="text-[13px] leading-relaxed text-text whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto">
            {item.prompt}
          </div>
        ) : (
          <button
            onClick={() => onOpenEdit(item.id)}
            className="w-full py-2.5 border border-dashed border-border-light rounded-lg bg-transparent text-text3 text-[13px] cursor-pointer transition-all hover:border-accent hover:text-accent"
          >
            + 添加提示词
          </button>
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

        <div className="flex items-center justify-between mt-2 gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text3">{formatDate(item.createdAt)}</span>
          </div>
          <div className="flex gap-1">
            {item.prompt && (
              <button
                onClick={handleCopy}
                className={`w-[30px] h-[30px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all shrink-0
                  ${copied
                    ? 'bg-success border-success text-white'
                    : 'border-border-light bg-transparent text-text2 hover:bg-surface2 hover:text-text hover:border-accent'
                  }
                `}
                title="复制提示词"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h11"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => onOpenEdit(item.id)}
              className="w-[30px] h-[30px] rounded-[6px] border border-border-light bg-transparent text-text2 cursor-pointer flex items-center justify-center transition-all hover:bg-surface2 hover:text-text hover:border-accent"
              title="编辑"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MediaCard;
