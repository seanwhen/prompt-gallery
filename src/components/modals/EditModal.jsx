import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getMedia, getThumb } from '../../db';

function formatDuration(s) {
  if (!s || !isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function EditModal({ isOpen, itemId, onClose }) {
  const { state, saveItem, showToast } = useApp();
  const [prompt, setPrompt] = useState('');
  const [tags, setTags] = useState('');
  const [refImageUrl, setRefImageUrl] = useState('');
  const [refImageFile, setRefImageFile] = useState(null);
  const [refImageRemoved, setRefImageRemoved] = useState(false);
  const [originalRefImageUrl, setOriginalRefImageUrl] = useState('');
  const fileInputRef = useRef(null);

  const item = state.items.find((i) => i.id === itemId);

  useEffect(() => {
    if (item) {
      setPrompt(item.prompt || '');
      setTags((item.tags || []).join(', '));
      setRefImageFile(null);
      setRefImageRemoved(false);
      if (item.id) {
        if (item.referenceImage) {
          const url = `/api/media/${item.id}/ref`;
          setRefImageUrl(url);
          setOriginalRefImageUrl(url);
        } else if (item.type === 'video') {
          getThumb(item.id).then((thumbUrl) => {
            setRefImageUrl(thumbUrl || '');
            setOriginalRefImageUrl(thumbUrl || '');
          });
        } else {
          setRefImageUrl('');
          setOriginalRefImageUrl('');
        }
      }
    }
  }, [item]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isOpen) handleSave();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, prompt, tags, refImageFile, refImageUrl]);

  const handleRefImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setRefImageUrl(previewUrl);
    setRefImageFile(file);
    setRefImageRemoved(false);
    e.target.value = '';
  };

  const handleRemoveRefImage = () => {
    setRefImageUrl('');
    setRefImageFile(null);
    setRefImageRemoved(true);
  };

  const handleSave = async () => {
    if (!item) return;
    const tagList = tags
      ? tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
      : [];
    const updates = {
      ...item,
      prompt: prompt.trim(),
      tags: tagList,
    };
    if (refImageFile !== null) {
      updates.referenceImage = refImageFile;
    } else if (refImageRemoved && item.id) {
      updates.referenceImage = null;
    }
    await saveItem(updates);
    showToast('已保存');
    onClose();
  };

  if (!isOpen || !item) return null;

  const meta = item.videoMeta;

  return (
    <div
      className={`fixed inset-0 bg-black/65 z-[200] flex items-center justify-center transition-opacity duration-200
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-modal p-6 w-[90%] max-w-[520px] border border-border-light transform transition-transform duration-200 max-h-[85vh] overflow-y-auto">
        <h2 className="text-[17px] mb-4">编辑提示词</h2>

        {/* Prompt */}
        <div className="mb-3">
          <label className="text-[11px] text-text3 uppercase tracking-wider mb-1.5 block">提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入提示词..."
            className="w-full bg-surface2 border border-border-light rounded-lg p-3 text-text text-sm leading-relaxed resize-y min-h-[120px] outline-none font-[inherit] transition-colors focus:border-accent"
          />
        </div>

        {/* Tags */}
        <div className="mb-3">
          <label className="text-[11px] text-text3 uppercase tracking-wider mb-1.5 block">标签</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="逗号分隔，如：风景, 写实"
            className="w-full bg-surface2 border border-border-light rounded-lg px-3 py-2 text-text text-[13px] outline-none transition-colors focus:border-accent"
          />
        </div>

        {/* Reference image - only for video */}
        {item.type === 'video' && (
          <div className="mb-3">
            <label className="text-[11px] text-text3 uppercase tracking-wider mb-1.5 block">参考图</label>
            {refImageUrl ? (
              <div className="flex items-center gap-2">
                <div className="relative inline-block">
                  <img
                    src={refImageUrl}
                    alt="reference"
                    className="w-20 h-20 rounded-lg object-cover border border-border-light"
                  />
                  <button
                    onClick={handleRemoveRefImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white border-none text-xs cursor-pointer flex items-center justify-center hover:bg-danger/80"
                  >
                    ×
                  </button>
                </div>
                {refImageRemoved && originalRefImageUrl && (
                  <button
                    onClick={() => {
                      setRefImageUrl(originalRefImageUrl);
                      setRefImageFile(null);
                      setRefImageRemoved(false);
                    }}
                    className="px-2 py-1 rounded-md bg-surface2 border border-border-light text-text2 text-[11px] cursor-pointer hover:bg-surface hover:text-text transition-colors"
                    title="恢复原始参考图"
                  >
                    恢复
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border-light bg-surface2 text-text3 text-[11px] cursor-pointer flex flex-col items-center justify-center gap-1 hover:border-accent hover:text-accent transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                上传
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleRefImageUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Video metadata */}
        {item.type === 'video' && meta && (
          <div className="mb-4">
            <label className="text-[11px] text-text3 uppercase tracking-wider mb-1.5 block">视频参数</label>
            <div className="flex gap-1.5 flex-wrap">
              {meta.duration > 0 && (
                <span className="text-[11px] bg-surface2 text-text2 px-2.5 py-1 rounded-md border border-border-light">
                  {formatDuration(meta.duration)}
                </span>
              )}
              {meta.width > 0 && meta.height > 0 && (
                <span className="text-[11px] bg-surface2 text-text2 px-2.5 py-1 rounded-md border border-border-light">
                  {meta.width}×{meta.height}
                </span>
              )}
              {meta.width > 0 && meta.height > 0 && (
                <span className="text-[11px] bg-surface2 text-text2 px-2.5 py-1 rounded-md border border-border-light">
                  {(() => {
                    const ratio = meta.width / meta.height;
                    if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
                    if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
                    if (Math.abs(ratio - 4/3) < 0.05) return '4:3';
                    if (Math.abs(ratio - 3/4) < 0.05) return '3:4';
                    if (Math.abs(ratio - 1) < 0.05) return '1:1';
                    return `${meta.width}:${meta.height}`;
                  })()}
                </span>
              )}
              <span className="text-[11px] bg-surface2 text-text2 px-2.5 py-1 rounded-md border border-border-light">
                {meta.hasAudio ? '有音频' : '无音频'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-[7px] rounded-lg border border-border-light bg-transparent text-text2 text-[13px] font-medium cursor-pointer transition-all hover:bg-surface2 hover:text-text"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-[7px] rounded-lg bg-accent text-white text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-hover"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
