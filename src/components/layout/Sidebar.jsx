import { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useStorageEstimate } from '../../hooks/useStorageEstimate';

const NAV_ITEMS = [
  {
    section: '工具',
    items: [
      { id: 'gallery', label: '资源库', icon: 'grid' },
      { id: 'prompts', label: '提示词列表', icon: 'doc' },
    ],
  },
  {
    section: 'AI 工具',
    items: [
      { id: 'chat', label: 'AI 对话', icon: 'chat' },
      { id: 'promptBuilder', label: '提示词工坊', icon: 'star', comingSoon: true },
      { id: 'batchProcess', label: '批量处理', icon: 'process', comingSoon: true },
    ],
  },
];

const ICONS = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  doc: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  ),
  process: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/>
      <line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  ),
};

export default function Sidebar({ onExport, onImport }) {
  const { state, dispatch } = useApp();
  const { usedStr, quotaStr, pct } = useStorageEstimate();
  const fileInputRef = useRef(null);

  return (
    <aside
      className={`bg-surface border-r border-border flex flex-col flex-shrink-0 transition-all duration-250 z-50
        ${state.sidebarCollapsed ? 'w-14' : 'w-sidebar overflow-hidden'}
        max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[200] max-md:transition-transform max-md:duration-250
        ${state.sidebarCollapsed ? 'max-md:translate-x-[-100%]' : 'max-md:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-border min-h-header shrink-0 ${state.sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}>
        {state.sidebarCollapsed ? (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#a29bfe] flex items-center justify-center text-sm font-bold text-white shrink-0"
            title="展开侧栏"
          >
            P
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap flex-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[#a29bfe] flex items-center justify-center text-sm font-bold text-white shrink-0">
                P
              </div>
              <span className="text-[15px] font-semibold text-text">Prompt Gallery</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
              className="text-text2 p-1.5 rounded-md hover:bg-surface2 hover:text-text transition-colors shrink-0"
              title="收起侧栏"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* New chat button */}
      {state.sidebarCollapsed ? (
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'chat' })}
          className="mx-auto mt-3 mb-1 w-9 h-9 rounded-[10px] border border-border-light bg-transparent text-text cursor-pointer flex items-center justify-center transition-all hover:bg-surface2 hover:border-accent hover:text-accent"
          title="新建对话"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      ) : (
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'chat' })}
          className="mx-3 mt-3 mb-1 px-3.5 py-2.5 rounded-[10px] border border-border-light bg-transparent text-text text-sm cursor-pointer flex items-center gap-2.5 transition-all hover:bg-surface2 hover:border-accent hover:text-accent whitespace-nowrap overflow-hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>新建对话</span>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            {!state.sidebarCollapsed && (
              <div className="text-[11px] font-semibold text-text3 uppercase tracking-[0.5px] px-2.5 pt-3 pb-1.5 whitespace-nowrap overflow-hidden">
                {section.section}
              </div>
            )}
            {section.items.map((item) => (
              <div
                key={item.id}
                onClick={() => dispatch({ type: 'SET_PAGE', page: item.id })}
                title={state.sidebarCollapsed ? item.label : undefined}
                className={`group relative flex items-center rounded-lg cursor-pointer transition-colors select-none
                  ${state.sidebarCollapsed
                    ? 'justify-center mx-auto w-10 h-10 my-0.5'
                    : 'gap-2.5 px-2.5 py-[9px] mx-2 mb-0.5 whitespace-nowrap overflow-hidden'
                  }
                  ${state.currentPage === item.id
                    ? 'bg-accent-dim text-accent'
                    : 'text-text2 hover:bg-surface2 hover:text-text'
                  }`}
              >
                <span className={`shrink-0 ${state.currentPage === item.id ? 'opacity-100' : 'opacity-70'}`}>
                  {ICONS[item.id]}
                </span>
                {!state.sidebarCollapsed && (
                  <span className="label overflow-hidden text-ellipsis">{item.label}</span>
                )}
                {!state.sidebarCollapsed && item.comingSoon && (
                  <span className="ml-auto text-[10px] text-text3 bg-surface2 px-1.5 py-0.5 rounded shrink-0">
                    即将推出
                  </span>
                )}
                {!state.sidebarCollapsed && item.id === 'gallery' && (
                  <span className="ml-auto bg-surface2 text-text3 text-[11px] px-1.5 py-0.5 rounded-full shrink-0">
                    {state.items.length}
                  </span>
                )}
                {/* Collapsed badge dot */}
                {state.sidebarCollapsed && item.comingSoon && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-text3" />
                )}
                {state.sidebarCollapsed && item.id === 'gallery' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
                {/* Tooltip on hover in collapsed mode */}
                {state.sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-surface2 border border-border rounded-md text-xs text-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[300]">
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-border ${state.sidebarCollapsed ? 'p-2' : 'p-3'}`}>
        {state.sidebarCollapsed ? (
          <>
            {/* Collapsed storage icon */}
            <div className="flex justify-center py-2 text-text3" title={`存储: ${usedStr} / ${quotaStr}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </div>
            {/* Collapsed export */}
            <div
              onClick={onExport}
              className="flex items-center justify-center py-2 rounded-lg cursor-pointer transition-colors text-text2 hover:bg-surface2 hover:text-text"
              title="导出数据"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </div>
            {/* Collapsed import */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center py-2 rounded-lg cursor-pointer transition-colors text-text2 hover:bg-surface2 hover:text-text"
              title="导入数据"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImport}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <>
            {/* Storage bar */}
            <div className="py-2 text-[11px] text-text3 flex items-center gap-2">
              <span>存储</span>
              <div className="w-[100px] h-1 rounded-full bg-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: Math.min(pct, 100) + '%' }}
                />
              </div>
              <span>{usedStr} / {quotaStr}</span>
            </div>

            {/* Export */}
            <div
              onClick={onExport}
              className="flex items-center gap-2.5 px-2.5 py-[9px] rounded-lg cursor-pointer transition-colors text-[13px] text-text2 hover:bg-surface2 hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              <span className="label">导出数据</span>
            </div>

            {/* Import */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2.5 px-2.5 py-[9px] rounded-lg cursor-pointer transition-colors text-[13px] text-text2 hover:bg-surface2 hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span className="label">导入数据</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImport}
                className="hidden"
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
