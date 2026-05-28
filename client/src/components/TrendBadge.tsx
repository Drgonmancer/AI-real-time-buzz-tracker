const trendConfig: Record<string, { color: string; char: string; label: string }> = {
  rising: { color: 'text-cyber-green', char: '\u25B2', label: 'RISING' },
  stable: { color: 'text-cyber-cyan', char: '\u25C6', label: 'STABLE' },
  declining: { color: 'text-cyber-red', char: '\u25BC', label: 'FALLING' },
};

export default function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend || !trendConfig[trend]) {
    return <span className="font-mono text-[11px] text-cyber-text-muted">--</span>;
  }

  const cfg = trendConfig[trend];
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold tracking-wider ${cfg.color}`}>
      {cfg.char} {cfg.label}
    </span>
  );
}
