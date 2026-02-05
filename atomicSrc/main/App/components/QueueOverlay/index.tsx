import React from 'react';

import type { Shape } from '../../types/core';
import { Overlay } from '../../../Shared/Overlay';
import { ShapeDisplay } from '../ShapeDisplay';
import { useTetrixStateContext } from '../../contexts/TetrixContext';
import './QueueOverlay.css';

interface QueueOverlayProps {
  hiddenShapes: Shape[]; // Array of shapes not currently visible
  onClose: () => void; // Called when overlay is closed
}

/**
 * QueueOverlay - Displays hidden shapes in finite queue mode
 *
 * Shows a modal overlay listing all shapes that are queued but not visible
 * in the main drag-and-drop interface
 */
const QueueOverlay: React.FC<QueueOverlayProps> = ({
  hiddenShapes,
  onClose,
}) => {
  const { blockTheme, showBlockIcons, gameMode } = useTetrixStateContext();

  return (
    <Overlay
      className="queue-overlay-backdrop"
      contentClassName="queue-overlay-content"
      onBackdropClick={onClose}
      onEscapeKey={onClose}
      usePortal={true}
      ariaLabelledBy="queue-overlay-title"
    >
      <div className="queue-overlay-header">
        <h2 id="queue-overlay-title">Shape Queue</h2>
        <button
          className="queue-overlay-close"
          onClick={onClose}
          aria-label="Close queue overlay"
        >
          ✕
        </button>
      </div>

      <div className="queue-overlay-body">
        {hiddenShapes.length === 0 ? (
          <p className="queue-overlay-empty">No hidden shapes in queue</p>
        ) : (
          <div className="queue-overlay-shapes">
            {hiddenShapes.map((shape, index) => (
              <div key={`hidden-shape-${index}`} className="queue-overlay-shape">
                <div className="queue-overlay-shape-label">#{index + 4}</div>
                <ShapeDisplay
                  shape={shape}
                  theme={blockTheme}
                  showIcon={gameMode === 'daily' || showBlockIcons}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
};

export { QueueOverlay };
