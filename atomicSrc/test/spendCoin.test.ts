import { expect, test, describe } from 'vitest';
import { tetrixReducer, initialState } from '../main/App/reducers';
import { generateRandomShape } from '../main/App/utils/shapes/shapeGeneration';
import type { QueuedShape, Shape } from '../main/App/types/core';

// Helper functions to create QueuedShapes for tests
let testShapeIdCounter = 4000;
const createQueuedShape = (shape: Shape): QueuedShape => ({
  id: testShapeIdCounter++,
  shape,
});
const createQueuedShapes = (shapes: Shape[]): QueuedShape[] =>
  shapes.map(shape => createQueuedShape(shape));

describe('Spend Coin Feature', () => {
  test('SPEND_COIN action reduces score and opens rotation menu', () => {
    // Create a test state with some score and shapes
    const plainShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];
    const testShapes = createQueuedShapes(plainShapes);

    const state = {
      ...initialState,
      nextShapes: testShapes,
      score: 5,
      openRotationMenus: [false, false, false],
    };

    // Dispatch spend coin action for first shape
    const newState = tetrixReducer(state, {
      type: 'SPEND_COIN',
      value: {
        shapeIndex: 0,
        mousePosition: { x: 100, y: 100 }
      }
    });

    // Verify the score was reduced and menu was opened
    expect(newState.score).toBe(4);
    expect(newState.openRotationMenus[0]).toBe(true);
    expect(newState.openRotationMenus[1]).toBe(false);
    expect(newState.openRotationMenus[2]).toBe(false);
  });

  test('SPEND_COIN action fails when score is 0', () => {
    const plainShapes = [generateRandomShape()];
    const testShapes = createQueuedShapes(plainShapes);

    const state = {
      ...initialState,
      nextShapes: testShapes,
      score: 0,
      openRotationMenus: [false],
    };

    // Try to spend when no coins available
    const newState = tetrixReducer(state, {
      type: 'SPEND_COIN',
      value: { shapeIndex: 0 }
    });

    // Score should remain 0 and error should be set
    expect(newState.score).toBe(0);
    expect(newState.insufficientFundsError).toBeDefined();
    expect(newState.insufficientFundsError).toBeGreaterThan(0);
  });

  test('SPEND_COIN action fails with invalid shape index', () => {
    const plainShapes = [generateRandomShape()];
    const testShapes = createQueuedShapes(plainShapes);
    
    const state = {
      ...initialState,
      nextShapes: testShapes,
      score: 5,
      openRotationMenus: [false],
    };

    // Try to spend on non-existent shape
    const newState = tetrixReducer(state, {
      type: 'SPEND_COIN',
      value: { shapeIndex: 5 }
    });

    // State should be unchanged
    expect(newState).toEqual(state);
  });

  test('SET_AVAILABLE_SHAPES resets rotation menus', () => {
    const state = {
      ...initialState,
      openRotationMenus: [true, true, false],
    };

    const newShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];

    // Set new shapes
    const newState = tetrixReducer(state, {
      type: 'SET_AVAILABLE_SHAPES',
      value: { shapes: newShapes }
    });

    // All rotation menus should be closed
    expect(newState.openRotationMenus).toEqual([false, false, false]);
    // SET_AVAILABLE_SHAPES wraps shapes with IDs
    expect(newState.nextShapes.length).toBe(3);
    expect(newState.nextShapes[0].shape).toEqual(newShapes[0]);
    expect(newState.nextShapes[1].shape).toEqual(newShapes[1]);
    expect(newState.nextShapes[2].shape).toEqual(newShapes[2]);
  });
});