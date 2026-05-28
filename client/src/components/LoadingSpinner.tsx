export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg className="h-8 w-8 animate-spin text-cyber-cyan" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="font-mono text-xs text-cyber-text-dim tracking-widest animate-pulse">LOADING...</p>
    </div>
  );
}
