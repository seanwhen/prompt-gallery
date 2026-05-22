import { useRef, useState } from 'react';

export default function UploadZone({ onFilesSelected }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onFilesSelected(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-9 text-center cursor-pointer transition-all mb-5 shrink-0
        ${dragOver ? 'border-accent bg-accent-dim' : 'border-border-light hover:border-accent hover:bg-accent-dim'}
      `}
    >
      <div className="text-[36px] opacity-40">+</div>
      <p className="text-text2 text-sm mt-1.5">拖拽图片/视频到此处，或点击上传</p>
      <p className="text-xs mt-1 opacity-40">支持 JPG, PNG, GIF, WebP, MP4, WebM</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => onFilesSelected(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
