import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function BatchEditModal({ isOpen, onClose }) {
  const { state, saveItem, showToast } = useApp();
  const [prompt, setPrompt] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setTags('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isOpen) handleSave();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, prompt, tags]);

  const handleSave = async () => {
    const promptText = prompt.trim();
    const tagList = tags
      ? tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
      : [];

    if (!promptText && tagList.length === 0) {
      showToast('请输入提示词或标签');
      return;
    }

    const selectedItems = state.items.filter((i) => state.selectedIds.includes(i.id));
    for (const item of selectedItems) {
      const updated = { ...item };
      if (promptText) updated.prompt = promptText;
      if (tagList.length > 0) {
        const existing = new Set(updated.tags || []);
        tagList.forEach((t) => existing.add(t));
        updated.tags = [...existing];
      }
      await saveItem(updated);
    }

    showToast(`已更新 ${selectedItems.length} 条记录`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/65 z-[200] flex items-center justify-center transition-opacity duration-200
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-modal p-6 w-[90%] max-w-[480px] border border-border-light transform transition-transform duration-200">
        <h2 className="text-[17px] mb-1">批量设置提示词</h2>
        <p className="text-[13px] text-text3 mb-3">
          将为 {state.selectedIds.length} 张图片设置相同的提示词
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入提示词，将应用到所有选中的图片..."
          className="w-full bg-surface2 border border-border-light rounded-lg p-3 text-text text-sm leading-relaxed resize-y min-h-[150px] outline-none font-[inherit] transition-colors focus:border-accent"
        />
        <div className="mt-2.5">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签 (逗号分隔，将追加到选中项)"
            className="w-full bg-surface2 border border-border-light rounded-lg px-3 py-2 text-text text-[13px] outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 mt-3.5">
          <button
            onClick={onClose}
            className="px-3.5 py-[7px] rounded-lg border border-border-light bg-transparent text-text2 text-[13px] font-medium cursor-pointer transition-all hover:bg-surface2 hover:text-text"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-[7px] rounded-lg bg-accent text-white text-[13px] font-medium cursor-pointer transition-all hover:bg-accent-hover"
          >
            应用到全部
          </button>
        </div>
      </div>
    </div>
  );
}
