# 换机部署与能力说明

本文说明：克隆到其他电脑后如何运行，以及哪些功能依赖哪些配置。

## 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | **18+**（推荐 20 / 24 LTS） |
| 操作系统 | Windows / macOS / Linux 均可 |
| 数据库 | **SQLite**（随 `prisma db push` 自动创建，无需 PostgreSQL） |
| 网络 | 国内源需可访问对应网站；国际源需 VPN 或代理 |

**不依赖：** 本机固定路径、Docker、PostgreSQL、Redis、预先存在的 `dev.db`（首次启动自动建库）。

## 首次部署步骤

### 方式 A：Windows 一键

```text
git clone https://github.com/Drgonmancer/AI-real-time-buzz-tracker.git
cd AI-real-time-buzz-tracker
双击 start.bat
```

`start.bat` 会：

- 自动检测 Node.js / npm（跳过无效的 `System32\npm`）
- 若缺少 `server/.env`，从 `.env.example` 复制
- 安装 `server/`、`client/` 依赖（首次）
- 执行 Prisma generate + db push
- 启动后端（3000）与前端（5173）

### 方式 B：跨平台脚本

```bash
git clone https://github.com/Drgonmancer/AI-real-time-buzz-tracker.git
cd AI-real-time-buzz-tracker
bash scripts/setup.sh
npm run dev:server    # 终端 1
npm run dev:client    # 终端 2
```

### 方式 C：根目录 npm 脚本

```bash
npm run setup         # install:all + db:setup
npm run dev:server
npm run dev:client
```

## 能力矩阵：什么配置才能用什么功能

### 零配置（仅 `DATABASE_URL` 默认值即可）

| 功能 | 说明 |
|------|------|
| 后端 / 前端启动 | 端口 3000 / 5173 |
| 定时爬虫（国内） | 百度、微博、抖音、B 站、GitHub Trending、Hacker News、DEV.to 等 |
| 关键词搜索 | B 站、搜狗、微博热榜匹配、DEV.to |
| 热点列表 / 筛选 / WebSocket | 完整可用 |
| 数据源健康检查 API | `GET /api/v1/search/sources/health` |

启动后约 **3 秒** 爬虫开始调度；等待 1–3 分钟可在 Dashboard 看到国内热点。

### 需要 `DEEPSEEK_API_KEY`（可选）

| 功能 | 无 Key 时行为 |
|------|----------------|
| AI 摘要、情感、趋势 | 不执行，列表仍显示原始热点 |
| `relevanceScore`、`isReal`、`importance` | 字段为空或默认值 |
| WebSocket `ai:analysis_complete` | 不推送 |

在 `server/.env` 填入 DeepSeek Key 后重启后端即可启用 AI 分析。

### 需要 `HTTPS_PROXY` 或系统 VPN

| 数据源 / 搜索 | 说明 |
|---------------|------|
| Reddit 爬虫 | Windows 通过 `curl.exe` 走代理；macOS/Linux 使用 `curl` |
| Google News（gnews_*） | undici + 系统代理或 `HTTPS_PROXY` |
| 搜索 `gnews_search` | 同上 |

`.env` 示例：

```env
HTTPS_PROXY=http://127.0.0.1:7890
```

Windows 也可开启 VPN 系统代理，`http.ts` 会尝试读取。

### 需要 `TWITTER_BEARER_TOKEN`

| 功能 | 无 Token 时 |
|------|-------------|
| Twitter 趋势爬虫 | 跳过或返回空 |
| 搜索 `twitter` | 返回空结果 |

Token 为 [twitterapi.io](https://twitterapi.io) 的 API Key（非官方 Twitter Bearer）。

### 已知限制

| 项目 | 说明 |
|------|------|
| Bing News RSS | 当前常为空，与 VPN 无关 |
| Product Hunt | 需 `PRODUCTHUNT_ACCESS_TOKEN`（未配置则跳过） |
| 生产部署 | 需自行 `npm run build`；修改 `PORT` 须同步改 `client/vite.config.ts` 代理 |

## 验证部署成功

```bash
curl http://localhost:3000/health
# 预期: {"status":"ok","timestamp":"..."}

curl http://localhost:3000/api/v1/config
# 预期: JSON 含 dataSources

cd server && npm run test:sources
# 预期: 国内源多数 OK
```

浏览器打开 http://localhost:5173，Dashboard 应显示热点或「暂无数据」（等待爬虫首轮完成）。

## 常见问题（换机）

| 问题 | 处理 |
|------|------|
| 没有热点数据 | 等待 1–3 分钟；确认 `SCRAPER_ENABLED` 不为 `false` |
| Prisma EPERM（Windows） | 运行 `stop.bat` 后重试 |
| 端口被占用 | `stop.bat` 或修改 `PORT` + Vite 代理 |
| Reddit / GNews 全失败 | 配置 `HTTPS_PROXY` 或 VPN |
| AI 不工作 | 检查 `DEEPSEEK_API_KEY`；无 Key 时属正常 |
| macOS/Linux 无 start.bat | 使用 `scripts/setup.sh` + 双终端启动 |

## 相关文档

- [quickstart.md](quickstart.md) — 启动与验证
- [configuration.md](configuration.md) — 环境变量逐项说明
- [testing.md](testing.md) — 诊断命令
