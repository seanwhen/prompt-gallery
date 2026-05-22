# Prompt Gallery — AI 媒体库 & Prompt 管理系统

家庭局域网内的 AI 图片/视频媒体库与提示词收集器。支持手机、平板等多设备通过内网穿透远程访问。

## 功能

- 图片/视频上传、预览、缩略图自动生成
- 提示词（Prompt）编辑、复制、搜索
- 标签管理与筛选
- 参考图关联（图生视频复现）
- 视频播放（悬停预览、全屏灯箱、进度条拖动）
- 批量选择与删除
- AI 聊天助手（接入 MiMo API）
- 跨设备访问（后端 SQLite + 文件存储）

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 19 + Vite 8 + Tailwind CSS 4 | SPA，HMR 开发 |
| 后端 | FastAPI + uvicorn | RESTful API，CORS 跨域 |
| 数据库 | SQLite (WAL 模式) | 单文件数据库，零运维 |
| 媒体处理 | Pillow + ffprobe/ffmpeg | 缩略图生成、视频元数据提取、抽帧 |
| AI | OpenAI SDK → MiMo API | 聊天提示词助手 |

## 项目结构

```
zhongzhuan/
├── backend/
│   ├── main.py              # FastAPI 入口 + 聊天 API
│   ├── database.py          # SQLite 连接 + 表定义
│   ├── models.py            # Pydantic 模型
│   ├── config.py            # 路径配置
│   ├── routers/
│   │   ├── items.py         # /api/items CRUD
│   │   └── media.py         # /api/media 文件服务 + Range 请求
│   └── services/
│       ├── thumbnail.py     # Pillow 缩略图
│       └── video.py         # ffprobe + ffmpeg
├── src/
│   ├── api/client.js        # fetch 封装
│   ├── db/index.js          # API 调用层（替代 IndexedDB）
│   ├── db/migrate.js        # 旧 IndexedDB → API 一次性迁移
│   ├── context/AppContext.jsx
│   └── components/
│       ├── gallery/         # 资源库（卡片、灯箱、上传）
│       ├── modals/          # 编辑弹窗
│       ├── prompts/         # 提示词列表
│       └── chat/            # AI 聊天
├── media/                   # 媒体文件存储（gitignore）
│   ├── originals/           # 原始文件
│   ├── thumbs/              # 缩略图
│   └── refs/                # 参考图
└── prompt_gallery.db        # SQLite 数据库
```

## 启动

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 后端（端口 8923）
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8923

# 前端（端口 4831，自动代理 /api → 8923）
npm run dev
```

同一局域网内其他设备访问 `http://<主机IP>:4831`。

## 性能演进

### Phase 1：原始 IndexedDB + base64（卡顿）

最初所有数据（图片 base64、缩略图 base64）都存在浏览器 IndexedDB 的单个 store 中。每次加载列表需要解码大量 base64 字符串，导致：
- 页面加载极慢（几秒到十几秒）
- 内存占用高（base64 比原始文件大约 33%）
- 视频灯箱卡顿掉帧
- 换浏览器/设备数据丢失

### Phase 2：IndexedDB Blob 分离存储 + 前端优化（流畅）

将 IndexedDB 拆分为三个独立 store：
- `items_meta` — 只存元数据（轻量查询）
- `items_media` — 存 Blob 对象（直接创建 Object URL）
- `items_thumbs` — 存缩略图 Blob

配合前端优化：
- `IntersectionObserver` 懒加载卡片（离开视口释放 Object URL）
- `React.memo` 防止无关重渲染
- 视频 `<video preload="metadata">` 只读首帧不加载全文件
- Pillow/OffscreenCanvas 生成 256px WebP 缩略图

效果：首屏加载 < 1s，视频悬停预览流畅，内存占用大幅降低。

### Phase 3：FastAPI + SQLite（当前 — 流畅 + 跨设备）

浏览器 IndexedDB 无法跨设备共享。迁移到 Client-Server 架构：
- 媒体文件存服务器磁盘，浏览器只加载需要的文件
- SQLite WAL 模式支持并发读
- Range 请求支持视频拖动进度条
- vite proxy 开发环境无缝代理

性能对比：
| 指标 | IndexedDB Blob | FastAPI + SQLite |
|------|---------------|-----------------|
| 首屏加载 | < 1s | < 1s（取决于网络） |
| 缩略图 | 客户端生成 + Blob URL | 服务端生成 + 直接 URL |
| 视频播放 | Blob URL（本地） | HTTP URL（支持 Range） |
| 内存占用 | 所有可见卡片的 Blob | 仅当前视口的 HTTP 缓存 |
| 跨设备 | 不支持 | 支持（局域网/内网穿透） |
| 数据安全 | 浏览器清除即丢失 | 服务器持久化 |

核心体验一致：卡片懒加载、悬停播放、灯箱预览都保持流畅。区别在于数据从浏览器内存搬到了服务器磁盘，通过 HTTP 按需加载，实际体感无明显差异。
