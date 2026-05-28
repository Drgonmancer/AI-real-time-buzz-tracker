const sourceColors: Record<string, string> = {
  baidu: 'text-red-400 border-red-400/20 bg-red-400/5',
  weibo: 'text-orange-400 border-orange-400/20 bg-orange-400/5',
  douyin: 'text-pink-400 border-pink-400/20 bg-pink-400/5',
  github: 'text-purple-400 border-purple-400/20 bg-purple-400/5',
  hackernews: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
  producthunt: 'text-rose-400 border-rose-400/20 bg-rose-400/5',
  twitter: 'text-sky-400 border-sky-400/20 bg-sky-400/5',
  reddit: 'text-indigo-400 border-indigo-400/20 bg-indigo-400/5',
  bilibili: 'text-pink-300 border-pink-300/20 bg-pink-300/5',
  sogou: 'text-green-400 border-green-400/20 bg-green-400/5',
  gnews_search: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
  bingnews: 'text-teal-400 border-teal-400/20 bg-teal-400/5',
  gnews_cn_tech: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
  gnews_cn: 'text-blue-300 border-blue-300/20 bg-blue-300/5',
  gnews_ai: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5',
};

const SOURCE_DISPLAY: Record<string, string> = {
  bilibili: 'B站',
  sogou: '搜狗',
  gnews_search: 'G·搜',
  gnews_cn: 'G·头条',
  gnews_ai: 'G·AI',
  hackernews: 'HN',
  bingnews: 'BING',
  producthunt: 'PH',
};

export default function SourceBadge({ source }: { source: string }) {
  const colors = sourceColors[source] || 'text-cyber-text-dim border-cyber-border bg-cyber-surface';
  const label = SOURCE_DISPLAY[source] ?? source.toUpperCase();
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${colors}`}>
      {label}
    </span>
  );
}
