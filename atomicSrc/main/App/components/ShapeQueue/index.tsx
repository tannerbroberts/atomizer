import './ShapeQueue.css';
import { QueueIndicator } from '../QueueIndicator';
import { QueueOverlay } from '../QueueOverlay';
import { ShapeSelector } from '../ShapeSelector';
import { useTetrixDispatchContext, useTetrixStateContext } from '../../contexts/TetrixContext';

const ShapeQueue = (): JSX.Element => {
  const dispatch = useTetrixDispatchContext();
  const { queueMode, queueHiddenShapes, isQueueOverlayOpen, nextShapes } = useTetrixStateContext();

  // Handle queue indicator click
  const handleQueueIndicatorClick = () => {
    dispatch({ type: 'TOGGLE_QUEUE_OVERLAY' });
  };

  // Calculate hidden shape count for indicator
  // In finite mode, show the total remaining shapes (hidden + visible)
  const hiddenCount = queueMode === 'finite'
    ? queueHiddenShapes.length + nextShapes.length
    : queueHiddenShapes.length;

  return (
    <div className="shape-queue">
      <ShapeSelector />

      <QueueIndicator
        mode={queueMode}
        hiddenCount={hiddenCount}
        onClick={handleQueueIndicatorClick}
      />

      {isQueueOverlayOpen && (
        <QueueOverlay
          hiddenShapes={queueHiddenShapes}
          onClose={handleQueueIndicatorClick}
        />
      )}
    </div>
  );
};

export { ShapeQueue };
