import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { autoClassify } from '../lib/classify';
import { notifyTopicsUpdated } from '../socket';
import { searchAllPlatforms } from '../services/searchService';
import { scrapers } from '../services/scraperService';

export const searchRouter = Router();

function hashTopic(title: string, source: string): string {
  return crypto.createHash('md5').update(`${title}_${source}`).digest('hex');
}

/** 多平台关键词搜索 — 先拓宽采集，结果入库 */
searchRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { query, sources, save = true } = req.body as {
      query?: string;
      sources?: string[];
      save?: boolean;
    };

    if (!query || typeof query !== 'string' || query.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请输入搜索关键词' },
      });
    }

    const q = query.trim();
    const { results, statuses } = await searchAllPlatforms(q, sources);

    let savedCount = 0;
    if (save && results.length > 0) {
      const hashes = results.map((r) => hashTopic(r.title, r.source));
      const existing = await prisma.hotTopic.findMany({
        where: { hash: { in: hashes } },
        select: { hash: true },
      });
      const existingSet = new Set(existing.map((e) => e.hash));
      const newItems = results.filter((r) => !existingSet.has(hashTopic(r.title, r.source)));

      if (newItems.length > 0) {
        await prisma.hotTopic.createMany({
          data: newItems.map((item) => ({
            title: item.title,
            content: item.content,
            source: item.source,
            sourceUrl: item.sourceUrl,
            category: autoClassify(item.title, item.source),
            metrics: JSON.stringify(item.metrics || {}),
            rank: item.rank,
            hash: hashTopic(item.title, item.source),
          })),
        });
        savedCount = newItems.length;
        notifyTopicsUpdated('search', savedCount);
      }
    }

    res.json({
      success: true,
      data: {
        query: q,
        total: results.length,
        savedCount,
        statuses,
        results: results.map((r) => ({
          title: r.title,
          content: r.content,
          source: r.source,
          sourceUrl: r.sourceUrl,
          metrics: r.metrics,
          rank: r.rank,
        })),
      },
    });
  } catch (error) {
    console.error('[Search] Failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '搜索失败' },
    });
  }
});

/** 数据源健康检查 — 逐个测试可用性 */
searchRouter.get('/sources/health', async (_req: Request, res: Response) => {
  const testQuery = 'AI';
  const checks: {
    source: string;
    ok: boolean;
    count: number;
    error?: string;
    latencyMs: number;
  }[] = [];

  // 测试定时爬虫
  for (const scraper of scrapers) {
    const start = Date.now();
    try {
      const raw = await scraper.fetchData();
      const parsed = scraper.parseData(raw);
      checks.push({
        source: scraper.sourceName,
        ok: parsed.length > 0,
        count: parsed.length,
        latencyMs: Date.now() - start,
        error: parsed.length === 0 ? '无数据返回' : undefined,
      });
    } catch (err: any) {
      checks.push({
        source: scraper.sourceName,
        ok: false,
        count: 0,
        error: err.message,
        latencyMs: Date.now() - start,
      });
    }
  }

  // 测试关键词搜索源
  const { statuses } = await searchAllPlatforms(testQuery, ['sogou', 'bilibili', 'weibo']);
  checks.push(...statuses);

  res.json({
    success: true,
    data: {
      testedAt: new Date().toISOString(),
      query: testQuery,
      sources: checks,
      summary: {
        total: checks.length,
        ok: checks.filter((c) => c.ok).length,
        failed: checks.filter((c) => !c.ok).length,
      },
    },
  });
});
