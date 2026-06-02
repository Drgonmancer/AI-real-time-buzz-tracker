import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { initNetwork } from './lib/http';
import { config } from './config';
import { initAiConfigFromDb } from './services/aiConfigService';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { hotTopicsRouter } from './routes/hotTopics';
import { aiAnalysisRouter } from './routes/aiAnalysis';
import { keywordGroupsRouter } from './routes/keywordGroups';
import { configRouter } from './routes/config';
import { searchRouter } from './routes/search';
import { setupSocketHandlers } from './socket';
import { startScrapers } from './services/scraperService';

initNetwork();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.websocket.corsOrigin,
    methods: ['GET', 'POST'],
  },
  pingTimeout: config.websocket.pingTimeout,
  pingInterval: config.websocket.pingInterval,
});

app.set('io', io);

app.use(helmet());
app.use(cors({
  origin: config.websocket.corsOrigin,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/hot-topics', hotTopicsRouter);
app.use('/api/v1/ai', aiAnalysisRouter);
app.use('/api/v1/keyword-groups', keywordGroupsRouter);
app.use('/api/v1/config', configRouter);
app.use('/api/v1/search', searchRouter);

app.use(notFoundHandler);
app.use(errorHandler);

setupSocketHandlers(io);

if (config.scraper.enabled) {
  setTimeout(() => {
    startScrapers();
  }, 3000);
}

const PORT = config.port;

async function startServer() {
  try {
    await initAiConfigFromDb();
  } catch (error) {
    console.error('[Startup] Failed to load AI config from database:', error);
  }

  httpServer.listen(PORT, () => {
    console.log(`
  Pulse Server Started Successfully!
  
  HTTP API:     http://localhost:${PORT}
  API v1:       http://localhost:${PORT}/api/v1
  WebSocket:    ws://localhost:${PORT}
  
  Data Sources:
     - Baidu Hot:      ${config.scraper.enabled ? 'ON' : 'OFF'}
     - Weibo Hot:      ${config.scraper.enabled ? 'ON' : 'OFF'}
     - Douyin Hot:     ${config.scraper.enabled ? 'ON' : 'OFF'}
     - GitHub Trending: ${config.scraper.enabled ? 'ON' : 'OFF'}
     
  AI Model:     ${config.deepseek.model}
  API Key:      ${config.deepseek.apiKey ? 'SET' : 'NOT SET'}
  
  Health Check: http://localhost:${PORT}/health
  `);
  });
}

startServer();

export { app, io };
