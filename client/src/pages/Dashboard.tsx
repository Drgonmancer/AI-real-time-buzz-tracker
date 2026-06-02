import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Radio, RefreshCw, Bot, TrendingUp, Globe, BarChart2, AlertTriangle, Flame, Star, Clock, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { HotTopic, SystemConfig } from '../types';
import { SOURCE_LABELS, SOURCE_ICONS } from '../types';
import ScoreBadge from '../components/ScoreBadge';
import TrendBadge from '../components/TrendBadge';
import SourceBadge from '../components/SourceBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { CardSpotlight } from '../components/ui/CardSpotlight';
import { MovingBorder } from '../components/ui/MovingBorder';
import { TextGenerateEffect } from '../components/ui/TextGenerateEffect';

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isJustNow(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 5 * 60_000;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}w`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function getTopMetric(metrics: HotTopic['metrics']): { Icon: React.ElementType; value: string } | null {
  if (metrics.hotScore && metrics.hotScore > 0)
    return { Icon: Flame, value: formatNum(metrics.hotScore) };
  if (metrics.views && metrics.views > 0)
    return { Icon: TrendingUp, value: formatNum(metrics.views) };
  if (metrics.stars && metrics.stars > 0)
    return { Icon: Star, value: formatNum(metrics.stars) };
  if (metrics.score && metrics.score > 0)
    return { Icon: BarChart2, value: String(metrics.score) };
  if (metrics.votes && metrics.votes > 0)
    return { Icon: BarChart2, value: String(metrics.votes) };
  return null;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatChip({
  icon: Icon, label, value, color,
}: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}28`,
      }}
    >
      <Icon size={11} style={{ color: `${color}cc` }} />
      <span className="font-mono text-[10px] tracking-wider" style={{ color: `${color}99` }}>
        {label}
      </span>
      <span className="font-mono text-xs font-bold" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// Importance level badge
function ImportanceBadge({ importance }: { importance?: string | null }) {
  if (!importance || importance === 'low') return null;
  const styles: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: '🚨 紧急', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    high:   { label: '🔥 重要', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    medium: { label: '📌 关注', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  };
  const s = styles[importance];
  if (!s) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}40` }}
    >
      {s.label}
    </span>
  );
}

// Fake news warning
function FakeNewsWarning() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-red-400 bg-red-400/10 border border-red-400/30">
      <AlertTriangle size={9} />
      可疑内容
    </span>
  );
}

function TopicCard({
  topic,
  rank,
  selected,
  onToggleSelect,
  onCategoryClick,
}: {
  topic: HotTopic;
  rank: number;
  selected: boolean;
  onToggleSelect: () => void;
  onCategoryClick: (cat: string) => void;
}) {
  const isNew = isJustNow(topic.collectedAt);
  const metric = getTopMetric(topic.metrics);
  const rankColor =
    rank <= 3 ? '#f59e0b' : rank <= 10 ? '#00e5ff' : '#404060';

  return (
    <CardSpotlight
      className="glass-card rounded-xl overflow-hidden cursor-default"
    >
      {/* Top accent line for top 3 */}
      {rank <= 3 && (
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${rankColor}80, transparent)`,
          }}
        />
      )}

      <div className="flex items-start gap-4 px-5 py-4 relative z-10">
        <label
          className="flex-shrink-0 pt-1 cursor-pointer"
          title={selected ? '取消选择' : '选择此热点进行 AI 分析'}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-cyber-border/60 bg-black/40 text-cyber-cyan focus:ring-cyber-cyan/40 focus:ring-offset-0 cursor-pointer accent-[#00e5ff]"
          />
        </label>

        {/* Rank */}
        <div className="flex-shrink-0 w-7 pt-0.5 text-right">
          <span
            className="font-mono text-sm font-bold tabular-nums"
            style={{
              color: rankColor,
              textShadow: rank <= 3 ? `0 0 12px ${rankColor}80` : undefined,
            }}
          >
            {String(rank).padStart(2, '0')}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {isNew && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25">
                    <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                    JUST NOW
                  </span>
                )}
                {topic.sourceUrl ? (
                  <a
                    href={topic.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-cyber-text hover:text-cyber-cyan transition-colors leading-snug line-clamp-2"
                  >
                    {topic.title}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-cyber-text leading-snug line-clamp-2">
                    {topic.title}
                  </span>
                )}
              </div>

              {topic.analysis?.summary && (
                <p className="font-mono text-[11px] text-cyber-text-dim line-clamp-1 leading-relaxed">
                  {topic.analysis.summary}
                </p>
              )}
            </div>

            {/* Right metadata stack */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Importance badge from AI analysis */}
                <ImportanceBadge importance={(topic.analysis as any)?.importance} />
                {/* Fake news warning */}
                {(topic.analysis as any)?.isReal === false && <FakeNewsWarning />}
                {topic.category && (
                  <button
                    onClick={() => onCategoryClick(topic.category!)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono hover:opacity-80 transition-opacity whitespace-nowrap"
                    style={{
                      background: 'rgba(168,85,247,0.1)',
                      border: '1px solid rgba(168,85,247,0.28)',
                      color: '#c084fc',
                    }}
                    title={`筛选: ${topic.category}`}
                  >
                    {topic.category}
                  </button>
                )}
                <SourceBadge source={topic.source} />
              </div>
              <ScoreBadge score={topic.analysis?.relevanceScore ?? null} />
            </div>
          </div>

          {/* Bottom row: metric + trend + timestamp */}
          <div className="flex items-center gap-3 mt-2">
            {metric && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-cyber-text-dim">
                <metric.Icon size={10} className="opacity-60" />
                {metric.value}
              </span>
            )}
            <TrendBadge trend={topic.analysis?.prediction?.trend ?? null} />
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cyber-text-muted ml-auto">
              <Clock size={9} className="opacity-50" />
              {timeAgo(topic.collectedAt)}
            </span>
          </div>
        </div>
      </div>
    </CardSpotlight>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

const ALL_SOURCES = [
  'baidu', 'weibo', 'douyin', 'bilibili', 'sogou',
  'github', 'hackernews', 'devto',
  'twitter', 'reddit', 'bingnews',
  'gnews_cn_tech', 'gnews_cn', 'gnews_ai', 'gnews_search',
];

const ALL_CATEGORIES = [
  'AI技术', '开发技术', '科技硬件', '产品发布',
  '财经金融', '数字货币',
  '娱乐', '游戏', '体育',
  '健康医疗', '教育',
  '国际政治', '社会民生',
  '国际资讯', '时事新闻', '社会热点',
];

/** 路由切换后保留列表，避免 Dashboard 卸载再挂载时黑屏/全屏 loading */
const dashboardCache = {
  topics: [] as HotTopic[],
  totalCount: 0,
  loaded: false,
};

export default function Dashboard() {
  const [topics, setTopics] = useState<HotTopic[]>(() => dashboardCache.topics);
  const hasLoadedOnce = useRef(dashboardCache.loaded);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [_config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(() => !dashboardCache.loaded);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'score' | 'collectedAt' | 'mixed'>('mixed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{ source: string; ok: boolean; count: number; error?: string }[] | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [analysisHint, setAnalysisHint] = useState<string | null>(null);

  // Silent refresh — only shows full loading spinner on initial load
  const silentRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const params: Record<string, string | number> = {
        page,
        pageSize: 20,
        sortBy,
        sortOrder,
      };
      if (sourceFilter) params.source = sourceFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery) params.q = searchQuery;
      const topicsRes = await api.getHotTopics(params);
      setTopics(topicsRes?.topics || []);
      setTotalCount(topicsRes?.meta?.total || 0);
      dashboardCache.topics = topicsRes?.topics || [];
      dashboardCache.totalCount = topicsRes?.meta?.total || 0;
    } catch {
      // keep old data on silent refresh failure
    } finally {
      setRefreshing(false);
    }
  }, [page, sortBy, sortOrder, sourceFilter, categoryFilter, searchQuery]);

  useWebSocket(
    {
      onConnect: () => setWsConnected(true),
      onDisconnect: () => setWsConnected(false),
      onNewTopic: () => silentRefresh(),
      onTopicsUpdated: () => silentRefresh(),
      onAnalysisComplete: () => {
        setAnalyzing(false);
        silentRefresh();
      },
      onBatchUpdate: (data) => {
        const list = data?.topics;
        if (Array.isArray(list) && list.length > 0) {
          setTopics(list as HotTopic[]);
          setTotalCount(data.totalCount ?? list.length);
        }
      },
    },
    'dashboard'
  );

  const fetchData = useCallback(async () => {
    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    const showFullLoading = !hasLoadedOnce.current;
    try {
      if (showFullLoading) setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {
        page,
        pageSize: 20,
        sortBy,
        sortOrder,
      };
      if (sourceFilter) params.source = sourceFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery) params.q = searchQuery;

      const [topicsRes, configRes] = await Promise.all([
        api.getHotTopics(params),
        api.getConfig().catch(() => null),
      ]);

      if (ac.signal.aborted) return;

      setTopics(topicsRes?.topics || []);
      setTotalCount(topicsRes?.meta?.total || 0);
      dashboardCache.topics = topicsRes?.topics || [];
      dashboardCache.totalCount = topicsRes?.meta?.total || 0;
      dashboardCache.loaded = true;
      if (configRes) setConfig(configRes);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      if (ac.signal.aborted) return;
      setError(err.message || 'Failed to load');
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [page, sortBy, sortOrder, sourceFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchData();
    return () => fetchAbortRef.current?.abort();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(silentRefresh, 30_000);
    return () => clearInterval(interval);
  }, [silentRefresh]);

  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) {
      setSearchQuery('');
      setSearchStatus(null);
      setPage(1);
      fetchData();
      return;
    }
    try {
      setSearching(true);
      setSearchStatus(null);
      const res = await api.searchPlatforms(q);
      setSearchStatus(res.statuses);
      setSearchQuery(q);
      setPage(1);
      await fetchData();
    } catch (err: any) {
      setError(err.message || '搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const handleAnalyze = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setAnalysisHint('请先勾选要分析的热点');
      return;
    }
    if (ids.length > 50) {
      setAnalysisHint('单次最多分析 50 条，请减少勾选数量');
      return;
    }

    try {
      setAnalysisHint(null);
      setAnalyzing(true);
      await api.triggerAnalysis(ids);
      setTimeout(() => {
        setAnalyzing(false);
        silentRefresh();
      }, 30_000);
    } catch (err: any) {
      setAnalyzing(false);
      setAnalysisHint(err.message || 'AI 分析启动失败');
    }
  };

  const toggleSelect = (id: string) => {
    setAnalysisHint(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setAnalysisHint(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      topics.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const clearSelection = () => {
    setAnalysisHint(null);
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;
  const pageSelectedCount = topics.filter((t) => selectedIds.has(t.id)).length;

  const analyzed = topics.filter((t) => t.analysis?.relevanceScore != null);
  const avgScore =
    analyzed.length > 0
      ? Math.round(analyzed.reduce((s, t) => s + (t.analysis!.relevanceScore || 0), 0) / analyzed.length)
      : 0;
  const activeSources = new Set(topics.map((t) => t.source)).size;

  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div className="relative z-10 space-y-5">
      {/* Ambient bg orbs */}
      <div
        className="ambient-orb opacity-20"
        style={{ width: 600, height: 600, top: -200, left: -100, background: 'radial-gradient(circle, rgba(0,229,255,0.15), transparent 70%)' }}
      />
      <div
        className="ambient-orb opacity-15"
        style={{ width: 400, height: 400, top: 100, right: -100, background: 'radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)' }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <TextGenerateEffect
              words="⚡ PULSE_MONITOR"
              className="font-mono text-xl tracking-widest neon-text-cyan"
              filter={false}
              duration={0.3}
            />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] tracking-wider font-semibold ${
                wsConnected
                  ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30'
                  : 'text-cyber-text-muted bg-white/5 border border-white/10'
              }`}
            >
              {wsConnected ? (
                <>
                  <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                  LIVE
                </>
              ) : (
                <><Radio size={10} className="opacity-40" /> OFFLINE</>
              )}
            </span>
            {refreshing && (
              <RefreshCw size={11} className="animate-spin text-cyber-text-muted opacity-60" />
            )}
          </div>

          <p className="terminal-text pl-0.5 mt-1">
            全网AI热点实时感知 · {new Date().toLocaleDateString('zh-CN')}
          </p>

          {/* Compact stats strip */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StatChip icon={Globe} label="TOPICS" value={totalCount} color="#00e5ff" />
            <StatChip icon={Bot} label="ANALYZED" value={analyzed.length} color="#a855f7" />
            {avgScore > 0 && (
              <StatChip icon={BarChart2} label="AVG" value={avgScore} color="#00ff7f" />
            )}
            <StatChip icon={TrendingUp} label="SOURCES" value={activeSources} color="#f59e0b" />
          </div>
        </div>

        {/* AI Analyze button with Moving Border */}
        <div className="flex flex-col items-end gap-2">
          <MovingBorder
            innerClassName="flex items-center gap-2 px-5 py-3 text-sm font-mono font-semibold text-cyber-cyan tracking-wider hover:text-white transition-colors group disabled:opacity-50"
            onClick={handleAnalyze}
            disabled={analyzing || selectedCount === 0}
            title={selectedCount === 0 ? '请先勾选要分析的热点' : `分析已选 ${selectedCount} 条热点`}
          >
            {analyzing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                ANALYZING...
              </>
            ) : (
              <>
                <Zap size={15} className="transition-transform group-hover:rotate-12" />
                AI ANALYZE{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </>
            )}
          </MovingBorder>
          {selectedCount > 0 && (
            <button
              onClick={clearSelection}
              className="font-mono text-[10px] text-cyber-text-dim hover:text-cyber-cyan transition-colors"
            >
              清空已选 ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 p-3 rounded-xl"
        style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)' }}
      >
        <Search size={16} className="text-cyber-cyan opacity-70 flex-shrink-0" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索关键词，并行查询 B站 / 搜狗 / 微博 / Twitter ..."
          className="cyber-input flex-1 text-sm py-2 h-auto border-0 bg-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="cyber-btn-primary px-4 py-2 text-xs disabled:opacity-50"
        >
          {searching ? 'SEARCHING...' : 'SEARCH'}
        </button>
        {searchQuery && (
          <button
            onClick={() => { setSearchInput(''); setSearchQuery(''); setSearchStatus(null); setPage(1); fetchData(); }}
            className="cyber-btn-secondary px-3 py-2 text-xs"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Search source status */}
      {searchStatus && searchStatus.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {searchStatus.map((s) => (
            <span
              key={s.source}
              className={`font-mono text-[10px] px-2 py-1 rounded-lg border ${
                s.ok
                  ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
                  : 'text-red-400 border-red-400/30 bg-red-400/5'
              }`}
              title={s.error || `${s.count} 条结果`}
            >
              {SOURCE_LABELS[s.source] || s.source}: {s.ok ? `${s.count}条` : '失败'}
            </span>
          ))}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 flex-wrap p-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Sort mode */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
          className="cyber-input text-xs py-1.5 h-auto"
          style={{ width: '130px' }}
        >
          <option value="mixed">⚡ MIX</option>
          <option value="score">BY SCORE</option>
          <option value="collectedAt">BY TIME</option>
        </select>

        {/* Order toggle */}
        <button
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          className="cyber-btn-secondary px-3 py-1.5 text-xs h-auto"
        >
          {sortOrder === 'desc' ? '↓ DESC' : '↑ ASC'}
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="cyber-input text-xs py-1.5 h-auto"
          style={{ width: '140px' }}
        >
          <option value="">All Sources</option>
          {ALL_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_ICONS[s]} {SOURCE_LABELS[s] || s}
            </option>
          ))}
        </select>

        {/* Tag filter */}
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="cyber-input text-xs py-1.5 h-auto"
          style={{ width: '130px' }}
        >
          <option value="">All Tags</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Active filter chips */}
        {sourceFilter && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
            {SOURCE_ICONS[sourceFilter]} {sourceFilter}
            <button
              onClick={() => { setSourceFilter(''); setPage(1); }}
              className="ml-0.5 hover:text-white leading-none"
            >
              ×
            </button>
          </span>
        )}
        {categoryFilter && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple">
            🏷 {categoryFilter}
            <button
              onClick={() => { setCategoryFilter(''); setPage(1); }}
              className="ml-0.5 hover:text-white leading-none"
            >
              ×
            </button>
          </span>
        )}

        {/* Result count */}
        <span className="font-mono text-[10px] text-cyber-text-muted ml-auto">
          {totalCount.toLocaleString()} results
        </span>
      </div>

      {analysisHint && (
        <div className="glass-card px-4 py-3 font-mono text-xs text-amber-300 border-amber-400/30 bg-amber-900/10 flex items-center justify-between gap-3">
          <span>{analysisHint}</span>
          <button
            onClick={() => setAnalysisHint(null)}
            className="text-cyber-text-dim hover:text-cyber-text transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {topics.length > 0 && (
        <div
          className="flex items-center gap-3 flex-wrap px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.18)' }}
        >
          <span className="font-mono text-[10px] text-cyber-purple tracking-wider">
            AI 分析选择
          </span>
          <button
            onClick={selectAllOnPage}
            className="cyber-btn-secondary px-3 py-1 text-[10px] h-auto"
          >
            全选本页 ({topics.length})
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedCount === 0}
            className="cyber-btn-secondary px-3 py-1 text-[10px] h-auto disabled:opacity-40"
          >
            清空选择
          </button>
          <span className="font-mono text-[10px] text-cyber-text-dim ml-auto">
            已选 {selectedCount} 条
            {pageSelectedCount > 0 && pageSelectedCount < selectedCount
              ? `（本页 ${pageSelectedCount} 条）`
              : ''}
          </span>
        </div>
      )}

      {/* ── Topic Feed ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div
          className="glass-card flex flex-col items-center gap-6 py-20 rounded-xl"
        >
          <div className="p-4 rounded-full bg-red-900/20 border border-red-500/30">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <p className="font-mono text-sm text-red-400">[SYSTEM ERROR]</p>
            <p className="terminal-text">{error}</p>
          </div>
          <button onClick={fetchData} className="cyber-btn-primary text-xs">
            ↻ RETRY
          </button>
        </div>
      ) : topics.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-6 py-20 rounded-xl">
          <div className="p-4 rounded-full bg-cyan-900/20 border border-cyan-500/30 animate-float">
            <svg className="w-12 h-12 text-cyber-cyan opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div className="text-center space-y-3">
            <p className="font-mono text-lg text-cyber-text-dim">AWAITING SIGNAL</p>
            <p className="terminal-text max-w-md">
              Backend not connected or no topics collected yet. Start the server on port 3000.
            </p>
          </div>
          <button onClick={fetchData} className="cyber-btn-primary text-xs">
            ⟳ REFRESH
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {topics.map((topic, index) => (
              <div key={topic.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.025}s` }}>
                <TopicCard
                  topic={topic}
                  rank={(page - 1) * 20 + index + 1}
                  selected={selectedIds.has(topic.id)}
                  onToggleSelect={() => toggleSelect(topic.id)}
                  onCategoryClick={(cat) => { setCategoryFilter(cat); setPage(1); }}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="cyber-btn-secondary text-xs disabled:opacity-25 disabled:cursor-not-allowed px-5"
            >
              ← PREV
            </button>

            <div
              className="px-5 py-2 rounded-lg font-mono text-sm"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)' }}
            >
              <span className="text-cyber-cyan neon-text-cyan">{page}</span>
              <span className="text-cyber-text-dim mx-2 text-xs">/</span>
              <span className="text-cyber-text-dim">{totalPages}</span>
            </div>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="cyber-btn-secondary text-xs disabled:opacity-25 disabled:cursor-not-allowed px-5"
            >
              NEXT →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
