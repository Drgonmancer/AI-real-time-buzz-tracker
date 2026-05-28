# 测试与诊断

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
