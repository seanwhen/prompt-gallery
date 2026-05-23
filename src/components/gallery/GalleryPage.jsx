import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useDebounce } from '../../hooks/useDebounce';
import UploadZone from './UploadZone';
import ViewControls from './ViewControls';
import SearchBox from '../shared/SearchBox';
import TagFilters from './TagFilters';
import MediaCard from './MediaCard';
import EditModal from '../modals/EditModal';
import BatchEditModal from '../modals/BatchEditModal';
import BatchBar from '../shared/BatchBar';
import MediaLightbox from './MediaLightbox';

export default function GalleryPage() {
  const { state, dispatch, showToast, saveItem, removeItems } = useApp();
  const debouncedSearch = useDebounce(state.searchQuery, 200);
  const [editingItemId, setEditingItemId] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const galleryRef = useRef(null);

  // Video exclusive play: pause all other videos when one starts
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const handlePlay = (e) => {
      if (e.target.tagName === 'VIDEO') {
        gallery.querySelectorAll('video').forEach((v) => {
          if (v !== e.target) v.pause();
        });
      }
    };
    gallery.addEventListener('play', handlePlay, true);
    return () => gallery.removeEventListener('play', handlePlay, true);
  }, []);

  const filtered = useMemo(() => {
    let result = state.items;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (i) =>
          (i.prompt && i.prompt.toLowerCase().includes(q)) ||
          (i.tags && i.tags.some((t) => t.toLowerCase().includes(q))) ||
          (i.fileName && i.fileName.toLowerCase().includes(q))
      );
    }
    if (state.activeTags.length > 0) {
      result = result.filter((i) => i.tags && state.activeTags.some((t) => i.tags.includes(t)));
    }
    if (mediaType !== 'all') {
      result = result.filter((i) => i.type === mediaType);
    }
    return result;
  }, [state.items, debouncedSearch, state.activeTags, mediaType]);

  const handleFilesSelected = useCallback(
    async (files) => {
      const fileList = Array.from(files);
      for (const file of fileList) {
        const isVideo = file.type.startsWith('video');
        const item = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
          type: isVideo ? 'video' : 'image',
          fileName: file.name,
          prompt: '',
          tags: [],
          createdAt: new Date().toISOString(),
          media: file,
        };
        await saveItem(item);
        showToast('已添加: ' + file.name);
      }
    },
    [saveItem, showToast]
  );

  const handleSelectAll = () => {
    const allIds = filtered.map((i) => i.id);
    const allSelected = allIds.length === state.selectedIds.length && allIds.every((id) => state.selectedIds.includes(id));
    dispatch({ type: allSelected ? 'CLEAR_SELECTION' : 'SELECT_ALL', ids: allIds });
  };

  const handleBatchDelete = async () => {
    if (state.selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${state.selectedIds.length} 条记录吗？`)) return;
    await removeItems(state.selectedIds);
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'TOGGLE_SELECTION_MODE' });
    showToast('已删除选中项');
  };

  const handleClearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'TOGGLE_SELECTION_MODE' });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (lightboxItem) setLightboxItem(null);
        else if (batchModalOpen) setBatchModalOpen(false);
        else if (editingItemId) setEditingItemId(null);
        else if (state.selectionMode) handleClearSelection();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [batchModalOpen, editingItemId, state.selectionMode, lightboxItem]);

  const typeCounts = useMemo(() => {
    const counts = { image: 0, video: 0, audio: 0 };
    state.items.forEach((i) => {
      if (counts[i.type] !== undefined) counts[i.type]++;
    });
    return counts;
  }, [state.items]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 min-h-header border-b border-border gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="md:hidden text-text2 p-1.5 rounded-md hover:bg-surface2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="text-base font-semibold">资源库</span>
          <TagFilters />
        </div>
        <div className="flex items-center gap-2">
          <ViewControls />
          <SearchBox
            value={state.searchQuery}
            onChange={(q) => dispatch({ type: 'SET_SEARCH', query: q })}
            placeholder="搜索提示词..."
          />
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SELECTION_MODE' })}
            className={`px-3 py-1.5 rounded-md border text-xs cursor-pointer inline-flex items-center gap-1 transition-all
              ${state.selectionMode
                ? 'bg-accent-dim text-accent border-accent'
                : 'bg-transparent text-text2 border-border-light hover:bg-surface2 hover:text-text'
              }
            `}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            选择
          </button>
          <button
            onClick={() => document.querySelector('#gallery-upload-input')?.click()}
            className="bg-accent text-white border-none py-[7px] px-3.5 rounded-lg text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-all hover:bg-accent-hover"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            上传
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <UploadZone onFilesSelected={handleFilesSelected} />

        {/* Type filter */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'image', label: '图片', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { key: 'video', label: '视频', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
            { key: 'audio', label: '音频', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMediaType(mediaType === key ? 'all' : key)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium cursor-pointer border transition-all inline-flex items-center justify-center gap-1.5
                ${mediaType === key
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-text2 border-border hover:border-accent hover:text-accent'
                }
              `}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon}/>
              </svg>
              {label}
              <span className={`text-[11px] ${mediaType === key ? 'text-white/60' : 'text-text3'}`}>
                {typeCounts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-3 text-xs text-text3">
          共 {state.items.length} 条记录
          {filtered.length !== state.items.length && `，匹配 ${filtered.length} 条`}
        </div>

        {state.selectionMode && filtered.length > 0 && (
          <div
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 text-[13px] text-text2 cursor-pointer select-none mb-3"
          >
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((i) => state.selectedIds.includes(i.id))}
              readOnly
              className="accent-accent w-[15px] h-[15px]"
            />
            全选
          </div>
        )}

        {filtered.length === 0 ? (
          state.items.length === 0 ? (
            <div className="text-center py-16 text-text3">
              <div className="text-[44px] opacity-30 mb-3.5"></div>
              <h3 className="text-base text-text2 mb-1.5">还没有提示词</h3>
              <p className="text-sm">上传图片或视频，开始记录你的提示词吧</p>
            </div>
          ) : (
            <div className="text-center py-16 text-text3">
              <h3 className="text-base text-text2 mb-1.5">没有匹配的结果</h3>
              <p className="text-sm">试试其他关键词</p>
            </div>
          )
        ) : (
          <div ref={galleryRef} className="gallery-grid">
            {filtered.map((item) => (
              <MediaCard key={item.id} item={item} onOpenEdit={setEditingItemId} onOpenLightbox={setLightboxItem} />
            ))}
          </div>
        )}
      </div>

      {/* Batch bar */}
      <BatchBar
        visible={state.selectionMode && state.selectedIds.length > 0}
        selectedCount={state.selectedIds.length}
        onEditBatch={() => setBatchModalOpen(true)}
        onDeleteBatch={handleBatchDelete}
        onClearSelection={handleClearSelection}
      />

      {/* Modals */}
      <EditModal
        isOpen={!!editingItemId}
        itemId={editingItemId}
        onClose={() => setEditingItemId(null)}
      />
      <BatchEditModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
      />
      <MediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </>
  );
}
