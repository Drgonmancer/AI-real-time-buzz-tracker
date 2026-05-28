import { Server, Socket } from 'socket.io';
import { config } from './config';

interface ConnectedClient {
  id: string;
  subscribedGroups: Set<string>;
  connectedAt: Date;
}

const clients = new Map<string, ConnectedClient>();

// Module-level io reference — set once in setupSocketHandlers and reused
// by broadcast helpers called from scrapers, etc.
let _io: Server | null = null;

function isInQuietHours(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const [quietStartHour] = config.notification.quietStart.split(':').map(Number);
  const [quietEndHour] = config.notification.quietEnd.split(':').map(Number);

  if (quietEndHour > quietStartHour) {
    return currentHour >= quietStartHour && currentHour < quietEndHour;
  } else {
    return currentHour >= quietStartHour || currentHour < quietEndHour;
  }
}

export function setupSocketHandlers(io: Server) {
  _io = io;

  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    clients.set(socket.id, {
      id: socket.id,
      subscribedGroups: new Set(),
      connectedAt: new Date(),
    });

    socket.emit('connected', {
      serverTime: Date.now(),
      clientId: socket.id,
    });

    socket.on('subscribe', async (data: { keywordGroupId: string }) => {
      const client = clients.get(socket.id);
      if (client && data.keywordGroupId) {
        client.subscribedGroups.add(data.keywordGroupId);
        console.log(`[WS] Client ${socket.id} subscribed group: ${data.keywordGroupId}`);
        socket.emit('system:notification', {
          type: 'info',
          message: `Subscribed to group: ${data.keywordGroupId}`,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('unsubscribe', (data: { keywordGroupId: string }) => {
      const client = clients.get(socket.id);
      if (client && data.keywordGroupId) {
        client.subscribedGroups.delete(data.keywordGroupId);
        console.log(`[WS] Client ${socket.id} unsubscribed group: ${data.keywordGroupId}`);
      }
    });

    socket.on('ping', (data: { timestamp: number }) => {
      socket.emit('pong', { timestamp: data.timestamp || Date.now() });
    });

    socket.on('sync:request', (data: { force: boolean }) => {
      console.log(`[WS] Client ${socket.id} sync request (force=${data.force})`);
      socket.emit('system:notification', {
        type: 'info',
        message: data.force ? 'Syncing all data...' : 'Syncing new data...',
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
      clients.delete(socket.id);
    });
  });

  console.log(`[WS] WebSocket service started, current connections: ${clients.size}`);
}

/**
 * Notify all connected clients that new topics are available.
 * Clients should re-fetch from the REST API when they receive this event.
 * Much lighter than pushing full topic payloads.
 */
export function notifyTopicsUpdated(source: string, newCount: number) {
  if (!_io) return;
  if (isInQuietHours()) return;

  _io.emit('hot_topic:updated', {
    source,
    newCount,
    timestamp: Date.now(),
  });
}

export function broadcastNewHotTopic(topic: any) {
  if (!_io) return;
  if (!topic.analysis || topic.analysis.relevanceScore < config.notification.minScore) return;
  if (isInQuietHours()) return;

  _io.emit('hot_topic:new', { topic, timestamp: Date.now() });
}

export function broadcastBatchUpdate(topics: any[]) {
  if (!_io || topics.length === 0) return;

  _io.emit('hot_topic:batch_update', {
    topics,
    totalCount: topics.length,
    updateTime: new Date().toISOString(),
  });
}

/**
 * Notify clients that an AI analysis task has completed.
 * Frontend can use taskId to fetch results or simply refresh.
 */
export function notifyAnalysisComplete(taskId: string, analyzedCount: number, failed: number) {
  if (!_io) return;
  _io.emit('ai:analysis_complete', {
    taskId,
    analyzedCount,
    failed,
    timestamp: Date.now(),
  });
}
