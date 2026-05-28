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

- **Windows 用户**：必须用 `start.bat`，它会调用 `scripts/*.ps1` 清理进程、按需生成 Prisma、启动 `server/run-dev.bat` 与 `client/run-dev.bat`
- **不要**使用已删除的 `start.ps1`
- Prisma EPERM：先 `stop.bat`，再 `start.bat`

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

见 `server/.env.example`。必填：`DEEPSEEK_API_KEY`、`DATABASE_URL`。

国际源代理：`HTTPS_PROXY` 或 Windows 系统代理（自动检测）。

## 修改爬虫时注意

- 批量入库用 `createMany`，避免 N+1
- 国际源用 `INTL_FETCH_OPTS`（长超时 + 重试）
- Reddit 域名自动走 `fetchWithCurl`，勿改回纯 undici
