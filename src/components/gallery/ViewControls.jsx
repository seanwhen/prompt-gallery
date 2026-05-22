import { useApp } from '../../context/AppContext';

export default function ViewControls() {
  const { state, dispatch } = useApp();

  const setCardSize = (size) => {
    dispatch({ type: 'SET_CARD_SIZE', size: Math.max(140, Math.min(400, size)) });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setCardSize(180)}
        className={`p-1 rounded border border-transparent cursor-pointer flex items-center justify-center transition-all
          ${state.cardSize <= 200 ? 'text-accent bg-accent-dim' : 'text-text3 hover:text-text hover:bg-surface2'}
        `}
        title="小图标"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="4" height="4"/><rect x="10" y="3" width="4" height="4"/>
          <rect x="17" y="3" width="4" height="4"/><rect x="3" y="10" width="4" height="4"/>
          <rect x="10" y="10" width="4" height="4"/><rect x="17" y="10" width="4" height="4"/>
          <rect x="3" y="17" width="4" height="4"/><rect x="10" y="17" width="4" height="4"/>
          <rect x="17" y="17" width="4" height="4"/>
        </svg>
      </button>
      <button
        onClick={() => setCardSize(280)}
        className={`p-1 rounded border border-transparent cursor-pointer flex items-center justify-center transition-all
          ${state.cardSize > 200 && state.cardSize <= 320 ? 'text-accent bg-accent-dim' : 'text-text3 hover:text-text hover:bg-surface2'}
        `}
        title="中图标"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/>
          <rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>
        </svg>
      </button>
      <button
        onClick={() => setCardSize(400)}
        className={`p-1 rounded border border-transparent cursor-pointer flex items-center justify-center transition-all
          ${state.cardSize > 320 ? 'text-accent bg-accent-dim' : 'text-text3 hover:text-text hover:bg-surface2'}
        `}
        title="大图标"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
      </button>

      <div className="w-px h-5 bg-border-light mx-1" />

      <div className="flex items-center gap-1.5 max-md:hidden">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text3 shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <input
          type="range"
          className="zoom-slider"
          min="140"
          max="400"
          value={state.cardSize}
          onInput={(e) => setCardSize(+e.target.value)}
        />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text3 shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </div>
    </div>
  );
}
