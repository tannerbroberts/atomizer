import { describe, it, expect } from 'vitest';
import { tetrixReducer } from '../main/App/reducers';
import type { TetrixReducerState } from '../main/App/types/gameState';
import { generateRandomShape } from '../main/App/utils/shapes/shapeGeneration';

describe('Drag and Drop Return to Selector', () => {
  it('should trigger return animation when RETURN_SHAPE_TO_SELECTOR is dispatched during dragging phase', () => {
    // Setup: Create state with a selected shape in dragging phase
    const shape = generateRandomShape();
    const initialState = {
      shapeOptionBounds: [
        { top: 50, left: 50, width: 100, height: 100 }
      ],
      dragState: {
        phase: 'dragging',
        selectedShape: shape,
        selectedShapeIndex: 0,
        sourcePosition: { x: 50, y: 50, width: 100, height: 100 },
        targetPosition: null,
        placementLocation: null,
        placementStartPosition: null,
        startTime: null,
      },
    } as TetrixReducerState;

    // Action: Dispatch RETURN_SHAPE_TO_SELECTOR
    const result = tetrixReducer(initialState, { type: 'RETURN_SHAPE_TO_SELECTOR' });

    // Assert: dragState phase should be 'returning'
    expect(result.dragState.phase).toBe('returning');
    expect(result.dragState.sourcePosition).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
    expect(result.dragState.selectedShape).toBe(shape); // Shape should still be selected during animation
  });

  it('should trigger return animation when RETURN_SHAPE_TO_SELECTOR is dispatched during picking-up phase', () => {
    // Setup: Create state with a selected shape in picking-up phase
    const shape = generateRandomShape();
    const initialState = {
      shapeOptionBounds: [
        { top: 50, left: 50, width: 100, height: 100 }
      ],
      dragState: {
        phase: 'picking-up',
        selectedShape: shape,
        selectedShapeIndex: 0,
        sourcePosition: { x: 50, y: 50, width: 100, height: 100 },
        targetPosition: null,
        placementLocation: null,
        placementStartPosition: null,
        startTime: performance.now(),
      },
    } as TetrixReducerState;

    // Action: Dispatch RETURN_SHAPE_TO_SELECTOR
    const result = tetrixReducer(initialState, { type: 'RETURN_SHAPE_TO_SELECTOR' });

    // Assert: dragState phase should be 'returning'
    expect(result.dragState.phase).toBe('returning');
    expect(result.dragState.sourcePosition).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
    expect(result.dragState.selectedShape).toBe(shape); // Shape should still be selected during animation
  });

  it('should clear shape immediately when no bounds available', () => {
    // Setup: Create state with a selected shape but no bounds
    const shape = generateRandomShape();
    const initialState = {
      shapeOptionBounds: [null], // No bounds available
      mousePosition: { x: 100, y: 100 },
      dragState: {
        phase: 'dragging',
        selectedShape: shape,
        selectedShapeIndex: 0,
        sourcePosition: null,
        targetPosition: null,
        placementLocation: null,
        placementStartPosition: null,
        startTime: null,
      },
    } as TetrixReducerState;

    // Action: Dispatch RETURN_SHAPE_TO_SELECTOR
    const result = tetrixReducer(initialState, { type: 'RETURN_SHAPE_TO_SELECTOR' });

    // Assert: Shape should be cleared immediately
    expect(result.dragState.selectedShape).toBeNull();
    expect(result.dragState.selectedShapeIndex).toBeNull();
    expect(result.dragState.phase).toBe('none');
  });
});
