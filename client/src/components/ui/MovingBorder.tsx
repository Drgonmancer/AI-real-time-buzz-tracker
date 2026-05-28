import React from 'react';

interface MovingBorderProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  as?: 'button' | 'div' | 'a';
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

/**
 * Aceternity-inspired Moving Border.
 * Uses CSS @property + conic-gradient animation — no framer-motion needed.
 * The spinning gradient creates the illusion of a border orbiting the container.
 */
export function MovingBorder({
  children,
  className = '',
  innerClassName = '',
  as: Tag = 'button',
  onClick,
  disabled,
  title,
}: MovingBorderProps) {
  return (
    <div className={`moving-border-wrap ${className}`}>
      <Tag
        className={`moving-border-inner ${innerClassName}`}
        onClick={onClick}
        disabled={disabled}
        title={title}
      >
        {children}
      </Tag>
    </div>
  );
}
