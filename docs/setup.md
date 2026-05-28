# 安装与配置

> 完整说明见 [configuration.md](configuration.md) 与 [deployment.md](deployment.md)

## 快速步骤

1. Node.js 18+
2. 克隆仓库
3. Windows：双击 `start.bat`（会自动创建 `server/.env`）
4. 其他系统：`bash scripts/setup.sh`，然后 `npm run dev:server` + `npm run dev:client`

**不必**先填 API Key 即可使用国内热点与搜索。需要 AI 分析时再编辑 `server/.env` 填入 `DEEPSEEK_API_KEY`。

## 端口

| 服务 | 端口 |
|------|------|
| 前端 | **5173** |
| 后端 | **3000** |

详见 [README.md](README.md#端口一览与源码一致)。
