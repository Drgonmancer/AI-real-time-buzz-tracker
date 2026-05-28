# AI Real-time Buzz Tracker

AI 热点监控与决策助手：聚合多平台热点，关键词跨平台搜索，DeepSeek AI 分析，WebSocket 实时推送。

## 仓库结构

```
├── client/          # 前端 Dashboard
├── docs/            # 文档与本地运行指南
├── server/          # 后端 API + 爬虫 + AI
├── skills/          # Agent Skill
├── .gitignore
└── README.md
```

Windows 用户可使用根目录 **`start.bat`** / **`stop.bat`** 一键启停。

## 技术栈

React 18 · Vite · Tailwind · Framer Motion · Express · Prisma · SQLite · DeepSeek · Socket.IO

## 端口

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 | http://localhost:3000 |
| API | http://localhost:3000/api/v1 |
| 健康检查 | http://localhost:3000/health |

## 快速开始

```bash
cd server && copy .env.example .env   # 填入 DEEPSEEK_API_KEY
```

Windows：双击 `start.bat`  
手动：见 [docs/quickstart.md](docs/quickstart.md)

## 文档

- [docs/README.md](docs/README.md) — 文档索引
- [docs/quickstart.md](docs/quickstart.md) — 本地运行
- [docs/configuration.md](docs/configuration.md) — 环境配置
- [docs/features.md](docs/features.md) — 功能与数据源
- [docs/api.md](docs/api.md) — API 接口
- [docs/architecture.md](docs/architecture.md) — 架构说明

## License

MIT
