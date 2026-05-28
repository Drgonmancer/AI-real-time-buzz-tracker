# 功能说明

## 核心能力

### 1. 多平台热点采集（定时爬虫）

启动后约 3 秒自动调度，数据写入 SQLite，WebSocket 推送更新。

| sourceName | 平台 | 备注 |
|------------|------|------|
| `baidu` | 百度热搜 | |
| `weibo` | 微博热搜 | |
| `douyin` | 抖音热榜 | |
| `bilibili` | B站热门 | |
| `github` | GitHub Trending | stars > 100 |
| `hackernews` | Hacker News | score ≥ 10 |
| `devto` | DEV Community | |
| `twitter` | Twitter 趋势 | 需 `TWITTER_BEARER_TOKEN` |
| `reddit` | Reddit r/technology | 需代理；curl 通道 |
| `bingnews` | Bing News RSS | 当前常为空 |
| `gnews_cn_tech` | Google News 科技 | 需代理 |
| `gnews_cn` | Google News 综合 | 需代理 |
| `gnews_ai` | Google News AI | 需代理 |

### 2. 关键词跨平台搜索

Dashboard 顶部搜索栏 + `POST /api/v1/search`。

| source | 平台 |
|--------|------|
| `bilibili` | B站视频搜索 |
| `sogou` | 搜狗网页 |
| `weibo` | 微博热搜匹配 |
| `twitter` | Twitter 高级搜索 |
| `devto` | DEV 文章 |
| `gnews_search` | Google News RSS |

策略：**先拓宽来源、后过滤**；无严格匹配时微博等源可返回热榜供浏览。

### 3. AI 分析（DeepSeek）

- 相关性评分 `relevanceScore`（0–100）
- 摘要、情感、趋势预测
- **`isReal`**：是否真实有价值（过滤标题党/谣言）
- **`importance`**：`low` | `medium` | `high` | `urgent`
- 分析完成通过 WebSocket 事件 `ai:analysis_complete` 推送

### 4. 前端 Dashboard

- 热点列表：来源筛选、分类、关键词、分页
- 实时刷新（WebSocket + 静默轮询）
- 搜索栏与各平台状态徽章
- Aceternity 风格动效（Framer Motion、Spotlight、Meteors）
- Settings：AI 配置、关键词组、数据源状态

### 5. 数据源健康检查

`GET /api/v1/search/sources/health` — 逐个测试爬虫与搜索源。

## 诊断脚本

在 `server/` 目录：

```bash
npm run test:sources   # 全量爬虫
npm run test:intl      # Reddit + Google News
npm run test:search    # 多平台关键词搜索
```

脚本位于 `server/scripts/`，非生产代码路径。
