import { useApp } from '../../context/AppContext';

export default function MainLayout({ children }) {
  const { state, dispatch } = useApp();

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Mobile overlay */}
      {!state.sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-[199] md:hidden"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />
      )}
      {children}
    </div>
  );
}
