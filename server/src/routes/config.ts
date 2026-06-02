import { Router, Request, Response } from 'express';
import { config } from '../config';
import prisma from '../lib/prisma';
import { testConnection } from '../services/aiService';
import {
  clearStoredApiKey,
  getAiConfigSnapshot,
  saveAiConfig,
} from '../services/aiConfigService';

export const configRouter = Router();

configRouter.get('/', async (req: Request, res: Response) => {
  try {
    const lite =
      req.query.lite === '1' ||
      req.query.lite === 'true' ||
      req.query.lite === 'settings';

    let totalTopics = 0;
    let todayTopics = 0;
    let analysisRate = 0;

    if (!lite) {
      const [total, today, analyzedCount] = await Promise.all([
        prisma.hotTopic.count(),
        prisma.hotTopic.count({
          where: {
            collectedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.aiAnalysis.count(),
      ]);
      totalTopics = total;
      todayTopics = today;
      analysisRate =
        totalTopics > 0 ? parseFloat(((analyzedCount / totalTopics) * 100).toFixed(1)) : 0;
    }

    res.json({
      success: true,
      data: {
        dataSources: [
          { name: 'baidu',        enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'weibo',        enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'douyin',       enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'bilibili',     enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'sogou',        enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'github',       enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'hackernews',   enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'reddit',       enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'devto',        enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'twitter',      enabled: !!config.twitter.bearerToken, lastSyncAt: null, status: config.twitter.bearerToken ? 'active' : 'disabled' },
          { name: 'bingnews',     enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'gnews_cn_tech',enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'gnews_cn',     enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
          { name: 'gnews_ai',     enabled: config.scraper.enabled, lastSyncAt: null, status: 'active' },
        ],
        aiConfig: getAiConfigSnapshot(),
        stats: {
          totalTopics,
          todayTopics,
          aiAnalysisRate: analysisRate,
        },
      },
    });
  } catch (error) {
    console.error('[Config] Get config failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取系统配置失败' },
    });
  }
});

configRouter.put('/ai', async (req: Request, res: Response) => {
  try {
    const { apiKey, baseUrl, model } = req.body;

    if (!apiKey && !baseUrl && !model) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请提供要保存的配置项' },
      });
    }

    if (apiKey !== undefined && typeof apiKey === 'string' && apiKey.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'API Key 不能为空，如需删除请使用删除功能' },
      });
    }

    await saveAiConfig({
      apiKey: typeof apiKey === 'string' ? apiKey.trim() : undefined,
      baseUrl: typeof baseUrl === 'string' ? baseUrl.trim() : undefined,
      model: typeof model === 'string' ? model.trim() : undefined,
    });

    const totalTopics = await prisma.hotTopic.count();
    const todayTopics = await prisma.hotTopic.count({
      where: {
        collectedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    res.json({
      success: true,
      data: {
        aiConfig: getAiConfigSnapshot(),
        stats: {
          totalTopics,
          todayTopics,
        },
      },
    });
  } catch (error) {
    console.error('[Config] Update AI config failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '更新AI配置失败' },
    });
  }
});

configRouter.delete('/ai/key', async (_req: Request, res: Response) => {
  try {
    await clearStoredApiKey();

    res.json({
      success: true,
      data: {
        aiConfig: getAiConfigSnapshot(),
        message: 'API Key 已删除',
      },
    });
  } catch (error) {
    console.error('[Config] Delete API key failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '删除 API Key 失败' },
    });
  }
});

configRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { apiKey, baseUrl } = req.body;

    const result = await testConnection(apiKey, baseUrl);

    res.json({
      success: true,
      data: {
        connected: result.connected,
        latency: result.latency,
        model: config.deepseek.model,
        testMessage: 'Connection successful',
      },
    });
  } catch (error: any) {
    console.error('[Config] Test connection failed:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: error.message || 'DeepSeek API Key无效，请检查后重试',
      },
    });
  }
});
