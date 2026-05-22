# Prompt Gallery

AI 图片/视频媒体库与提示词管理系统。FastAPI + SQLite 后端 + React + Vite 前端。

## 启动命令

```bash
# 后端
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8923

# 前端
npm run dev

# Docker
docker compose up -d
```

## 架构

- `backend/` — FastAPI 应用，端口 8923
  - `main.py` — 入口，CORS，路由挂载，聊天 API
  - `routers/items.py` — CRUD（POST/GET/PUT/DELETE + batch-delete + migrate-refs）
  - `routers/media.py` — 文件服务（thumb/original/ref + Range 请求）
  - `services/thumbnail.py` — Pillow 生成 256px WebP 缩略图
  - `services/video.py` — ffprobe 元数据 + ffmpeg 抽帧（含全分辨率第一帧）
  - `database.py` — SQLite 建表（WAL 模式）
  - `config.py` — 路径配置（media/originals, thumbs, refs）
- `src/` — React 前端，端口 4831
  - `api/client.js` — fetch 封装（GET/POST/PUT/DELETE/upload）
  - `db/index.js` — API 调用层，返回 URL 字符串（非 Blob URL）
  - `db/migrate.js` — 旧 IndexedDB → API 一次性迁移脚本
  - `context/AppContext.jsx` — 全局状态 + saveItem/removeItem + 自动迁移
  - `components/gallery/` — MediaCard（懒加载）、MediaLightbox（灯箱）、GalleryPage（上传+筛选）
  - `components/modals/EditModal.jsx` — 编辑提示词/标签/参考图（含恢复按钮）
  - `components/prompts/PromptListItem.jsx` — 提示词列表项
- `media/` — 媒体文件存储（gitignore）
- `prompt_gallery.db` — SQLite 数据库

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
- 图片组不显示参考图（图片本身就是参考图）
- 参考图仅对视频类型有意义

## Git 版本控制

```bash
# 查看状态
git status

# 提交更改
git add .
git commit -m "描述你的更改"

# 撤销更改
git checkout .
```

## 依赖

Python: fastapi, uvicorn, python-multipart, pillow, openai, python-dotenv
Node: react, vite, tailwindcss, @tailwindcss/vite
