import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { safeParse, parseMetrics } from '../lib/json';

export const hotTopicsRouter = Router();

function formatTopic(topic: any) {
  return {
    id: topic.id,
    title: topic.title,
    content: topic.content,
    source: topic.source,
    sourceUrl: topic.sourceUrl,
    category: topic.category,
    metrics: parseMetrics(topic.metrics),
    rank: topic.rank,
    collectedAt: topic.collectedAt.toISOString(),
    analysis: topic.analysis
      ? {
          relevanceScore: topic.analysis.relevanceScore,
          summary: topic.analysis.summary,
          sentiment: topic.analysis.sentiment,
          isReal: topic.analysis.isReal,
          importance: topic.analysis.importance,
          prediction: safeParse(topic.analysis.prediction),
        }
      : null,
  };
}

hotTopicsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      source,
      category,
      q,
      minScore = '0',
      maxScore = '100',
      sortBy = 'collectedAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const size = Math.min(parseInt(pageSize as string, 10), 100);
    const skip = (pageNum - 1) * size;

    const where: any = {};

    if (source) {
      where.source = source;
    }

    if (category && typeof category === 'string') {
      where.category = category;
    }

    if (q && typeof q === 'string' && q.trim()) {
      const keyword = q.trim();
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
      ];
    }

    if (dateFrom || dateTo) {
      where.collectedAt = {};
      if (dateFrom) where.collectedAt.gte = new Date(dateFrom as string);
      if (dateTo) where.collectedAt.lte = new Date(dateTo as string);
    }

    if (minScore !== '0' || maxScore !== '100') {
      where.analysis = {
        relevanceScore: {
          gte: parseFloat(minScore as string),
          lte: parseFloat(maxScore as string),
        },
      };
    }

    // Mixed mode: recent 7-day topics sorted by rank, with DB-level pagination
    if (sortBy === 'mixed' && !source) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const mixedWhere = { ...where, collectedAt: { gte: since } };

      const [topics, total] = await Promise.all([
        prisma.hotTopic.findMany({
          where: mixedWhere,
          include: { analysis: true },
          orderBy: [{ rank: 'asc' }, { collectedAt: 'desc' }],
          skip,
          take: size,
        }),
        prisma.hotTopic.count({ where: mixedWhere }),
      ]);

      return res.json({
        success: true,
        data: {
          topics: topics.map(formatTopic),
          meta: { total, page: pageNum, pageSize: size },
        },
      });
    }

    // Standard sort modes
    const orderBy: any = {};
    if (sortBy === 'score') {
      orderBy.analysis = { relevanceScore: sortOrder };
    } else if (sortBy === 'rank') {
      orderBy.rank = sortOrder;
    } else {
      orderBy.collectedAt = sortOrder;
    }

    const [topics, total] = await Promise.all([
      prisma.hotTopic.findMany({
        where,
        include: { analysis: true },
        orderBy,
        skip,
        take: size,
      }),
      prisma.hotTopic.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        topics: topics.map(formatTopic),
        meta: { total, page: pageNum, pageSize: size },
      },
    });
  } catch (error) {
    console.error('[HotTopics] List failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取热点列表失败' },
    });
  }
});

hotTopicsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const topic = await prisma.hotTopic.findUnique({
      where: { id: id as string },
      include: { analysis: true },
    }) as any;

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '热点不存在' },
      });
    }

    res.json({
      success: true,
      data: {
        id: topic.id,
        title: topic.title,
        content: topic.content,
        source: topic.source,
        sourceUrl: topic.sourceUrl,
        category: topic.category,
        metrics: parseMetrics(topic.metrics),
        rank: topic.rank,
        hash: topic.hash,
        collectedAt: topic.collectedAt.toISOString(),
        createdAt: topic.createdAt.toISOString(),
        analysis: topic.analysis
          ? {
              id: topic.analysis.id,
              topicId: topic.analysis.topicId,
              relevanceScore: topic.analysis.relevanceScore,
              scoreBreakdown: safeParse(topic.analysis.scoreBreakdown),
              summary: topic.analysis.summary,
              keyPoints: safeParse(topic.analysis.keyPoints),
              sentiment: topic.analysis.sentiment,
              isReal: topic.analysis.isReal,
              importance: topic.analysis.importance,
              prediction: safeParse(topic.analysis.prediction),
              modelUsed: topic.analysis.modelUsed,
              tokensUsed: topic.analysis.tokensUsed,
              cost: topic.analysis.cost,
              analyzedAt: topic.analysis.analyzedAt.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[HotTopics] Detail failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取热点详情失败' },
    });
  }
});
