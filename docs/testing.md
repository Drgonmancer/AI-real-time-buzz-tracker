# 测试与诊断

## 新环境验收清单

克隆到新机器后，按顺序验证：

```bash
# 1. 安装与数据库
npm run setup

# 2. 启动（双终端或 start.bat）
npm run dev:server
npm run dev:client

# 3. 健康检查
curl http://localhost:3000/health

# 4. 爬虫（国内源应多数 OK，无需 API Key）
cd server && npm run test:sources
```

预期：health 返回 `ok`；`test:sources` 中 baidu/weibo/bilibili 等国内源成功。

## 端口验证

确认与文档一致：**后端 3000，前端 5173**。

```powershell
netstat -ano | findstr LISTENING | findstr ":3000 :5173"
curl http://localhost:3000/health
curl http://localhost:5173
```

## 冒烟测试（Windows）

```bat
stop.bat
start.bat
```

- http://localhost:3000/health → `{"status":"ok",...}`
- http://localhost:5173 → Dashboard 页面

## 数据源自检

在 `server/` 目录：

```bash
npm run test:sources
npm run test:intl
npm run test:search
npm run test:search -- "AI编程"
```

## API 健康检查

```bash
curl http://localhost:3000/api/v1/search/sources/health
curl http://localhost:3000/api/v1/config
```

## 国际源

Reddit / Google News 需 VPN 或 `HTTPS_PROXY`。失败时查看 `server/src/lib/http.ts` 代理与 curl 回退逻辑。

## 日志

- 后端：Pulse-Backend 控制台
- 启动脚本：`startup.log`（项目根目录）
