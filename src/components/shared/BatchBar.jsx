export default function BatchBar({ visible, selectedCount, onEditBatch, onDeleteBatch, onClearSelection }) {
  return (
    <div
      className={`fixed bottom-0 left-spacing-sidebar right-0 bg-surface/95 backdrop-blur-xl border-t border-border-light px-6 py-3 flex items-center justify-between z-[100] transition-transform duration-250
        ${visible ? 'translate-y-0' : 'translate-y-full'}
        max-md:left-0 max-md:px-3
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text">{selectedCount} 项已选</span>
        <span className="text-xs text-text3">已选中的图片将应用相同提示词</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEditBatch}
          className="px-4 py-2 rounded-lg bg-accent text-white border-none text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-all hover:bg-accent-hover"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          批量编辑提示词
        </button>
        <button
          onClick={onDeleteBatch}
          className="px-4 py-2 rounded-lg bg-transparent text-danger border border-border-light text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-all hover:bg-danger/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          删除
        </button>
        <button
          onClick={onClearSelection}
          className="px-4 py-2 rounded-lg bg-transparent text-text2 border border-border-light text-[13px] font-medium cursor-pointer transition-all hover:bg-surface2 hover:text-text"
        >
          取消选择
        </button>
      </div>
    </div>
  );
}
