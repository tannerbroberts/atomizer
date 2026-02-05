import { expect, test, describe } from 'vitest';
import { tetrixReducer, initialState } from '../main/App/reducers';
import { generateRandomShape } from '../main/App/utils/shapes/shapeGeneration';

describe('Debug Actions for Shape Management', () => {
  test('ADD_SHAPE_OPTION adds a new shape to existing shapes', () => {
    const testShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, true, false],
      shapeOptionBounds: [null, null, null],
    };

    const newState = tetrixReducer(state, {
      type: 'ADD_SHAPE_OPTION'
    });

    // Should have one more shape
    expect(newState.nextShapes.length).toBe(4);

    // All original shapes should still be there
    expect(newState.nextShapes[0]).toBe(testShapes[0]);
    expect(newState.nextShapes[1]).toBe(testShapes[1]);
    expect(newState.nextShapes[2]).toBe(testShapes[2]);

    // New shape should be added at the end
    expect(newState.nextShapes[3]).toBeDefined();
    expect(newState.nextShapes[3]).not.toBe(testShapes[0]);

    // Rotation menus should be extended
    expect(newState.openRotationMenus).toEqual([false, true, false, false]);

    // Bounds should be extended
    expect(newState.shapeOptionBounds).toEqual([null, null, null, null]);
  });

  test('REMOVE_SHAPE_OPTION removes the last shape when above 1 shape', () => {
    const testShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, true, true, false],
      shapeOptionBounds: [null, null, null, null],
    };

    const newState = tetrixReducer(state, {
      type: 'REMOVE_SHAPE_OPTION'
    });

    // Should have one fewer shape
    expect(newState.nextShapes.length).toBe(3);

    // First three shapes should still be there
    expect(newState.nextShapes[0]).toBe(testShapes[0]);
    expect(newState.nextShapes[1]).toBe(testShapes[1]);
    expect(newState.nextShapes[2]).toBe(testShapes[2]);

    // Last shape should be removed
    expect(newState.nextShapes[3]).toBeUndefined();

    // Arrays should be truncated
    expect(newState.openRotationMenus).toEqual([false, true, true]);
    expect(newState.shapeOptionBounds).toEqual([null, null, null]);
  });

  test('REMOVE_SHAPE_OPTION does not remove when at 1 shape (minimum)', () => {
    const testShapes = [generateRandomShape()];

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false],
      shapeOptionBounds: [null],
    };

    const newState = tetrixReducer(state, {
      type: 'REMOVE_SHAPE_OPTION'
    });

    // Should not change - still 1 shape
    expect(newState.nextShapes.length).toBe(1);
    expect(newState).toEqual(state); // No changes at all
  });

  test('REMOVE_SHAPE_OPTION clears selection when removing selected shape', () => {
    const testShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, false, false],
      shapeOptionBounds: [null, null, null],
      dragState: {
        ...initialState.dragState,
        selectedShape: testShapes[2],
        selectedShapeIndex: 2,
        phase: 'dragging' as const,
        hoveredBlockPositions: [{ location: { row: 1, column: 1 }, block: testShapes[2][0][0] }],
      },
    };

    const newState = tetrixReducer(state, {
      type: 'REMOVE_SHAPE_OPTION'
    });

    // Should have removed the selected shape and cleared selection
    expect(newState.nextShapes.length).toBe(2);
    expect(newState.dragState.selectedShape).toBe(null);
    expect(newState.dragState.selectedShapeIndex).toBe(null);
    expect(newState.dragState.phase).toBe('none');
    expect(newState.dragState.hoveredBlockPositions).toEqual([]);
  });

  test('REMOVE_SHAPE_OPTION preserves selection when removing non-selected shape', () => {
    const testShapes = [
      generateRandomShape(),
      generateRandomShape(),
      generateRandomShape(),
    ];

    const state = {
      ...initialState,
      nextShapes: testShapes,
      openRotationMenus: [false, false, false],
      shapeOptionBounds: [null, null, null],
      dragState: {
        ...initialState.dragState,
        selectedShape: testShapes[0],
        selectedShapeIndex: 0,
        phase: 'dragging' as const,
        hoveredBlockPositions: [{ location: { row: 1, column: 1 }, block: testShapes[0][0][0] }],
      },
    };

    const newState = tetrixReducer(state, {
      type: 'REMOVE_SHAPE_OPTION'
    });

    // Should preserve selection since we're not removing the selected shape
    expect(newState.nextShapes.length).toBe(2);
    expect(newState.dragState.selectedShape).toBe(testShapes[0]);
    expect(newState.dragState.selectedShapeIndex).toBe(0);
    expect(newState.dragState.phase).toBe('dragging');
    expect(newState.dragState.hoveredBlockPositions).toEqual([{ location: { row: 1, column: 1 }, block: testShapes[0][0][0] }]);
  });
});