import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { config } from '../config';
import { analyzeHotTopic } from '../services/aiService';
import { notifyAnalysisComplete } from '../socket';

export const aiAnalysisRouter = Router();

const analysisTasks = new Map<
  string,
  { status: string; progress: number; results: any[] }
>();

aiAnalysisRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    if (!config.deepseek.apiKey) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_NOT_CONFIGURED',
          message: '未配置 DEEPSEEK_API_KEY，热点采集与搜索仍可用',
        },
      });
    }

    const { topicIds, forceRefresh = false } = req.body;

    if (!topicIds || !Array.isArray(topicIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'topicIds必须为数组' },
      });
    }

    if (topicIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '单次最多分析50条' },
      });
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    analysisTasks.set(taskId, {
      status: 'pending',
      progress: 0,
      results: [],
    });

    processAnalysisTask(taskId, topicIds, forceRefresh);

    res.json({
      success: true,
      data: {
        taskId,
        estimatedTime: topicIds.length * 2,
        topicCount: topicIds.length,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[AI] Trigger analysis failed:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '触发分析失败' },
    });
  }
});

async function processAnalysisTask(
  taskId: string,
  topicIds: string[],
  forceRefresh: boolean
) {
  const task = analysisTasks.get(taskId)!;
  task.status = 'processing';

  try {
    const keywords = await getActiveKeywords();

    for (let i = 0; i < topicIds.length; i++) {
      const topicId = topicIds[i];

      let existingAnalysis = null;
      if (!forceRefresh) {
        existingAnalysis = await prisma.aiAnalysis.findUnique({
          where: { topicId },
        });
      }

      if (existingAnalysis && !forceRefresh) {
        task.results.push(existingAnalysis);
        task.progress = ((i + 1) / topicIds.length) * 100;
        continue;
      }

      const topic = await prisma.hotTopic.findUnique({
        where: { id: topicId },
      });

      if (!topic) continue;

      const metricsData = typeof topic.metrics === 'string' 
        ? JSON.parse(topic.metrics) 
        : topic.metrics;

      const analysisResult = await analyzeHotTopic({
        hotTopic: {
          title: topic.title,
          content: topic.content || undefined,
          source: topic.source,
          metrics: metricsData,
        },
        userKeywords: keywords,
      });

      const analysisData = {
        relevanceScore: analysisResult.relevanceScore,
        scoreBreakdown: JSON.stringify(analysisResult.scoreBreakdown),
        summary: analysisResult.summary,
        keyPoints: JSON.stringify(analysisResult.keyPoints),
        sentiment: analysisResult.sentiment,
        isReal: analysisResult.isReal,
        importance: analysisResult.importance,
        prediction: JSON.stringify(analysisResult.prediction),
        modelUsed: analysisResult.modelUsed,
        tokensUsed: analysisResult.tokensUsed,
        cost: (analysisResult.tokensUsed / 1000) * 0.001,
      };

      const savedAnalysis = await prisma.aiAnalysis.upsert({
        where: { topicId },
        update: analysisData,
        create: { topicId, ...analysisData },
      });

      task.results.push(savedAnalysis);
      task.progress = ((i + 1) / topicIds.length) * 100;
    }

    task.status = 'completed';
    // Notify all connected WebSocket clients that analysis is done
    notifyAnalysisComplete(taskId, task.results.length, topicIds.length - task.results.length);
  } catch (error) {
    console.error('[AI] Analysis task failed:', error);
    task.status = 'failed';
    notifyAnalysisComplete(taskId, task.results.length, topicIds.length - task.results.length);
  }
}

async function getActiveKeywords(): Promise<string[]> {
  const groups = await prisma.keywordGroup.findMany({
    where: { isActive: true },
    include: { keywords: true },
  });

  const allKeywords: string[] = [];
  for (const group of groups) {
    for (const keyword of group.keywords) {
      allKeywords.push(keyword.word);
    }
  }
  return [...new Set(allKeywords)];
}

aiAnalysisRouter.get('/analyze/status/:taskId', (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const task = analysisTasks.get(taskId);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '任务不存在' },
    });
  }

  res.json({
    success: true,
    data: {
      taskId,
      status: task.status,
      progress: Math.round(task.progress),
      completedCount: task.results.length,
      totalCount: task.results.length + (task.status === 'processing' ? 1 : 0),
      results: task.status === 'completed' ? task.results : undefined,
    },
  });
});
