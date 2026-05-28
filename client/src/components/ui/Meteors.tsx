import { cn } from '../../lib/utils';

/**
 * Aceternity UI — Meteors
 * 随机流星划过背景，纯 CSS 动画，零 JS 运行时开销。
 */
export function Meteors({ number = 14, className }: { number?: number; className?: string }) {
  const meteors = Array.from({ length: number }, (_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${0.4 + Math.random() * 0.6}s`,
  }));

  return (
    <>
      {meteors.map((style, idx) => (
        <span
          key={idx}
          className={cn(
            'absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-cyan-400/60 shadow-[0_0_0_1px_rgba(0,229,255,0.15)]',
            'before:absolute before:top-1/2 before:h-[1px] before:w-[80px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-cyan-400/60 before:to-transparent',
            className
          )}
          style={{
            top: style.top,
            left: style.left,
            animationDelay: style.delay,
            animationDuration: style.duration,
          }}
        />
      ))}
    </>
  );
}
