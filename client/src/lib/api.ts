import type {
  ApiResponse,
  HotTopic,
  HotTopicDetail,
  KeywordGroup,
  SystemConfig,
  AnalysisTask,
  AnalysisStatus,
} from '../types';

const BASE_URL = '/api/v1';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${text || res.statusText || 'Request failed'}`);
  }

  const text = await res.text();
  if (!text || text.trim().length === 0) {
    throw new Error('Empty response from server - backend may not be running');
  }

  const json: ApiResponse<T> = JSON.parse(text);

  if (!json.success) {
    throw new Error(json.error?.message || '请求失败');
  }

  return json.data as T;
}

export const api = {
  getHotTopics(params?: Record<string, string | number>) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.set(k, String(v));
      });
    }
    const qs = searchParams.toString();
    return request<{ topics: HotTopic[]; meta: { total: number; page: number; pageSize: number } }>(
      `/hot-topics${qs ? `?${qs}` : ''}`
    );
  },

  getHotTopicDetail(id: string) {
    return request<HotTopicDetail>(`/hot-topics/${id}`);
  },

  triggerAnalysis(topicIds: string[], forceRefresh = false) {
    return request<AnalysisTask>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ topicIds, forceRefresh }),
    });
  },

  getAnalysisStatus(taskId: string) {
    return request<AnalysisStatus>(`/ai/analyze/status/${taskId}`);
  },

  getKeywordGroups() {
    return request<KeywordGroup[]>('/keyword-groups');
  },

  createKeywordGroup(data: { name: string; weight?: number; keywords: { word: string; weight?: number }[] }) {
    return request<KeywordGroup>('/keyword-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateKeywordGroup(id: string, data: Partial<{ name: string; isActive: boolean; weight: number; keywords: { word: string; weight?: number }[] }>) {
    return request<KeywordGroup>(`/keyword-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteKeywordGroup(id: string) {
    return request<{ success: boolean }>(`/keyword-groups/${id}`, {
      method: 'DELETE',
    });
  },

  getConfig(options?: { lite?: boolean }) {
    const qs = options?.lite ? '?lite=1' : '';
    return request<SystemConfig>(`/config${qs}`);
  },

  updateAiConfig(data: { apiKey?: string; baseUrl?: string; model?: string }) {
    return request<SystemConfig>('/config/ai', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAiApiKey() {
    return request<{ aiConfig: SystemConfig['aiConfig']; message: string }>('/config/ai/key', {
      method: 'DELETE',
    });
  },

  testConnection(data?: { apiKey?: string; baseUrl?: string }) {
    return request<{ connected: boolean; latency: number; model: string; testMessage: string }>(
      '/config/test-connection',
      { method: 'POST', body: JSON.stringify(data || {}) }
    );
  },

  searchPlatforms(query: string, sources?: string[]) {
    return request<{
      query: string;
      total: number;
      savedCount: number;
      statuses: { source: string; ok: boolean; count: number; error?: string; latencyMs: number }[];
      results: { title: string; content?: string; source: string; sourceUrl?: string; metrics?: Record<string, number>; rank?: number }[];
    }>('/search', {
      method: 'POST',
      body: JSON.stringify({ query, sources, save: true }),
    });
  },

  getSourceHealth() {
    return request<{
      testedAt: string;
      query: string;
      sources: { source: string; ok: boolean; count: number; error?: string; latencyMs: number }[];
      summary: { total: number; ok: number; failed: number };
    }>('/search/sources/health');
  },
};
