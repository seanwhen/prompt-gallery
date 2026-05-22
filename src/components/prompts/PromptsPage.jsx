import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useDebounce } from '../../hooks/useDebounce';
import SearchBox from '../shared/SearchBox';
import PromptListItem from './PromptListItem';
import EditModal from '../modals/EditModal';

const PAGE_SIZE = 10;

export default function PromptsPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [editingItemId, setEditingItemId] = useState(null);
  const [page, setPage] = useState(1);

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
    return result;
  }, [state.items, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
  };

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
          <span className="text-base font-semibold">提示词列表</span>
          <span className="text-xs text-text3">共 {filtered.length} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchBox value={search} onChange={handleSearch} placeholder="搜索..." />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 pb-16">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text3">
            <div className="text-[44px] opacity-30 mb-3.5"></div>
            <h3 className="text-base text-text2 mb-1.5">
              {debouncedSearch ? '没有匹配的结果' : '还没有记录'}
            </h3>
            <p className="text-sm">
              {debouncedSearch ? '试试其他关键词' : '去资源库上传素材'}
            </p>
          </div>
        ) : (
          paged.map((item) => (
            <PromptListItem
              key={item.id}
              item={item}
              onOpenEdit={setEditingItemId}
            />
          ))
        )}
      </div>

      {/* Pagination - fixed at bottom */}
      {totalPages > 1 && (
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-center gap-1.5 bg-surface">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-md text-xs border border-border-light bg-transparent text-text2 cursor-pointer hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-md text-xs border border-border-light bg-transparent text-text2 cursor-pointer hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-text3">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-xs border cursor-pointer transition-all
                    ${page === p
                      ? 'bg-accent border-accent text-white'
                      : 'border-border-light bg-transparent text-text2 hover:bg-surface2'
                    }
                  `}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-md text-xs border border-border-light bg-transparent text-text2 cursor-pointer hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-md text-xs border border-border-light bg-transparent text-text2 cursor-pointer hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            »
          </button>
          <span className="text-xs text-text3 ml-3">
            共 {filtered.length} 条，第 {page}/{totalPages} 页
          </span>
        </div>
      )}

      <EditModal
        isOpen={!!editingItemId}
        itemId={editingItemId}
        onClose={() => setEditingItemId(null)}
      />
    </>
  );
}
