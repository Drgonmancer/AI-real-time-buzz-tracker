# 环境配置

## 1. Node.js

- 版本：**18+**（推荐 20 / 24 LTS）
- 验证：`node --version`、`npm --version`

## 2. 数据库（SQLite，无需 PostgreSQL）

当前 MVP 默认使用 **SQLite**，零额外安装：

```env
DATABASE_URL="file:./dev.db"
```

数据库文件位于 `server/dev.db`，由 `npx prisma db push` 自动创建。

> 生产环境可改为 PostgreSQL，修改 `DATABASE_URL` 即可，schema 兼容 Prisma。

## 3. 环境变量

```bash
cd server
copy .env.example .env   # Windows
```

### 必填

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | SQLite 路径 | `file:./dev.db` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-...` |

### 服务端口

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | **3000** | 后端 HTTP + WebSocket |
| `WS_CORS_ORIGIN` | **http://localhost:5173** | 允许的前端来源 |

前端端口 **5173** 在 `client/vite.config.ts` 中配置，与 `WS_CORS_ORIGIN` 保持一致。

### 可选

```env
SCRAPER_ENABLED=true
HTTPS_PROXY=http://127.0.0.1:7892    # Reddit / Google News 国际源
TWITTER_BEARER_TOKEN=                # Twitter 搜索（twitterapi.io）
DEEPSEEK_MODEL=deepseek-chat
AI_DAILY_BUDGET=50
```

## 4. DeepSeek API Key

1. 注册 https://platform.deepseek.com/
2. 创建 API Key（`sk-` 开头）
3. 写入 `server/.env` 的 `DEEPSEEK_API_KEY`

## 5. 国际数据源代理

Reddit、Google News 需要可访问国际网络的代理：

- 方式 A：Windows 系统代理（VPN 开启后 `start.bat` 可自动读取）
- 方式 B：在 `.env` 设置 `HTTPS_PROXY=http://127.0.0.1:7892`

Reddit 请求在 `server/src/lib/http.ts` 中通过 `curl.exe` 走代理，避免 Node TLS 指纹被 403。

## 6. 配置验证

```bash
cd server
npx prisma db push --accept-data-loss
npx prisma generate
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
