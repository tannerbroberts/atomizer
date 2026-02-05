/**
 * Drag Reducer - Handles all drag and drop state management
 * Actions: SELECT_SHAPE, UPDATE_MOUSE_LOCATION, PLACE_SHAPE, COMPLETE_PLACEMENT,
 *          RETURN_SHAPE_TO_SELECTOR, COMPLETE_RETURN, CLEAR_SELECTION
 */

import type { TetrixReducerState, TetrixAction } from '../../types/gameState';
import { ANIMATION_TIMING } from '../../utils/animationConstants';
import { getShapeGridPositions, getShapeVisualOffset } from '../../utils/shapes/shapeGeometry';

export function dragReducer(state: TetrixReducerState, action: TetrixAction): TetrixReducerState {
  switch (action.type) {
    case 'START_DRAG': {
      const { shape, sourceId, sourceBounds, shapeIndex } = action.value;

      // Calculate grid dimensions - match the Grid component's calculation
      const gridElement = document.querySelector('.grid');
      if (!gridElement) {
        // Can't calculate offsets without grid, proceed without them (fallback behavior)
        return {
          ...state,
          dragState: {
            phase: 'picking-up',
            selectedShape: shape,
            selectedShapeIndex: shapeIndex ?? null,
            sourceId,
            isValidPlacement: false,
            hoveredBlockPositions: [],
            invalidBlockPositions: [],
            sourcePosition: {
              x: sourceBounds.left,
              y: sourceBounds.top,
              width: sourceBounds.width,
              height: sourceBounds.height,
            },
            targetPosition: null,
            placementLocation: null,
            placementStartPosition: null,
            startTime: performance.now(),
            dragOffsets: null,
          },
        };
      }

      const rect = gridElement.getBoundingClientRect();
      const GRID_GAP = 2; // Matches Grid component
      const GRID_GAPS_TOTAL = 9 * GRID_GAP;
      const TILE_SIZE = (rect.width - GRID_GAPS_TOTAL) / 10;

      // Calculate visual offset from 4x4 center to filled blocks center
      const { offsetX: visualOffsetX, offsetY: visualOffsetY } = getShapeVisualOffset(
        shape,
        TILE_SIZE,
        GRID_GAP,
      );

      // Calculate grid offset from mouse to 4x4 top-left corner
      // The 4x4 grid dimensions
      const shapeWidth = 4 * TILE_SIZE + 3 * GRID_GAP;
      const shapeHeight = 4 * TILE_SIZE + 3 * GRID_GAP;

      // Grid offset = distance from mouse to 4x4 top-left corner
      // When filled blocks are centered on mouse, top-left is at:
      // mouse - shapeWidth/2 - visualOffset
      // We want: gridTopLeft = mouse + gridOffset
      // Therefore: gridOffset = -shapeWidth/2 - visualOffset
      const gridOffsetX = -shapeWidth / 2 - visualOffsetX;
      const gridOffsetY = -shapeHeight / 2 - visualOffsetY;

      // Detect mobile and calculate touch offset
      const isTouchDevice = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
      const touchOffset = isTouchDevice ? TILE_SIZE * 2.5 : 0;

      return {
        ...state,
        dragState: {
          phase: 'picking-up',
          selectedShape: shape,
          selectedShapeIndex: shapeIndex ?? null,
          sourceId,
          isValidPlacement: false,
          hoveredBlockPositions: [],
          invalidBlockPositions: [],
          sourcePosition: {
            x: sourceBounds.left,
            y: sourceBounds.top,
            width: sourceBounds.width,
            height: sourceBounds.height,
          },
          targetPosition: null,
          placementLocation: null,
          placementStartPosition: null,
          startTime: performance.now(),
          dragOffsets: {
            visualOffsetX,
            visualOffsetY,
            gridOffsetX,
            gridOffsetY,
            touchOffset,
            tileSize: TILE_SIZE,
            gridGap: GRID_GAP,
          },
        },
      };
    }

    case 'SELECT_SHAPE': {
      const { shapeIndex } = action.value;
      const queueItem = state.nextShapes[shapeIndex];
      const bounds = state.shapeOptionBounds[shapeIndex];

      if (!queueItem || !bounds) {
        return state;
      }

      // Only allow selecting shapes (not purchasable slots)
      if (queueItem.type !== 'shape') {
        return state;
      }

      // Extract the actual shape data from the QueuedShape wrapper
      const shape = queueItem.shape;

      // Calculate grid dimensions - match the Grid component's calculation
      const gridElement = document.querySelector('.grid');
      if (!gridElement) {
        // Can't calculate offsets without grid, proceed without them (fallback behavior)
        return {
          ...state,
          dragState: {
            phase: 'picking-up',
            selectedShape: shape,
            selectedShapeIndex: shapeIndex,
            sourceId: null,
            isValidPlacement: false,
            hoveredBlockPositions: [],
            invalidBlockPositions: [],
            sourcePosition: {
              x: bounds.left,
              y: bounds.top,
              width: bounds.width,
              height: bounds.height,
            },
            targetPosition: null,
            placementLocation: null,
            placementStartPosition: null,
            startTime: performance.now(),
            dragOffsets: null,
          },
        };
      }

      const rect = gridElement.getBoundingClientRect();
      const GRID_GAP = 2; // Matches Grid component
      const GRID_GAPS_TOTAL = 9 * GRID_GAP;
      const TILE_SIZE = (rect.width - GRID_GAPS_TOTAL) / 10;

      // Calculate visual offset from 4x4 center to filled blocks center
      const { offsetX: visualOffsetX, offsetY: visualOffsetY } = getShapeVisualOffset(
        shape,
        TILE_SIZE,
        GRID_GAP,
      );

      // Calculate grid offset from mouse to 4x4 top-left corner
      // The 4x4 grid dimensions
      const shapeWidth = 4 * TILE_SIZE + 3 * GRID_GAP;
      const shapeHeight = 4 * TILE_SIZE + 3 * GRID_GAP;

      // Grid offset = distance from mouse to 4x4 top-left corner
      // When filled blocks are centered on mouse, top-left is at:
      // mouse - shapeWidth/2 - visualOffset
      // We want: gridTopLeft = mouse + gridOffset
      // Therefore: gridOffset = -shapeWidth/2 - visualOffset
      const gridOffsetX = -shapeWidth / 2 - visualOffsetX;
      const gridOffsetY = -shapeHeight / 2 - visualOffsetY;

      // Detect mobile and calculate touch offset
      const isTouchDevice = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
      const touchOffset = isTouchDevice ? TILE_SIZE * 2.5 : 0;

      return {
        ...state,
        dragState: {
          phase: 'picking-up',
          selectedShape: shape,
          selectedShapeIndex: shapeIndex,
          sourceId: null,
          isValidPlacement: false,
          hoveredBlockPositions: [],
          invalidBlockPositions: [],
          sourcePosition: {
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height,
          },
          targetPosition: null,
          placementLocation: null,
          placementStartPosition: null,
          startTime: performance.now(),
          dragOffsets: {
            visualOffsetX,
            visualOffsetY,
            gridOffsetX,
            gridOffsetY,
            touchOffset,
            tileSize: TILE_SIZE,
            gridGap: GRID_GAP,
          },
        },
      };
    }

    case 'UPDATE_MOUSE_LOCATION': {
      const { location, position, tileSize, gridBounds, isValid, invalidBlocks } = action.value;

      // If we are in the placing phase, we should NOT update the validity or hovered blocks
      // The shape is animating into place and should not react to mouse movement anymore
      if (state.dragState.phase === 'placing' || state.dragState.phase === 'returning') {
        return {
          ...state,
          mouseGridLocation: location,
          mousePosition: position ?? state.mousePosition ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          gridTileSize: tileSize ?? state.gridTileSize ?? null,
          gridBounds: gridBounds ?? state.gridBounds ?? null,
          // Keep existing drag state exactly as is to preserve the placement visualization
          dragState: state.dragState,
        };
      }

      // Calculate hovered block positions based on selected shape and mouse location
      const hoveredBlockPositions = state.dragState.selectedShape && location
        ? getShapeGridPositions(state.dragState.selectedShape, location)
        : [];

      // Get invalid block positions from action (or default to empty array)
      const invalidBlockPositions = invalidBlocks ?? [];

      // Transition from picking-up to dragging after pickup animation completes
      const shouldTransitionToDragging = state.dragState.phase === 'picking-up' && state.dragState.startTime
        && (performance.now() - state.dragState.startTime > ANIMATION_TIMING.PICKUP_DURATION);

      const newDragState = shouldTransitionToDragging
        ? { ...state.dragState, phase: 'dragging' as const, hoveredBlockPositions, invalidBlockPositions, isValidPlacement: isValid ?? false }
        : { ...state.dragState, hoveredBlockPositions, invalidBlockPositions, isValidPlacement: isValid ?? false };

      return {
        ...state,
        mouseGridLocation: location,
        mousePosition: position ?? state.mousePosition ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        gridTileSize: tileSize ?? state.gridTileSize ?? null,
        gridBounds: gridBounds ?? state.gridBounds ?? null,
        dragState: newDragState,
      };
    }

    case 'PLACE_SHAPE': {
      const { location, mousePosition: clickPosition } = action.value;

      if (!state.dragState.selectedShape || state.dragState.selectedShapeIndex === null) {
        return state;
      }

      // Start placement animation
      if (!state.gridTileSize || !state.gridBounds) {
        return state;
      }

      // Use the click position if provided, otherwise fall back to current mouse position
      const useMousePosition = clickPosition || state.mousePosition;
      if (!useMousePosition) {
        return state;
      }

      // CRITICAL: Recalculate grid dimensions from current DOM to respect window resize
      // DraggingShape uses useGameSizing() which reacts to resize, so we must use current values
      const gridElement = document.querySelector('.grid');
      let TILE_SIZE: number;
      let GRID_GAP: number;
      let currentGridBounds = state.gridBounds;

      if (gridElement) {
        const rect = gridElement.getBoundingClientRect();
        GRID_GAP = 2; // Matches Grid component
        const GRID_GAPS_TOTAL = 9 * GRID_GAP;
        TILE_SIZE = (rect.width - GRID_GAPS_TOTAL) / 10;

        // Update grid bounds to current values
        currentGridBounds = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      } else {
        // Fallback to stored values if grid element not found
        TILE_SIZE = state.dragState.dragOffsets?.tileSize ?? state.gridTileSize;
        GRID_GAP = state.dragState.dragOffsets?.gridGap ?? 2;
      }

      if (!TILE_SIZE || !currentGridBounds) {
        return state;
      }

      // Calculate the target position - center of where the filled blocks will be placed
      const tileWithGap = TILE_SIZE + GRID_GAP;

      // Get the positions where the shape will be placed
      const shapePositions = getShapeGridPositions(state.dragState.selectedShape, location);

      // Calculate the center point of all filled blocks that will be placed
      let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
      shapePositions.forEach((pos) => {
        minRow = Math.min(minRow, pos.location.row);
        maxRow = Math.max(maxRow, pos.location.row);
        minCol = Math.min(minCol, pos.location.column);
        maxCol = Math.max(maxCol, pos.location.column);
      });

      // Center of the filled blocks on the grid (in grid coordinates, 1-indexed)
      const centerRow = (minRow + maxRow) / 2;
      const centerCol = (minCol + maxCol) / 2;

      // Convert grid coordinates to pixel coordinates
      // For 1-indexed column C, the tile's left edge is at: gridBounds.left + (C - 1) * tileWithGap
      // The tile's center is at: left edge + TILE_SIZE / 2
      const targetCellCenterX = currentGridBounds.left + (centerCol - 1) * tileWithGap + TILE_SIZE / 2;
      const targetCellCenterY = currentGridBounds.top + (centerRow - 1) * tileWithGap + TILE_SIZE / 2;

      // Store where the shape currently IS (before updating mousePosition)
      // This is critical - the shape is visually at state.mousePosition during dragging,
      // and we need to animate from there, not from the new click position
      const placementStartPosition = state.mousePosition
        ? { x: state.mousePosition.x, y: state.mousePosition.y }
        : useMousePosition;

      return {
        ...state,
        dragState: {
          ...state.dragState,
          phase: 'placing',
          targetPosition: { x: targetCellCenterX, y: targetCellCenterY },
          placementLocation: location, // Lock in the placement location at release time
          placementStartPosition, // Where the shape visually was when placement started
          hoveredBlockPositions: shapePositions,
          startTime: performance.now(),
        },
        mouseGridLocation: location,
        mousePosition: useMousePosition, // Update current mouse position with click position
      };
    }

    case 'COMPLETE_RETURN': {
      // Clear shape after return animation completes
      return {
        ...state,
        mouseGridLocation: null,
        dragState: {
          phase: 'none',
          selectedShape: null,
          selectedShapeIndex: null,
          sourceId: null,
          isValidPlacement: false,
          hoveredBlockPositions: [],
          invalidBlockPositions: [],
          sourcePosition: null,
          targetPosition: null,
          placementLocation: null,
          placementStartPosition: null,
          startTime: null,
          dragOffsets: null,
        },
      };
    }

    case 'RETURN_SHAPE_TO_SELECTOR': {
      // Return shape to selector (invalid placement or drag outside grid)
      // If we have a selected shape and bounds, animate the return
      if (state.dragState.selectedShape) {
        const canAnimate = state.dragState.phase === 'dragging' || state.dragState.phase === 'picking-up';

        if (canAnimate) {
          // CRITICAL: Query current DOM bounds to respect window resize
          let sourcePosition = null;

          // Try to find by sourceId first (new method)
          if (state.dragState.sourceId) {
            const element = document.querySelector(`[data-shape-id="${state.dragState.sourceId}"]`);
            if (element) {
              const rect = element.getBoundingClientRect();
              sourcePosition = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
              };
            }
          }

          // Fallback to index-based lookup (old method)
          if (!sourcePosition && state.dragState.selectedShapeIndex !== null) {
            const shapeOptionElement = document.querySelector(`[data-shape-index="${state.dragState.selectedShapeIndex}"]`);
            if (shapeOptionElement) {
              const rect = shapeOptionElement.getBoundingClientRect();
              sourcePosition = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
              };
            }
          }

          // Fallback to stored bounds (for tests or edge cases)
          if (!sourcePosition && state.dragState.selectedShapeIndex !== null) {
            const storedBounds = state.shapeOptionBounds[state.dragState.selectedShapeIndex];
            if (storedBounds) {
              // Normalize bounds format - stored bounds use {top, left} but we need {x, y}
              sourcePosition = {
                x: storedBounds.left,
                y: storedBounds.top,
                width: storedBounds.width,
                height: storedBounds.height,
              };
            }
          }

          // Fallback to stored sourcePosition if available
          if (!sourcePosition && state.dragState.sourcePosition) {
            sourcePosition = state.dragState.sourcePosition;
          }

          // Only animate if we have valid bounds
          if (sourcePosition) {
            // Start return animation
            return {
              ...state,
              dragState: {
                ...state.dragState,
                phase: 'returning',
                sourcePosition,
                targetPosition: null,
                placementLocation: null,
                placementStartPosition: null,
                startTime: performance.now(),
              },
            };
          }
        }
      }

      // No animation needed - clear immediately
      return {
        ...state,
        mouseGridLocation: null,
        mousePosition: state.mousePosition,
        dragState: {
          phase: 'none',
          selectedShape: null,
          selectedShapeIndex: null,
          sourceId: null,
          isValidPlacement: false,
          hoveredBlockPositions: [],
          invalidBlockPositions: [],
          sourcePosition: null,
          targetPosition: null,
          placementLocation: null,
          placementStartPosition: null,
          startTime: null,
          dragOffsets: null,
        },
      };
    }

    case 'CLEAR_SELECTION': {
      // Clear selection immediately (ESC key)
      return {
        ...state,
        mouseGridLocation: null,
        mousePosition: state.mousePosition, // Keep current mouse position
        dragState: {
          phase: 'none',
          selectedShape: null,
          selectedShapeIndex: null,
          sourceId: null,
          isValidPlacement: false,
          hoveredBlockPositions: [],
          invalidBlockPositions: [],
          sourcePosition: null,
          targetPosition: null,
          placementLocation: null,
          placementStartPosition: null,
          startTime: null,
          dragOffsets: null,
        },
      };
    }

    default:
      return state;
  }
}
