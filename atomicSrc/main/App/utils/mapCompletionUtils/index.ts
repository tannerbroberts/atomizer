import type { TilesSet } from '../../types/core';

/**
 * Result of checking map completion
 */
export interface MapCompletionResult {
  isComplete: boolean; // Whether all tiles have blocks placed
  matchedTiles: number; // Number of tiles where block color matches tile background
  totalTiles: number; // Total number of tiles that should be filled
  missedTiles: number; // Number of tiles that don't match
  stars: number; // 0-3 stars based on matching accuracy (0 = failure)
}

/**
 * Check if a map/level is complete and calculate star rating
 *
 * A map is complete when all tiles have filled blocks placed.
 * Star rating is based on how many blocks match their tile's background color:
 * - 3 stars: Perfect match (0 mismatches)
 * - 2 stars: 1-2 mismatches
 * - 1 star: 3-5 mismatches
 * - 0 stars (failure): More than 5 mismatches
 *
 * @param tiles - The current game board state
 * @param targetTiles - Optional set of tile positions to check. If not provided, checks all tiles.
 *                      In daily challenges, this is automatically derived from tiles with custom backgrounds.
 * @returns MapCompletionResult with stats and star rating
 */
export function checkMapCompletion(
  tiles: TilesSet,
  targetTiles?: Set<string>,
): MapCompletionResult {
  let totalTiles = 0;
  let filledTiles = 0;
  let matchedTiles = 0;
  let missedTiles = 0;

  // If targetTiles is provided, only check those specific tiles
  // Otherwise, check all tiles on the board
  const tilesToCheck = targetTiles || new Set(tiles.keys());

  for (const position of tilesToCheck) {
    const tile = tiles.get(position);
    if (!tile) continue;

    totalTiles++;

    // Check if tile has a block placed
    if (tile.block.isFilled) {
      filledTiles++;

      // Check if block color matches tile background color
      if (tile.block.color === tile.backgroundColor) {
        matchedTiles++;
      } else {
        missedTiles++;
      }
    }
  }

  // Map is only complete if all target tiles are filled
  const isComplete = filledTiles === totalTiles && totalTiles > 0;

  // Calculate star rating based on mismatches
  let stars = 0;
  if (isComplete) {
    if (missedTiles === 0) {
      stars = 3; // Perfect!
    } else if (missedTiles <= 2) {
      stars = 2; // Great
    } else if (missedTiles <= 5) {
      stars = 1; // Good
    } else {
      stars = 0; // Failure - too many mismatches
    }
  }

  return {
    isComplete,
    matchedTiles,
    totalTiles,
    missedTiles,
    stars,
  };
}

/**
 * Create a Set of target tile positions from challenge data
 * Used to know which tiles should be filled for a level/challenge
 *
 * @param tilePositions - Array of tile position strings (e.g., ["R1C1", "R1C2"])
 * @returns Set of tile positions
 */
export function createTargetTilesSet(tilePositions: string[]): Set<string> {
  return new Set(tilePositions);
}
