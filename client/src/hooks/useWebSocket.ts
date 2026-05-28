import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onNewTopic?: (data: any) => void;
  onBatchUpdate?: (data: any) => void;
  onTopicsUpdated?: (data: { source: string; newCount: number; timestamp: number }) => void;
  onAnalysisComplete?: (data: any) => void;
  onNotification?: (data: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket 已连接');
      optionsRef.current.onConnect?.();
    });

    socket.on('hot_topic:new', (data) => {
      optionsRef.current.onNewTopic?.(data);
    });

    socket.on('hot_topic:batch_update', (data) => {
      optionsRef.current.onBatchUpdate?.(data);
    });

    socket.on('hot_topic:updated', (data) => {
      optionsRef.current.onTopicsUpdated?.(data);
    });

    socket.on('ai:analysis_complete', (data) => {
      optionsRef.current.onAnalysisComplete?.(data);
    });

    socket.on('system:notification', (data) => {
      optionsRef.current.onNotification?.(data);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket 已断开');
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket 连接错误:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((keywordGroupId: string) => {
    socketRef.current?.emit('subscribe', { keywordGroupId });
  }, []);

  const unsubscribe = useCallback((keywordGroupId: string) => {
    socketRef.current?.emit('unsubscribe', { keywordGroupId });
  }, []);

  const requestSync = useCallback((force = false) => {
    socketRef.current?.emit('sync:request', { force });
  }, []);

  return { subscribe, unsubscribe, requestSync };
}
