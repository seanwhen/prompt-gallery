import { AppProvider } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MainLayout from './components/layout/MainLayout';
import Toast from './components/shared/Toast';
import GalleryPage from './components/gallery/GalleryPage';
import PromptsPage from './components/prompts/PromptsPage';
import ChatPage from './components/chat/ChatPage';
import { useApp } from './context/AppContext';
import { getAllItems } from './db';
import { apiUpload } from './api/client';

function PlaceholderPage({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-text3">
      <div className="text-[56px] opacity-20 mb-4">{icon}</div>
      <h2 className="text-xl text-text2 mb-2">{title}</h2>
      <p className="text-sm max-w-[360px] leading-relaxed">{description}</p>
    </div>
  );
}

function AppContent() {
  const { state, dispatch, showToast, saveItem, migration, startMigration, dismissMigration } = useApp();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state.items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-gallery-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出元数据（不含媒体文件）');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      for (const item of imported) {
        const formData = new FormData();
        formData.append('prompt', item.prompt || '');
        formData.append('tags', JSON.stringify(item.tags || []));
        formData.append('item_type', item.type || 'image');
        await apiUpload('/items', formData);
      }
      const items = await getAllItems();
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      dispatch({ type: 'SET_ITEMS', items });
      showToast(`已导入 ${imported.length} 条记录`);
    } catch {
      showToast('导入失败，请检查文件格式');
    }
    e.target.value = '';
  };

  return (
    <div className="flex h-screen">
      <Sidebar onExport={handleExport} onImport={handleImport} />
      <MainLayout>
        <div className="h-full overflow-hidden relative">
          <div className={`h-full overflow-y-auto ${state.currentPage === 'gallery' ? '' : 'hidden'}`}><GalleryPage /></div>
          <div className={`h-full overflow-y-auto ${state.currentPage === 'prompts' ? '' : 'hidden'}`}><PromptsPage /></div>
          <div className={`h-full overflow-y-auto ${state.currentPage === 'chat' ? '' : 'hidden'}`}><ChatPage /></div>
          <div className={`h-full overflow-y-auto ${state.currentPage === 'promptBuilder' ? '' : 'hidden'}`}>
            <PlaceholderPage icon="⭐" title="提示词工坊" description="即将推出 - 通过模板和参数组合，快速构建高质量提示词" />
          </div>
          <div className={`h-full overflow-y-auto ${state.currentPage === 'batchProcess' ? '' : 'hidden'}`}>
            <PlaceholderPage icon="🔄" title="批量处理" description="即将推出 - 批量上传图片并自动生成、编辑提示词" />
          </div>
        </div>
      </MainLayout>
      <Toast />

      {/* Migration dialog */}
      {(migration.needed || migration.running || migration.done) && (
        <div className="fixed inset-0 bg-black/65 z-[300] flex items-center justify-center">
          <div className="bg-surface rounded-xl p-6 w-[90%] max-w-[400px] border border-border-light text-center">
            {migration.running ? (
              <>
                <div className="text-lg font-medium mb-2">迁移中</div>
                <div className="text-sm text-text2 mb-4">{migration.progress}</div>
                <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </>
            ) : migration.done ? (
              <>
                <div className="text-lg font-medium mb-2">迁移完成</div>
                <div className="text-sm text-text2 mb-4">旧数据已成功迁移到服务器，并已清理浏览器缓存。</div>
              </>
            ) : (
              <>
                <div className="text-lg font-medium mb-2">发现旧数据</div>
                <div className="text-sm text-text2 mb-4">
                  检测到浏览器中存有旧版本地数据。是否迁移到服务器？<br/>
                  迁移后旧数据将被删除。
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={dismissMigration}
                    className="px-4 py-2 rounded-lg border border-border-light bg-transparent text-text2 text-sm cursor-pointer hover:bg-surface2"
                  >
                    暂不迁移
                  </button>
                  <button
                    onClick={startMigration}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium cursor-pointer hover:bg-accent-hover"
                  >
                    开始迁移
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
