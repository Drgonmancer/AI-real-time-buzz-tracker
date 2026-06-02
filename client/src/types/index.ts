export interface HotTopic {
  id: string;
  title: string;
  content: string | null;
  source: string;
  sourceUrl: string | null;
  category: string | null;
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    stars?: number;
    hotScore?: number;
    hotValue?: number;
    rawHot?: number;
    score?: number;
    descendants?: number;
    votes?: number;
    forks?: number;
    watchers?: number;
  };
  rank: number | null;
  collectedAt: string;
  analysis: {
    relevanceScore: number | null;
    summary: string | null;
    prediction: {
      trend: 'rising' | 'stable' | 'declining';
      hours_24: { score: number; confidence: number };
      hours_48: { score: number; confidence: number };
      hours_72: { score: number; confidence: number };
    } | null;
  } | null;
}

export interface HotTopicDetail extends HotTopic {
  hash: string;
  createdAt: string;
  analysis: {
    relevanceScore: number | null;
    scoreBreakdown: { keywordMatch: number; contentRelevance: number; hotnessFactor: number } | null;
    summary: string | null;
    keyPoints: string[] | null;
    sentiment: string | null;
    prediction: {
      trend: 'rising' | 'stable' | 'declining';
      hours_24: { score: number; confidence: number };
      hours_48: { score: number; confidence: number };
      hours_72: { score: number; confidence: number };
    } | null;
    modelUsed: string;
    analyzedAt: string;
  } | null;
}

export interface KeywordGroup {
  id: string;
  name: string;
  isActive: boolean;
  weight: number;
  keywords: { id: string; word: string; weight: number }[];
  createdAt: string;
}

export interface DataSource {
  name: string;
  enabled: boolean;
  lastSyncAt: string | null;
  status: 'active' | 'error' | 'disabled';
}

export interface AiConfig {
  model: string;
  apiKeyStatus: 'valid' | 'invalid' | 'not_configured';
  apiKeyConfigured?: boolean;
  apiKeyHint?: string | null;
  dailyUsage: number;
  dailyLimit: number;
}

export interface SystemStats {
  totalTopics: number;
  todayTopics: number;
  aiAnalysisRate: number;
}

export interface SystemConfig {
  dataSources: DataSource[];
  aiConfig: AiConfig;
  stats: SystemStats;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { total: number; page: number; pageSize: number };
}

export interface AnalysisTask {
  taskId: string;
  estimatedTime: number;
  topicCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AnalysisStatus {
  taskId: string;
  status: string;
  progress: number;
  completedCount: number;
  totalCount: number;
  results?: any[];
}

export const SOURCE_LABELS: Record<string, string> = {
  baidu: '百度热搜',
  weibo: '微博热搜',
  douyin: '抖音热点',
  github: 'GitHub',
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  devto: 'DEV.to',
  twitter: 'Twitter',
  bilibili: 'Bilibili',
  sogou: '搜狗搜索',
  gnews_search: 'Google·搜索',
  bingnews: 'Bing News',
  gnews_cn_tech: 'Google·科技',
  gnews_cn: 'Google·头条',
  gnews_ai: 'Google·AI',
};

export const SOURCE_ICONS: Record<string, string> = {
  baidu: '🔴',
  weibo: '🟠',
  douyin: '⚫',
  github: '🐙',
  hackernews: '🟠',
  reddit: '🟧',
  devto: '🟣',
  twitter: '🔵',
  bilibili: '📺',
  sogou: '🔍',
  gnews_search: '📰',
  bingnews: '🟢',
  gnews_cn_tech: '📰',
  gnews_cn: '🗞️',
  gnews_ai: '🤖',
};
