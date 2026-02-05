import { useEffect, useRef } from 'react';

import { useSoundEffects } from '../../contexts/SoundEffectsContext';
import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';
import { GRID_SIZE } from '../../utils/gridConstants';
import { mousePositionToGridLocation } from '../../utils/shapes/shapeGeometry';
import { isValidPlacement } from '../../utils/shapes/shapeValidation';

export const useShapePlacement = () => {
  const { gameMode, dragState, tiles } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();
  const { playSound } = useSoundEffects();
  const gridRef = useRef<HTMLElement | null>(null);

  // Global pointerup handler - consolidates all placement/return logic
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      // Only handle if a shape is being dragged
      if (!dragState.selectedShape) return;

      // Get current grid element for validation
      if (!gridRef.current) {
        gridRef.current = document.querySelector('.grid');
      }

      const gridElement = gridRef.current as HTMLElement;
      if (!gridElement) {
        // No grid available - return shape
        dispatch({ type: 'RETURN_SHAPE_TO_SELECTOR' });
        return;
      }

      // Use precomputed offsets (required)
      const offsets = dragState.dragOffsets;
      if (!offsets) {
        // No offsets means SELECT_SHAPE didn't properly calculate them
        console.error('dragOffsets not available - this indicates a logic error in SELECT_SHAPE');
        dispatch({ type: 'RETURN_SHAPE_TO_SELECTOR' });
        return;
      }

      // Use precomputed offsets for grid location calculation
      const location = mousePositionToGridLocation(
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

      // If location is null or placement is invalid, return the shape
      if (location === null || !isValidPlacement(dragState.selectedShape, location, tiles, gameMode)) {
        playSound('invalid_placement');
        dispatch({ type: 'RETURN_SHAPE_TO_SELECTOR' });
        return;
      }

      // Valid placement - place the shape
      dispatch({
        type: 'PLACE_SHAPE',
        value: {
          location,
          mousePosition: { x: e.clientX, y: e.clientY },
        },
      });
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dispatch, dragState.selectedShape, dragState.dragOffsets, tiles, playSound, gameMode]);
};
