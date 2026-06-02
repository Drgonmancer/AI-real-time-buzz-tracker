import { useEffect, useRef } from 'react';
import { motion, stagger, useAnimate, useInView } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Aceternity UI — Text Generate Effect
 * filter=false 时直接显示文字，避免路由切换后 IntersectionObserver 未触发导致 opacity-0 黑屏
 */
export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once: true, amount: 0.1 });
  const mountedRef = useRef(true);
  const wordsArray = words.split(' ');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!filter) return;
    if (!isInView || !mountedRef.current) return;

    void animate(
      'span',
      { opacity: 1, filter: 'blur(0px)' },
      { duration, delay: stagger(0.08) }
    );
  }, [isInView, animate, filter, duration]);

  if (!filter) {
    return (
      <div className={cn('font-bold', className)}>
        {words}
      </div>
    );
  }

  return (
    <div ref={scope} className={cn('font-bold', className)}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          className="opacity-0"
          style={{ filter: 'blur(10px)' }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </div>
  );
}
