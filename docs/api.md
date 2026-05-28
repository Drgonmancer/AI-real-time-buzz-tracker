# API 接口文档

## 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:3000/api/v1` |
| 健康检查 | `http://localhost:3000/health` |
| WebSocket | `ws://localhost:3000`（Socket.IO） |
| 前端开发地址 | `http://localhost:5173`（Vite 代理 `/api` → 3000） |
| 认证 | MVP 无认证 |

## 通用响应

成功：`{ "success": true, "data": ... }`  
失败：`{ "success": false, "error": { "code", "message" } }`

---

## 热点数据

### GET /hot-topics

Query：`page`, `pageSize`, `source`, `category`, `q`, `minScore`, `maxScore`, `sortBy`, `sortOrder`, `dateFrom`, `dateTo`

**source 可选值**（含搜索入库源）：

`baidu` `weibo` `douyin` `bilibili` `github` `hackernews` `devto` `twitter` `reddit` `bingnews` `gnews_cn_tech` `gnews_cn` `gnews_ai` `gnews_search` `sogou` 等

**analysis 字段**（若已分析）：

```json
{
  "relevanceScore": 85,
  "summary": "...",
  "sentiment": "positive",
  "isReal": true,
  "importance": "high",
  "prediction": { "trend": "rising" }
}
```

### GET /hot-topics/:id

热点详情（含完整 `analysis` 字段）。

---

## 关键词搜索

### POST /search

```json
{
  "query": "AI编程",
  "sources": ["bilibili", "sogou", "gnews_search"],
  "save": true
}
```

- `sources` 可选，默认全部搜索源
- `save: true` 时结果去重写入 `hot_topics`

响应含 `results`、`statuses`（各平台 OK/FAIL）。

### GET /search/sources/health

全量数据源健康检查（爬虫 + 搜索源），返回延迟与条数。

---

## AI 分析

### POST /ai/analyze

```json
{ "topicIds": ["..."], "forceRefresh": true }
```

### GET /ai/analyze/status/:taskId

任务进度与结果。

---

## 关键词组

- `GET/POST /keyword-groups`
- `GET/PUT/DELETE /keyword-groups/:id`

---

## 系统配置

- `GET /config` — 数据源、AI、统计
- `PUT /config/ai` — 更新 AI 相关配置
- `POST /config/test-connection` — 测试 DeepSeek 连通性

---

## WebSocket 事件

| 事件 | 说明 |
|------|------|
| `topics:updated` | 新热点入库 |
| `ai:analysis_complete` | 单条 AI 分析完成 |
| `notification` | 高分数推送（若启用） |

客户端连接：`http://localhost:5173` → 代理至 `ws://localhost:3000`

---

**文档版本**：v1.1 · 2026-05-28 · 对齐当前源码
