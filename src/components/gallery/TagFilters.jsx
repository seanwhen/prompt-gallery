import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';

export default function TagFilters() {
  const { state, dispatch } = useApp();

  const allTags = useMemo(
    () => [...new Set(state.items.flatMap((i) => i.tags || []))].sort(),
    [state.items]
  );

  if (allTags.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {allTags.map((tag) => {
        const active = state.activeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => dispatch({ type: 'TOGGLE_TAG', tag })}
            className={`px-2.5 py-[3px] rounded-full text-[11px] cursor-pointer border transition-all
              ${active
                ? 'bg-accent text-white border-accent'
                : 'border-border-light bg-transparent text-text3 hover:bg-accent hover:text-white hover:border-accent'
              }
            `}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
