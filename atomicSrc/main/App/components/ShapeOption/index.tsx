import './ShapeOption.css';
import React, { useRef, useEffect, useCallback } from 'react';

import type { Shape } from '../../types/core';
import { ANIMATION_TIMING } from '../../utils/animationConstants';
import { ShapeDisplay } from '../ShapeDisplay';
import { useTetrixDispatchContext, useTetrixStateContext } from '../../contexts/TetrixContext';

type ShapeOptionProps = {
  shape: Shape;
  shapeIndex: number;
  id?: string;
};

const ShapeOption = ({ shape, shapeIndex, id }: ShapeOptionProps) => {
  const dispatch = useTetrixDispatchContext();
  const {
    dragState,
    isTurningModeActive,
    turningDirection,
    isDoubleTurnModeActive,
    removingShapeIndex,
    shapeRemovalAnimationState,
    shapeOptionBounds,
    score,
    blockTheme,
    showBlockIcons,
    gameMode,
  } = useTetrixStateContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRemoval = removingShapeIndex === shapeIndex && shapeRemovalAnimationState === 'removing';

  // Generate stable ID if not provided
  const shapeId = id || `shape-option-${shapeIndex}`;

  // Track if bounds are currently null (need registration)
  const boundsAreNull = shapeOptionBounds[shapeIndex] === null || shapeOptionBounds[shapeIndex] === undefined;

  // Register bounds when component mounts or updates
  // Re-register when shape changes (e.g., after rotation or queue updates)
  // OR when bounds become null (cleared by reducer)
  useEffect(() => {
    // Only register if bounds are null (not already registered)
    if (containerRef.current && boundsAreNull) {
      const bounds = containerRef.current.getBoundingClientRect();
      dispatch({
        type: 'SET_SHAPE_OPTION_BOUNDS',
        value: {
          index: shapeIndex,
          bounds: {
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
          },
        },
      });
    }
  }, [dispatch, shapeIndex, shape, boundsAreNull]);

  // Handle removal animation - trigger completion after animation duration
  useEffect(() => {
    if (removingShapeIndex === shapeIndex && shapeRemovalAnimationState === 'removing') {
      // Start the animation and trigger completion after duration
      const animationTimer = setTimeout(() => {
        dispatch({ type: 'COMPLETE_SHAPE_REMOVAL' });
      }, ANIMATION_TIMING.REMOVAL_DURATION);

      return () => clearTimeout(animationTimer);
    }
  }, [removingShapeIndex, shapeIndex, shapeRemovalAnimationState, dispatch]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();

    // Don't handle events during animation
    if (isAnimatingRemoval) return;

    // Handle turning mode - rotate shape instead of dragging
    if (isTurningModeActive) {
      if (score >= 2) {
        // Deduct cost
        dispatch({
          type: 'ADD_SCORE',
          value: {
            scoreData: {
              rowsCleared: 0,
              columnsCleared: 0,
              pointsEarned: -2,
            },
          },
        });

        const clockwise = turningDirection === 'cw';

        dispatch({
          type: 'ROTATE_SHAPE',
          value: { shapeIndex, clockwise },
        });

        // Deactivate turning mode after rotation
        dispatch({ type: 'DEACTIVATE_TURNING_MODE' });
      } else {
        // Not enough score - deactivate mode
        dispatch({ type: 'DEACTIVATE_TURNING_MODE' });
      }

      return;
    }

    // Handle double turn mode - rotate shape 180 degrees (2 rotations)
    if (isDoubleTurnModeActive) {
      if (score >= 3) {
        // Deduct cost
        dispatch({
          type: 'ADD_SCORE',
          value: {
            scoreData: {
              rowsCleared: 0,
              columnsCleared: 0,
              pointsEarned: -3,
            },
          },
        });

        // Perform two clockwise rotations for 180-degree turn
        dispatch({
          type: 'ROTATE_SHAPE',
          value: { shapeIndex, clockwise: true },
        });

        dispatch({
          type: 'ROTATE_SHAPE',
          value: { shapeIndex, clockwise: true },
        });

        // Deactivate double turn mode after rotation
        dispatch({ type: 'DEACTIVATE_DOUBLE_TURN_MODE' });
      } else {
        // Not enough score - deactivate mode
        dispatch({ type: 'DEACTIVATE_DOUBLE_TURN_MODE' });
      }

      return;
    }

    if (dragState.selectedShapeIndex === shapeIndex) {
      // Already selected - do nothing, let the global pointerup handler in App.tsx
      // handle the return logic (it will detect we're over a ShapeOption)
      return;
    }

    // Select this shape - DraggingShape will handle all animations
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();

    dispatch({
      type: 'START_DRAG',
      value: {
        shape,
        sourceId: shapeId,
        sourceBounds: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        shapeIndex,
      },
    });
  }, [dispatch, shapeIndex, dragState.selectedShapeIndex, isTurningModeActive, turningDirection, isDoubleTurnModeActive, isAnimatingRemoval, score, shape, shapeId]);

  const isSelected = dragState.sourceId === shapeId || dragState.selectedShapeIndex === shapeIndex;

  // Render empty blocks during removal animation
  const displayShape = isAnimatingRemoval
    ? shape.map((row) => row.map((block) => ({ ...block, isFilled: false })))
    : shape;

  // Simple opacity: fully visible when not selected, fade when selected
  const opacity = isSelected ? 0 : 1;

  return (
    <div
      ref={containerRef}
      data-shape-index={shapeIndex}
      data-shape-id={shapeId}
      className={`shape-option-container${isSelected ? ' selected' : ''}`}
      style={{
        width: 'var(--game-controls-button-size)',
        height: 'var(--game-controls-button-size)',
        opacity,
        transition: 'opacity 0.15s ease-out',
      } as React.CSSProperties}
      onPointerDown={handlePointerDown}
    >
      <ShapeDisplay
        shape={displayShape}
        theme={blockTheme}
        showIcon={gameMode === 'daily' || showBlockIcons}
      />
    </div>
  );
};

export { ShapeOption };
