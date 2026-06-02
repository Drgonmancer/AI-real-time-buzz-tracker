import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

export type WsEventHandlers = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onNewTopic?: (data: unknown) => void;
  onBatchUpdate?: (data: { topics?: unknown[]; totalCount?: number }) => void;
  onTopicsUpdated?: (data: { source: string; newCount: number; timestamp: number }) => void;
  onAnalysisComplete?: (data: unknown) => void;
  onNotification?: (data: unknown) => void;
};

type WebSocketContextValue = {
  connected: boolean;
  subscribe: (keywordGroupId: string) => void;
  unsubscribe: (keywordGroupId: string) => void;
  requestSync: (force?: boolean) => void;
  registerHandlers: (id: string, handlers: WsEventHandlers) => void;
  unregisterHandlers: (id: string) => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/** 开发环境直连后端，避免 Vite ws 代理在路由切换时 ECONNABORTED */
function getSocketUrl(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  }
  return '/';
}

function dispatchHandlers(
  map: Map<string, WsEventHandlers>,
  key: keyof WsEventHandlers,
  arg?: unknown
) {
  for (const h of map.values()) {
    const fn = h[key];
    if (typeof fn === 'function') {
      if (arg !== undefined) (fn as (data: unknown) => void)(arg);
      else (fn as () => void)();
    }
  }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, WsEventHandlers>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      dispatchHandlers(handlersRef.current, 'onConnect');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      dispatchHandlers(handlersRef.current, 'onDisconnect');
    });

    socket.on('hot_topic:new', (data) => {
      dispatchHandlers(handlersRef.current, 'onNewTopic', data);
    });

    socket.on('hot_topic:batch_update', (data) => {
      dispatchHandlers(handlersRef.current, 'onBatchUpdate', data);
    });

    socket.on('hot_topic:updated', (data) => {
      dispatchHandlers(handlersRef.current, 'onTopicsUpdated', data);
    });

    socket.on('ai:analysis_complete', (data) => {
      dispatchHandlers(handlersRef.current, 'onAnalysisComplete', data);
    });

    socket.on('system:notification', (data) => {
      dispatchHandlers(handlersRef.current, 'onNotification', data);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] connect_error:', err.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const registerHandlers = useCallback((id: string, handlers: WsEventHandlers) => {
    handlersRef.current.set(id, handlers);
    if (socketRef.current?.connected) {
      handlers.onConnect?.();
    }
  }, []);

  const unregisterHandlers = useCallback((id: string) => {
    handlersRef.current.delete(id);
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

  const value: WebSocketContextValue = {
    connected,
    subscribe,
    unsubscribe,
    requestSync,
    registerHandlers,
    unregisterHandlers,
  };

  return (
    <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
  );
}

export function useWebSocket(handlers: WsEventHandlers = {}, consumerId = 'default') {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const id = consumerId;
    ctx.registerHandlers(id, {
      onConnect: () => handlersRef.current.onConnect?.(),
      onDisconnect: () => handlersRef.current.onDisconnect?.(),
      onNewTopic: (d) => handlersRef.current.onNewTopic?.(d),
      onBatchUpdate: (d) => handlersRef.current.onBatchUpdate?.(d),
      onTopicsUpdated: (d) =>
        handlersRef.current.onTopicsUpdated?.(
          d as { source: string; newCount: number; timestamp: number }
        ),
      onAnalysisComplete: (d) => handlersRef.current.onAnalysisComplete?.(d),
      onNotification: (d) => handlersRef.current.onNotification?.(d),
    });
    return () => ctx.unregisterHandlers(id);
  }, [ctx, consumerId]);

  return {
    connected: ctx.connected,
    subscribe: ctx.subscribe,
    unsubscribe: ctx.unsubscribe,
    requestSync: ctx.requestSync,
  };
}
