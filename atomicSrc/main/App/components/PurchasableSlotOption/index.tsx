import './PurchasableSlotOption.css';
import React, { useRef, useEffect, useCallback } from 'react';

import { ANIMATION_TIMING } from '../../utils/animationConstants';
import { useTetrixDispatchContext, useTetrixStateContext } from '../../contexts/TetrixContext';

type PurchasableSlotOptionProps = {
  cost: number;
  slotNumber: number;
  slotIndex: number;
  id?: string;
};

const PurchasableSlotOption = ({ cost, slotNumber, slotIndex, id }: PurchasableSlotOptionProps) => {
  const dispatch = useTetrixDispatchContext();
  const {
    removingShapeIndex,
    shapeRemovalAnimationState,
    shapeOptionBounds,
    score,
  } = useTetrixStateContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRemoval = removingShapeIndex === slotIndex && shapeRemovalAnimationState === 'removing';

  // Generate stable ID if not provided
  const slotId = id || `purchasable-slot-${slotIndex}`;

  // Track if bounds are currently null (need registration)
  const boundsAreNull = shapeOptionBounds[slotIndex] === null || shapeOptionBounds[slotIndex] === undefined;

  // Register bounds when component mounts or updates
  useEffect(() => {
    if (containerRef.current && boundsAreNull) {
      const bounds = containerRef.current.getBoundingClientRect();
      dispatch({
        type: 'SET_SHAPE_OPTION_BOUNDS',
        value: {
          index: slotIndex,
          bounds: {
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
          },
        },
      });
    }
  }, [dispatch, slotIndex, boundsAreNull]);

  // Handle removal animation - trigger completion after animation duration
  useEffect(() => {
    if (removingShapeIndex === slotIndex && shapeRemovalAnimationState === 'removing') {
      const animationTimer = setTimeout(() => {
        dispatch({ type: 'COMPLETE_SLOT_PURCHASE_REMOVAL' });
      }, ANIMATION_TIMING.REMOVAL_DURATION);

      return () => clearTimeout(animationTimer);
    }
  }, [removingShapeIndex, slotIndex, shapeRemovalAnimationState, dispatch]);

  const canAfford = score >= cost;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't handle events during animation
    if (isAnimatingRemoval) return;

    // Only allow purchase if player has enough points
    if (!canAfford) return;

    // Start purchase process
    dispatch({
      type: 'PURCHASE_SHAPE_SLOT',
      value: { slotIndex },
    });
  }, [isAnimatingRemoval, canAfford, slotIndex, dispatch]);

  return (
    <div
      ref={containerRef}
      className={`purchasable-slot-option ${canAfford ? 'affordable' : 'locked'} ${isAnimatingRemoval ? 'removing' : ''}`}
      onClick={handleClick}
      id={slotId}
    >
      <div className="purchasable-slot-content">
        <div className="lock-icon">{canAfford ? '🔓' : '🔒'}</div>
        <div className="slot-label">Slot {slotNumber}</div>
        <div className="cost-display">
          <span className="cost-amount">{cost}</span>
          <span className="cost-icon">💎</span>
        </div>
      </div>
    </div>
  );
};

export { PurchasableSlotOption };
