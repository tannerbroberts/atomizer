import React, { useMemo, memo } from 'react';

import type { BlockTheme } from '../../../App/types/theme';

interface BlockSvgProps {
  color: string;
  theme?: BlockTheme;
  className?: string;
}

const THEME_VIEWBOX_SIZE = 100;

const BlockSvgInner: React.FC<BlockSvgProps> = ({ color, theme = 'gem', className }) => {
  // Helper to get CSS variable names
  const getVar = (suffix: string, fallback: string) => `var(--color-${color}-${suffix}, ${fallback})`;

  const renderGem = () => {
    const borderSize = 20;
    const size = THEME_VIEWBOX_SIZE;
    const innerSize = size - (borderSize * 2);

    // Colors
    const bg = getVar('bg', color);
    const top = getVar('border-top', '#ffffff80');
    const right = getVar('border-right', '#00000020');
    const bottom = getVar('border-bottom', '#00000040');
    const left = getVar('border-left', '#ffffff40');

    return (
      <g>
        {/* Center */}
        <rect x={borderSize} y={borderSize} width={innerSize} height={innerSize} fill={bg} />

        {/* Top Trapezoid */}
        <path d={`M0,0 L${size},0 L${size - borderSize},${borderSize} L${borderSize},${borderSize} Z`} fill={top} />

        {/* Right Trapezoid */}
        <path d={`M${size},0 L${size},${size} L${size - borderSize},${size - borderSize} L${size - borderSize},${borderSize} Z`} fill={right} />

        {/* Bottom Trapezoid */}
        <path d={`M${size},${size} L0,${size} L${borderSize},${size - borderSize} L${size - borderSize},${size - borderSize} Z`} fill={bottom} />

        {/* Left Trapezoid */}
        <path d={`M0,${size} L0,0 L${borderSize},${borderSize} L${borderSize},${size - borderSize} Z`} fill={left} />
      </g>
    );
  };

  const renderSimple = () => {
    const bg = getVar('bg', color);
    return (
      <rect
        x="2"
        y="2"
        width={THEME_VIEWBOX_SIZE - 4}
        height={THEME_VIEWBOX_SIZE - 4}
        fill={bg}
        style={{ rx: 'var(--block-svg-radius)' } as React.CSSProperties}
      />
    );
  };

  const renderPixel = () => {
    // 8x8 grid for chunkier pixels
    const gridSize = 8;
    const pixelSize = THEME_VIEWBOX_SIZE / gridSize;

    const pixels = [];
    const bg = getVar('bg', color);
    const highlight = getVar('border-top', '#ffffff');
    const shadow = getVar('border-bottom', '#000000');

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        let fill = bg;

        // Classic bevel logic
        if (x === 0 || y === 0) {
          fill = highlight; // Top/Left highlight
        } else if (x === gridSize - 1 || y === gridSize - 1) {
          fill = shadow; // Bottom/Right shadow
        } else if (x === 1 || y === 1) {
          // Inner highlight (optional, maybe just keep it simple)
          // fill = highlight;
        }

        // Corner logic for outer frame
        if ((x === 0 && y === gridSize - 1) || (x === gridSize - 1 && y === 0)) {
          fill = bg; // Corners are often neutral or transparent in some styles, but bg works
        }

        pixels.push(
          <rect
            key={`${x}-${y}`}
            x={x * pixelSize}
            y={y * pixelSize}
            width={pixelSize + 0.5} // +0.5 to avoid subpixel gaps
            height={pixelSize + 0.5}
            fill={fill}
          />,
        );
      }
    }
    return <g>{pixels}</g>;
  };

  const content = useMemo(() => {
    switch (theme) {
      case 'simple': return renderSimple();
      case 'pixel': return renderPixel();
      case 'gem':
      default: return renderGem();
    }
  }, [theme, color]);

  return (
    <svg
      viewBox={`0 0 ${THEME_VIEWBOX_SIZE} ${THEME_VIEWBOX_SIZE}`}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {content}
    </svg>
  );
};

// Memoize to prevent re-renders when parent re-renders with same props
export const BlockSvg = memo(BlockSvgInner);
