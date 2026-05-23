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
| 部署 | Docker + Docker Compose | 容器化部署 |

## 项目结构

```
prompt-gallery/
├── backend/
│   ├── main.py              # FastAPI 入口 + 聊天 API
│   ├── database.py          # SQLite 连接 + 表定义
│   ├── models.py            # Pydantic 模型
│   ├── config.py            # 路径配置
│   ├── .env.example         # 环境变量模板（API Key 留空）
│   ├── .env                 # 环境变量配置（gitignore，需自行创建）
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
├── prompt_gallery.db        # SQLite 数据库
├── Dockerfile               # 后端镜像
├── docker-compose.yml       # 容器编排
└── requirements.txt         # Python 依赖
```

## 启动

### 环境配置

1. 复制环境变量模板并填入你的 API Key：
```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入你的 MIMO_API_KEY
```

### 本地开发

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 后端（端口 8923）
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8923

# 前端（端口 4831，自动代理 /api → 8923）
npm run dev
```

### Docker 部署

```bash
# 构建并启动
docker compose up -d

# 查看日志
docker compose logs -f

# 停止
docker compose down

# 重新构建（仅改 Dockerfile/requirements.txt 时需要）
docker compose up -d --build

# 重启容器（改代码/配置后只需 restart，无需 rebuild）
docker compose restart

# 重启单个服务
docker compose restart frontend
docker compose restart backend

# 重新创建容器（环境变量变更后需要 up 而非 restart）
docker compose up -d frontend
```

> **Docker 注意事项：**
> - 前端代码通过 volume 挂载，改代码后 `restart` 即可，无需 `--build`
> - 只有改了 Dockerfile 或 requirements.txt 才需要 `--build`
> - 环境变量变更（docker-compose.yml）需要 `up -d` 重新创建容器
> - 清理未使用的镜像/缓存：`docker system prune -a --volumes`

同一局域网内其他设备访问 `http://<主机IP>:4831`。

## Git 版本控制

```bash
# 查看状态
git status

# 查看提交历史
git log --oneline

# 提交更改
git add .
git commit -m "描述你的更改"

# 撤销未暂存的更改
git checkout .

# 暂存当前更改
git stash

# 恢复暂存的更改
git stash pop
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items` | 列出所有 items |
| POST | `/api/items` | 上传文件创建 item（multipart） |
| PUT | `/api/items/{id}` | 更新元数据（JSON） |
| DELETE | `/api/items/{id}` | 删除 item + 文件 |
| POST | `/api/items/batch-delete` | 批量删除 |
| PUT | `/api/items/{id}/ref` | 上传参考图 |
| DELETE | `/api/items/{id}/ref` | 删除参考图 |
| POST | `/api/items/migrate-refs` | 迁移视频参考图 |
| GET | `/api/media/{id}/thumb` | 缩略图 |
| GET | `/api/media/{id}/original` | 原始文件（Range） |
| GET | `/api/media/{id}/ref` | 参考图 |
| POST | `/api/chat` | AI 聊天（SSE 流式） |

## 关键约定

- 数据库字段 `snake_case`，前端字段 `camelCase`，`db/index.js` 中 `normalizeItem()` 负责转换
- `getMedia(id)` / `getThumb(id)` 返回 API URL 字符串（如 `/api/media/xxx/original`），不是 Blob URL
- `putItem(item, isNew)` — `isNew=true` 走 FormData 上传，`isNew=false` 走 JSON 更新
- 前端 `vite.config.js` 配置了 `/api` 代理到 `localhost:8923`
- 聊天功能使用独立的 IndexedDB（`PromptGalleryChatDB`），不需要迁移
- 视频自动生成全分辨率第一帧作为默认参考图

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
