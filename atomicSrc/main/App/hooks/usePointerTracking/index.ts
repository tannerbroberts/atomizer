import { useEffect, useRef } from 'react';

import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';
import { GRID_SIZE } from '../../utils/gridConstants';
import { mousePositionToGridLocation } from '../../utils/shapes/shapeGeometry';
import { isValidPlacement, getInvalidBlocks } from '../../utils/shapes/shapeValidation';

export const usePointerTracking = () => {
  const { gameMode, dragState, gridTileSize, gridBounds, tiles } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();
  const gridRef = useRef<HTMLElement | null>(null);

  // Global mouse/pointer tracking for DraggingShape
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const position = { x: e.clientX, y: e.clientY };

      // Optimization: If we are placing or returning, we don't need to calculate fit
      // The reducer also guards against this, but we can save the calculation here
      if (dragState.phase === 'placing' || dragState.phase === 'returning') {
        dispatch({
          type: 'UPDATE_MOUSE_LOCATION',
          value: {
            location: null,
            position,
            tileSize: gridTileSize,
            gridBounds,
            isValid: false,
            invalidBlocks: [],
          },
        });
        return;
      }

      // Only calculate grid location if a shape is selected and grid is available
      let location = null;
      let tileSize = gridTileSize;
      let bounds = gridBounds;
      let isValid = false;
      let invalidBlocks: Array<{ shapeRow: number; shapeCol: number }> = [];

      if (dragState.selectedShape) {
        // Find the grid element if we don't have it cached
        if (!gridRef.current) {
          gridRef.current = document.querySelector('.grid');
        }

        if (gridRef.current) {
          const gridElement = gridRef.current as HTMLElement;
          const rect = gridElement.getBoundingClientRect();

          // Update bounds if needed
          if (!bounds) {
            bounds = {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
          }

          // Use precomputed offsets from dragState (required)
          const offsets = dragState.dragOffsets;
          if (!offsets) {
            // No offsets means SELECT_SHAPE didn't properly calculate them
            console.error('dragOffsets not available - this indicates a logic error in SELECT_SHAPE');
            return;
          }

          // Use stored tile size and touch offset
          tileSize = offsets.tileSize;

          // Calculate grid location with precomputed offsets
          location = mousePositionToGridLocation(
            e.clientX,
            e.clientY,
            gridElement,
            { rows: GRID_SIZE, columns: GRID_SIZE },
            offsets.touchOffset,
            dragState.selectedShape,
            {
              gridOffsetX: offsets.gridOffsetX,
              gridOffsetY: offsets.gridOffsetY,
              tileSize: offsets.tileSize,
              gridGap: offsets.gridGap,
            },
          );

          // Validate placement when we have a location
          if (location) {
            // Always calculate validation - the location might be the same but we need to ensure
            // invalidBlocks is properly calculated for any location (including out of bounds)
            isValid = isValidPlacement(dragState.selectedShape, location, tiles, gameMode);
            invalidBlocks = getInvalidBlocks(dragState.selectedShape, location, tiles, gameMode);
          }
        }
      }

      // Always dispatch position updates to keep mousePosition current
      dispatch({
        type: 'UPDATE_MOUSE_LOCATION',
        value: {
          location,
          position,
          tileSize,
          gridBounds: bounds,
          isValid,
          invalidBlocks,
        },
      });
    };

    // Track pointer movement globally
    document.addEventListener('pointermove', handlePointerMove);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      gridRef.current = null;
    };
  }, [dispatch, dragState.selectedShape, dragState.dragOffsets, dragState.hoveredBlockPositions, dragState.isValidPlacement, dragState.invalidBlockPositions, dragState.phase, gridTileSize, gridBounds, tiles, gameMode]);
};
