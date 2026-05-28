# 环境配置

## 1. Node.js

- 版本：**18+**（推荐 20 / 24 LTS）
- 验证：`node --version`、`npm --version`

## 2. 数据库（SQLite，无需 PostgreSQL）

当前默认使用 **SQLite**，零额外安装：

```env
DATABASE_URL="file:./dev.db"
```

数据库文件位于 `server/dev.db`，由 `prisma db push` 自动创建。

> 生产环境可改为 PostgreSQL，修改 `DATABASE_URL` 即可，schema 兼容 Prisma。

## 3. 环境变量文件

```bash
cd server
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

Windows 用户若使用 `start.bat`，缺少 `.env` 时会**自动从 `.env.example` 复制**。

### 必填（仅一项）

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | SQLite 路径 | `file:./dev.db`（`.env.example` 已含默认值） |

### 可选 — AI 分析

| 变量 | 说明 | 不配时 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 热点采集与搜索正常；AI 摘要/评分跳过 |
| `DEEPSEEK_BASE_URL` | API 地址 | 默认 `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | 模型 | 默认 `deepseek-chat` |

### 可选 — 国际源与 Twitter

| 变量 | 说明 |
|------|------|
| `HTTPS_PROXY` | Reddit、Google News 代理，如 `http://127.0.0.1:7890` |
| `TWITTER_BEARER_TOKEN` | Twitter 趋势与搜索（twitterapi.io Key） |
| `PRODUCTHUNT_ACCESS_TOKEN` | Product Hunt 爬虫 |

### 服务端口

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | **3000** | 后端 HTTP + WebSocket |
| `WS_CORS_ORIGIN` | **http://localhost:5173** | 允许的前端来源 |

前端端口 **5173** 在 `client/vite.config.ts` 中配置，与 `WS_CORS_ORIGIN` 保持一致。

### 爬虫开关

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SCRAPER_ENABLED` | **true**（未设置时也开启） | 设为 `false` 关闭定时采集 |
| `SCRAPER_INTERVAL_*` | 见 `.env.example` | 各平台轮询间隔（毫秒） |

## 4. DeepSeek API Key（可选）

仅在使用 **AI 分析** 时需要：

1. 注册 https://platform.deepseek.com/
2. 创建 API Key（`sk-` 开头）
3. 写入 `server/.env` 的 `DEEPSEEK_API_KEY`
4. 重启后端

## 5. 国际数据源代理

Reddit、Google News 需要可访问国际网络的代理：

- 方式 A：Windows 系统代理（VPN 开启后 `start.bat` / `http.ts` 可自动读取）
- 方式 B：在 `.env` 设置 `HTTPS_PROXY=http://127.0.0.1:7890`

Reddit 在 Windows 上通过 `curl.exe` 走代理；macOS / Linux 使用系统 `curl` 命令。

## 6. 能力速查

| 你想做什么 | 需要什么 |
|------------|----------|
| 看国内热点、Dashboard 搜索 | 仅默认 `.env` |
| AI 摘要与重要性评分 | `DEEPSEEK_API_KEY` |
| Reddit / Google News | VPN 或 `HTTPS_PROXY` |
| Twitter | `TWITTER_BEARER_TOKEN` |

完整矩阵见 [deployment.md](deployment.md)。

## 7. 配置验证

```bash
cd server
npm run db:setup
npm run dev
```

另开终端访问 http://localhost:3000/health 确认返回 `ok`。

## 常见问题

| 问题 | 处理 |
|------|------|
| Prisma EPERM | 运行 `stop.bat` 后重试 `start.bat` |
| npm 无效 | 确保使用真实 Node 安装路径，勿用 `System32\npm` 占位 |
| 端口 3000 被占用 | `stop.bat` 或修改 `PORT`（需同步改 `vite.config.ts` 代理） |
| 5173 无法访问 | 确认 Pulse-Frontend 窗口未报错 |
| 没有 AI 结果 | 检查是否配置了 `DEEPSEEK_API_KEY` |
