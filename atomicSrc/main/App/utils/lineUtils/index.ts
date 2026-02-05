import type { TilesSet, Tile } from '../../types/core';

const GRID_SIZE = 10;

// Helper to create tile key
function makeTileKey(row: number, column: number): string {
  return `R${row}C${column}`;
}

/**
 * Checks if a specific row is completely filled with blocks
 * @param tiles - All tiles in the grid (Map)
 * @param row - The row number to check (1-indexed)
 * @returns true if all 10 tiles in the row have isFilled = true
 */
export function isRowFull(tiles: TilesSet, row: number): boolean {
  for (let column = 1; column <= GRID_SIZE; column++) {
    const tile = tiles.get(makeTileKey(row, column));
    if (!tile || !tile.block.isFilled) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a specific column is completely filled with blocks
 * @param tiles - All tiles in the grid (Map)
 * @param column - The column number to check (1-indexed)
 * @returns true if all 10 tiles in the column have isFilled = true
 */
export function isColumnFull(tiles: TilesSet, column: number): boolean {
  for (let row = 1; row <= GRID_SIZE; row++) {
    const tile = tiles.get(makeTileKey(row, column));
    if (!tile || !tile.block.isFilled) {
      return false;
    }
  }
  return true;
}

/**
 * Finds all full rows in the grid
 * @param tiles - All tiles in the grid (Map)
 * @returns Array of row numbers that are completely filled (1-indexed)
 */
export function findFullRows(tiles: TilesSet): number[] {
  const fullRows: number[] = [];
  for (let row = 1; row <= GRID_SIZE; row++) {
    if (isRowFull(tiles, row)) {
      fullRows.push(row);
    }
  }
  return fullRows;
}

/**
 * Finds all full columns in the grid
 * @param tiles - All tiles in the grid (Map)
 * @returns Array of column numbers that are completely filled (1-indexed)
 */
export function findFullColumns(tiles: TilesSet): number[] {
  const fullColumns: number[] = [];
  for (let column = 1; column <= GRID_SIZE; column++) {
    if (isColumnFull(tiles, column)) {
      fullColumns.push(column);
    }
  }
  return fullColumns;
}

/**
 * Clears (empties) all tiles in the specified rows
 * @param tiles - All tiles in the grid (Map)
 * @param rows - Array of row numbers to clear (1-indexed)
 * @returns New tiles Map with specified rows cleared
 */
export function clearRows(tiles: TilesSet, rows: number[]): TilesSet {
  if (rows.length === 0) return tiles;

  const newTiles = new Map(tiles);
  const rowSet = new Set(rows);

  for (let row = 1; row <= GRID_SIZE; row++) {
    if (rowSet.has(row)) {
      for (let column = 1; column <= GRID_SIZE; column++) {
        const position = makeTileKey(row, column);
        const tile = newTiles.get(position);
        if (tile) {
          newTiles.set(position, {
            ...tile,
            block: { isFilled: false, color: 'grey' },
          });
        } else {
          const newTile: Tile = {
            position,
            backgroundColor: 'grey',
            block: { isFilled: false, color: 'grey' },
            activeAnimations: [],
          };
          newTiles.set(position, newTile);
        }
      }
    }
  }

  return newTiles;
}

/**
 * Clears (empties) all tiles in the specified columns
 * @param tiles - All tiles in the grid (Map)
 * @param columns - Array of column numbers to clear (1-indexed)
 * @returns New tiles Map with specified columns cleared
 */
export function clearColumns(tiles: TilesSet, columns: number[]): TilesSet {
  if (columns.length === 0) return tiles;

  const newTiles = new Map(tiles);
  const columnSet = new Set(columns);

  for (let column = 1; column <= GRID_SIZE; column++) {
    if (columnSet.has(column)) {
      for (let row = 1; row <= GRID_SIZE; row++) {
        const position = makeTileKey(row, column);
        const tile = newTiles.get(position);
        if (tile) {
          newTiles.set(position, {
            ...tile,
            block: { isFilled: false, color: 'grey' },
          });
        } else {
          const newTile: Tile = {
            position,
            backgroundColor: 'grey',
            block: { isFilled: false, color: 'grey' },
            activeAnimations: [],
          };
          newTiles.set(position, newTile);
        }
      }
    }
  }

  return newTiles;
}

/**
 * Checks if a line (row or column) has a uniform color
 * @param tiles - All tiles in the grid (Map)
 * @param index - The row or column index (1-indexed)
 * @param isRow - True if checking a row, false for a column
 * @returns The color if uniform, otherwise undefined
 */
function getLineColor(tiles: TilesSet, index: number, isRow: boolean): string | undefined {
  let firstColor: string | undefined;

  for (let i = 1; i <= GRID_SIZE; i++) {
    const row = isRow ? index : i;
    const col = isRow ? i : index;
    const tile = tiles.get(makeTileKey(row, col));

    if (!tile || !tile.block.isFilled) return undefined;

    if (!firstColor) {
      firstColor = tile.block.color;
    } else if (tile.block.color !== firstColor) {
      return undefined;
    }
  }

  return firstColor;
}

export type ClearedLine = {
  index: number;
  color?: string;
};

/**
 * Checks if the entire grid (all 100 tiles) is completely empty
 * Used to detect when all tiles have been cleared (full board clear)
 * @param tiles - All tiles in the grid (Map)
 * @returns true if all tiles are empty (not filled)
 */
export function isGridCompletelyEmpty(tiles: TilesSet): boolean {
  for (let row = 1; row <= GRID_SIZE; row++) {
    for (let column = 1; column <= GRID_SIZE; column++) {
      const tile = tiles.get(makeTileKey(row, column));
      if (tile?.block.isFilled) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Finds and clears all full lines (both rows and columns) in the grid
 * This is the main function to call after placing a shape
 * @param tiles - All tiles in the grid (Map)
 * @returns Object containing the new tiles Map and info about what was cleared
 */
export function clearFullLines(tiles: TilesSet): {
  tiles: TilesSet;
  clearedRows: ClearedLine[];
  clearedColumns: ClearedLine[];
  totalLinesCleared: number;
} {
  const fullRows = findFullRows(tiles);
  const fullColumns = findFullColumns(tiles);

  const clearedRowsWithColor = fullRows.map((row) => ({
    index: row,
    color: getLineColor(tiles, row, true),
  }));

  const clearedColumnsWithColor = fullColumns.map((col) => ({
    index: col,
    color: getLineColor(tiles, col, false),
  }));

  // Clear rows first, then columns
  let newTiles = clearRows(tiles, fullRows);
  newTiles = clearColumns(newTiles, fullColumns);

  return {
    tiles: newTiles,
    clearedRows: clearedRowsWithColor,
    clearedColumns: clearedColumnsWithColor,
    totalLinesCleared: fullRows.length + fullColumns.length,
  };
}
