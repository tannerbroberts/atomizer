import { useEffect, useState } from 'react';

import { useGameSizing } from '../../hooks/useGameSizing';
import { ANIMATION_TIMING } from '../../utils/animationConstants';
import { getShapeBounds } from '../../utils/shapes/shapeGeometry';
import { BlockVisual } from '../../../Shared/BlockVisual';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';
import './DraggingShape.css';

/**
 * DraggingShape Component
 *
 * PURPOSE:
 * This component acts as the visual bridge between the static ShapeOption (in the menu)
 * and the interactive Grid (on the board). It is a temporary overlay that exists only
 * during the drag-and-drop lifecycle.
 *
 * RESPONSIBILITIES:
 * 1. Handle all movement animations (pickup, dragging, placing, returning).
 * 2. Smoothly interpolate between the ShapeOption's coordinate system and the Grid's coordinate system.
 * 3. Ensure the "Filled Center" of the shape aligns with the mouse cursor (during drag)
 *    or the target grid tiles (during drop).
 *
 * COORDINATE SYSTEMS:
 * - ShapeOption: Uses a padded container with a centered 4x4 grid.
 * - Grid: Uses a fixed tile grid.
 * - DraggingShape: Interpolates between these two states.
 */
export function DraggingShape() {
  const {
    dragState,
    mousePosition,
    blockTheme,
    showBlockIcons,
    gameMode,
  } = useTetrixStateContext();

  const dispatch = useTetrixDispatchContext();
  const { playSound } = useSoundEffects();
  const [pickupProgress, setPickupProgress] = useState(0);
  const [placingProgress, setPlacingProgress] = useState(0);
  const [returningProgress, setReturningProgress] = useState(0);

  // Get dynamic sizing from hook
  const { gridSize, gridGap } = useGameSizing();

  // Constants for animation timing (derived from shared source of truth)
  const {
    PICKUP_DURATION,
    PLACING_DURATION,
    RETURN_DURATION,
    PLACEMENT_SOUND_DURATION,
    INVALID_BLOCK_ANIMATION_DURATION,
  } = ANIMATION_TIMING;

  // ShapeOption constants (must match ShapeOption.tsx)
  const SHAPE_OPTION_PADDING = 4;
  const SHAPE_OPTION_GAP = 2;

  // Calculate Grid dimensions
  const GRID_GAP = gridGap;
  const GRID_GAPS_TOTAL = 9 * GRID_GAP;
  const GRID_TILE_SIZE = (gridSize - GRID_GAPS_TOTAL) / 10;

  // Get touch offset
  const MOBILE_TOUCH_OFFSET = dragState.dragOffsets?.touchOffset ?? 0;

  // --- Effects for Animation Lifecycle ---

  // Play pickup sound
  useEffect(() => {
    if (dragState.phase === 'picking-up' && dragState.startTime) {
      playSound('pickup_shape');
    }
  }, [dragState.phase, dragState.startTime, playSound]);

  // Animate pick-up
  useEffect(() => {
    if (dragState.phase !== 'picking-up' || !dragState.sourcePosition) {
      setPickupProgress(dragState.phase === 'dragging' ? 1 : 0);
      return;
    }

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / PICKUP_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

      setPickupProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPickupProgress(1);
        // Phase transition handled by reducer via UPDATE_MOUSE_LOCATION
      }
    };
    requestAnimationFrame(animate);
  }, [dragState.phase, dragState.sourcePosition, PICKUP_DURATION]);

  // Animate placement
  useEffect(() => {
    if (dragState.phase !== 'placing' || !dragState.targetPosition) {
      setPlacingProgress(0);
      return;
    }

    const SOUND_DURATION = PLACEMENT_SOUND_DURATION;
    const SOUND_START_TIME = PLACING_DURATION - SOUND_DURATION;
    const startTime = performance.now();
    let soundTriggered = false;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / PLACING_DURATION, 1);

      if (!soundTriggered && elapsed >= SOUND_START_TIME) {
        soundTriggered = true;
        playSound('click_into_place');
      }

      const eased = Math.pow(progress, 3); // Ease-in cubic
      setPlacingProgress(eased);

      if (progress >= 1) {
        dispatch({ type: 'COMPLETE_PLACEMENT' });
        // Check for map completion after placement
        dispatch({ type: 'CHECK_MAP_COMPLETION' });
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [dragState.phase, dragState.targetPosition, dispatch, playSound, PLACING_DURATION]);

  // Animate return
  useEffect(() => {
    if (dragState.phase !== 'returning' || !dragState.sourcePosition) {
      setReturningProgress(0);
      return;
    }

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / RETURN_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

      setReturningProgress(eased);

      if (progress >= 1) {
        dispatch({ type: 'COMPLETE_RETURN' });
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [dragState.phase, dragState.sourcePosition, dispatch, RETURN_DURATION]);

  // --- Render Logic ---

  if (!dragState.selectedShape || dragState.phase === 'none') {
    return null;
  }

  const shape = dragState.selectedShape;
  const sourcePosition = dragState.sourcePosition;

  // 1. Calculate ShapeOption metrics (Start State)
  // We need to know exactly how the shape looked in the ShapeOption
  let shapeOptionCellSize = GRID_TILE_SIZE;
  let shapeOptionCenter = { x: 0, y: 0 };

  if (sourcePosition) {
    const availableSize = sourcePosition.width - (SHAPE_OPTION_PADDING * 2);
    const cellGapSpace = SHAPE_OPTION_GAP * 3;
    shapeOptionCellSize = (availableSize - cellGapSpace) / 4;

    shapeOptionCenter = {
      x: sourcePosition.x + sourcePosition.width / 2,
      y: sourcePosition.y + sourcePosition.height / 2,
    };
  }

  // 2. Determine current interpolation state based on phase
  let currentCellSize = GRID_TILE_SIZE;
  let currentGap = GRID_GAP;
  let currentCenter = { x: 0, y: 0 };
  let scale = 1;

  // Helper to calculate centering offset for a given cell size
  // This matches ShapeOption's logic: shifts children so the visual center aligns with container center
  const getCenteringOffset = (cellSize: number, gap: number) => {
    const bounds = getShapeBounds(shape);
    const cellWithGap = cellSize + gap;
    const shapeVisualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    const shapeVisualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const gridCenter = 1.5; // Center of 4x4 grid (0-3)

    return {
      x: (gridCenter - shapeVisualCenterCol) * cellWithGap,
      y: (gridCenter - shapeVisualCenterRow) * cellWithGap,
    };
  };

  if (dragState.phase === 'picking-up' && sourcePosition) {
    // Interpolate from ShapeOption to Mouse
    currentCellSize = shapeOptionCellSize + (GRID_TILE_SIZE - shapeOptionCellSize) * pickupProgress;
    currentGap = SHAPE_OPTION_GAP + (GRID_GAP - SHAPE_OPTION_GAP) * pickupProgress;

    const targetX = mousePosition.x;
    const targetY = mousePosition.y - MOBILE_TOUCH_OFFSET;

    currentCenter = {
      x: shapeOptionCenter.x + (targetX - shapeOptionCenter.x) * pickupProgress,
      y: shapeOptionCenter.y + (targetY - shapeOptionCenter.y) * pickupProgress,
    };
  } else if (dragState.phase === 'dragging') {
    // Follow mouse exactly
    currentCellSize = GRID_TILE_SIZE;
    currentGap = GRID_GAP;
    currentCenter = {
      x: mousePosition.x,
      y: mousePosition.y - MOBILE_TOUCH_OFFSET,
    };
  } else if (dragState.phase === 'placing' && dragState.targetPosition) {
    // Interpolate from Mouse (Placement Start) to Grid Target
    currentCellSize = GRID_TILE_SIZE;
    currentGap = GRID_GAP;

    const startPos = dragState.placementStartPosition ?? mousePosition;
    const startX = startPos.x;
    const startY = startPos.y - MOBILE_TOUCH_OFFSET;

    const targetX = dragState.targetPosition.x;
    const targetY = dragState.targetPosition.y;

    currentCenter = {
      x: startX + (targetX - startX) * placingProgress,
      y: startY + (targetY - startY) * placingProgress,
    };

    scale = 1 - 0.05 * Math.sin(placingProgress * Math.PI);
  } else if (dragState.phase === 'returning' && sourcePosition) {
    // Interpolate from Mouse back to ShapeOption
    currentCellSize = GRID_TILE_SIZE + (shapeOptionCellSize - GRID_TILE_SIZE) * returningProgress;
    currentGap = GRID_GAP + (SHAPE_OPTION_GAP - GRID_GAP) * returningProgress;

    const startX = mousePosition.x;
    const startY = mousePosition.y - MOBILE_TOUCH_OFFSET;

    currentCenter = {
      x: startX + (shapeOptionCenter.x - startX) * returningProgress,
      y: startY + (shapeOptionCenter.y - startY) * returningProgress,
    };

    scale = 1 - 0.2 * returningProgress;
  }

  // 3. Calculate final container position and child offsets
  const centeringOffset = getCenteringOffset(currentCellSize, currentGap);

  const shapeWidth = 4 * currentCellSize + 3 * currentGap;
  const shapeHeight = 4 * currentCellSize + 3 * currentGap;

  const containerLeft = currentCenter.x - shapeWidth / 2;
  const containerTop = currentCenter.y - shapeHeight / 2;

  // Safety check
  if (!Number.isFinite(containerTop) || !Number.isFinite(containerLeft)) {
    return null;
  }

  const invalidBlockSet = new Set(
    dragState.invalidBlockPositions.map((pos) => `${pos.shapeRow},${pos.shapeCol}`),
  );

  return (
    <div
      className={`dragging-shape-container ${dragState.phase === 'dragging' ? 'dragging-phase' : ''}`}
      style={{
        '--container-top': `${containerTop}px`,
        '--container-left': `${containerLeft}px`,
        '--tile-size': `${currentCellSize}px`,
        '--grid-gap': `${currentGap}px`,
        '--block-overlap': '1px',
        '--scale': scale,
        // Apply centering offset to children via CSS variable (matching ShapeOption)
        '--centering-offset-x': `${centeringOffset.x}px`,
        '--centering-offset-y': `${centeringOffset.y}px`,
        '--invalid-anim-duration': `${INVALID_BLOCK_ANIMATION_DURATION}ms`,
      } as React.CSSProperties}
    >
      {shape.map((row, rowIndex) => (
        row.map((block, colIndex) => {
          const blockKey = `${rowIndex},${colIndex}`;
          const isInvalid = invalidBlockSet.has(blockKey);
          const wiggleDelay = (rowIndex * 4 + colIndex) * 50;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`dragging-shape-cell ${isInvalid ? 'invalid-cell' : ''}`}
              style={{
                // Apply the centering transform here
                transform: 'translate(var(--centering-offset-x), var(--centering-offset-y))',
              } as React.CSSProperties}
            >
              <div
                className="wiggle-wrapper"
                style={{
                  '--wiggle-delay': `${wiggleDelay}ms`,
                } as React.CSSProperties}
              >
                {block.isFilled && (
                  <BlockVisual
                    isFilled={block.isFilled}
                    color={block.color}
                    size={isInvalid ? currentCellSize * 0.5 : currentCellSize}
                    theme={blockTheme}
                    showIcon={gameMode === 'daily' || showBlockIcons}
                  />
                )}
              </div>
            </div>
          );
        })
      ))}
    </div>
  );
}
