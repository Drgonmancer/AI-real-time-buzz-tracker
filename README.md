# AI Real-time Buzz Tracker

AI 热点监控与决策助手：聚合多平台热点，关键词跨平台搜索，DeepSeek AI 分析，WebSocket 实时推送。

## 换机 / 克隆后能否直接用？

**可以。** 本项目不依赖本机硬编码路径，换电脑只需：

1. 安装 **Node.js 18+**
2. 克隆仓库
3. 复制 `server/.env.example` → `server/.env`（Windows 下 `start.bat` 会自动创建）
4. 安装依赖并启动

**无需配置任何 API Key 即可：**

- 定时爬取国内热点（百度、微博、抖音、B 站等）
- 在 Dashboard 搜索栏做关键词跨平台搜索（B 站、搜狗、微博等）
- 查看热点列表与 WebSocket 实时更新

**可选配置（按需）：**

| 配置 | 作用 |
|------|------|
| `DEEPSEEK_API_KEY` | AI 摘要、重要性、真伪判断（不配则跳过 AI 分析，热点仍可看） |
| `HTTPS_PROXY` 或系统 VPN | Reddit、Google News 等国际源 |
| `TWITTER_BEARER_TOKEN` | Twitter 趋势与搜索 |

详见 [docs/deployment.md](docs/deployment.md) 中的能力矩阵。

## 仓库结构

```
├── client/          # 前端 Dashboard
├── docs/            # 文档与本地运行指南
├── scripts/         # setup.sh（macOS / Linux / Git Bash）
├── server/          # 后端 API + 爬虫 + AI
├── skills/          # Agent Skill
├── start.bat        # Windows 一键启动
├── stop.bat         # Windows 停止
├── package.json     # 根目录便捷脚本（install:all、db:setup）
└── README.md
```

## 技术栈

React 18 · Vite · Tailwind · Framer Motion · Express · Prisma · SQLite · DeepSeek（可选）· Socket.IO

## 端口

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 | http://localhost:3000 |
| API | http://localhost:3000/api/v1 |
| 健康检查 | http://localhost:3000/health |

## 快速开始

### Windows（推荐）

1. 安装 [Node.js 18+](https://nodejs.org/)
2. 克隆仓库，双击 **`start.bat`**
3. 浏览器打开 http://localhost:5173

### macOS / Linux / 手动

```bash
git clone https://github.com/Drgonmancer/AI-real-time-buzz-tracker.git
cd AI-real-time-buzz-tracker
bash scripts/setup.sh          # 安装依赖 + 初始化 SQLite
npm run dev:server             # 终端 1
npm run dev:client             # 终端 2
```

或分步执行：

```bash
npm run setup                  # install:all + db:setup
cp server/.env.example server/.env   # 可选：填入 DEEPSEEK_API_KEY
```

更多细节见 [docs/quickstart.md](docs/quickstart.md)。

## 文档

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 文档索引 |
| [docs/deployment.md](docs/deployment.md) | **换机部署、能力矩阵、环境要求** |
| [docs/quickstart.md](docs/quickstart.md) | 本地运行 |
| [docs/configuration.md](docs/configuration.md) | 环境变量详解 |
| [docs/features.md](docs/features.md) | 功能与数据源 |
| [docs/api.md](docs/api.md) | API 接口 |
| [docs/architecture.md](docs/architecture.md) | 架构说明 |
| [docs/testing.md](docs/testing.md) | 测试与诊断 |

## License

MIT
