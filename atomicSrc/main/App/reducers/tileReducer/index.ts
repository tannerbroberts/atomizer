/**
 * Tile Reducer - Handles grid/tile manipulation and placement
 * Actions: COMPLETE_PLACEMENT (tile updates), DEBUG_* actions
 */

import type { Tile, QueuedShape, QueueItem } from '../../types/core';
import type { TetrixReducerState, TetrixAction } from '../../types/gameState';
// safeBatchSave removed - persistence handled by PersistenceListener
import { cleanupExpiredAnimations } from '../../utils/clearingAnimationUtils';
import { checkGameOver } from '../../utils/gameOverUtils';
import { makeTileKey } from '../../utils/gridConstants';
import { performLineClearing } from '../../utils/lineClearingOrchestrator';
import { checkMapCompletion } from '../../utils/mapCompletionUtils';
import { generateSuperShape } from '../../utils/shapes/shapeGeneration';
import { generateRandomShapeWithGrandpaMode } from '../../utils/shapes/shapeGenerationWithProbabilities';
import { getShapeGridPositions } from '../../utils/shapes/shapeGeometry';
import { detectSuperComboPattern } from '../../utils/shapes/shapePatterns';
import { updateStats, incrementNoTurnStreak } from '../../utils/statsUtils';

export function tileReducer(state: TetrixReducerState, action: TetrixAction): TetrixReducerState {
  switch (action.type) {
    case 'COMPLETE_PLACEMENT': {
      if (!state.dragState.selectedShape || state.dragState.selectedShapeIndex === null) {
        return state;
      }

      // Use the locked-in placement location from dragState (set during PLACE_SHAPE)
      // Fall back to mouseGridLocation for backward compatibility with tests
      const placementLocation = state.dragState.placementLocation || state.mouseGridLocation;
      if (!placementLocation) {
        return state;
      }

      // Get the positions where the shape would be placed
      const shapePositions = getShapeGridPositions(state.dragState.selectedShape, placementLocation);

      // Update tiles with the placed shape (working with plain Tile objects)
      const newTiles = new Map(state.tiles);
      for (const pos of shapePositions) {
        if (pos.block.isFilled) {
          const position = makeTileKey(pos.location.row, pos.location.column);
          const existingTile = newTiles.get(position);
          if (existingTile) {
            // Update existing tile's block immutably
            newTiles.set(position, {
              ...existingTile,
              block: { isFilled: true, color: pos.block.color },
            });
          } else {
            // Create new tile if it doesn't exist
            const newTile: Tile = {
              position,
              backgroundColor: 'grey', // default background
              block: { isFilled: true, color: pos.block.color },
              activeAnimations: [],
            };
            newTiles.set(position, newTile);
          }
        }
      }

      // Perform line clearing with orchestrator (handles animations, sounds, scoring)
      const lineClearResult = performLineClearing(newTiles);

      const newScore = state.score + lineClearResult.pointsEarned;
      const newTotalLinesCleared = state.totalLinesCleared
        + lineClearResult.clearedRowIndices.length
        + lineClearResult.clearedColumnIndices.length;

      // Update stats (only for infinite mode)
      let newStats = state.stats;
      if (state.gameMode === 'infinite') {
        // Convert indices back to full row/column objects for stats
        const clearedRows = lineClearResult.clearedRowIndices.map((index) => ({
          index,
          color: 'grey' as const, // Color doesn't matter for stats
        }));
        const clearedColumns = lineClearResult.clearedColumnIndices.map((index) => ({
          index,
          color: 'grey' as const,
        }));

        newStats = updateStats(state.stats, clearedRows, clearedColumns);
        // Increment no-turn streak (since shape was placed without rotating)
        newStats = incrementNoTurnStreak(newStats);
      }

      // Persistence is now handled by PersistenceListener
      // No side effects in reducer!

      // Index of the shape being placed (will be removed from queue after animation)
      const removedIndex = state.dragState.selectedShapeIndex;

      // Check if super combo pattern exists after this placement
      const hasSuperComboPattern = detectSuperComboPattern(lineClearResult.tiles);

      // TWO-PHASE ANIMATION APPROACH:
      // Phase 1 (COMPLETE_PLACEMENT): Keep placed shape in array, add new shape at end (4 total)
      //   - Placed shape gets .removing class -> shrinks to 0
      //   - Other shapes slide forward to fill the gap
      //   - New shape (4th) slides into view from clipped position
      // Phase 2 (COMPLETE_SHAPE_REMOVAL): Remove placed shape from array (back to 3)

      const updatedHiddenShapes = [...state.queueHiddenShapes];

      // Keep all existing items (including the one being placed) for animation
      const animatingShapes: QueueItem[] = [...state.nextShapes];
      const animatingRotationMenus = [...state.openRotationMenus];
      const animatingAnimationStates = [...state.newShapeAnimationStates];

      // Track the next ID to use
      let nextIdCounter = state.nextShapeIdCounter;

      // Only add shapes if: infinite mode OR (finite mode AND shapes remain in hidden queue)
      const shouldAddShape = state.queueMode === 'infinite' || updatedHiddenShapes.length > 0;

      if (shouldAddShape) {
        let newShapeData;

        // In finite mode, pull from hidden shapes if available
        if (state.queueMode === 'finite' && updatedHiddenShapes.length > 0) {
          newShapeData = updatedHiddenShapes.shift()!; // Take first shape from queue
        } else if (hasSuperComboPattern) {
          // Generate super shape if pattern detected
          newShapeData = generateSuperShape();
        } else {
          // Generate shape using color probabilities (infinite mode only)
          // Apply grandpa mode to reduce Z and S shape frequency
          newShapeData = generateRandomShapeWithGrandpaMode(state.queueColorProbabilities, state.grandpaMode);
        }

        // Wrap the new shape with a unique ID
        const newQueuedShape: QueuedShape = {
          id: nextIdCounter++,
          shape: newShapeData,
          type: 'shape',
        };

        // Add new shape at end (will be at position 4, clipped until animation slides it in)
        animatingShapes.push(newQueuedShape);
        animatingRotationMenus.push(false); // New shape starts with menu closed
        animatingAnimationStates.push('none'); // New shape appears normally (slides in via CSS)
      }

      // For game over check, we need to check the POST-animation state (without the placed shape)
      const shapesAfterRemoval = animatingShapes.filter((_, index) => index !== removedIndex);
      const menusAfterRemoval = animatingRotationMenus.filter((_, index) => index !== removedIndex);
      // Extract only actual shapes (not purchasable slots) for game over check
      const plainShapes = shapesAfterRemoval.filter((item) => item.type === 'shape').map((item) => (item as QueuedShape).shape);

      // GAME OVER CHECK: Run on the FINAL state (correct 3 shapes after placement)
      // Infinite mode: Check if any shapes can be placed
      // Finite mode: Game over when queue is completely empty (no visible shapes and no hidden shapes)
      let isGameOver = false;
      if (state.gameMode === 'infinite') {
        isGameOver = checkGameOver(lineClearResult.tiles, plainShapes, menusAfterRemoval, state.gameMode);
      } else if (state.queueMode === 'finite') {
        // In finite mode, check if queue is depleted
        const queueDepleted = shapesAfterRemoval.length === 0 && updatedHiddenShapes.length === 0;

        // Check if no moves are possible with remaining shapes
        const noMovesPossible = checkGameOver(lineClearResult.tiles, plainShapes, menusAfterRemoval, state.gameMode);

        // If queue is depleted OR no moves possible, check map completion
        if ((queueDepleted || noMovesPossible) && state.targetTiles) {
          const completionResult = checkMapCompletion(lineClearResult.tiles, state.targetTiles);

          // For game over, skip animation and use final state directly
          return {
            ...state,
            gameState: 'gameover',
            tiles: lineClearResult.tiles,
            score: newScore,
            totalLinesCleared: newTotalLinesCleared,
            stats: newStats,
            nextShapes: shapesAfterRemoval, // Use final state for game over
            nextShapeIdCounter: nextIdCounter,
            queueHiddenShapes: updatedHiddenShapes,
            shapesUsed: state.shapesUsed + 1,
            openRotationMenus: menusAfterRemoval,
            newShapeAnimationStates: animatingAnimationStates.filter((_, index) => index !== removedIndex),
            shapeOptionBounds: new Array(shapesAfterRemoval.length).fill(null),
            mouseGridLocation: null,
            mapCompletionResult: {
              stars: completionResult.stars,
              matchedTiles: completionResult.matchedTiles,
              totalTiles: completionResult.totalTiles,
              missedTiles: completionResult.missedTiles,
            },
            dragState: {
              phase: 'none' as const,
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
            hasPlacedFirstShape: true,
            removingShapeIndex: null,
            shapeRemovalAnimationState: 'none' as const,
          };
        }

        isGameOver = queueDepleted || noMovesPossible;
      }

      // For normal gameplay (not game over), use two-phase animation:
      // Keep 4 shapes during animation, COMPLETE_SHAPE_REMOVAL will remove the placed shape
      const newState = {
        ...state,
        gameState: isGameOver ? 'gameover' : state.gameState,
        tiles: lineClearResult.tiles,
        score: newScore,
        totalLinesCleared: newTotalLinesCleared,
        stats: newStats,
        // Keep all shapes including placed one (4 total) for animation
        // COMPLETE_SHAPE_REMOVAL will remove the placed shape after animation
        nextShapes: animatingShapes,
        nextShapeIdCounter: nextIdCounter, // Update the ID counter
        queueHiddenShapes: updatedHiddenShapes,
        shapesUsed: state.shapesUsed + 1, // Increment immediately since shape is logically removed
        openRotationMenus: animatingRotationMenus,
        newShapeAnimationStates: animatingAnimationStates,
        shapeOptionBounds: new Array(animatingShapes.length).fill(null),
        mouseGridLocation: null,
        dragState: {
          phase: 'none' as const,
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
        hasPlacedFirstShape: true, // Mark that first shape has been placed
        // Start the removal animation - placed shape shrinks, others slide forward
        removingShapeIndex: removedIndex,
        shapeRemovalAnimationState: 'removing' as const,
      };

      return newState;
    }

    case 'CLEANUP_ANIMATIONS': {
      const cleanedTiles = cleanupExpiredAnimations(state.tiles);

      // Only update state if tiles actually changed
      if (cleanedTiles === state.tiles) {
        return state;
      }

      return {
        ...state,
        tiles: cleanedTiles,
      };
    }

    case 'DEBUG_FILL_ROW': {
      const { row, excludeColumn, color } = action.value;
      const newTiles = new Map(state.tiles);

      for (let column = 1; column <= 10; column++) {
        if (column !== excludeColumn) {
          const position = makeTileKey(row, column);
          const existingTile = newTiles.get(position);
          if (existingTile) {
            newTiles.set(position, {
              ...existingTile,
              block: { isFilled: true, color },
            });
          } else {
            const tile: Tile = {
              position,
              backgroundColor: 'grey',
              block: { isFilled: true, color },
              activeAnimations: [],
            };
            newTiles.set(position, tile);
          }
        }
      }

      // Persistence handled by listener

      return {
        ...state,
        tiles: newTiles,
      };
    }

    case 'DEBUG_FILL_COLUMN': {
      const { column, excludeRow, color } = action.value;
      const newTiles = new Map(state.tiles);

      for (let row = 1; row <= 10; row++) {
        if (row !== excludeRow) {
          const position = makeTileKey(row, column);
          const existingTile = newTiles.get(position);
          if (existingTile) {
            newTiles.set(position, {
              ...existingTile,
              block: { isFilled: true, color },
            });
          } else {
            const tile: Tile = {
              position,
              backgroundColor: 'grey',
              block: { isFilled: true, color },
              activeAnimations: [],
            };
            newTiles.set(position, tile);
          }
        }
      }

      // Persistence handled by listener

      return {
        ...state,
        tiles: newTiles,
      };
    }

    case 'DEBUG_REMOVE_BLOCK': {
      const { location } = action.value;
      const newTiles = new Map(state.tiles);
      const position = makeTileKey(location.row, location.column);
      const currentTile = newTiles.get(position);

      if (currentTile) {
        newTiles.set(position, {
          ...currentTile,
          block: { isFilled: false, color: 'grey' },
        });
      }

      // Persistence handled by listener

      return {
        ...state,
        tiles: newTiles,
      };
    }

    case 'DEBUG_ADD_BLOCK': {
      const { location, color } = action.value;
      const newTiles = new Map(state.tiles);
      const position = makeTileKey(location.row, location.column);
      const existingTile = newTiles.get(position);

      if (existingTile) {
        newTiles.set(position, {
          ...existingTile,
          block: { isFilled: true, color },
        });
      } else {
        const tile: Tile = {
          position,
          backgroundColor: 'grey',
          block: { isFilled: true, color },
          activeAnimations: [],
        };
        newTiles.set(position, tile);
      }

      // Persistence handled by listener

      return {
        ...state,
        tiles: newTiles,
      };
    }

    case 'GENERATE_SUPER_COMBO_PATTERN': {
      // Generate a 4x4 super combo pattern for testing
      // Pattern: rows 4-7 are completely filled except for diagonal empty spaces
      // AND columns 4-7 are completely filled except for diagonal empty spaces
      // Supports both ascending and descending diagonals
      const newTiles = new Map(state.tiles);

      // Randomly choose which diagonal to use (50/50 chance)
      const useAscending = Math.random() > 0.5;

      for (let row = 1; row <= 10; row++) {
        for (let column = 1; column <= 10; column++) {
          const position = makeTileKey(row, column);

          // Check if this tile is in pattern rows (4-7) OR pattern columns (4-7)
          const isInPatternRows = row >= 4 && row <= 7;
          const isInPatternCols = column >= 4 && column <= 7;

          // Check if this tile is on either diagonal of the 4x4 area
          // Ascending diagonal: (4,4), (5,5), (6,6), (7,7)
          const isOnAscendingDiagonal = isInPatternRows && isInPatternCols && (row - 4) === (column - 4);
          // Descending diagonal: (4,7), (5,6), (6,5), (7,4)
          const isOnDescendingDiagonal = isInPatternRows && isInPatternCols && (row + column) === 11;

          const isOnDiagonal = useAscending ? isOnAscendingDiagonal : isOnDescendingDiagonal;

          // Fill if in pattern rows OR pattern columns, but NOT on diagonal
          const existingTile = newTiles.get(position);
          if ((isInPatternRows || isInPatternCols) && !isOnDiagonal) {
            if (existingTile) {
              newTiles.set(position, {
                ...existingTile,
                block: { isFilled: true, color: 'blue' },
              });
            } else {
              const tile: Tile = {
                position,
                backgroundColor: 'grey',
                block: { isFilled: true, color: 'blue' },
                activeAnimations: [],
              };
              newTiles.set(position, tile);
            }
          } else if (isOnDiagonal && existingTile) {
            // Empty if on diagonal
            newTiles.set(position, {
              ...existingTile,
              block: { isFilled: false, color: 'grey' },
            });
          }
          // Keep all other tiles as-is
        }
      }

      // Persistence handled by listener

      return {
        ...state,
        tiles: newTiles,
      };
    }

    case 'DEBUG_REPLACE_FIRST_SHAPE': {
      const { shape } = action.value;

      // Remove the first shape and add the new shape to the end
      if (state.nextShapes.length === 0) {
        // If there are no shapes, just add this one as a QueuedShape
        const newQueuedShape: QueuedShape = {
          id: state.nextShapeIdCounter,
          shape,
          type: 'shape',
        };
        // Persistence handled by listener

        return {
          ...state,
          nextShapes: [newQueuedShape],
          nextShapeIdCounter: state.nextShapeIdCounter + 1,
          openRotationMenus: [false],
          shapeOptionBounds: [null],
          newShapeAnimationStates: ['none'],
        };
      }

      // Remove first shape and add new shape to the end as a QueuedShape
      const newQueuedShape: QueuedShape = {
        id: state.nextShapeIdCounter,
        shape,
        type: 'shape',
      };
      const newShapes = [...state.nextShapes.slice(1), newQueuedShape];

      // Persistence handled by listener

      return {
        ...state,
        nextShapes: newShapes,
        nextShapeIdCounter: state.nextShapeIdCounter + 1,
        openRotationMenus: [...state.openRotationMenus.slice(1), false],
        shapeOptionBounds: [...state.shapeOptionBounds.slice(1), null],
        newShapeAnimationStates: [...state.newShapeAnimationStates.slice(1), 'none'],
      };
    }

    default:
      return state;
  }
}
