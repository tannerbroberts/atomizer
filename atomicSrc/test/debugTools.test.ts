import { describe, it, expect } from 'vitest';
import { tetrixReducer, initialState } from '../main/App/reducers';
import type { TilesSet } from '../main/App/types/core';

// Helper to get tile data from TilesSet
function getTileData(tiles: TilesSet, row: number, column: number) {
  return tiles.get(`R${row}C${column}`);
}

// Helper to count filled tiles
function countFilledTiles(tiles: TilesSet): number {
  let count = 0;
  for (const tileData of tiles.values()) {
    if (tileData.block.isFilled) count++;
  }
  return count;
}

describe('Debug Tools', () => {
  describe('DEBUG_ADD_BLOCK', () => {
    it('should add a block at the specified location', () => {
      const location = { row: 5, column: 5 };

      // Verify initial state has no block
      const initialTile = getTileData(initialState.tiles, location.row, location.column);
      expect(initialTile?.block.isFilled).toBe(false);

      // Add block
      const newState = tetrixReducer(initialState, {
        type: 'DEBUG_ADD_BLOCK',
        value: { location, color: 'blue' },
      });

      // Verify block was added
      const updatedTile = getTileData(newState.tiles, location.row, location.column);
      expect(updatedTile?.block.isFilled).toBe(true);
      expect(updatedTile?.block.color).toBe('blue');
    });

    it('should overwrite existing blocks', () => {
      const location = { row: 3, column: 3 };

      // Add red block first
      const stateWithRedBlock = tetrixReducer(initialState, {
        type: 'DEBUG_ADD_BLOCK',
        value: { location, color: 'red' },
      });

      // Add green block over it
      const stateWithGreenBlock = tetrixReducer(stateWithRedBlock, {
        type: 'DEBUG_ADD_BLOCK',
        value: { location, color: 'green' },
      });

      const finalTile = getTileData(stateWithGreenBlock.tiles, location.row, location.column);
      expect(finalTile?.block.isFilled).toBe(true);
      expect(finalTile?.block.color).toBe('green');
    });
  });

  describe('Integration with existing debug tools', () => {
    it('should work with multiple debug tools', () => {
      // Add a few blocks
      let state = tetrixReducer(initialState, {
        type: 'DEBUG_ADD_BLOCK',
        value: { location: { row: 5, column: 5 }, color: 'blue' },
      });

      // Fill a row (excluding position)
      state = tetrixReducer(state, {
        type: 'DEBUG_FILL_ROW',
        value: { row: 3, excludeColumn: 5, color: 'red' },
      });

      // Count filled tiles
      const filledAfterFill = countFilledTiles(state.tiles);
      expect(filledAfterFill).toBe(10); // 1 from add + 9 from fill row

      // Remove a block
      state = tetrixReducer(state, {
        type: 'DEBUG_REMOVE_BLOCK',
        value: { location: { row: 5, column: 5 } },
      });

      // Verify block was removed
      const filledAfterRemove = countFilledTiles(state.tiles);
      expect(filledAfterRemove).toBe(9);

      // Add blocks again
      state = tetrixReducer(state, {
        type: 'DEBUG_ADD_BLOCK',
        value: { location: { row: 1, column: 1 }, color: 'yellow' },
      });

      const filledFinal = countFilledTiles(state.tiles);
      expect(filledFinal).toBe(10);
    });
  });
});
