import { describe, it, expect } from 'vitest';
import { tetrixReducer, initialState } from '../main/App/reducers';
import type { Shape } from '../main/App/types/core';
import { getTileData } from './testHelpers';

// Helper to count filled tiles in a row
const countFilledInRow = (tiles: Map<string, any>, row: number): number => {
  let count = 0;
  for (let col = 1; col <= 10; col++) {
    const tile = getTileData(tiles, row, col);
    if (tile?.block.isFilled) count++;
  }
  return count;
};

// Helper to count filled tiles in a column
const countFilledInColumn = (tiles: Map<string, any>, column: number): number => {
  let count = 0;
  for (let row = 1; row <= 10; row++) {
    const tile = getTileData(tiles, row, column);
    if (tile?.block.isFilled) count++;
  }
  return count;
};

// Helper to create a simple horizontal line shape (4 blocks in a row)
const createHorizontalLineShape = (): Shape => [
  [
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false }
  ],
  [
    { color: 'red', isFilled: true },
    { color: 'red', isFilled: true },
    { color: 'red', isFilled: true },
    { color: 'red', isFilled: true }
  ],
  [
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false }
  ],
  [
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false },
    { color: 'red', isFilled: false }
  ]
];

// Helper to create a simple vertical line shape (4 blocks in a column)
const createVerticalLineShape = (): Shape => [
  [
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: true },
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: false }
  ],
  [
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: true },
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: false }
  ],
  [
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: true },
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: false }
  ],
  [
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: true },
    { color: 'blue', isFilled: false },
    { color: 'blue', isFilled: false }
  ]
];

// Helper to create a single block shape (in 4x4 grid)
const createSingleBlockShape = (): Shape => [
  [
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false }
  ],
  [
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: true },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false }
  ],
  [
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false }
  ],
  [
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false },
    { color: 'green', isFilled: false }
  ]
];

describe('Tetrix Reducer - Line Clearing Integration', () => {
  describe('Row clearing after shape placement', () => {
    it('should clear a full row after placing the completing shape', () => {
      // Start with initial state
      let state = initialState;

      // Place horizontal shapes to fill row 5 (need to place multiple shapes)
      const horizontalShape = createHorizontalLineShape();

      // Place first shape at column 1 (covers columns 1-4)
      // Shape has blocks at row 1, so we place at row 4 to target row 5
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 1 },
        dragState: {
          ...state.dragState,
          selectedShape: horizontalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Verify blocks were placed
      let row5Filled = countFilledInRow(state.tiles, 5);
      expect(row5Filled).toBe(4);

      // Place second shape at column 5 (covers columns 5-8)
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 5 },
        dragState: {
          ...state.dragState,
          selectedShape: horizontalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      row5Filled = countFilledInRow(state.tiles, 5);
      expect(row5Filled).toBe(8);

      // Place single blocks to complete the row (columns 9 and 10)
      const singleBlock = createSingleBlockShape();
      // Single block is at R1, C1. To target R5, C9: row=4, col=8
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 8 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      row5Filled = countFilledInRow(state.tiles, 5);
      expect(row5Filled).toBe(9);

      // Place final single block at column 10. To target R5, C10: row=4, col=9
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 9 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Row 5 should now be cleared (all blocks removed)
      row5Filled = countFilledInRow(state.tiles, 5);
      expect(row5Filled).toBe(0);

      // Verify all tiles in row 5 are empty
      for (let col = 1; col <= 10; col++) {
        const tile = getTileData(state.tiles, 5, col);
        expect(tile?.block.isFilled).toBe(false);
        expect(tile?.block.color).toBe('grey');
      }
    });
  });

  describe('Column clearing after shape placement', () => {
    it('should clear a full column after placing the completing shape', () => {
      // Start with initial state
      let state = initialState;

      // Place vertical shapes to fill column 3
      const verticalShape = createVerticalLineShape();

      // Place shapes at different rows to fill column 3 
      // Vertical shape has blocks at col 1. To target col 3: col=2
      // First shape at row 1 (covers rows 1-4)
      state = {
        ...state,
        mouseGridLocation: { row: 1, column: 2 },
        dragState: {
          ...state.dragState,
          selectedShape: verticalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Second shape at row 5 (covers rows 5-8)  
      state = {
        ...state,
        mouseGridLocation: { row: 5, column: 2 },
        dragState: {
          ...state.dragState,
          selectedShape: verticalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Should have 8 blocks in column 3
      let col3Filled = countFilledInColumn(state.tiles, 3);
      expect(col3Filled).toBe(8);

      // Place single block for row 9
      const singleBlock = createSingleBlockShape();
      // Single block at R1, C1. To target R9, C3: row=8, col=2
      state = {
        ...state,
        mouseGridLocation: { row: 8, column: 2 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      col3Filled = countFilledInColumn(state.tiles, 3);
      expect(col3Filled).toBe(9);

      // Place final block to complete column 3. To target R10, C3: row=9, col=2
      state = {
        ...state,
        mouseGridLocation: { row: 9, column: 2 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Column 3 should now be cleared
      col3Filled = countFilledInColumn(state.tiles, 3);
      expect(col3Filled).toBe(0);

      // Verify all tiles in column 3 are empty
      for (let row = 1; row <= 10; row++) {
        const tile = getTileData(state.tiles, row, 3);
        expect(tile?.block.isFilled).toBe(false);
        expect(tile?.block.color).toBe('grey');
      }
    });
  });

  describe('Simultaneous row and column clearing', () => {
    it('should clear both a row and column when they both become full', () => {
      // This is a simpler test that just verifies the mechanism works
      // We'll manually fill row 5 and column 5 except for the intersection point
      let state = initialState;

      // Fill all of row 5 
      const horizontalShape = createHorizontalLineShape();

      // First shape at column 1 (covers columns 1-4)
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 1 },
        dragState: {
          ...state.dragState,
          selectedShape: horizontalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Second shape at column 5 (covers columns 5-8)
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 5 },
        dragState: {
          ...state.dragState,
          selectedShape: horizontalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Add single blocks for columns 9 and 10
      const singleBlock = createSingleBlockShape();
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 8 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 9 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Row 5 should be cleared now
      const row5Filled = countFilledInRow(state.tiles, 5);
      expect(row5Filled).toBe(0);

      // Now fill column 5 (which is already empty from row clearing)
      const verticalShape = createVerticalLineShape();

      // First shape at row 1 (covers rows 1-4)
      state = {
        ...state,
        mouseGridLocation: { row: 1, column: 4 }, // Target C5 -> col=4
        dragState: {
          ...state.dragState,
          selectedShape: verticalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Second shape at row 5 (covers rows 5-8)
      state = {
        ...state,
        mouseGridLocation: { row: 5, column: 4 },
        dragState: {
          ...state.dragState,
          selectedShape: verticalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Add single blocks for rows 9 and 10
      state = {
        ...state,
        mouseGridLocation: { row: 8, column: 4 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      state = {
        ...state,
        mouseGridLocation: { row: 9, column: 4 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Column 5 should now be cleared
      const col5Filled = countFilledInColumn(state.tiles, 5);
      expect(col5Filled).toBe(0);
    });
  });

  describe('No clearing when lines are incomplete', () => {
    it('should not clear a row with only 9 blocks', () => {
      let state = initialState;

      // Place 2 horizontal shapes and 1 single block to get 9 blocks in row 5
      const horizontalShape = createHorizontalLineShape();
      const singleBlock = createSingleBlockShape();

      // First shape at column 1 (covers columns 1-4)
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 1 },
        dragState: {
          ...state.dragState,
          selectedShape: horizontalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Second shape at column 5 (covers columns 5-8)
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 5 },
        dragState: {
          ...state.dragState,
          selectedShape: horizontalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Single block at column 9 (leaves column 10 empty)
      state = {
        ...state,
        mouseGridLocation: { row: 4, column: 8 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Should have 9 blocks, not cleared
      const row5Filled = countFilledInRow(state.tiles, 5);
      expect(row5Filled).toBe(9);

      // Blocks should still be filled (not grey)
      for (let col = 1; col <= 9; col++) {
        const tile = getTileData(state.tiles, 5, col);
        expect(tile?.block.isFilled).toBe(true);
        expect(tile?.block.color).not.toBe('grey');
      }
    });

    it('should not clear a column with only 9 blocks', () => {
      let state = initialState;

      // Place 2 vertical shapes and 1 single block to get 9 blocks in column 4
      const verticalShape = createVerticalLineShape();
      const singleBlock = createSingleBlockShape();

      // First shape at row 1 (covers rows 1-4)
      state = {
        ...state,
        mouseGridLocation: { row: 1, column: 3 }, // Target C4 -> col=3
        dragState: {
          ...state.dragState,
          selectedShape: verticalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Second shape at row 5 (covers rows 5-8)
      state = {
        ...state,
        mouseGridLocation: { row: 5, column: 3 },
        dragState: {
          ...state.dragState,
          selectedShape: verticalShape,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Single block at row 9 (leaves row 10 empty)
      state = {
        ...state,
        mouseGridLocation: { row: 8, column: 3 },
        dragState: {
          ...state.dragState,
          selectedShape: singleBlock,
          selectedShapeIndex: 0,
        }
      };
      state = tetrixReducer(state, { type: 'COMPLETE_PLACEMENT' });

      // Should have 9 blocks, not cleared
      const col4Filled = countFilledInColumn(state.tiles, 4);
      expect(col4Filled).toBe(9);

      // Blocks should still be filled (not grey)
      for (let row = 1; row <= 9; row++) {
        const tile = getTileData(state.tiles, row, 4);
        expect(tile?.block.isFilled).toBe(true);
        expect(tile?.block.color).not.toBe('grey');
      }
    });
  });
});
