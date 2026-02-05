import { describe, it, expect } from 'vitest';
import { detectSuperComboPattern } from '../main/App/utils/shapes/shapePatterns';
import type { TilesSet, ColorName } from '../main/App/types/core';
import { createTilesWithFilled } from './testHelpers';

/**
 * Helper to create a 10x10 grid with all tiles empty
 */
function createEmptyGrid(): TilesSet {
  return createTilesWithFilled([]);
}

describe('Diagonal Pattern Detection', () => {
  describe('Ascending Diagonal Pattern', () => {
    it('should detect ascending diagonal pattern starting at (4,4)', () => {
      const positions = [];

      // Create ascending diagonal pattern:
      // Row 4: empty at col 4, filled everywhere else
      // Row 5: empty at col 5, filled everywhere else
      // Row 6: empty at col 6, filled everywhere else
      // Row 7: empty at col 7, filled everywhere else
      // Same for columns 4-7

      // Fill rows 4-7 (except diagonal)
      for (let row = 4; row <= 7; row++) {
        for (let col = 1; col <= 10; col++) {
          const isOnDiagonal = (row >= 4 && row <= 7 && col >= 4 && col <= 7 && (row - 4) === (col - 4));
          if (!isOnDiagonal) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      // Fill columns 4-7 (except diagonal)
      for (let col = 4; col <= 7; col++) {
        for (let row = 1; row <= 10; row++) {
          const isOnDiagonal = (row >= 4 && row <= 7 && col >= 4 && col <= 7 && (row - 4) === (col - 4));
          // Skip if already added or on diagonal
          const alreadyAdded = row >= 4 && row <= 7 && !isOnDiagonal;
          if (!isOnDiagonal && !alreadyAdded) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      const tiles = createTilesWithFilled(positions);
      expect(detectSuperComboPattern(tiles)).toBe(true);
    });

    it('should detect ascending diagonal pattern starting at (1,1)', () => {
      const positions = [];

      // Create ascending diagonal at top-left corner
      // Rows 1-4, columns 1-4
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 10; col++) {
          const isOnDiagonal = (row >= 1 && row <= 4 && col >= 1 && col <= 4 && (row - 1) === (col - 1));
          if (!isOnDiagonal) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      for (let col = 1; col <= 4; col++) {
        for (let row = 1; row <= 10; row++) {
          const isOnDiagonal = (row >= 1 && row <= 4 && col >= 1 && col <= 4 && (row - 1) === (col - 1));
          const alreadyAdded = row >= 1 && row <= 4 && !isOnDiagonal;
          if (!isOnDiagonal && !alreadyAdded) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      const tiles = createTilesWithFilled(positions);
      expect(detectSuperComboPattern(tiles)).toBe(true);
    });
  });

  describe('Descending Diagonal Pattern', () => {
    it('should detect descending diagonal pattern at (4,4)-(7,7)', () => {
      const positions = [];

      // Create descending diagonal pattern:
      // Row 4: empty at col 7
      // Row 5: empty at col 6
      // Row 6: empty at col 5
      // Row 7: empty at col 4
      // Descending diagonal check: (row + col) === 11
      // (4,7): 4+7=11 ✓
      // (5,6): 5+6=11 ✓
      // (6,5): 6+5=11 ✓
      // (7,4): 7+4=11 ✓

      // Fill rows 4-7 (except descending diagonal)
      for (let row = 4; row <= 7; row++) {
        for (let col = 1; col <= 10; col++) {
          const isOnDescendingDiagonal = (row >= 4 && row <= 7 && col >= 4 && col <= 7 && (row + col) === 11);
          if (!isOnDescendingDiagonal) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      // Fill columns 4-7 (except descending diagonal)
      for (let col = 4; col <= 7; col++) {
        for (let row = 1; row <= 10; row++) {
          const isOnDescendingDiagonal = (row >= 4 && row <= 7 && col >= 4 && col <= 7 && (row + col) === 11);
          const alreadyAdded = row >= 4 && row <= 7 && !isOnDescendingDiagonal;
          if (!isOnDescendingDiagonal && !alreadyAdded) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      const tiles = createTilesWithFilled(positions);
      expect(detectSuperComboPattern(tiles)).toBe(true);
    });

    it('should detect descending diagonal pattern starting at (1,4)', () => {
      const positions = [];

      // Create descending diagonal at top-right area
      // Rows 1-4, columns 1-4
      // Descending: row 1 empty at col 4, row 2 empty at col 3, etc.
      // Check: (row + col) === 5
      // (1,4): 1+4=5 ✓
      // (2,3): 2+3=5 ✓
      // (3,2): 3+2=5 ✓
      // (4,1): 4+1=5 ✓

      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 10; col++) {
          const isOnDescendingDiagonal = (row >= 1 && row <= 4 && col >= 1 && col <= 4 && (row + col) === 5);
          if (!isOnDescendingDiagonal) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      for (let col = 1; col <= 4; col++) {
        for (let row = 1; row <= 10; row++) {
          const isOnDescendingDiagonal = (row >= 1 && row <= 4 && col >= 1 && col <= 4 && (row + col) === 5);
          const alreadyAdded = row >= 1 && row <= 4 && !isOnDescendingDiagonal;
          if (!isOnDescendingDiagonal && !alreadyAdded) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      const tiles = createTilesWithFilled(positions);
      expect(detectSuperComboPattern(tiles)).toBe(true);
    });
  });

  describe('No Pattern Cases', () => {
    it('should not detect pattern when grid is empty', () => {
      const tiles = createEmptyGrid();
      expect(detectSuperComboPattern(tiles)).toBe(false);
    });

    it('should not detect pattern when diagonal positions are filled', () => {
      const positions = [];

      // Fill everything including diagonal - this breaks the pattern
      for (let row = 4; row <= 7; row++) {
        for (let col = 1; col <= 10; col++) {
          positions.push({ row, column: col, color: 'blue' as ColorName });
        }
      }

      for (let col = 4; col <= 7; col++) {
        for (let row = 1; row <= 10; row++) {
          // Skip already added
          if (row < 4 || row > 7) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      const tiles = createTilesWithFilled(positions);
      expect(detectSuperComboPattern(tiles)).toBe(false);
    });

    it('should not detect pattern with incomplete rows', () => {
      const positions = [];

      // Only fill some rows, not all required for the pattern
      for (let row = 4; row <= 5; row++) { // Only 2 rows instead of 4
        for (let col = 1; col <= 10; col++) {
          const isOnDiagonal = (row >= 4 && row <= 7 && col >= 4 && col <= 7 && (row - 4) === (col - 4));
          if (!isOnDiagonal) {
            positions.push({ row, column: col, color: 'blue' as ColorName });
          }
        }
      }

      const tiles = createTilesWithFilled(positions);
      expect(detectSuperComboPattern(tiles)).toBe(false);
    });
  });
});
