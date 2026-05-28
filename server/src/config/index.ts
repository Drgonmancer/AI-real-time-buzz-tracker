import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },

  ai: {
    dailyBudget: parseFloat(process.env.AI_DAILY_BUDGET || '50'),
    maxTopicsPerRun: parseInt(process.env.AI_MAX_TOPICS_PER_RUN || '50', 10),
    analysisInterval: parseInt(process.env.AI_ANALYSIS_INTERVAL || '300000', 10),
  },

  twitter: {
    // This is your twitterapi.io API key (X-API-Key), NOT the official Twitter Bearer Token
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  },

  producthunt: {
    accessToken: process.env.PRODUCTHUNT_ACCESS_TOKEN || '',
  },

  scraper: {
    enabled: process.env.SCRAPER_ENABLED !== 'false',
    intervals: {
      baidu: parseInt(process.env.SCRAPER_INTERVAL_BAIDU || '300000', 10),
      weibo: parseInt(process.env.SCRAPER_INTERVAL_WEIBO || '300000', 10),
      douyin: parseInt(process.env.SCRAPER_INTERVAL_DOUYIN || '600000', 10),
      bilibili: parseInt(process.env.SCRAPER_INTERVAL_BILIBILI || '600000', 10),
      github: parseInt(process.env.SCRAPER_INTERVAL_GITHUB || '3600000', 10),
      hackernews: parseInt(process.env.SCRAPER_INTERVAL_HACKERNEWS || '900000', 10),
      producthunt: parseInt(process.env.SCRAPER_INTERVAL_PRODUCTHUNT || '3600000', 10),
      twitter: parseInt(process.env.SCRAPER_INTERVAL_TWITTER || '900000', 10),
      reddit: parseInt(process.env.SCRAPER_INTERVAL_REDDIT || '1800000', 10),
      bingnews: parseInt(process.env.SCRAPER_INTERVAL_BINGNEWS || '1800000', 10),
      gnews: parseInt(process.env.SCRAPER_INTERVAL_GNEWS || '900000', 10),
    },
  },

  websocket: {
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  },

  notification: {
    minScore: parseInt(process.env.NOTIFICATION_MIN_SCORE || '70', 10),
    quietStart: process.env.NOTIFICATION_QUIET_START || '23:00',
    quietEnd: process.env.NOTIFICATION_QUIET_END || '08:00',
  },

  log: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};
