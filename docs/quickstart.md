# 快速启动

## 方式一：Windows 一键启动（推荐）

1. 完成 [环境配置](configuration.md)
2. 若之前有残留进程，双击 **`stop.bat`**
3. 双击 **`start.bat`**
4. 出现 `SUCCESS!` 后，浏览器打开 **http://localhost:5173**

`start.bat` 会自动：

- 检测 Node.js / npm（跳过无效的 System32 npm）
- 清理 3000 / 5173 端口占用
- 按需生成 Prisma Client（schema 未变则跳过）
- 执行 `prisma db push`
- 启动 **Pulse-Backend**（3000）与 **Pulse-Frontend**（5173）两个窗口

失败时查看项目根目录 **`startup.log`**。

## 方式二：手动启动

```bash
# 终端 1 — 后端 (端口 3000)
cd server
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run dev

# 终端 2 — 前端 (端口 5173)
cd client
npm install
npm run dev
```

## 启动验证

| 检查项 | 地址 | 预期 |
|--------|------|------|
| 后端健康 | http://localhost:3000/health | `{"status":"ok","timestamp":"..."}` |
| 前端页面 | http://localhost:5173 | 200，显示 Pulse Dashboard |
| 系统配置 | http://localhost:3000/api/v1/config | JSON 含 dataSources |

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/config
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
