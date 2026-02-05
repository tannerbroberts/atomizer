import React from 'react';
import './ShapeProducerViewport.css';

type ShapeProducerViewportProps = {
  children: React.ReactNode;
  isLandscape: boolean;
  className?: string;
};

/**
 * A layout container that strictly enforces a "viewport" of exactly 4 items.
 * It clips any overflow and enforces dimensions based on --game-controls-button-size.
 * This component is "dumb" and only handles layout/clipping.
 *
 * It intentionally does NOT know about game state, drag and drop, or shape logic.
 * Its only job is to maintain the "Producer Illusion" by being a fixed window.
 */
const ShapeProducerViewport = ({ children, isLandscape, className = '' }: ShapeProducerViewportProps) => {
  return (
    <div
      className={`shape-producer-viewport ${isLandscape ? 'landscape' : 'portrait'} ${className}`}
    >
      {children}
    </div>
  );
};

export { ShapeProducerViewport };
