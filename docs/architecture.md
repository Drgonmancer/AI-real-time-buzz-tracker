# 架构与技术栈

## 目录结构

```
AI-real-time-buzz-tracker/
├── client/                 # React 前端 (5173)
├── docs/                   # 技术文档
├── server/                 # Express 后端 (3000)
│   ├── src/                # 生产代码
│   └── scripts/            # 诊断脚本 + startup/ 启动辅助
├── skills/hot-monitor/     # Cursor Agent Skill
├── .gitignore
├── README.md
├── start.bat               # Windows 一键启动（可选）
└── stop.bat
```

## 技术栈（当前实现）

| 层 | 技术 |
|----|------|
| 前端 | React 18 · Vite 5 · TypeScript · Tailwind CSS · Framer Motion · Lucide · Zustand · Socket.IO Client |
| 后端 | Node.js · Express 4 · TypeScript · Prisma 5 · SQLite · Socket.IO · node-cron · undici |
| AI | DeepSeek API（OpenAI SDK 兼容） |
| 部署 | Windows bat 脚本；本地双进程 |

> 文档 v1.0 中提到的 Redis、PostgreSQL、shadcn/ui、Recharts、TanStack Query **尚未接入**；MVP 使用 SQLite + 内存调度。

## 请求链路

```
浏览器 :5173
  → Vite proxy /api/*
  → Express :3000
  → Services (scraper / search / ai)
  → Prisma → SQLite

WebSocket :5173/socket.io → proxy → :3000 Socket.IO
```

## 核心模块

| 模块 | 文件 |
|------|------|
| 爬虫调度 | `server/src/services/scraperService.ts` |
| 关键词搜索 | `server/src/services/searchService.ts` |
| AI 分析 | `server/src/services/aiService.ts` |
| 网络层 | `server/src/lib/http.ts` |
| 分类 | `server/src/lib/classify.ts` |
| 配置 | `server/src/config/index.ts` |

## 数据流

1. `startScrapers()` 定时 `fetchData` → 批量 `createMany`
2. 用户搜索 → `searchAllPlatforms` → 可选入库
3. AI 定时/手动分析 → 写入 `ai_analyses` → WS 推送
4. 前端 Dashboard 拉取 `/hot-topics` + 监听 WS

## 端口配置源码

```typescript
// server/src/config/index.ts
port: process.env.PORT || 3000
websocket.corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173'

// client/vite.config.ts
server.port: 5173
proxy['/api'].target: 'http://localhost:3000'
```

**文档版本**：v1.1 · 2026-05-28
