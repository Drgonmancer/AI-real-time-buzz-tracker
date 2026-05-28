---
name: hot-monitor
description: AI 热点监控工具开发与排错。用于修改爬虫、搜索服务、AI 分析、Dashboard 或 Windows 启动脚本时使用。
---

# AI Real-time Buzz Tracker — Agent Skill

## 项目结构

```
client/          React + Vite 前端
server/          Express + Prisma 后端
  src/           生产代码（路由、爬虫、AI、WebSocket）
  scripts/       诊断脚本 + startup/ 启动 ps1
  prisma/        SQLite schema
start.bat        主启动入口（Windows）
stop.bat         停止服务
docs/            安装与测试文档
```

## 启动约定

- **Windows**：使用根目录 `start.bat` / `stop.bat`；内部调用 `server/scripts/startup/*.ps1`
- **macOS / Linux**：`bash scripts/setup.sh`，然后 `npm run dev:server` + `npm run dev:client`
- Prisma EPERM（Windows）：先 `stop.bat`，再 `start.bat`

## 关键模块

| 模块 | 路径 |
|------|------|
| 爬虫 | `server/src/services/scraperService.ts` |
| 关键词搜索 | `server/src/services/searchService.ts` |
| AI 分析 | `server/src/services/aiService.ts` |
| 网络/代理 | `server/src/lib/http.ts`（Reddit 走 curl） |
| Dashboard | `client/src/pages/Dashboard.tsx` |

## 端口（与源码一致）

| 服务 | 端口 |
|------|------|
| 后端 | 3000 |
| 前端 | 5173 |

详见 [docs/README.md](../docs/README.md)。

## 诊断命令

在 `server/` 目录：

```bash
npm run test:sources
npm run test:intl
npm run test:search
```

脚本路径：`server/scripts/`（非 `src/`）。

## 环境变量

见 `server/.env.example`。

- **必填**：`DATABASE_URL`（模板已含默认值）
- **可选 AI**：`DEEPSEEK_API_KEY`（无则跳过 AI，热点仍可用）
- **可选国际源**：`HTTPS_PROXY` 或 Windows 系统代理
- **可选 Twitter**：`TWITTER_BEARER_TOKEN`

## 修改爬虫时注意

- 批量入库用 `createMany`，避免 N+1
- 国际源用 `INTL_FETCH_OPTS`（长超时 + 重试）
- Reddit 域名自动走 `fetchWithCurl`，勿改回纯 undici
