import { Router, Request, Response } from 'express';
import { config } from '../config';
import prisma from '../lib/prisma';
import { testConnection } from '../services/aiService';

export const configRouter = Router();

configRouter.get('/', async (req: Request, res: Response) => {
  try {
    const totalTopics = await prisma.hotTopic.count();
    const todayTopics = await prisma.hotTopic.count({
      where: {
        collectedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const analyzedCount = await prisma.aiAnalysis.count();
    const analysisRate =
      totalTopics > 0 ? ((analyzedCount / totalTopics) * 100).toFixed(1) : '0';

    const apiKeyStatus = config.deepseek.apiKey ? 'valid' : 'not_configured';

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
        aiConfig: {
          model: config.deepseek.model,
          apiKeyStatus,
          dailyUsage: 0.35,
          dailyLimit: config.ai.dailyBudget,
        },
        stats: {
          totalTopics,
          todayTopics,
          aiAnalysisRate: parseFloat(analysisRate),
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

    if (apiKey) {
      process.env.DEEPSEEK_API_KEY = apiKey;
      config.deepseek.apiKey = apiKey;
    }
    if (baseUrl) {
      process.env.DEEPSEEK_BASE_URL = baseUrl;
      config.deepseek.baseUrl = baseUrl;
    }
    if (model) {
      process.env.DEEPSEEK_MODEL = model;
      config.deepseek.model = model;
    }

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
        aiConfig: {
          model: config.deepseek.model,
          apiKeyStatus: config.deepseek.apiKey ? 'valid' : 'not_configured',
          dailyUsage: 0.35,
          dailyLimit: config.ai.dailyBudget,
        },
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
