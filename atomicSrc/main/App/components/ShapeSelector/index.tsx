import './ShapeSelector.css';
import { useEffect, useMemo } from 'react';

import type { QueueItem, PurchasableSlot } from '../../types/core';
import { generateRandomShape } from '../../utils/shapes/shapeGeneration';
import { PurchasableSlotOption } from '../PurchasableSlotOption';
import { ShapeOption } from '../ShapeOption';
import { ShapeProducerViewport } from '../ShapeProducerViewport';
import { useTetrixDispatchContext, useTetrixStateContext } from '../../contexts/TetrixContext';

const ShapeSelector = (): JSX.Element => {
  const dispatch = useTetrixDispatchContext();
  const { nextShapes, removingShapeIndex, shapeRemovalAnimationState, queueMode, unlockedSlots } = useTetrixStateContext();

  // Create initial queue - shapes + purchasable slots based on unlocked slots
  const initialQueue = useMemo(() => {
    const queue: QueueItem[] = [];
    let idCounter = 0;

    // Add shapes for unlocked slots
    for (let i = 0; i < unlockedSlots; i++) {
      queue.push({
        id: idCounter++,
        shape: generateRandomShape(),
        type: 'shape',
      });
    }

    // Add purchasable slots for remaining slots (up to 4 total)
    const slotCosts = [5000, 15000, 50000]; // Costs for slots 2, 3, 4
    for (let i = unlockedSlots; i < 4; i++) {
      const slotNumber = i + 1; // Slot numbers are 1-indexed
      queue.push({
        id: idCounter++,
        type: 'purchasable-slot',
        cost: slotCosts[i - 1], // Get cost from array (0-indexed)
        slotNumber,
      });
    }

    return queue;
  }, [unlockedSlots]);

  // Initialize queue when needed
  // - On mount if no items exist and in infinite mode
  // - When switching to infinite mode with no items
  useEffect(() => {
    if (nextShapes.length === 0 && queueMode === 'infinite') {
      dispatch({ type: 'INITIALIZE_QUEUE', value: { items: initialQueue } });
    }
  }, [dispatch, initialQueue, nextShapes.length, queueMode]);

  // Display all items (including 5th during slide-in animation)
  // The container will clip overflow, and the 5th item slides in when another is removed
  const displayedItems = nextShapes;

  const isLandscape = window.innerWidth >= window.innerHeight;

  // ShapeSelector sizing:
  // - Displays exactly 4 items in a row (portrait) or column (landscape)
  // - Each item uses --game-controls-button-size from parent (passed via CSS variable)
  // - Explicit sizing: 4 * button size (width in portrait, height in landscape)

  return (
    <div className="shape-selector">
      <ShapeProducerViewport isLandscape={isLandscape}>
        {displayedItems.length > 0 ? (
          displayedItems.map((queueItem, index) => {
            const isRemoving = removingShapeIndex === index && shapeRemovalAnimationState === 'removing';
            // Use the unique ID from the QueueItem as the React key
            // This ensures proper animation when items slide in the queue

            if (queueItem.type === 'shape') {
              return (
                <div
                  key={queueItem.id}
                  className={`shape-selector-shape-wrapper${isRemoving ? ' removing' : ''}`}
                  data-landscape={isLandscape ? '1' : '0'}
                >
                  <ShapeOption
                    shape={queueItem.shape}
                    shapeIndex={index}
                  />
                </div>
              );
            }
            // Purchasable slot
            const slot = queueItem as PurchasableSlot;
            return (
              <div
                key={queueItem.id}
                className={`shape-selector-shape-wrapper${isRemoving ? ' removing' : ''}`}
                data-landscape={isLandscape ? '1' : '0'}
              >
                <PurchasableSlotOption
                  cost={slot.cost}
                  slotNumber={slot.slotNumber}
                  slotIndex={index}
                />
              </div>
            );
          })
        ) : (
          // Show placeholder when queue is empty
          <div
            className="shape-selector-shape-wrapper shape-selector-empty-placeholder"
            data-landscape={isLandscape ? '1' : '0'}
          >
            <div className="empty-queue-message">
              Queue Empty
            </div>
          </div>
        )}
      </ShapeProducerViewport>
    </div>
  );
};

export { ShapeSelector };
