import { api } from './api';
import type { KeywordGroup, SystemConfig } from '../types';

const CACHE_TTL_MS = 60_000;

type SettingsSnapshot = {
  config: SystemConfig;
  groups: KeywordGroup[];
  fetchedAt: number;
};

let cache: SettingsSnapshot | null = null;
let inflight: Promise<SettingsSnapshot> | null = null;

export function getCachedSettings(): SettingsSnapshot | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null;
  return cache;
}

export function invalidateSettingsCache() {
  cache = null;
  inflight = null;
}

/** 设置页专用：lite 配置 + 关键词组，带内存缓存 */
export async function loadSettingsData(options?: {
  force?: boolean;
  signal?: AbortSignal;
}): Promise<SettingsSnapshot> {
  const force = options?.force ?? false;

  if (!force) {
    const hit = getCachedSettings();
    if (hit) return hit;
    if (inflight) return inflight;
  }

  const run = async (): Promise<SettingsSnapshot> => {
    const [config, groups] = await Promise.all([
      api.getConfig({ lite: true }),
      api.getKeywordGroups(),
    ]);

    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const snapshot: SettingsSnapshot = {
      config,
      groups,
      fetchedAt: Date.now(),
    };
    cache = snapshot;
    return snapshot;
  };

  inflight = run().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** 侧栏悬停时预取，进入设置页即可秒开 */
export function prefetchSettings() {
  if (getCachedSettings() || inflight) return;
  void loadSettingsData().catch(() => {});
}
