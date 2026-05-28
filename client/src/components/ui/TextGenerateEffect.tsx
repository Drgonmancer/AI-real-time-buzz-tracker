import { useEffect } from 'react';
import { motion, stagger, useAnimate, useInView } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Aceternity UI — Text Generate Effect
 * 文字逐词淡入+模糊消除动画。
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
  const isInView = useInView(scope);
  const wordsArray = words.split(' ');

  useEffect(() => {
    if (isInView) {
      animate(
        'span',
        { opacity: 1, filter: filter ? 'blur(0px)' : 'none' },
        { duration, delay: stagger(0.08) }
      );
    }
  }, [isInView, animate, filter, duration]);

  return (
    <div ref={scope} className={cn('font-bold', className)}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={idx}
          className="opacity-0"
          style={{ filter: filter ? 'blur(10px)' : 'none' }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </div>
  );
}
