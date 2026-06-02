# 后端 API 接口文档

> Base URL：`http://localhost:3000/api/v1`  
> 健康检查：`GET http://localhost:3000/health`  
> 更新日期：2026-06-03

---

## 1. 通用约定

### 1.1 请求头

```
Content-Type: application/json
```

### 1.2 响应格式

**成功：**

```json
{
  "success": true,
  "data": { }
}
```

**失败：**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读说明"
  }
}
```

### 1.3 常见错误码

| HTTP | code | 说明 |
|------|------|------|
| 400 | VALIDATION_ERROR | 参数校验失败 |
| 401 | INVALID_API_KEY | DeepSeek 连接测试失败 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 503 | AI_NOT_CONFIGURED | 未配置 AI API Key |

---

## 2. 热点 Hot Topics

### GET `/hot-topics`

分页查询热点列表。

**Query 参数：**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数，最大 100 |
| source | string | - | 来源筛选，如 `weibo` |
| category | string | - | 分类筛选 |
| q | string | - | 标题/内容关键词 |
| minScore | number | 0 | AI 评分下限 |
| maxScore | number | 100 | AI 评分上限 |
| sortBy | string | collectedAt | `mixed` / `score` / `collectedAt` / `rank` |
| sortOrder | string | desc | `asc` / `desc` |
| dateFrom | ISO8601 | - | 采集时间起 |
| dateTo | ISO8601 | - | 采集时间止 |

**sortBy=mixed 说明：** 近 7 天数据，按 rank 升序 + collectedAt 降序（Dashboard 默认）。

**响应 data：**

```json
{
  "topics": [
    {
      "id": "clxxx",
      "title": "热点标题",
      "content": "正文摘要",
      "source": "weibo",
      "sourceUrl": "https://...",
      "category": "AI技术",
      "metrics": { "hotScore": 12345 },
      "rank": 1,
      "collectedAt": "2026-06-03T08:00:00.000Z",
      "analysis": {
        "relevanceScore": 85,
        "summary": "AI 摘要...",
        "sentiment": "positive",
        "isReal": true,
        "importance": "high",
        "prediction": { "trend": "rising" }
      }
    }
  ],
  "meta": {
    "total": 1200,
    "page": 1,
    "pageSize": 20
  }
}
```

未分析的热点 `analysis` 为 `null`。

---

### GET `/hot-topics/:id`

获取热点详情（含完整 AI 分析字段）。

**响应 data.analysis 额外字段：** `scoreBreakdown`, `keyPoints`, `modelUsed`, `tokensUsed`, `cost`, `analyzedAt`

---

## 3. AI 分析

### POST `/ai/analyze`

对指定热点触发异步 AI 分析。**需已配置 DeepSeek API Key。**

**请求体：**

```json
{
  "topicIds": ["id1", "id2", "id3"],
  "forceRefresh": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| topicIds | string[] | 是 | 热点 ID 列表，最多 50 条 |
| forceRefresh | boolean | 否 | true 时忽略已有分析重新调用 AI |

**成功响应：**

```json
{
  "success": true,
  "data": {
    "taskId": "task_1717400000000_abc123",
    "estimatedTime": 6,
    "topicCount": 3,
    "status": "pending"
  }
}
```

**错误：**

- `503 AI_NOT_CONFIGURED` — 未配置 Key
- `400 VALIDATION_ERROR` — topicIds 非数组或超过 50 条

---

### GET `/ai/analyze/status/:taskId`

查询分析任务进度。

**响应 data：**

```json
{
  "taskId": "task_xxx",
  "status": "processing",
  "progress": 66,
  "completedCount": 2,
  "totalCount": 3,
  "results": []
}
```

`status`：`pending` | `processing` | `completed` | `failed`  
`results` 仅在 `completed` 时返回。

**WebSocket 补充：** 任务完成后服务端广播 `ai:analysis_complete`，前端通常直接刷新列表而非轮询。

---

## 4. 系统配置

### GET `/config`

获取系统配置与统计。

**Query：**

| 参数 | 说明 |
|------|------|
| lite=1 | 轻量模式，跳过 totalTopics 等统计查询（Settings 页使用） |

**响应 data.aiConfig：**

```json
{
  "model": "deepseek-chat",
  "apiKeyStatus": "valid",
  "apiKeyConfigured": true,
  "apiKeyHint": "sk-...abc1",
  "dailyUsage": 0.35,
  "dailyLimit": 50
}
```

> 不返回完整 API Key，仅脱敏 hint。

**响应 data.dataSources：** 各数据源 name / enabled / status  
**响应 data.stats：** totalTopics, todayTopics, aiAnalysisRate（lite 模式下 stats 数值为 0）

---

### PUT `/config/ai`

保存 AI 配置。

**请求体：**

```json
{
  "apiKey": "sk-xxxxxxxx",
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat"
}
```

字段均可选，但至少提供一个。`apiKey` 不能为空字符串（删除请用 DELETE 接口）。

**行为：** API Key 写入数据库 `users.apiKey` 并立即生效。

---

### DELETE `/config/ai/key`

删除已存储的 API Key。

**响应：**

```json
{
  "success": true,
  "data": {
    "aiConfig": { "apiKeyConfigured": false, "apiKeyStatus": "not_configured", ... },
    "message": "API Key 已删除"
  }
}
```

---

### POST `/config/test-connection`

测试 DeepSeek 连接。

**请求体（均可选）：**

```json
{
  "apiKey": "sk-xxx",
  "baseUrl": "https://api.deepseek.com/v1"
}
```

不传 `apiKey` 时使用当前已保存的配置。

**成功：**

```json
{
  "success": true,
  "data": {
    "connected": true,
    "latency": 842,
    "model": "deepseek-chat",
    "testMessage": "Connection successful"
  }
}
```

**失败：** HTTP 401，`code: INVALID_API_KEY`

---

## 5. 关键词组 Keyword Groups

### GET `/keyword-groups`

返回全部关键词组及下属关键词。

---

### POST `/keyword-groups`

创建关键词组。

**请求体：**

```json
{
  "name": "AI大模型",
  "weight": 1.0,
  "keywords": [
    { "word": "GPT", "weight": 1.0 },
    { "word": "DeepSeek", "weight": 1.5 }
  ]
}
```

- `name` 必填，1～20 个关键词
- 组名重复返回 `400 DUPLICATE_ERROR`

---

### PUT `/keyword-groups/:id`

更新组名、启用状态、权重或整组关键词。

**请求体示例：**

```json
{
  "name": "新名称",
  "isActive": true,
  "weight": 1.2,
  "keywords": [{ "word": "Claude" }]
}
```

---

### DELETE `/keyword-groups/:id`

删除关键词组（级联删除下属关键词）。

---

## 6. 搜索 Search

### POST `/search`

多平台关键词搜索。

**请求体：**

```json
{
  "query": "DeepSeek",
  "sources": ["bilibili", "weibo", "sogou"],
  "save": true
}
```

| 字段 | 说明 |
|------|------|
| query | 必填，搜索词 |
| sources | 可选，限定平台；不传则搜索全部 |
| save | 默认 true，新结果入库 |

**响应 data：**

```json
{
  "query": "DeepSeek",
  "total": 45,
  "savedCount": 12,
  "statuses": [
    { "source": "bilibili", "ok": true, "count": 20, "latencyMs": 1200 }
  ],
  "results": [
    {
      "title": "...",
      "content": "...",
      "source": "bilibili",
      "sourceUrl": "https://...",
      "metrics": {},
      "rank": 1
    }
  ]
}
```

---

### GET `/search/sources/health`

数据源健康检查（逐个测试 scraper + 部分搜索源）。

**响应 data.summary：** total / ok / failed

---

## 7. WebSocket（Socket.IO）

**连接地址：** `ws://localhost:3000`（开发环境前端也可经 Vite 代理）

| 事件 | 方向 | 载荷摘要 |
|------|------|---------|
| `connected` | S→C | `{ serverTime, clientId }` |
| `hot_topic:updated` | S→C | `{ source, newCount, timestamp }` |
| `hot_topic:new` | S→C | `{ topic, timestamp }` |
| `hot_topic:batch_update` | S→C | `{ topics, totalCount, updateTime }` |
| `ai:analysis_complete` | S→C | `{ taskId, analyzedCount, failed, timestamp }` |
| `ping` | C→S | `{ timestamp }` |
| `pong` | S→C | `{ timestamp }` |

---

## 8. 数据源 name 枚举

| name | 说明 |
|------|------|
| baidu | 百度热搜 |
| weibo | 微博热搜 |
| douyin | 抖音热点 |
| bilibili | B 站热门 |
| sogou | 搜狗微信热词 |
| github | GitHub Trending |
| hackernews | Hacker News |
| reddit | Reddit |
| devto | Dev.to |
| twitter | Twitter（需 Token） |
| bingnews | Bing News |
| gnews_cn_tech | Google News 中文科技 |
| gnews_cn | Google News 中文 |
| gnews_ai | Google News AI |
| gnews_search | 搜索专用 Google News |

---

## 9. 相关文档

- [需求分析.md](./需求分析.md)
- [技术实现方案.md](./技术实现方案.md)
- [人工配置.md](./人工配置.md)
