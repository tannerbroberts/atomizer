import './ShapeDisplay.css';
import { useMemo, useRef, useEffect, useState } from 'react';

import type { Shape } from '../../types/core';
import type { BlockTheme } from '../../types/theme';
import { getShapeBounds } from '../../utils/shapes/shapeGeometry';
import { BlockVisual } from '../../../Shared/BlockVisual';

type ShapeDisplayProps = {
  shape: Shape;
  cellGap?: number; // Gap between cells in pixels (default: 1)
  containerPadding?: number; // Padding around the grid in pixels (default: 4)
  className?: string; // Additional CSS classes
  theme?: BlockTheme;
  showIcon?: boolean;
};

/**
 * ShapeDisplay - Pure visual display of a shape
 *
 * Renders a shape in a 4x4 grid with automatic centering.
 * Fully responsive - sizes itself to fit the parent container.
 * No interactivity - this is just for display purposes.
 * Used by ShapeOption (with drag/drop) and QueueOverlay (read-only).
 */
const ShapeDisplay = ({
  shape,
  cellGap = 2,
  containerPadding = 4,
  className = '',
  theme,
  showIcon = true,
}: ShapeDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(0);

  // Calculate cell size based on container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      // Use the smaller dimension to ensure the shape fits
      const availableSize = Math.min(containerWidth, containerHeight);

      // Calculate cell size: (availableSize - padding*2 - gaps*3) / 4
      const cellGapSpace = cellGap * 3;
      const calculatedCellSize = (availableSize - (containerPadding * 2) - cellGapSpace) / 4;

      setCellSize(calculatedCellSize);
    };

    updateSize();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [cellGap, containerPadding]);

  // Calculate centering offset for shapes with odd dimensions
  const shapeBounds = useMemo(() => getShapeBounds(shape), [shape]);
  const centeringOffset = useMemo(() => {
    // Calculate how much to shift the shape to center it in the 4x4 grid
    // Each cell + gap is (cellSize + cellGap)
    const cellWithGap = cellSize + cellGap;

    // The shape's visual center in grid coordinates (0-based, fractional)
    const shapeVisualCenterCol = shapeBounds.minCol + (shapeBounds.width - 1) / 2;
    const shapeVisualCenterRow = shapeBounds.minRow + (shapeBounds.height - 1) / 2;

    // The 4x4 grid's center (1.5, 1.5 in 0-based coordinates)
    const gridCenter = 1.5;

    // Calculate offset needed to center the shape
    const offsetX = (gridCenter - shapeVisualCenterCol) * cellWithGap;
    const offsetY = (gridCenter - shapeVisualCenterRow) * cellWithGap;

    return { x: offsetX, y: offsetY };
  }, [shapeBounds, cellSize, cellGap]);

  // Don't render until we have a size calculated
  if (cellSize === 0) {
    return <div ref={containerRef} className={`shape-display ${className}`.trim()} />;
  }

  return (
    <div
      ref={containerRef}
      className={`shape-display ${className}`.trim()}
      style={{
        '--shape-cell-size': `${cellSize}px`,
        '--shape-cell-gap': `${cellGap}px`,
        '--block-overlap': '1px',
        '--centering-offset-x': `${centeringOffset.x}px`,
        '--centering-offset-y': `${centeringOffset.y}px`,
      } as React.CSSProperties}
    >
      {shape.map((row, rowIndex) => (
        row.map((block, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className="shape-display-tile"
          >
            <BlockVisual isFilled={block.isFilled} color={block.color} size={cellSize} theme={theme} showIcon={showIcon} />
          </div>
        ))
      ))}
    </div>
  );
};

export { ShapeDisplay };
