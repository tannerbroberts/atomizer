import { describe, it, expect } from 'vitest';
import {
  isRowFull,
  isColumnFull,
  findFullRows,
  findFullColumns,
  clearRows,
  clearColumns,
  clearFullLines
} from '../main/App/utils/lineUtils';
import type { TilesSet, ColorName } from '../main/App/types/core';
import {
  createTilesWithFilled,
  getTileData,
  countFilledTiles,
  isRowFull as testIsRowFull,
  isColumnFull as testIsColumnFull
} from './testHelpers';

// Helper to create a full grid of empty tiles
const createEmptyGrid = (): TilesSet => {
  return createTilesWithFilled([]);
};

describe('Line Clearing Utilities', () => {
  describe('isRowFull', () => {
    it('should return true when all 10 tiles in a row are filled', () => {
      const positions = [];
      // Fill row 5
      for (let column = 1; column <= 10; column++) {
        positions.push({ row: 5, column, color: 'red' as ColorName });
      }
      const tiles = createTilesWithFilled(positions);

      expect(isRowFull(tiles, 5)).toBe(true);
    });

    it('should return false when a row is not completely filled', () => {
      const positions = [];
      // Fill row 5 except for one tile
      for (let column = 1; column <= 10; column++) {
        if (column !== 5) {
          positions.push({ row: 5, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      expect(isRowFull(tiles, 5)).toBe(false);
    });

    it('should return false for an empty row', () => {
      const tiles = createEmptyGrid();
      expect(isRowFull(tiles, 1)).toBe(false);
    });
  });

  describe('isColumnFull', () => {
    it('should return true when all 10 tiles in a column are filled', () => {
      const positions = [];
      // Fill column 3
      for (let row = 1; row <= 10; row++) {
        positions.push({ row, column: 3, color: 'red' as ColorName });
      }
      const tiles = createTilesWithFilled(positions);

      expect(isColumnFull(tiles, 3)).toBe(true);
    });

    it('should return false when a column is not completely filled', () => {
      const positions = [];
      // Fill column 3 except for one tile
      for (let row = 1; row <= 10; row++) {
        if (row !== 7) {
          positions.push({ row, column: 3, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      expect(isColumnFull(tiles, 3)).toBe(false);
    });

    it('should return false for an empty column', () => {
      const tiles = createEmptyGrid();
      expect(isColumnFull(tiles, 1)).toBe(false);
    });
  });

  describe('findFullRows', () => {
    it('should find all full rows', () => {
      const positions = [];
      // Fill rows 2, 5, and 9
      for (const row of [2, 5, 9]) {
        for (let column = 1; column <= 10; column++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const fullRows = findFullRows(tiles);
      expect(fullRows).toEqual([2, 5, 9]);
    });

    it('should return empty array when no rows are full', () => {
      const tiles = createEmptyGrid();
      expect(findFullRows(tiles)).toEqual([]);
    });
  });

  describe('findFullColumns', () => {
    it('should find all full columns', () => {
      const positions = [];
      // Fill columns 1, 4, and 10
      for (const column of [1, 4, 10]) {
        for (let row = 1; row <= 10; row++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const fullColumns = findFullColumns(tiles);
      expect(fullColumns).toEqual([1, 4, 10]);
    });

    it('should return empty array when no columns are full', () => {
      const tiles = createEmptyGrid();
      expect(findFullColumns(tiles)).toEqual([]);
    });
  });

  describe('clearRows', () => {
    it('should clear specified rows', () => {
      const positions = [];
      // Fill rows 2 and 5
      for (const row of [2, 5]) {
        for (let column = 1; column <= 10; column++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const clearedTiles = clearRows(tiles, [2, 5]);

      // Check that rows 2 and 5 are now empty
      expect(testIsRowFull(clearedTiles, 2)).toBe(false);
      expect(testIsRowFull(clearedTiles, 5)).toBe(false);

      // Verify all tiles in those rows are empty
      for (let column = 1; column <= 10; column++) {
        const tile2 = getTileData(clearedTiles, 2, column);
        const tile5 = getTileData(clearedTiles, 5, column);
        expect(tile2?.block.isFilled).toBe(false);
        expect(tile5?.block.isFilled).toBe(false);
        expect(tile2?.block.color).toBe('grey');
        expect(tile5?.block.color).toBe('grey');
      }
    });

    it('should not modify other rows', () => {
      const positions = [];
      // Fill rows 2 and 7
      for (const row of [2, 7]) {
        for (let column = 1; column <= 10; column++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const clearedTiles = clearRows(tiles, [2]);

      // Row 7 should still be filled
      expect(testIsRowFull(clearedTiles, 7)).toBe(true);
    });

    it('should return unchanged tiles when clearing empty array', () => {
      const tiles = createEmptyGrid();
      const clearedTiles = clearRows(tiles, []);
      expect(clearedTiles).toBe(tiles);
    });
  });

  describe('clearColumns', () => {
    it('should clear specified columns', () => {
      const positions = [];
      // Fill columns 3 and 8
      for (const column of [3, 8]) {
        for (let row = 1; row <= 10; row++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const clearedTiles = clearColumns(tiles, [3, 8]);

      // Check that columns 3 and 8 are now empty
      expect(testIsColumnFull(clearedTiles, 3)).toBe(false);
      expect(testIsColumnFull(clearedTiles, 8)).toBe(false);

      // Verify all tiles in those columns are empty
      for (let row = 1; row <= 10; row++) {
        const tile3 = getTileData(clearedTiles, row, 3);
        const tile8 = getTileData(clearedTiles, row, 8);
        expect(tile3?.block.isFilled).toBe(false);
        expect(tile8?.block.isFilled).toBe(false);
        expect(tile3?.block.color).toBe('grey');
        expect(tile8?.block.color).toBe('grey');
      }
    });

    it('should not modify other columns', () => {
      const positions = [];
      // Fill columns 3 and 6
      for (const column of [3, 6]) {
        for (let row = 1; row <= 10; row++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const clearedTiles = clearColumns(tiles, [3]);

      // Column 6 should still be filled
      expect(testIsColumnFull(clearedTiles, 6)).toBe(true);
    });

    it('should return unchanged tiles when clearing empty array', () => {
      const tiles = createEmptyGrid();
      const clearedTiles = clearColumns(tiles, []);
      expect(clearedTiles).toBe(tiles);
    });
  });

  describe('clearFullLines', () => {
    it('should clear both full rows and columns', () => {
      const positions = [];
      // Fill row 5 and column 3
      for (let column = 1; column <= 10; column++) {
        positions.push({ row: 5, column, color: 'red' as ColorName });
      }
      for (let row = 1; row <= 10; row++) {
        positions.push({ row, column: 3, color: 'blue' as ColorName });
      }
      const tiles = createTilesWithFilled(positions);

      const result = clearFullLines(tiles);

      // Row 5 is mixed (mostly red, but (5,3) is blue)
      expect(result.clearedRows).toEqual([{ index: 5, color: undefined }]);
      // Column 3 is all blue
      expect(result.clearedColumns).toEqual([{ index: 3, color: 'blue' }]);
      expect(result.totalLinesCleared).toBe(2);

      // Check that row 5 and column 3 are cleared
      expect(testIsRowFull(result.tiles, 5)).toBe(false);
      expect(testIsColumnFull(result.tiles, 3)).toBe(false);
    });

    it('should handle intersecting row and column clears', () => {
      const positions = [];
      // Fill entire grid
      for (let row = 1; row <= 10; row++) {
        for (let column = 1; column <= 10; column++) {
          positions.push({ row, column, color: 'red' as ColorName });
        }
      }
      const tiles = createTilesWithFilled(positions);

      const result = clearFullLines(tiles);

      // All rows and columns are full red
      const expectedRows = Array.from({ length: 10 }, (_, i) => ({ index: i + 1, color: 'red' }));
      const expectedCols = Array.from({ length: 10 }, (_, i) => ({ index: i + 1, color: 'red' }));

      expect(result.clearedRows).toEqual(expectedRows);
      expect(result.clearedColumns).toEqual(expectedCols);
      expect(result.totalLinesCleared).toBe(20);

      // All tiles should be cleared
      expect(countFilledTiles(result.tiles)).toBe(0);
    });

    it('should return unchanged tiles when no lines are full', () => {
      const tiles = createEmptyGrid();

      const result = clearFullLines(tiles);

      expect(result.clearedRows).toEqual([]);
      expect(result.clearedColumns).toEqual([]);
      expect(result.totalLinesCleared).toBe(0);
      expect(result.tiles).toBe(tiles);
    });
  });
});
