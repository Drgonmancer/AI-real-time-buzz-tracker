# 快速启动

## 前置条件

- Node.js **18+**
- 克隆仓库后**无需**预先配置 API Key 即可看到国内热点（见 [deployment.md](deployment.md)）

## 方式一：Windows 一键启动（推荐）

1. 安装 Node.js：https://nodejs.org/
2. 若之前有残留进程，双击 **`stop.bat`**
3. 双击 **`start.bat`**
4. 出现 `SUCCESS!` 后，浏览器打开 **http://localhost:5173**

`start.bat` 会自动：

- 检测 Node.js / npm（跳过无效的 System32 npm）
- 若缺少 `server/.env`，从 `.env.example` 复制
- 清理 3000 / 5173 端口占用
- 按需生成 Prisma Client（schema 未变则跳过）
- 执行 `prisma db push`
- 启动 **Pulse-Backend**（3000）与 **Pulse-Frontend**（5173）两个窗口

失败时查看项目根目录 **`startup.log`**。

> 可选：编辑 `server/.env` 填入 `DEEPSEEK_API_KEY` 启用 AI 分析；国际源配置 `HTTPS_PROXY`。

## 方式二：跨平台 setup 脚本

```bash
bash scripts/setup.sh
npm run dev:server    # 终端 1
npm run dev:client    # 终端 2
```

## 方式三：手动启动

```bash
# 根目录一键安装
npm run setup

# 终端 1 — 后端 (端口 3000)
cd server
cp .env.example .env    # 首次
npm run dev

# 终端 2 — 前端 (端口 5173)
cd client
npm run dev
```

等价于：

```bash
cd server && npm install && npm run db:setup && npm run dev
cd client && npm install && npm run dev
```

## 启动验证

| 检查项 | 地址 | 预期 |
|--------|------|------|
| 后端健康 | http://localhost:3000/health | `{"status":"ok","timestamp":"..."}` |
| 前端页面 | http://localhost:5173 | 200，显示 Pulse Dashboard |
| 系统配置 | http://localhost:3000/api/v1/config | JSON 含 dataSources |
| 热点数据 | Dashboard 列表 | 启动 1–3 分钟后有国内源数据 |

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/config
cd server && npm run test:sources
```

## 前端路由

| 路径 | 页面 |
|------|------|
| `/` | 热点仪表盘（搜索、筛选、AI 分析展示） |
| `/settings` | 系统设置（AI 配置、关键词组、数据源） |

## 生产构建

```bash
cd server && npm run build && npm start   # 端口仍由 PORT 控制，默认 3000
cd client && npm run build && npm run preview
```

修改后端 `PORT` 时，须同步修改 `client/vite.config.ts` 中的 `proxy.target`。
