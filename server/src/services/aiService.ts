import OpenAI from 'openai';
import { config } from '../config';

function createOpenAIClient(apiKey?: string, baseUrl?: string) {
  const key = apiKey || config.deepseek.apiKey;
  if (!key) {
    throw new Error('未配置 DeepSeek API Key');
  }
  return new OpenAI({
    apiKey: key,
    baseURL: baseUrl || config.deepseek.baseUrl,
  });
}

interface RelevanceInput {
  hotTopic: {
    title: string;
    content?: string;
    source: string;
    metrics?: Record<string, number>;
  };
  userKeywords: string[];
}

export interface AnalysisResult {
  relevanceScore: number;
  scoreBreakdown: {
    keywordMatch: number;
    contentRelevance: number;
    hotnessFactor: number;
  };
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  isReal: boolean;
  importance: 'low' | 'medium' | 'high' | 'urgent';
  prediction: {
    trend: 'rising' | 'stable' | 'declining';
    hours_24: { score: number; confidence: number };
    hours_48: { score: number; confidence: number };
    hours_72: { score: number; confidence: number };
  };
  modelUsed: string;
  tokensUsed: number;
}

export async function analyzeHotTopic(
  input: RelevanceInput
): Promise<AnalysisResult> {
  const prompt = `你是一个专业的热点话题分析师。请根据以下热点信息和用户关注的关键词，进行智能分析。

## 热点信息
- 标题: ${input.hotTopic.title}
- 内容: ${input.hotTopic.content || '无'}
- 来源: ${input.hotTopic.source}
- 热度指标: ${JSON.stringify(input.hotTopic.metrics || {})}

## 用户关注的关键词
${input.userKeywords.join(', ') || '未设置关键词'}

请以JSON格式返回以下分析结果（不要包含其他文字）:
{
  "relevanceScore": 0-100的整数,
  "scoreBreakdown": {
    "keywordMatch": 0-40, 
    "contentRelevance": 0-35,
    "hotnessFactor": 0-25
  },
  "summary": "200字以内的中文摘要",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "sentiment": "positive|neutral|negative",
  "isReal": true或false（判断是否为真实有价值的信息，排除标题党、谣言、营销软文）,
  "importance": "low|medium|high|urgent"（对AI编程博主的重要程度：urgent=重大突破/紧急事件, high=值得分享, medium=一般关注, low=不重要）,
  "prediction": {
    "trend": "rising|stable|declining",
    "hours_24": {"score": 0-100, "confidence": 0-1},
    "hours_48": {"score": 0-100, "confidence": 0-1},
    "hours_72": {"score": 0-100, "confidence": 0-1}
  }
}`;

  try {
    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: config.deepseek.model,
      messages: [
        {
          role: 'system',
          content:
            '你是Pulse AI热点决策助手的专业分析引擎。你必须严格以JSON格式输出分析结果，不包含任何额外文字。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseText);

    return {
      relevanceScore: Math.min(100, Math.max(0, result.relevanceScore || 0)),
      scoreBreakdown: {
        keywordMatch: Math.min(40, Math.max(0, result.scoreBreakdown?.keywordMatch || 0)),
        contentRelevance: Math.min(35, Math.max(0, result.scoreBreakdown?.contentRelevance || 0)),
        hotnessFactor: Math.min(25, Math.max(0, result.scoreBreakdown?.hotnessFactor || 0)),
      },
      summary: result.summary || '',
      keyPoints: result.keyPoints || [],
      sentiment: result.sentiment || 'neutral',
      isReal: result.isReal !== undefined ? Boolean(result.isReal) : true,
      importance: ['low', 'medium', 'high', 'urgent'].includes(result.importance)
        ? result.importance
        : 'low',
      prediction: result.prediction || {
        trend: 'stable',
        hours_24: { score: 50, confidence: 0.5 },
        hours_48: { score: 50, confidence: 0.4 },
        hours_72: { score: 50, confidence: 0.3 },
      },
      modelUsed: config.deepseek.model,
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('[AIService] Analysis failed:', error);
    throw error;
  }
}

export async function testConnection(
  apiKey?: string,
  baseUrl?: string
): Promise<{ connected: boolean; latency: number }> {
  const testClient = createOpenAIClient(apiKey, baseUrl);

  const startTime = Date.now();
  try {
    await testClient.chat.completions.create({
      model: config.deepseek.model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5,
    });
    return {
      connected: true,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    throw new Error('API连接失败，请检查API Key和URL是否正确');
  }
}
