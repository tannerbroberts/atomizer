import type { TilesSet } from '../../../types/core';
import { makeTileKey } from '../shapeValidation';

/**
 * Shape pattern detection - Super combo and special patterns
 */

/**
 * Detect if there's a 4x4 super combo pattern on the grid.
 * Pattern: 4 consecutive rows where each row has exactly 9 filled blocks (one missing),
 * and the missing block position increases or decreases by 1 for each row (forming a diagonal).
 * Same pattern must exist for columns.
 *
 * Supports both ascending and descending diagonal patterns:
 *
 * Ascending diagonal example (X = filled, O = empty):
 * Row 1: O X X X X X X X X X
 * Row 2: X O X X X X X X X X
 * Row 3: X X O X X X X X X X
 * Row 4: X X X O X X X X X X
 *
 * Descending diagonal example (X = filled, O = empty):
 * Row 1: X X X O X X X X X X
 * Row 2: X X O X X X X X X X
 * Row 3: X O X X X X X X X X
 * Row 4: O X X X X X X X X X
 *
 * @param tiles - Map of tiles (10x10 grid, 1-indexed)
 * @returns true if the pattern exists
 */
export function detectSuperComboPattern(tiles: TilesSet): boolean {
  // Build a 2D grid for easier pattern checking
  const grid: boolean[][] = new Array(11).fill(null).map(() => new Array(11).fill(false));

  for (let row = 1; row <= 10; row++) {
    for (let column = 1; column <= 10; column++) {
      const tile = tiles.get(makeTileKey(row, column));
      if (tile?.block.isFilled) {
        grid[row][column] = true;
      }
    }
  }

  // Check all possible 4x4 starting positions
  for (let startRow = 1; startRow <= 7; startRow++) {
    for (let startCol = 1; startCol <= 7; startCol++) {
      if (checkDiagonalPattern(grid, startRow, startCol)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a diagonal pattern exists at the given starting position
 * Checks both ascending and descending diagonal patterns
 */
function checkDiagonalPattern(grid: boolean[][], startRow: number, startCol: number): boolean {
  // Check ascending diagonal (top-left to bottom-right)
  const ascendingRowPattern = checkRowPattern(grid, startRow, startCol, true);
  const ascendingColPattern = checkColumnPattern(grid, startRow, startCol, true);

  if (ascendingRowPattern && ascendingColPattern) {
    return true;
  }

  // Check descending diagonal (top-right to bottom-left)
  const descendingRowPattern = checkRowPattern(grid, startRow, startCol, false);
  const descendingColPattern = checkColumnPattern(grid, startRow, startCol, false);

  return descendingRowPattern && descendingColPattern;
}

/**
 * Check if 4 consecutive rows have the diagonal empty pattern
 * @param ascending - true for ascending diagonal, false for descending
 */
function checkRowPattern(grid: boolean[][], startRow: number, startCol: number, ascending: boolean): boolean {
  for (let i = 0; i < 4; i++) {
    const row = startRow + i;
    const emptyCol = ascending ? startCol + i : startCol + (3 - i);

    if (!isRowValidWithEmptyAt(grid, row, emptyCol)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if 4 consecutive columns have the diagonal empty pattern
 * @param ascending - true for ascending diagonal, false for descending
 */
function checkColumnPattern(grid: boolean[][], startRow: number, startCol: number, ascending: boolean): boolean {
  for (let i = 0; i < 4; i++) {
    const col = startCol + i;
    const emptyRow = ascending ? startRow + i : startRow + (3 - i);

    if (!isColumnValidWithEmptyAt(grid, col, emptyRow)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a row has exactly 9 filled blocks with empty at specified column
 */
function isRowValidWithEmptyAt(grid: boolean[][], row: number, emptyCol: number): boolean {
  let filledCount = 0;
  let hasEmptyAtPosition = false;

  for (let col = 1; col <= 10; col++) {
    if (grid[row][col]) {
      filledCount++;
    } else if (col === emptyCol) {
      hasEmptyAtPosition = true;
    }
  }

  return filledCount === 9 && hasEmptyAtPosition;
}

/**
 * Check if a column has exactly 9 filled blocks with empty at specified row
 */
function isColumnValidWithEmptyAt(grid: boolean[][], col: number, emptyRow: number): boolean {
  let filledCount = 0;
  let hasEmptyAtPosition = false;

  for (let row = 1; row <= 10; row++) {
    if (grid[row][col]) {
      filledCount++;
    } else if (row === emptyRow) {
      hasEmptyAtPosition = true;
    }
  }

  return filledCount === 9 && hasEmptyAtPosition;
}
