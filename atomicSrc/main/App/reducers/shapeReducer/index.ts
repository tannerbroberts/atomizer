/**
 * Shape Reducer - Handles shape queue, rotation, and shape option management
 * Actions: SET_AVAILABLE_SHAPES, ROTATE_SHAPE, ADD_SHAPE_OPTION, REMOVE_SHAPE_OPTION,
 *          SET_SHAPE_OPTION_BOUNDS, START_SHAPE_REMOVAL, COMPLETE_SHAPE_REMOVAL
 */

import type { QueuedShape, QueueItem } from '../../types/core';
import type { TetrixReducerState, TetrixAction } from '../../types/gameState';
import { safeBatchSave } from '../../utils/persistence';
import { generateRandomShape } from '../../utils/shapes/shapeGeneration';
import { rotateShape, cloneShape } from '../../utils/shapes/shapeTransforms';
import { resetNoTurnStreak } from '../../utils/statsUtils';

export function shapeReducer(state: TetrixReducerState, action: TetrixAction): TetrixReducerState {
  switch (action.type) {
    case 'INITIALIZE_QUEUE': {
      const { items } = action.value;
      // Items already have unique IDs and correct types, just use them directly
      const newState = {
        ...state,
        nextShapes: items,
        nextShapeIdCounter: Math.max(...items.map((item) => item.id), state.nextShapeIdCounter) + 1,
        openRotationMenus: new Array(items.length).fill(false),
        shapeOptionBounds: new Array(items.length).fill(null),
        newShapeAnimationStates: new Array(items.length).fill('none'),
      };

      // Save FULL queue to database - purchasable slots are first-class items
      if (state.gameMode !== 'hub') {
        safeBatchSave({ nextQueue: items, savedShape: newState.savedShape })
          .catch((error: Error) => {
            console.error('Failed to save shapes state:', error);
          });
      }

      return newState;
    }

    case 'SET_AVAILABLE_SHAPES': {
      const { shapes } = action.value;
      // Wrap each plain shape with a unique ID
      let nextId = state.nextShapeIdCounter;
      const enhancedShapes: QueueItem[] = shapes.map((shape) => ({
        id: nextId++,
        shape,
        type: 'shape' as const,
      }));

      const newState = {
        ...state,
        nextShapes: enhancedShapes,
        nextShapeIdCounter: nextId,
        openRotationMenus: new Array(enhancedShapes.length).fill(false),
        shapeOptionBounds: new Array(enhancedShapes.length).fill(null),
        newShapeAnimationStates: new Array(enhancedShapes.length).fill('none'),
      };

      // Save FULL queue to database - purchasable slots are first-class items
      if (state.gameMode !== 'hub') {
        safeBatchSave({ nextQueue: enhancedShapes, savedShape: newState.savedShape })
          .catch((error: Error) => {
            console.error('Failed to save shapes state:', error);
          });
      }

      return newState;
    }

    case 'ROTATE_SHAPE': {
      const { shapeIndex, clockwise } = action.value;

      if (shapeIndex < 0 || shapeIndex >= state.nextShapes.length) {
        return state;
      }

      const newShapes = [...state.nextShapes];
      const queueItem = newShapes[shapeIndex];

      // Only rotate if the item is actually a shape (not a purchasable slot)
      if (queueItem.type !== 'shape') {
        return state;
      }

      const queuedShape = queueItem as QueuedShape;
      let rotatedShape = cloneShape(queuedShape.shape);

      if (clockwise) {
        rotatedShape = rotateShape(rotatedShape);
      } else {
        // Rotate counter-clockwise (3 clockwise rotations)
        rotatedShape = rotateShape(rotateShape(rotateShape(rotatedShape)));
      }

      // Keep the same ID, just update the shape data
      newShapes[shapeIndex] = { ...queuedShape, shape: rotatedShape, type: 'shape' };

      // If this is the currently selected shape, update it in dragState too
      const newDragState = state.dragState.selectedShapeIndex === shapeIndex
        ? { ...state.dragState, selectedShape: rotatedShape }
        : state.dragState;

      // Reset no-turn streak since a shape was rotated
      const newStats = resetNoTurnStreak(state.stats);

      const newState = {
        ...state,
        nextShapes: newShapes,
        dragState: newDragState,
        stats: newStats,
      };

      // Save FULL queue and stats to database
      if (state.gameMode !== 'hub') {
        safeBatchSave({
          nextQueue: newShapes,
          savedShape: newState.savedShape,
          stats: newStats,
        }).catch((error: Error) => {
          console.error('Failed to save shapes state:', error);
        });
      }

      return newState;
    }

    case 'ADD_SHAPE_OPTION': {
      const newShape = generateRandomShape();
      const newQueuedShape: QueuedShape = {
        id: state.nextShapeIdCounter,
        shape: newShape,
        type: 'shape',
      };
      const updatedShapes = [...state.nextShapes, newQueuedShape];

      const newState = {
        ...state,
        nextShapes: updatedShapes,
        nextShapeIdCounter: state.nextShapeIdCounter + 1,
        openRotationMenus: [...state.openRotationMenus, false], // New shape starts with menu closed
        shapeOptionBounds: [...state.shapeOptionBounds, null], // New shape has no bounds initially
        newShapeAnimationStates: [...state.newShapeAnimationStates, 'none' as const], // New shape appears immediately
      };

      // Save FULL queue to database
      if (state.gameMode !== 'hub') {
        safeBatchSave({ nextQueue: updatedShapes, savedShape: newState.savedShape })
          .catch((error: Error) => {
            console.error('Failed to save shapes state:', error);
          });
      }

      return newState;
    }

    case 'REMOVE_SHAPE_OPTION': {
      // In infinite mode, never remove below 1 shape
      // In finite mode, allow going to 0 to show empty queue placeholder
      if (state.queueMode === 'infinite' && state.nextShapes.length <= 1) {
        return state;
      }

      // Don't allow removal if already at 0
      if (state.nextShapes.length === 0) {
        return state;
      }

      // Remove the last shape
      const updatedShapes = state.nextShapes.slice(0, -1);
      const updatedRotationMenus = state.openRotationMenus.slice(0, -1);
      const updatedBounds = state.shapeOptionBounds.slice(0, -1);
      const updatedAnimationStates = state.newShapeAnimationStates.slice(0, -1);

      // If the currently selected shape is being removed, clear selection
      const isRemovingSelectedShape = state.dragState.selectedShapeIndex === state.nextShapes.length - 1;

      const newDragState = isRemovingSelectedShape
        ? {
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
        }
        : state.dragState;

      const newState = {
        ...state,
        nextShapes: updatedShapes,
        openRotationMenus: updatedRotationMenus,
        shapeOptionBounds: updatedBounds,
        newShapeAnimationStates: updatedAnimationStates,
        dragState: newDragState,
      };

      // Save FULL queue to database
      if (state.gameMode !== 'hub') {
        safeBatchSave({ nextQueue: updatedShapes, savedShape: newState.savedShape })
          .catch((error: Error) => {
            console.error('Failed to save shapes state:', error);
          });
      }

      return newState;
    }

    case 'SET_SHAPE_OPTION_BOUNDS': {
      const { index, bounds } = action.value;
      const newBounds = [...state.shapeOptionBounds];
      newBounds[index] = bounds;
      return {
        ...state,
        shapeOptionBounds: newBounds,
      };
    }

    case 'START_SHAPE_REMOVAL': {
      const { shapeIndex } = action.value;
      return {
        ...state,
        removingShapeIndex: shapeIndex,
        shapeRemovalAnimationState: 'removing',
      };
    }

    case 'COMPLETE_SHAPE_REMOVAL': {
      // Phase 2 of two-phase animation:
      // Remove the placed shape from the array (animation has completed)
      // Array goes from 4 shapes back to 3

      if (state.removingShapeIndex === null) {
        return {
          ...state,
          shapeRemovalAnimationState: 'none',
        };
      }

      const indexToRemove = state.removingShapeIndex;

      // Filter out the placed shape now that animation is complete
      const finalShapes = state.nextShapes.filter((_, index) => index !== indexToRemove);
      const finalRotationMenus = state.openRotationMenus.filter((_, index) => index !== indexToRemove);
      const finalAnimationStates = state.newShapeAnimationStates.filter((_, index) => index !== indexToRemove);
      const finalBounds = state.shapeOptionBounds.filter((_, index) => index !== indexToRemove);

      return {
        ...state,
        nextShapes: finalShapes,
        openRotationMenus: finalRotationMenus,
        newShapeAnimationStates: finalAnimationStates,
        shapeOptionBounds: finalBounds,
        removingShapeIndex: null,
        shapeRemovalAnimationState: 'none',
      };
    }

    case 'PURCHASE_SHAPE_SLOT': {
      const { slotIndex } = action.value;

      // Check if the item at slotIndex is actually a purchasable slot
      const item = state.nextShapes[slotIndex];
      if (!item || item.type !== 'purchasable-slot') {
        return state;
      }

      // Check if player has enough points
      if (state.score < item.cost) {
        return state;
      }

      // Deduct cost from score
      const newScore = state.score - item.cost;

      // Generate a new shape to add at the end (5th position, clipped)
      const newShape = generateRandomShape();
      const newQueuedShape: QueuedShape = {
        id: state.nextShapeIdCounter,
        shape: newShape,
        type: 'shape',
      };

      // Add new shape at end (will be at position 5, clipped until animation slides it in)
      const updatedItems = [...state.nextShapes, newQueuedShape];

      // Start removal animation for the purchasable slot
      return {
        ...state,
        score: newScore,
        nextShapes: updatedItems,
        nextShapeIdCounter: state.nextShapeIdCounter + 1,
        removingShapeIndex: slotIndex,
        shapeRemovalAnimationState: 'removing',
        openRotationMenus: [...state.openRotationMenus, false],
        shapeOptionBounds: [...state.shapeOptionBounds, null],
        newShapeAnimationStates: [...state.newShapeAnimationStates, 'none'],
      };
    }

    case 'COMPLETE_SLOT_PURCHASE_REMOVAL': {
      // Phase 2 of two-phase animation:
      // Remove the purchased slot from the array (animation has completed)
      // Increment unlockedSlots counter

      if (state.removingShapeIndex === null) {
        return {
          ...state,
          shapeRemovalAnimationState: 'none',
        };
      }

      const indexToRemove = state.removingShapeIndex;

      // Filter out the purchased slot now that animation is complete
      const finalItems = state.nextShapes.filter((_, index) => index !== indexToRemove);
      const finalRotationMenus = state.openRotationMenus.filter((_, index) => index !== indexToRemove);
      const finalAnimationStates = state.newShapeAnimationStates.filter((_, index) => index !== indexToRemove);
      const finalBounds = state.shapeOptionBounds.filter((_, index) => index !== indexToRemove);

      return {
        ...state,
        nextShapes: finalItems,
        openRotationMenus: finalRotationMenus,
        newShapeAnimationStates: finalAnimationStates,
        shapeOptionBounds: finalBounds,
        removingShapeIndex: null,
        shapeRemovalAnimationState: 'none',
        unlockedSlots: state.unlockedSlots + 1, // Increment unlocked slots
      };
    }

    default:
      return state;
  }
}
