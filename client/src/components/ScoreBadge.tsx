interface ScoreBadgeProps {
  score: number | null;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return <span className="font-mono text-[11px] text-cyber-text-muted">--</span>;
  }

  const color =
    score >= 80 ? 'text-cyber-green' :
    score >= 60 ? 'text-cyber-cyan' :
    score >= 40 ? 'text-cyber-amber' :
    'text-cyber-red';

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${color}`}>
      <span className="text-[10px]">&#9679;</span>
      {score}
    </span>
  );
}
