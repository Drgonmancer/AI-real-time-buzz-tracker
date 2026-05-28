import React, { useRef, MouseEvent } from 'react';

interface CardSpotlightProps {
  children: React.ReactNode;
  className?: string;
  radius?: number;
  color?: string;
  onClick?: () => void;
}

/**
 * Aceternity-inspired Card Spotlight.
 * Renders a radial-gradient highlight that tracks the mouse cursor.
 * Pure React + CSS — no extra dependencies.
 */
export function CardSpotlight({
  children,
  className = '',
  radius = 380,
  color = 'rgba(0, 229, 255, 0.055)',
  onClick,
}: CardSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--spot-x', `${x}px`);
    ref.current.style.setProperty('--spot-y', `${y}px`);
    ref.current.style.setProperty('--spot-radius', `${radius}px`);
    ref.current.style.setProperty('--spot-color', color);
  };

  return (
    <div
      ref={ref}
      className={`topic-spotlight ${className}`}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
