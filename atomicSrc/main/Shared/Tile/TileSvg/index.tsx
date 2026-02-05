import React from 'react';

interface TileSvgProps {
  color?: string;
  className?: string;
}

export const TileSvg: React.FC<TileSvgProps> = ({ color = 'grey', className }) => {
  // "20% opacity middle-gray color for both light and dark mode"
  // "darker purple for blast mode"

  const isBlast = color !== 'grey';
  const fill = isBlast ? '#2e174b' : '#c4c4c4';
  const opacity = 0.2;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        fill={fill}
        fillOpacity={opacity}
        style={{ rx: 'var(--block-svg-radius)' } as React.CSSProperties}
      />
    </svg>
  );
};
