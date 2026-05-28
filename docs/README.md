# 文档索引

| 文档 | 说明 |
|------|------|
| [换机部署](deployment.md) | **克隆到其他电脑、能力矩阵、零配置可用范围** |
| [快速启动](quickstart.md) | Windows 一键启动、手动启动、验证步骤 |
| [环境配置](configuration.md) | Node.js、`.env`、SQLite、DeepSeek（可选）、代理 |
| [功能说明](features.md) | 当前已实现功能与数据源清单 |
| [API 接口](api.md) | REST + WebSocket 接口 |
| [架构与技术栈](architecture.md) | 目录结构、模块划分、技术选型 |
| [测试与诊断](testing.md) | 冒烟测试、数据源自检命令 |

## 端口一览（与源码一致）

| 服务 | 端口 | 配置文件 |
|------|------|----------|
| 后端 API | **3000** | `server/.env` → `PORT` |
| 前端页面 | **5173** | `client/vite.config.ts` → `server.port` |
| WebSocket | **3000**（与后端同端口） | `server/src/index.ts` |
| 前端代理 | `/api`、`/socket.io` → `http://localhost:3000` | `client/vite.config.ts` |

访问地址：

- 前端 Dashboard：http://localhost:5173
- 后端健康检查：http://localhost:3000/health
- API 根路径：http://localhost:3000/api/v1

> 若修改后端 `PORT`，需同步修改 `client/vite.config.ts` 中的 `proxy.target`。

## 最小可用 vs 完整功能

| 场景 | 需要配置 |
|------|----------|
| 国内热点 + Dashboard 搜索 | 默认 `.env` 即可 |
| AI 分析 | `DEEPSEEK_API_KEY` |
| Reddit / Google News | VPN 或 `HTTPS_PROXY` |
| Twitter | `TWITTER_BEARER_TOKEN` |

详见 [deployment.md](deployment.md)。
