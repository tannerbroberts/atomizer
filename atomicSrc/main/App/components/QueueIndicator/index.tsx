import React from 'react';
import './QueueIndicator.css';

interface QueueIndicatorProps {
  mode: 'infinite' | 'finite';
  hiddenCount: number; // Number of shapes hidden in queue (only relevant in finite mode)
  onClick?: () => void; // Called when finite mode button is clicked
}

/**
 * QueueIndicator - Shows queue mode and count
 *
 * Infinite mode: Shows ∞ symbol, disabled square button
 * Finite mode: Shows number of hidden shapes, clickable button that opens overlay
 */
const QueueIndicator: React.FC<QueueIndicatorProps> = ({
  mode,
  hiddenCount,
  onClick,
}) => {
  const handleClick = () => {
    if (mode === 'finite' && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`queue-indicator ${mode === 'infinite' ? 'queue-indicator-infinite' : 'queue-indicator-finite'}`}
      onClick={handleClick}
      disabled={mode === 'infinite'}
      title={mode === 'infinite' ? 'Infinite queue mode' : `${hiddenCount} shapes in queue`}
      aria-label={mode === 'infinite' ? 'Infinite queue mode' : `View ${hiddenCount} hidden shapes`}
    >
      {mode === 'infinite' ? (
        <span className="queue-indicator-infinity">∞</span>
      ) : (
        <span className="queue-indicator-count">{hiddenCount}</span>
      )}
    </button>
  );
};

export { QueueIndicator };
