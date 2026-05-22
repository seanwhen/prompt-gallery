import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { uid } from '../../utils/uid';
import { getAllConversations, getConversation, putConversation, deleteConversation } from '../../db/chat';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

const API_BASE = 'http://localhost:8923';
const MAX_IMAGES = 3;

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMediaType(type) {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return null;
}

function getVideoThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 72;
      canvas.getContext('2d').drawImage(video, 0, 0, 128, 72);
      const thumb = canvas.toDataURL('image/jpeg', 0.6);
      URL.revokeObjectURL(url);
      resolve(thumb);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 3000);
  });
}

async function compressImage(file, maxWidth = 1024) {
  if (file.size < 200 * 1024) {
    return await fileToBase64(file);
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  let w = img.width;
  let h = img.height;
  if (w > maxWidth) {
    h = Math.round((h * maxWidth) / w);
    w = maxWidth;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// Render message content (handles both string and array with images)
function MessageContent({ content, isUser }) {
  if (typeof content === 'string') {
    if (isUser) return <>{content}</>;
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{content}</Markdown>
      </div>
    );
  }
  if (!Array.isArray(content)) return <>{String(content)}</>;

  return (
    <>
      {content.map((part, i) => {
        if (part.type === 'text') {
          if (isUser) return <span key={i}>{part.text}</span>;
          return (
            <div key={i} className="prose prose-invert prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
            </div>
          );
        }
        if (part.type === 'image_url') {
          return (
            <img
              key={i}
              src={part.image_url.url}
              alt="uploaded"
              className="max-w-full rounded-lg mt-2 cursor-pointer"
              style={{ maxHeight: 300 }}
              onClick={() => window.open(part.image_url.url, '_blank')}
            />
          );
        }
        if (part.type === 'video_url') {
          return (
            <video
              key={i}
              src={part.video_url.url}
              controls
              className="max-w-full rounded-lg mt-2"
              style={{ maxHeight: 300 }}
            />
          );
        }
        if (part.type === 'input_audio') {
          return (
            <audio
              key={i}
              src={part.input_audio.data}
              controls
              className="w-full mt-2"
            />
          );
        }
        return null;
      })}
    </>
  );
}

export default function ChatPage() {
  const { dispatch, showToast } = useApp();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streamingIds, setStreamingIds] = useState([]);
  const [search, setSearch] = useState('');
  const [images, setImages] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const activeIdRef = useRef(null);
  const streamConvRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const isStreaming = streamingIds.includes(activeId);
  const canSend = streamingIds.length < 2 || isStreaming;
  const atLimit = streamingIds.length >= 2 && !isStreaming;

  const loadConversations = useCallback(async () => {
    const convs = await getAllConversations();
    setConversations(convs);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const lastId = localStorage.getItem('chatActiveId');
    if (lastId) {
      getConversation(lastId).then((conv) => {
        if (conv) {
          setActiveId(conv.id);
          activeIdRef.current = conv.id;
          setMessages(conv.messages || []);
        }
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    activeIdRef.current = activeId;
    if (activeId) {
      localStorage.setItem('chatActiveId', activeId);
    } else {
      localStorage.removeItem('chatActiveId');
    }
  }, [activeId]);

  // Close upload menu on outside click
  useEffect(() => {
    if (!showUploadMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUploadMenu]);

  const saveToDB = useCallback(async (id, msgs) => {
    const firstUserMsg = msgs.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? (typeof firstUserMsg.content === 'string' ? firstUserMsg.content : firstUserMsg.content.find(p => p.type === 'text')?.text || '')
      : '新对话';
    await putConversation({
      id,
      title: title.slice(0, 40),
      messages: msgs,
      createdAt: msgs[0]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await loadConversations();
  }, [loadConversations]);

  const createNewConversation = () => {
    setActiveId(null);
    setMessages([]);
    setImages([]);
    localStorage.removeItem('chatActiveId');
  };

  const selectConversation = (id) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveId(id);
      setMessages(conv.messages || []);
      setImages([]);
    }
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!confirm('确定删除这个对话？')) return;
    await deleteConversation(id);
    if (activeId === id) createNewConversation();
    await loadConversations();
    showToast('已删除对话');
  };

  // --- Image handling ---
  const addImages = useCallback(async (files) => {
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      showToast(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, slots);
    if (imageFiles.length === 0) return;

    // Add placeholders immediately with 'uploading' status
    const placeholders = imageFiles.map((file) => ({
      id: uid(),
      name: file.name,
      preview: URL.createObjectURL(file),
      base64: null,
      status: 'uploading',
    }));
    setImages(prev => [...prev, ...placeholders]);

    // Convert each in background
    for (const file of imageFiles) {
      const placeholder = placeholders.find(p => p.name === file.name);
      try {
        const base64 = await compressImage(file);
        setImages(prev => prev.map(img =>
          img.id === placeholder.id ? { ...img, base64, status: 'done' } : img
        ));
      } catch {
        setImages(prev => prev.map(img =>
          img.id === placeholder.id ? { ...img, status: 'error' } : img
        ));
      }
    }
  }, [images.length, showToast]);

  const removeImage = useCallback((id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const removeMediaFile = useCallback((id) => {
    setMediaFiles(prev => prev.filter(m => m.id !== id));
  }, []);

  const handlePaste = useCallback(async (e) => {
    // Try clipboardData.files first (works better for multiple files on macOS)
    const clipFiles = e.clipboardData?.files;
    if (clipFiles && clipFiles.length > 0) {
      const fileArr = Array.from(clipFiles);
      const imageFiles = fileArr.filter(f => f.type.startsWith('image/'));
      const otherFiles = fileArr.filter(f => !f.type.startsWith('image/'));
      if (imageFiles.length > 0 || otherFiles.length > 0) {
        e.preventDefault();
        if (imageFiles.length > 0) addImages(imageFiles);
        for (const file of otherFiles) {
          const mediaType = getMediaType(file.type);
          if (!mediaType) continue;
          const id = uid();
          const preview = mediaType === 'video' ? await getVideoThumbnail(file) : null;
          setMediaFiles(prev => [...prev, {
            id, name: file.name, type: mediaType, mimeType: file.type,
            preview, base64: null, status: 'uploading',
          }]);
          try {
            const base64 = await fileToBase64(file);
            setMediaFiles(prev => prev.map(m => m.id === id ? { ...m, base64, status: 'done' } : m));
          } catch {
            setMediaFiles(prev => prev.map(m => m.id === id ? { ...m, status: 'error' } : m));
          }
        }
        return;
      }
    }
    // Fallback: try items
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addImages(files);
    }
  }, [addImages]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      const mediaType = getMediaType(file.type);
      if (!mediaType) {
        showToast(`不支持的文件类型: ${file.type || file.name}`);
        continue;
      }
      if (mediaType === 'image') {
        addImages([file]);
      } else {
        const id = uid();
        const preview = mediaType === 'video' ? await getVideoThumbnail(file) : null;
        setMediaFiles(prev => [...prev, {
          id, name: file.name, type: mediaType, mimeType: file.type,
          preview, base64: null, status: 'uploading',
        }]);
        try {
          const base64 = await fileToBase64(file);
          setMediaFiles(prev => prev.map(m => m.id === id ? { ...m, base64, status: 'done' } : m));
        } catch {
          setMediaFiles(prev => prev.map(m => m.id === id ? { ...m, status: 'error' } : m));
        }
      }
    }
  }, [addImages, showToast]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're leaving the drop zone entirely
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
      setDragging(false);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files) addImages(files);
    e.target.value = '';
  }, [addImages]);

  const handleGeneralFileSelect = useCallback(async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    e.target.value = '';

    for (const file of files) {
      const mediaType = getMediaType(file.type);
      if (!mediaType) {
        showToast(`不支持的文件类型: ${file.type || file.name}`);
        continue;
      }
      if (mediaType === 'image') {
        addImages([file]);
        continue;
      }
      // Audio or video — add placeholder first, then convert in background
      const id = uid();
      const preview = mediaType === 'video' ? await getVideoThumbnail(file) : null;
      setMediaFiles(prev => [...prev, {
        id,
        name: file.name,
        type: mediaType,
        mimeType: file.type,
        preview,
        base64: null,
        status: 'uploading',
      }]);
      try {
        const base64 = await fileToBase64(file);
        setMediaFiles(prev => prev.map(m =>
          m.id === id ? { ...m, base64, status: 'done' } : m
        ));
      } catch {
        setMediaFiles(prev => prev.map(m =>
          m.id === id ? { ...m, status: 'error' } : m
        ));
      }
    }
  }, [addImages, showToast]);

  // --- Send message ---
  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && images.length === 0 && mediaFiles.length === 0) || !canSend) return;

    // Wait for all uploads to finish
    if (images.some(i => i.status === 'uploading') || mediaFiles.some(m => m.status === 'uploading')) {
      showToast('请等待文件上传完成');
      return;
    }

    // Build content: text + images + audio/video
    let content;
    if (images.length > 0 || mediaFiles.length > 0) {
      content = [];
      if (text) content.push({ type: 'text', text });
      for (const img of images) {
        if (img.status === 'done' && img.base64) {
          content.push({ type: 'image_url', image_url: { url: img.base64 } });
        }
      }
      for (const m of mediaFiles) {
        if (m.status !== 'done' || !m.base64) continue;
        if (m.type === 'audio') {
          content.push({ type: 'input_audio', input_audio: { data: m.base64 } });
        } else if (m.type === 'video') {
          content.push({ type: 'video_url', video_url: { url: m.base64 }, fps: 2, media_resolution: 'default' });
        }
      }
    } else {
      content = text;
    }

    // Store thumbnails for display
    const imageThumbs = images.map(i => ({ id: i.id, preview: i.preview }));
    const mediaThumbs = mediaFiles.map(m => ({ id: m.id, name: m.name, type: m.type }));

    const userMsg = {
      role: 'user', content, createdAt: new Date().toISOString(),
      _images: imageThumbs.length > 0 ? imageThumbs : undefined,
      _media: mediaThumbs.length > 0 ? mediaThumbs : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setImages([]);
    setMediaFiles([]);

    const convId = activeId || uid();
    if (!activeId) setActiveId(convId);
    streamConvRef.current = convId;

    // Save immediately so it appears in sidebar right away
    const firstUserMsg = newMessages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? (typeof firstUserMsg.content === 'string' ? firstUserMsg.content : firstUserMsg.content.find(p => p.type === 'text')?.text || '')
      : '新对话';
    await putConversation({
      id: convId,
      title: title.slice(0, 40),
      messages: newMessages,
      createdAt: newMessages[0]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await loadConversations();

    setStreamingIds((prev) => [...prev, convId]);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => {
            const { _images, createdAt, ...rest } = m;
            return rest;
          }),
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = { role: 'assistant', content: '', createdAt: new Date().toISOString() };
      let currentMsgs = [...newMessages, assistantMsg];

      if (activeIdRef.current === convId) {
        setMessages(currentMsgs);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMsg = { ...assistantMsg, content: assistantMsg.content + parsed.content };
                currentMsgs = [...newMessages, assistantMsg];
                if (activeIdRef.current === convId) {
                  setMessages(currentMsgs);
                }
              }
            } catch {}
          }
        }
      }

      await saveToDB(convId, currentMsgs);
    } catch (err) {
      showToast('对话请求失败: ' + err.message);
    } finally {
      setStreamingIds((prev) => prev.filter((id) => id !== convId));
      streamConvRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-[260px] border-r border-border flex flex-col shrink-0 max-md:hidden">
        <div className="p-3 border-b border-border">
          <button
            onClick={createNewConversation}
            className="w-full py-2.5 rounded-lg border border-border-light bg-transparent text-text text-sm cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-surface2 hover:border-accent hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            新对话
          </button>
        </div>
        <div className="p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索对话..."
            className="w-full bg-surface2 border border-border-light rounded-lg px-3 py-1.5 text-text text-[13px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5
                ${activeId === conv.id
                  ? 'bg-accent-dim text-accent'
                  : 'text-text2 hover:bg-surface2 hover:text-text'
                }
              `}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate">{conv.title}</div>
                <div className="text-[11px] text-text3">{formatTime(conv.updatedAt)}</div>
              </div>
              {streamingIds.includes(conv.id) && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-accent animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              )}
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-text3 hover:text-danger transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 min-h-header border-b border-border gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
              className="md:hidden text-text2 p-1.5 rounded-md hover:bg-surface2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="text-base font-semibold">AI 对话</span>
            <span className="text-[11px] bg-accent-dim text-accent px-2 py-0.5 rounded-full">MiMo v2.5</span>
            {streamingIds.length > 0 && (
              <span className="text-[11px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {streamingIds.length}/2 生成中
              </span>
            )}
          </div>
          <button
            onClick={createNewConversation}
            className="px-3 py-1.5 rounded-md bg-transparent text-text2 border border-border-light text-xs cursor-pointer transition-all hover:bg-surface2 hover:text-text"
          >
            新对话
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-text3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-[#a29bfe] flex items-center justify-center text-2xl text-white mb-4">
                AI
              </div>
              <h2 className="text-xl text-text2 mb-2">MiMo AI 助手</h2>
              <p className="text-sm max-w-[400px] leading-relaxed mb-6">
                你可以问我任何问题，也可以让我帮你生成、优化图片提示词
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-[400px]">
                {[
                  '帮我写一段赛博朋克风格的城市提示词',
                  '优化这段提示词让它更详细',
                  '把这段英文提示词翻译成中文',
                  '推荐几个适合人像摄影的风格关键词',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-left text-[13px] text-text2 bg-surface border border-border-light rounded-lg p-3 cursor-pointer transition-all hover:border-accent hover:text-text"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[800px] mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-accent text-white rounded-br-md whitespace-pre-wrap'
                        : 'bg-surface border border-border-light text-text rounded-bl-md'
                      }
                    `}
                  >
                    {msg.role === 'user' && msg._images && msg._images.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {msg._images.map((img) => (
                          <img
                            key={img.id}
                            src={img.preview}
                            alt="uploaded"
                            className="rounded-lg object-cover"
                            style={{ width: 80, height: 80 }}
                          />
                        ))}
                      </div>
                    )}
                    {msg.role === 'user' && msg._media && msg._media.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {msg._media.map((m) => (
                          <div key={m.id} className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5 text-xs">
                            {m.type === 'video' ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            )}
                            <span className="truncate max-w-[100px]">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                    {msg.role === 'assistant' && msg.content === '' && (
                      <span className="inline-block w-2 h-4 bg-text3 animate-pulse ml-0.5" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className={`px-5 pb-5 pt-2 shrink-0 ${dragging ? 'ring-2 ring-accent ring-inset rounded-xl' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <div className="max-w-[800px] mx-auto relative">
            {/* Image previews */}
            {images.length > 0 && (
              <div className="flex gap-2 mb-2 px-1">
                {images.map((img) => (
                  <div key={img.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border-light">
                    <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                    {/* Uploading overlay */}
                    {img.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" className="animate-spin text-white/70">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                        </svg>
                      </div>
                    )}
                    {/* Error overlay */}
                    {img.status === 'error' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Media file previews (audio/video) */}
            {mediaFiles.length > 0 && (
              <div className="flex gap-2 mb-2 px-1 flex-wrap">
                {mediaFiles.map((m) => (
                  m.type === 'video' && m.preview ? (
                    /* Video: show thumbnail like image */
                    <div key={m.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border-light">
                      <img src={m.preview} alt={m.name} className="w-full h-full object-cover" />
                      {/* Play icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                        </div>
                      </div>
                      {/* Status overlays */}
                      {m.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin text-white/70">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                          </svg>
                        </div>
                      )}
                      {m.status === 'error' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                        </div>
                      )}
                      <button
                        onClick={() => removeMediaFile(m.id)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    /* Audio: show tag-style */
                    <div key={m.id} className="relative group flex items-center gap-1.5 bg-surface2 border border-border-light rounded-lg px-2.5 py-1.5 text-xs text-text2">
                      {m.status === 'uploading' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin text-text3">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                        </svg>
                      ) : m.status === 'error' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      )}
                      <span className="truncate max-w-[100px]">{m.name}</span>
                      <button
                        onClick={() => removeMediaFile(m.id)}
                        className="ml-1 w-4 h-4 rounded-full bg-surface flex items-center justify-center text-text3 hover:text-danger transition-colors cursor-pointer border-none"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(e); }}
              disabled={atLimit}
              placeholder={atLimit ? '已有 2 个对话正在生成，请等待完成...' : dragging ? '松开上传图片...' : '输入消息... (Enter 发送, Shift+Enter 换行, 可粘贴图片)'}
              rows={1}
              className={`w-full bg-surface border border-border-light rounded-xl px-4 py-3 pr-24 text-text text-[14px] outline-none resize-none min-h-[48px] max-h-[200px] font-[inherit] leading-relaxed transition-colors focus:border-accent ${atLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ height: 'auto' }}
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
            />

            {/* Action buttons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* Upload menu button */}
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                  className="w-9 h-9 rounded-lg bg-transparent text-text2 border-none cursor-pointer flex items-center justify-center transition-all hover:bg-surface2 hover:text-text"
                  title="上传"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>

                {/* Popup menu */}
                {showUploadMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-surface border border-border-light rounded-xl shadow-lg py-1.5 min-w-[160px] z-[100]">
                    <button
                      onClick={() => { imageInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text hover:bg-surface2 cursor-pointer transition-colors border-none bg-transparent text-left"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      图片
                    </button>
                    <button
                      onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text hover:bg-surface2 cursor-pointer transition-colors border-none bg-transparent text-left"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                      </svg>
                      本地文件
                    </button>
                    <button
                      onClick={() => { videoInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text hover:bg-surface2 cursor-pointer transition-colors border-none bg-transparent text-left"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                      视频
                    </button>
                    <button
                      onClick={() => { audioInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text hover:bg-surface2 cursor-pointer transition-colors border-none bg-transparent text-left"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                      音频
                    </button>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleGeneralFileSelect}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleGeneralFileSelect}
                  className="hidden"
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleGeneralFileSelect}
                  className="hidden"
                />
              </div>

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && images.length === 0) || !canSend}
                className="w-9 h-9 rounded-lg bg-accent text-white border-none cursor-pointer flex items-center justify-center transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
