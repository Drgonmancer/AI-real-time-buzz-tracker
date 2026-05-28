import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { KeywordGroup, SystemConfig } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Settings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cfg, grps] = await Promise.all([
        api.getConfig(),
        api.getKeywordGroups(),
      ]);
      setConfig(cfg);
      setGroups(grps);
      setApiKey('');
      setModel(cfg.aiConfig.model || '');
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    setSaving(true);
    try {
      const data: any = {};
      if (apiKey) data.apiKey = apiKey;
      if (model) data.model = model;
      await api.updateAiConfig(data);
      setTestResult({ ok: true, msg: '✓ AI CONFIG SAVED SUCCESSFULLY' });
      fetchData();
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ SAVE FAILED: ${err.message}` });
    } finally {
      setSaving(false);
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
      await api.createKeywordGroup({ name: newGroupName.trim(), keywords });
      setNewGroupName('');
      setNewKeywords('');
      fetchData();
      setTestResult({ ok: true, msg: '✓ KEYWORD GROUP CREATED' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ CREATION FAILED: ${err.message}` });
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Delete this keyword group?')) return;
    try {
      await api.deleteKeywordGroup(id);
      fetchData();
      setTestResult({ ok: true, msg: '✓ GROUP DELETED' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ DELETE FAILED: ${err.message}` });
    }
  };

  const handleToggleGroup = async (group: KeywordGroup) => {
    try {
      await api.updateKeywordGroup(group.id, { isActive: !group.isActive });
      fetchData();
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ TOGGLE FAILED: ${err.message}` });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await api.updateKeywordGroup(id, { name: editName });
      setEditingGroup(null);
      fetchData();
      setTestResult({ ok: true, msg: '✓ GROUP UPDATED' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `✗ UPDATE FAILED: ${err.message}` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-8">
      {/* Scan Line Effect */}
      <div className="scan-line-effect" />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="pulse-dot-cyan" />
          <h1 className="font-mono text-2xl font-bold tracking-wider neon-text-purple">
            {'//'} SYSTEM_CONFIG
          </h1>
        </div>
        <p className="terminal-text pl-5">
          AI model configuration & keyword surveillance parameters v1.0
        </p>
      </div>

      {/* Result Toast */}
      {testResult && (
        <div className={`glass-card px-6 py-4 font-mono text-sm flex items-center gap-3 ${
          testResult.ok 
            ? 'border-cyber-green/40 bg-green-900/10' 
            : 'border-cyber-red/40 bg-red-900/10'
        }`}>
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
        {/* AI Configuration Panel */}
        <div className="glass-card-glow p-8 space-y-6">
          {/* Section Header */}
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
            {/* API Key Input */}
            <div className="space-y-2">
              <label className="terminal-text block">
                API_CREDENTIALS
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="cyber-input"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="terminal-text block">
                MODEL_IDENTIFIER
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-v4-flash"
                className="cyber-input"
              />
            </div>

            {/* Status Display */}
            {config && (
              <div className="rounded-xl border border-cyber-border/50 bg-gradient-to-br from-white/[0.02] to-transparent p-5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="terminal-text">CONNECTION_STATUS</span>
                  <span className={`font-mono text-xs font-bold px-3 py-1 rounded-lg ${
                    config.aiConfig.apiKeyStatus === 'valid' 
                      ? 'bg-green-900/30 text-cyber-green border border-green-500/30' 
                      : 'bg-red-900/30 text-cyber-red border border-red-500/30'
                  }`}>
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

                {/* Progress Bar */}
                <div className="w-full h-2 bg-cyber-border/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-purple rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((config.aiConfig.dailyUsage / config.aiConfig.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleTestConnection} 
                disabled={testing} 
                className="cyber-btn-primary flex-1 text-xs disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    TESTING...
                  </>
                ) : '⟳ TEST CONNECTION'}
              </button>
              <button 
                onClick={handleSaveAiConfig} 
                disabled={saving} 
                className="cyber-btn-secondary flex-1 text-xs disabled:opacity-50"
              >
                {saving ? '↻ SAVING...' : '💾 SAVE CONFIG'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Sources Status Panel */}
        <div className="glass-card p-8 space-y-6">
          {/* Section Header */}
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
                className="group flex items-center justify-between rounded-xl border border-cyber-border/50 bg-gradient-to-r from-white/[0.01] to-transparent px-5 py-4 hover:border-cyber-pink/30 transition-all duration-300 hover-lift"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`relative h-3 w-3 rounded-full ${
                    ds.status === 'active' ? 'bg-cyber-green' :
                    ds.status === 'error' ? 'bg-cyber-red animate-pulse' :
                    'bg-cyber-text-muted'
                  }`}>
                    {(ds.status === 'active') && (
                      <span className="absolute inset-0 rounded-full bg-cyber-green animate-ping opacity-40" />
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <span className="font-mono text-sm font-bold text-cyber-text tracking-wider block">
                      {ds.name.toUpperCase()}
                    </span>
                    <span className="font-mono text-[9px] text-cyber-text-muted uppercase tracking-widest">
                      Source #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className={`font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg tracking-wider ${
                  ds.enabled 
                    ? (ds.status === 'active' 
                        ? 'bg-green-900/20 text-cyber-green border border-green-500/30' 
                        : 'bg-red-900/20 text-cyber-red border border-red-500/30'
                      )
                    : 'bg-gray-800/30 text-cyber-text-muted border border-cyber-border/50'
                }`}>
                  [{ds.enabled ? ds.status.toUpperCase() : 'DISABLED'}]
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords Management Section */}
      <div className="glass-card-glow p-8 space-y-6">
        {/* Section Header */}
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
              <p className="font-mono text-[10px] text-cyber-text-dim mt-0.5">
                Surveillance Target Configuration
              </p>
            </div>
          </div>

          <div className="glass-card px-4 py-2">
            <span className="font-mono text-xs text-cyber-cyan neon-text-cyan">
              {groups.length}
            </span>
            <span className="font-mono text-[10px] text-cyber-text-dim ml-2">GROUPS</span>
          </div>
        </div>

        {/* Create New Group */}
        <div className="rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyan-900/10 to-transparent p-6 space-y-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="pulse-dot-cyan" />
            <span className="font-mono text-xs font-bold text-cyber-cyan tracking-wider">
              NEW_GROUP_CREATION
            </span>
          </div>

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
              placeholder="keyword1, keyword2, keyword3..."
              className="cyber-input col-span-7"
            />
            <button 
              onClick={handleCreateGroup} 
              className="cyber-btn-primary col-span-2 text-xs"
            >
              + CREATE
            </button>
          </div>

          <p className="terminal-text text-[11px]">
            // Enter group identifier and comma-separated target keywords for AI monitoring
          </p>
        </div>

        {/* Groups List */}
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-4 rounded-full bg-cyber-surface/50 border border-cyber-border/50">
                <svg className="w-8 h-8 text-cyber-text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="font-mono text-sm text-cyber-text-dim">NO_KEYWORD_GROUPS_DETECTED</p>
                <p className="terminal-text mt-2">Create your first surveillance target group above</p>
              </div>
            </div>
          ) : (
            groups.map((group, idx) => (
              <div 
                key={group.id} 
                className="group/card rounded-2xl border border-cyber-border/40 bg-gradient-to-r from-white/[0.01] to-transparent p-6 hover:border-cyber-purple/30 transition-all duration-300"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3 min-w-0">
                    {/* Group Header */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-cyber-text-muted tabular-nums">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      
                      {editingGroup === group.id ? (
                        <div className="flex items-center gap-2 flex-1">
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
                        </div>
                      ) : (
                        <>
                          <span className="font-mono text-base font-bold text-cyber-text group-hover/card:text-cyber-purple transition-colors">
                            {group.name}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className="cyber-badge text-cyber-purple border-purple-500/30 bg-purple-900/10 text-[10px]">
                              W:{group.weight}
                            </span>
                            
                            <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md tracking-wider ${
                              group.isActive 
                                ? 'bg-green-900/20 text-cyber-green border border-green-500/30' 
                                : 'bg-gray-800/30 text-cyber-text-muted border border-cyber-border/50'
                            }`}>
                              {group.isActive ? '● ACTIVE' : '○ INACTIVE'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Keywords Tags */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {group.keywords.map((kw) => (
                        <span 
                          key={kw.id} 
                          className="px-3 py-1.5 rounded-lg border border-cyber-purple/25 bg-purple-900/15 font-mono text-[11px] text-cyber-purple font-medium hover:border-cyber-purple/50 hover:bg-purple-900/25 transition-all cursor-default"
                        >
                          {kw.word}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {editingGroup !== group.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingGroup(group.id); setEditName(group.name); }}
                        className="p-2 rounded-lg border border-cyber-border/50 text-cyber-text-dim hover:text-cyber-cyan hover:border-cyber-cyan/30 hover:bg-cyber-cyan/5 transition-all"
                        title="Edit Group"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleToggleGroup(group)}
                        className={`p-2 rounded-lg border transition-all ${
                          group.isActive
                            ? 'border-green-500/30 text-cyber-green hover:bg-green-900/20'
                            : 'border-cyber-border/50 text-cyber-text-dim hover:text-cyber-text hover:bg-cyber-surface/50'
                        }`}
                        title={group.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {group.isActive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-2 rounded-lg border border-red-500/20 text-cyber-red hover:bg-red-900/20 transition-all"
                        title="Delete Group"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
