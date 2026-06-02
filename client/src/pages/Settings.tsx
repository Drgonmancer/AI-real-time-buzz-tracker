import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import {
  getCachedSettings,
  invalidateSettingsCache,
  loadSettingsData,
} from '../lib/settingsData';
import type { KeywordGroup, SystemConfig } from '../types';

function SettingsSkeleton() {
  return (
    <div className="relative z-10 space-y-8 animate-pulse">
      <div className="h-8 w-64 rounded bg-white/5" />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="glass-card h-80 rounded-xl bg-white/[0.03]" />
        <div className="glass-card h-80 rounded-xl bg-white/[0.03]" />
      </div>
      <div className="glass-card h-48 rounded-xl bg-white/[0.03]" />
    </div>
  );
}

export default function Settings() {
  const cached = getCachedSettings();
  const [config, setConfig] = useState<SystemConfig | null>(cached?.config ?? null);
  const [groups, setGroups] = useState<KeywordGroup[]>(cached?.groups ?? []);
  const [initialLoading, setInitialLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(cached?.config.aiConfig.model || '');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const applySnapshot = useCallback((cfg: SystemConfig, grps: KeywordGroup[]) => {
    setConfig(cfg);
    setGroups(grps);
    setModel(cfg.aiConfig.model || '');
  }, []);

  const refresh = useCallback(
    async (opts?: { force?: boolean; silent?: boolean }) => {
      const force = opts?.force ?? false;
      const silent = opts?.silent ?? !!getCachedSettings();

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        if (!silent) setInitialLoading(true);
        else setRefreshing(true);

        const { config: cfg, groups: grps } = await loadSettingsData({
          force,
          signal: ac.signal,
        });

        if (ac.signal.aborted) return;
        applySnapshot(cfg, grps);
        setApiKey('');
      } catch (err) {
        if (ac.signal.aborted) return;
        if (!config && !groups.length) {
          setTestResult({ ok: false, msg: '✗ 加载设置失败，请确认后端已启动' });
        }
      } finally {
        if (!ac.signal.aborted) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [applySnapshot]
  );

  useEffect(() => {
    const hasCache = !!getCachedSettings();
    refresh({ silent: hasCache });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(
        apiKey ? { apiKey, baseUrl: 'https://api.deepseek.com/v1' } : undefined
      );
      setTestResult({ ok: true, msg: `✓ CONNECTED | Latency: ${res.latency}ms | Model: ${res.model}` });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ ERROR: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAiConfig = async () => {
    if (!apiKey.trim() && !model.trim()) {
      setTestResult({ ok: false, msg: '✗ 请输入 API Key 或模型名称后再保存' });
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, string> = {};
      if (apiKey.trim()) data.apiKey = apiKey.trim();
      if (model.trim()) data.model = model.trim();
      await api.updateAiConfig(data);
      invalidateSettingsCache();
      setApiKey('');
      setTestResult({ ok: true, msg: '✓ AI 配置已保存' });
      await refresh({ force: true, silent: true });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ 保存失败: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!window.confirm('确定删除已保存的 API Key？删除后 AI 分析功能将不可用。')) return;

    setDeleting(true);
    try {
      await api.deleteAiApiKey();
      invalidateSettingsCache();
      setApiKey('');
      setTestResult({ ok: true, msg: '✓ API Key 已删除' });
      await refresh({ force: true, silent: true });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ 删除失败: ${err.message}` });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const keywords = newKeywords
        .split(/[,，\n]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .map((word) => ({ word }));
      if (keywords.length === 0) {
        setTestResult({ ok: false, msg: '✗ VALIDATION ERROR: At least 1 keyword required' });
        return;
      }
      const created = await api.createKeywordGroup({ name: newGroupName.trim(), keywords });
      setGroups((prev) => [created, ...prev]);
      invalidateSettingsCache();
      setNewGroupName('');
      setNewKeywords('');
      setTestResult({ ok: true, msg: '✓ KEYWORD GROUP CREATED' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ CREATION FAILED: ${err.message}` });
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Delete this keyword group?')) return;
    try {
      await api.deleteKeywordGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      invalidateSettingsCache();
      setTestResult({ ok: true, msg: '✓ GROUP DELETED' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ DELETE FAILED: ${err.message}` });
    }
  };

  const handleToggleGroup = async (group: KeywordGroup) => {
    const next = !group.isActive;
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, isActive: next } : g))
    );
    try {
      await api.updateKeywordGroup(group.id, { isActive: next });
      invalidateSettingsCache();
    } catch (err: any) {
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, isActive: group.isActive } : g))
      );
      setTestResult({ ok: false, msg: `✗ TOGGLE FAILED: ${err.message}` });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const updated = await api.updateKeywordGroup(id, { name: editName });
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: updated.name } : g)));
      setEditingGroup(null);
      invalidateSettingsCache();
      setTestResult({ ok: true, msg: '✓ GROUP UPDATED' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ UPDATE FAILED: ${err.message}` });
    }
  };

  if (initialLoading && !config) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="relative z-10 space-y-8">
      <div className="scan-line-effect" />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="pulse-dot-cyan" />
          <h1 className="font-mono text-2xl font-bold tracking-wider neon-text-purple">
            {'//'} SYSTEM_CONFIG
          </h1>
          {refreshing && (
            <span className="font-mono text-[10px] text-cyber-text-muted animate-pulse">
              SYNCING...
            </span>
          )}
        </div>
        <p className="terminal-text pl-5">
          AI model configuration & keyword surveillance parameters v1.0
        </p>
      </div>

      {testResult && (
        <div
          className={`glass-card px-6 py-4 font-mono text-sm flex items-center gap-3 ${
            testResult.ok
              ? 'border-cyber-green/40 bg-green-900/10'
              : 'border-cyber-red/40 bg-red-900/10'
          }`}
        >
          <span className={`text-lg ${testResult.ok ? 'text-cyber-green' : 'text-cyber-red'}`}>
            {testResult.ok ? '✓' : '✗'}
          </span>
          <span className={testResult.ok ? 'text-cyber-green' : 'text-cyber-red'}>
            {testResult.msg}
          </span>
          <button
            onClick={() => setTestResult(null)}
            className="ml-auto text-cyber-text-dim hover:text-cyber-text transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="glass-card-glow p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-cyber-border/50">
            <div className="p-2 rounded-lg bg-cyan-900/20 border border-cyber-cyan/30">
              <svg className="w-5 h-5 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-wider text-cyber-cyan neon-text-cyan">
                {'{'} AI_ENGINE {'}'}
              </h2>
              <p className="font-mono text-[10px] text-cyber-text-dim mt-0.5">
                DeepSeek Integration Module
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="terminal-text block">API_CREDENTIALS</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  config?.aiConfig.apiKeyConfigured
                    ? `已保存 (${config.aiConfig.apiKeyHint || '••••••••'})，输入新 Key 可覆盖`
                    : 'sk-xxxxxxxxxxxxxxxx'
                }
                className="cyber-input"
              />
              {config?.aiConfig.apiKeyConfigured && (
                <p className="font-mono text-[10px] text-cyber-text-dim">
                  当前已配置: {config.aiConfig.apiKeyHint || '••••••••'}（完整 Key 不会显示）
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="terminal-text block">MODEL_IDENTIFIER</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
                className="cyber-input"
              />
            </div>

            {config && (
              <div className="rounded-xl border border-cyber-border/50 bg-gradient-to-br from-white/[0.02] to-transparent p-5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="terminal-text">CONNECTION_STATUS</span>
                  <span
                    className={`font-mono text-xs font-bold px-3 py-1 rounded-lg ${
                      config.aiConfig.apiKeyStatus === 'valid'
                        ? 'bg-green-900/30 text-cyber-green border border-green-500/30'
                        : 'bg-red-900/30 text-cyber-red border border-red-500/30'
                    }`}
                  >
                    {config.aiConfig.apiKeyStatus?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                <div className="h-[1px] bg-gradient-to-r from-transparent via-cyber-border to-transparent" />

                <div className="flex items-center justify-between">
                  <span className="terminal-text">DAILY_BUDGET</span>
                  <div className="text-right">
                    <span className="font-mono text-sm text-cyber-text font-semibold">
                      ¥{config.aiConfig.dailyUsage}
                    </span>
                    <span className="font-mono text-xs text-cyber-text-dim ml-2">
                      / ¥{config.aiConfig.dailyLimit}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-cyber-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-purple rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((config.aiConfig.dailyUsage / config.aiConfig.dailyLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={testing || deleting}
                className="cyber-btn-primary flex-1 min-w-[140px] text-xs disabled:opacity-50"
              >
                {testing ? 'TESTING...' : '⟳ TEST CONNECTION'}
              </button>
              <button
                onClick={handleSaveAiConfig}
                disabled={saving || deleting}
                className="cyber-btn-secondary flex-1 min-w-[140px] text-xs disabled:opacity-50"
              >
                {saving ? '↻ SAVING...' : '💾 SAVE CONFIG'}
              </button>
              {config?.aiConfig.apiKeyConfigured && (
                <button
                  onClick={handleDeleteApiKey}
                  disabled={deleting || saving || testing}
                  className="cyber-btn-secondary flex-1 min-w-[140px] text-xs text-cyber-red border-red-500/30 disabled:opacity-50"
                >
                  {deleting ? 'DELETING...' : '🗑 DELETE API KEY'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-cyber-border/50">
            <div className="p-2 rounded-lg bg-pink-900/20 border border-cyber-pink/30">
              <svg className="w-5 h-5 text-cyber-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-wider text-cyber-pink neon-text-pink">
                {'{'} DATA_SOURCES {'}'}
              </h2>
              <p className="font-mono text-[10px] text-cyber-text-dim mt-0.5">
                Real-time Surveillance Feeds
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {config?.dataSources.map((ds, idx) => (
              <div
                key={ds.name}
                className="group flex items-center justify-between rounded-xl border border-cyber-border/50 bg-gradient-to-r from-white/[0.01] to-transparent px-5 py-4 hover:border-cyber-pink/30 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`relative h-3 w-3 rounded-full ${
                      ds.status === 'active'
                        ? 'bg-cyber-green'
                        : ds.status === 'error'
                          ? 'bg-cyber-red animate-pulse'
                          : 'bg-cyber-text-muted'
                    }`}
                  >
                    {ds.status === 'active' && (
                      <span className="absolute inset-0 rounded-full bg-cyber-green animate-ping opacity-40" />
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold text-cyber-text tracking-wider">
                    {ds.name.toUpperCase()}
                  </span>
                </div>
                <div
                  className={`font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                    ds.enabled
                      ? ds.status === 'active'
                        ? 'bg-green-900/20 text-cyber-green border border-green-500/30'
                        : 'bg-red-900/20 text-cyber-red border border-red-500/30'
                      : 'bg-gray-800/30 text-cyber-text-muted border border-cyber-border/50'
                  }`}
                >
                  [{ds.enabled ? ds.status.toUpperCase() : 'DISABLED'}]
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card-glow p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-cyber-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-900/20 border border-cyber-purple/30">
              <svg className="w-5 h-5 text-cyber-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-wider text-cyber-purple neon-text-purple">
                {'{'} KEYWORD_GROUPS {'}'}
              </h2>
            </div>
          </div>
          <div className="glass-card px-4 py-2">
            <span className="font-mono text-xs text-cyber-cyan neon-text-cyan">{groups.length}</span>
            <span className="font-mono text-[10px] text-cyber-text-dim ml-2">GROUPS</span>
          </div>
        </div>

        <div className="rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyan-900/10 to-transparent p-6 space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="GROUP_NAME"
              className="cyber-input col-span-3"
            />
            <input
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="keyword1, keyword2..."
              className="cyber-input col-span-7"
            />
            <button onClick={handleCreateGroup} className="cyber-btn-primary col-span-2 text-xs">
              + CREATE
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="font-mono text-sm text-cyber-text-dim text-center py-8">
              NO_KEYWORD_GROUPS_DETECTED
            </p>
          ) : (
            groups.map((group, idx) => (
              <div
                key={group.id}
                className="rounded-2xl border border-cyber-border/40 bg-gradient-to-r from-white/[0.01] to-transparent p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[9px] text-cyber-text-muted">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      {editingGroup === group.id ? (
                        <>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="cyber-input py-2 text-xs flex-1 max-w-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(group.id)}
                            className="cyber-btn-primary text-[10px] px-4 py-2"
                          >
                            ✓ SAVE
                          </button>
                          <button
                            onClick={() => setEditingGroup(null)}
                            className="cyber-btn-secondary text-[10px] px-4 py-2"
                          >
                            ✕ CANCEL
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-base font-bold text-cyber-text">
                            {group.name}
                          </span>
                          <span
                            className={`font-mono text-[9px] px-2 py-0.5 rounded-md ${
                              group.isActive
                                ? 'bg-green-900/20 text-cyber-green border border-green-500/30'
                                : 'bg-gray-800/30 text-cyber-text-muted border border-cyber-border/50'
                            }`}
                          >
                            {group.isActive ? '● ACTIVE' : '○ INACTIVE'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.keywords.map((kw) => (
                        <span
                          key={kw.id}
                          className="px-3 py-1.5 rounded-lg border border-cyber-purple/25 bg-purple-900/15 font-mono text-[11px] text-cyber-purple"
                        >
                          {kw.word}
                        </span>
                      ))}
                    </div>
                  </div>
                  {editingGroup !== group.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingGroup(group.id);
                          setEditName(group.name);
                        }}
                        className="p-2 rounded-lg border border-cyber-border/50 text-cyber-text-dim hover:text-cyber-cyan"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleToggleGroup(group)}
                        className="p-2 rounded-lg border border-cyber-border/50 text-cyber-text-dim"
                      >
                        {group.isActive ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-2 rounded-lg border border-red-500/20 text-cyber-red"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
