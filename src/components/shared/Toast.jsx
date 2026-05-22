import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toast } = useApp();

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface2 border border-border-light text-text px-5 py-2.5 rounded-lg text-[13px] z-[300] pointer-events-none transition-transform duration-300
        ${toast.visible ? 'translate-x-[-50%] translate-y-0' : 'translate-x-[-50%] translate-y-20'}
      `}
    >
      {toast.message}
    </div>
  );
}
