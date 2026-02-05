import type { Shape, Location, TilesSet } from '../../../types/core';
import type { GameMode } from '../../../types/gameState';
import { GRID_SIZE } from '../../gridConstants';

/**
 * Shape validation functions - Placement validation and collision detection
 */

/**
 * Helper function to create a tile key from location
 */
export function makeTileKey(row: number, column: number): string {
  return `R${row}C${column}`;
}

/**
 * Check if a shape can be placed at a given location on the grid
 *
 * Gracefully handles any location values (including negative and beyond grid bounds).
 * Short-circuits to false when any filled block is out of bounds or overlapping.
 *
 * @param shape - The 4x4 shape grid
 * @param gridTopLeftLocation - Location where the 4x4 grid's top-left corner (0,0) would be placed (can be any value, even negative)
 * @param gridSize - Size of the grid (rows and columns)
 * @param tiles - Map of tile keys to tile data for checking occupancy
 * @returns true if the shape can be placed without overlapping or going out of bounds
 */
export function canPlaceShape(
  shape: Shape,
  gridTopLeftLocation: Location,
  gridSize: { rows: number; columns: number },
  tiles: TilesSet,
): boolean {
  // Iterate through all 16 tiles of the 4x4 shape
  for (let shapeRow = 0; shapeRow < 4; shapeRow++) {
    for (let shapeCol = 0; shapeCol < 4; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      // Only check filled blocks
      if (block.isFilled) {
        // Calculate the grid position for this block
        const gridRow = gridTopLeftLocation.row + shapeRow;
        const gridCol = gridTopLeftLocation.column + shapeCol;

        // Check bounds - short circuit if out of bounds
        if (
          gridRow < 1
          || gridRow > gridSize.rows
          || gridCol < 1
          || gridCol > gridSize.columns
        ) {
          return false; // Block doesn't fit
        }

        // Check if position exists and is not occupied
        const tileKey = makeTileKey(gridRow, gridCol);
        const tileData = tiles.get(tileKey);

        // Tile must exist and must not be filled
        if (!tileData) {
          return false; // Tile doesn't exist at this position
        }

        if (tileData.block.isFilled) {
          return false; // Block overlaps
        }
      }
    }
  }

  return true;
}

/**
 * Check if a shape can be placed at a given location based on tile Map
 * This function iterates through the shape's 4x4 grid and checks each filled block
 * against the tiles Map for O(1) lookup performance.
 *
 * Gracefully handles any location values (including negative and > 10).
 * Short-circuits to false when any filled block is out of bounds or overlapping.
 *
 * @param shape - The 4x4 shape grid to check
 * @param gridTopLeftLocation - Location where the 4x4 grid's top-left corner (0,0) would be placed (can be any value, even negative)
 * @param tiles - Map of tile keys to tile data for O(1) lookup
 * @param gameMode - The current game mode (optional, defaults to 'infinite')
 * @returns true if the shape can be placed without overlapping filled tiles or going out of bounds
 */
export function isValidPlacement(
  shape: Shape,
  gridTopLeftLocation: Location | null,
  tiles: TilesSet,
  gameMode: GameMode = 'infinite',
): boolean {
  // Return false if location is null
  if (gridTopLeftLocation === null) {
    return false;
  }

  // Iterate through all 16 tiles of the 4x4 shape
  for (let shapeRow = 0; shapeRow < 4; shapeRow++) {
    for (let shapeCol = 0; shapeCol < 4; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      // Only check filled blocks
      if (block.isFilled) {
        // Calculate the grid position for this block
        const gridRow = gridTopLeftLocation.row + shapeRow;
        const gridCol = gridTopLeftLocation.column + shapeCol;

        // Check bounds (1-indexed) - short circuit if out of bounds
        if (gridRow < 1 || gridRow > GRID_SIZE || gridCol < 1 || gridCol > GRID_SIZE) {
          return false; // Block doesn't fit
        }

        // Check if position exists and is not occupied using O(1) Map lookup
        const tileKey = makeTileKey(gridRow, gridCol);
        const tileData = tiles.get(tileKey);

        // Tile must exist and must not be filled
        if (!tileData) {
          return false; // Tile doesn't exist at this position
        }

        if (tileData.block.isFilled) {
          return false; // Block overlaps
        }

        // Daily Challenge Logic: Check color match
        if (gameMode === 'daily') {
          // In daily challenge, blocks must match the background color of the tile
          if (tileData.backgroundColor !== block.color) {
            return false; // Color mismatch
          }
        }
      }
    }
  }

  return true;
}

/**
 * Get the positions of blocks in the shape that cannot be placed (out of bounds or overlapping)
 * Returns an array of shape-relative coordinates (row, col in the 4x4 grid)
 *
 * Gracefully handles any location values (including negative and > 10).
 * Marks filled blocks as invalid if they're out of bounds or overlapping.
 *
 * @param shape - The 4x4 shape grid to check
 * @param gridTopLeftLocation - Location where the 4x4 grid's top-left corner (0,0) would be placed (can be any value, even negative)
 * @param tiles - Map of tile keys to tile data for O(1) lookup
 * @param gameMode - The current game mode (optional, defaults to 'infinite')
 * @returns Array of invalid block positions with their shape-relative coordinates
 */
export function getInvalidBlocks(
  shape: Shape,
  gridTopLeftLocation: Location | null,
  tiles: TilesSet,
  gameMode: GameMode = 'infinite',
): Array<{ shapeRow: number; shapeCol: number }> {
  const invalidBlocks: Array<{ shapeRow: number; shapeCol: number }> = [];

  // Return empty array if location is null
  if (gridTopLeftLocation === null) {
    return invalidBlocks;
  }

  // Iterate through all 16 tiles of the 4x4 shape
  for (let shapeRow = 0; shapeRow < 4; shapeRow++) {
    for (let shapeCol = 0; shapeCol < 4; shapeCol++) {
      const block = shape[shapeRow][shapeCol];

      // Only check filled blocks
      if (block.isFilled) {
        // Calculate the grid position for this block
        const gridRow = gridTopLeftLocation.row + shapeRow;
        const gridCol = gridTopLeftLocation.column + shapeCol;

        // Check bounds (1-indexed)
        const outOfBounds = gridRow < 1 || gridRow > GRID_SIZE || gridCol < 1 || gridCol > GRID_SIZE;

        // Check if position exists and is occupied using O(1) Map lookup
        let invalid = false;
        if (!outOfBounds) {
          const tileKey = makeTileKey(gridRow, gridCol);
          const tileData = tiles.get(tileKey);

          // Tile must exist and must not be filled
          if (!tileData) {
            invalid = true; // Tile doesn't exist at this position
          } else if (tileData.block.isFilled) {
            invalid = true; // Block overlaps
          } else if (gameMode === 'daily') {
            // Daily Challenge Logic: Check color match
            if (tileData.backgroundColor !== block.color) {
              invalid = true; // Color mismatch
            }
          }
        }

        // If invalid, add to the list
        if (outOfBounds || invalid) {
          invalidBlocks.push({ shapeRow, shapeCol });
        }
      }
    }
  }

  return invalidBlocks;
}
