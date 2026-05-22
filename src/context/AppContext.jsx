import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { getAllItems, putItem, deleteItem, deleteItems, migrateVideoRefs } from '../db';
import { hasOldData, migrateToAPI } from '../db/migrate';

const AppContext = createContext(null);

const initialState = {
  items: [],
  currentPage: 'gallery',
  selectionMode: false,
  selectedIds: [],
  cardSize: parseInt(localStorage.getItem('pgCardSize') || '300'),
  searchQuery: '',
  activeTags: [],
  sidebarCollapsed: localStorage.getItem('pgSidebarCollapsed') === 'true',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.items };
    case 'ADD_ITEM':
      return { ...state, items: [action.item, ...state.items] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.item.id ? action.item : i)),
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        selectedIds: state.selectedIds.filter((id) => id !== action.id),
      };
    case 'REMOVE_ITEMS': {
      const ids = new Set(action.ids);
      return {
        ...state,
        items: state.items.filter((i) => !ids.has(i.id)),
        selectedIds: state.selectedIds.filter((id) => !ids.has(id)),
      };
    }
    case 'SET_PAGE':
      return { ...state, currentPage: action.page };
    case 'TOGGLE_SELECTION_MODE':
      return {
        ...state,
        selectionMode: !state.selectionMode,
        selectedIds: state.selectionMode ? [] : state.selectedIds,
      };
    case 'TOGGLE_SELECT_ID': {
      const exists = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: exists
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: [] };
    case 'SELECT_ALL':
      return { ...state, selectedIds: action.ids };
    case 'SET_CARD_SIZE': {
      localStorage.setItem('pgCardSize', action.size);
      document.documentElement.style.setProperty('--card-min', action.size + 'px');
      return { ...state, cardSize: action.size };
    }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'TOGGLE_TAG': {
      const exists = state.activeTags.includes(action.tag);
      return {
        ...state,
        activeTags: exists
          ? state.activeTags.filter((t) => t !== action.tag)
          : [...state.activeTags, action.tag],
      };
    }
    case 'TOGGLE_SIDEBAR': {
      const next = !state.sidebarCollapsed;
      localStorage.setItem('pgSidebarCollapsed', next);
      return { ...state, sidebarCollapsed: next };
    }
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastTimer = useRef(null);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [migration, setMigration] = useState({ needed: false, running: false, progress: '', done: false });

  // Check for old data and load items on mount
  useEffect(() => {
    getAllItems()
      .then((items) => {
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        dispatch({ type: 'SET_ITEMS', items });
        // Check for old IndexedDB data after loading backend items
        if (items.length === 0) {
          hasOldData().then((hasOld) => {
            if (hasOld) setMigration((m) => ({ ...m, needed: true }));
          });
        }
        // Migrate videos without reference_image_path in background, then reload items
        migrateVideoRefs()
          .then(() => getAllItems())
          .then((updatedItems) => {
            updatedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            dispatch({ type: 'SET_ITEMS', items: updatedItems });
          })
          .catch(() => {});
      })
      .catch(console.error);
  }, []);

  const startMigration = useCallback(async () => {
    setMigration({ needed: false, running: true, progress: '准备迁移...', done: false });
    try {
      const result = await migrateToAPI((done, total) => {
        setMigration((m) => ({ ...m, progress: `迁移中 ${done}/${total}...` }));
      });
      setMigration({ needed: false, running: false, progress: '', done: true });
      // Reload items after migration
      const items = await getAllItems();
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      dispatch({ type: 'SET_ITEMS', items });
      const msg = result.failed > 0
        ? `迁移完成：成功 ${result.migrated} 条，失败 ${result.failed} 条`
        : `已迁移 ${result.migrated} 条旧数据`;
      setToast({ message: msg, visible: true });
      setTimeout(() => setToast({ message: '', visible: false }), 3000);
    } catch (e) {
      setMigration({ needed: false, running: false, progress: '', done: false });
      setToast({ message: '迁移失败: ' + e.message, visible: true });
      setTimeout(() => setToast({ message: '', visible: false }), 3000);
    }
  }, []);

  const dismissMigration = useCallback(() => {
    setMigration({ needed: false, running: false, progress: '', done: false });
  }, []);

  // Apply card size CSS variable on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--card-min', state.cardSize + 'px');
  }, []);

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ message: '', visible: false }), 2000);
  }, []);

  const value = {
    state,
    dispatch,
    toast,
    showToast,
    migration,
    startMigration,
    dismissMigration,
    saveItem: useCallback(
      async (item) => {
        const isNew = !state.items.find((i) => i.id === item.id);
        const result = await putItem(item, isNew);
        const savedItem = result || item;
        if (isNew) {
          dispatch({ type: 'ADD_ITEM', item: savedItem });
        } else {
          dispatch({ type: 'UPDATE_ITEM', item: savedItem });
        }
      },
      [state.items]
    ),
    removeItem: useCallback(
      async (id) => {
        await deleteItem(id);
        dispatch({ type: 'REMOVE_ITEM', id });
      },
      []
    ),
    removeItems: useCallback(
      async (ids) => {
        await deleteItems(ids);
        dispatch({ type: 'REMOVE_ITEMS', ids });
      },
      []
    ),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
