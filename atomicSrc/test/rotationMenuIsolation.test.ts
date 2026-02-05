import { expect, test, describe } from 'vitest';
import { tetrixReducer, initialState } from '../main/App/reducers';
import { generateRandomShape } from '../main/App/utils/shapes/shapeGeneration';
import type { QueuedShape, Shape } from '../main/App/types/core';

// Helper functions to create QueuedShapes for tests
let testShapeIdCounter = 2000;
const createQueuedShape = (shape: Shape): QueuedShape => ({
  id: testShapeIdCounter++,
  shape,
});
const createQueuedShapes = (shapes: Shape[]): QueuedShape[] =>
  shapes.map(shape => createQueuedShape(shape));

describe('Rotation Menu Isolation', () => {
  test('COMPLETE_PLACEMENT atomically removes placed shape and adds new shape', () => {
    // Create test shapes
    const plainShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];
    const testShapes = createQueuedShapes(plainShapes);

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, true, true, false], // Shapes 1 and 2 have menus open
      dragState: {
        ...initialState.dragState,
        selectedShape: testShapes[1].shape, // Select shape at index 1
        selectedShapeIndex: 1,
      },
      mouseGridLocation: { row: 5, column: 5 }, // Valid placement location
    };

    // Two-phase animation: COMPLETE_PLACEMENT keeps all shapes + adds new one (5 total)
    // COMPLETE_SHAPE_REMOVAL will remove the placed shape after animation
    const newState = tetrixReducer(state, {
      type: 'COMPLETE_PLACEMENT'
    });

    // During animation: 5 shapes (original 4 + new one at end)
    expect(newState.nextShapes.length).toBe(5);
    // All original shapes still present during animation
    expect(newState.nextShapes[0].shape).toEqual(plainShapes[0]);
    expect(newState.nextShapes[1].shape).toEqual(plainShapes[1]); // Being removed (has .removing class)
    expect(newState.nextShapes[2].shape).toEqual(plainShapes[2]);
    expect(newState.nextShapes[3].shape).toEqual(plainShapes[3]);
    // New shape added at index 4 (clipped, will slide in)
    expect(newState.nextShapes[4].shape).not.toEqual(plainShapes[1]);

    // Removal animation is active on index 1 (shape shrinks, others slide)
    expect(newState.removingShapeIndex).toBe(1);
    expect(newState.shapeRemovalAnimationState).toBe('removing');

    // Rotation menu states preserved during animation (plus new shape)
    // Original: [false, true, true, false] for indices [0, 1, 2, 3]
    // With new shape: [false, true, true, false, false] for indices [0, 1, 2, 3, 4]
    expect(newState.openRotationMenus.length).toBe(5);
    expect(newState.openRotationMenus[0]).toBe(false);
    expect(newState.openRotationMenus[1]).toBe(true);  // Still at index 1 during animation
    expect(newState.openRotationMenus[2]).toBe(true);
    expect(newState.openRotationMenus[3]).toBe(false);
    expect(newState.openRotationMenus[4]).toBe(false); // New shape starts with menu closed

    // Selection should be cleared
    expect(newState.dragState.selectedShape).toBe(null);
    expect(newState.dragState.selectedShapeIndex).toBe(null);
  });

  test('COMPLETE_SHAPE_REMOVAL removes placed shape after animation completes', () => {
    // Create test shapes - simulating mid-animation state with 5 shapes
    const plainShapes = [
      generateRandomShape(), // index 0 
      generateRandomShape(), // index 1 (being removed)
      generateRandomShape(), // index 2
      generateRandomShape(), // index 3 
      generateRandomShape(), // index 4 (new shape)
    ];
    const testShapes = createQueuedShapes(plainShapes);

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, true, false, false, false], // 5 shapes during animation
      newShapeAnimationStates: ['none', 'none', 'none', 'none', 'none'] as const,
      shapeOptionBounds: [null, null, null, null, null],
      removingShapeIndex: 1, // Animation was tracking removal at index 1
      shapeRemovalAnimationState: 'removing' as const,
    };

    // Complete shape removal - removes the placed shape from array
    const newState = tetrixReducer(state, {
      type: 'COMPLETE_SHAPE_REMOVAL'
    });

    // After animation: back to 4 shapes (index 1 removed)
    expect(newState.nextShapes.length).toBe(4);
    expect(newState.nextShapes[0].shape).toEqual(plainShapes[0]); // Was at index 0
    expect(newState.nextShapes[1].shape).toEqual(plainShapes[2]); // Was at index 2, now at 1
    expect(newState.nextShapes[2].shape).toEqual(plainShapes[3]); // Was at index 3, now at 2
    expect(newState.nextShapes[3].shape).toEqual(plainShapes[4]); // Was at index 4, now at 3

    // Rotation menu states should be filtered (index 1 removed)
    expect(newState.openRotationMenus).toEqual([false, false, false, false]);

    // Animation should be reset
    expect(newState.removingShapeIndex).toBe(null);
    expect(newState.shapeRemovalAnimationState).toBe('none');
  });

  test('COMPLETE_PLACEMENT handles edge case when removing last shape with menu open', () => {
    const plainShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];
    const testShapes = createQueuedShapes(plainShapes);

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, true, true], // Last two shapes have menus open
      dragState: {
        ...initialState.dragState,
        selectedShape: testShapes[2].shape, // Select the last shape
        selectedShapeIndex: 2,
      },
      mouseGridLocation: { row: 5, column: 5 },
    };

    const newState = tetrixReducer(state, {
      type: 'COMPLETE_PLACEMENT'
    });

    // During animation phase: all shapes kept + new shape added = 4 shapes
    // Original shapes [0,1,2] + new shape = 4 shapes total
    expect(newState.nextShapes.length).toBe(4);
    expect(newState.removingShapeIndex).toBe(2); // The placed shape is being animated out
    
    // Rotation menus during animation: original 3 + new shape = 4
    // Original: [false, true, true] at indices 0,1,2
    // New shape added at index 3 with false
    expect(newState.openRotationMenus[0]).toBe(false); // Index 0 unchanged
    expect(newState.openRotationMenus[1]).toBe(true);  // Index 1 unchanged
    expect(newState.openRotationMenus[2]).toBe(true);  // Index 2 unchanged (still animating)
    expect(newState.openRotationMenus[3]).toBe(false); // New shape at end
    expect(newState.openRotationMenus.length).toBe(4);

    // Complete the animation - shape at index 2 is removed
    const finalState = tetrixReducer(newState, { type: 'COMPLETE_SHAPE_REMOVAL' });
    
    expect(finalState.nextShapes.length).toBe(3);
    expect(finalState.removingShapeIndex).toBeNull();
    // After removal: shapes 0,1,3 become 0,1,2
    // Original menus [false, true, true, false] -> remove index 2 -> [false, true, false]
    expect(finalState.openRotationMenus[0]).toBe(false);
    expect(finalState.openRotationMenus[1]).toBe(true);
    expect(finalState.openRotationMenus[2]).toBe(false); // New shape
    expect(finalState.openRotationMenus.length).toBe(3);
  });

  test('SPEND_COIN only affects the specific shape index', () => {
    const plainShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];
    const testShapes = createQueuedShapes(plainShapes);

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, true, false], // Only middle shape has menu open
      score: 5, // Have coins to spend
    };

    // Spend coin on first shape (index 0)
    const newState = tetrixReducer(state, {
      type: 'SPEND_COIN',
      value: {
        shapeIndex: 0,
        mousePosition: { x: 100, y: 100 }
      }
    });

    // Only the first shape's menu should be affected
    expect(newState.openRotationMenus[0]).toBe(true);  // Changed from false to true
    expect(newState.openRotationMenus[1]).toBe(true);  // Unchanged - was already true
    expect(newState.openRotationMenus[2]).toBe(false); // Unchanged - was already false
    expect(newState.score).toBe(4); // Coin spent
  });
});