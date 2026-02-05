/**
 * Clearing Animation Utilities
 *
 * Manages tile-based clearing animations with configurable timing and wave effects.
 * Animations are instanced per tile and persist independently of block state.
 *
 * Animation Types:
 * - row-cw: Clockwise rotation for single row clears
 * - row-double: Dynamic grow/rotate effect for double row clears
 * - row-triple: Octagon with full 360° rotation for triple row clears
 * - row-quad: Beating heart effect for quad row clears (4+ rows)
 * - column-ccw: Counterclockwise base rotation for single column clears
 * - column-double: Dynamic grow/rotate effect for double column clears
 * - column-triple: Octagon with full 360° rotation for triple column clears
 * - column-quad: Beating heart effect for quad column clears (4+ columns)
 */

import type { TileAnimation, TilesSet } from '../../types/core';
import type { ClearedLine } from '../lineUtils';

export type AnimationTierConfig = {
  duration: number; // Animation duration in ms
  waveDelay: number; // Delay between each tile in ms
  startDelay: number; // Delay before the first animation starts in ms
  beatCount?: number; // Number of heartbeats (for quad animations)
  finishDuration?: number; // Duration of the shrink/fade out phase
};

export type AnimationConfig = {
  rows: {
    single: AnimationTierConfig;
    double: AnimationTierConfig;
    triple: AnimationTierConfig;
    quad: AnimationTierConfig;
  };
  columns: {
    single: AnimationTierConfig;
    double: AnimationTierConfig;
    triple: AnimationTierConfig;
    quad: AnimationTierConfig;
  };
  /**
   * Full board clear animation configuration
   * Triggers when clearing lines results in all 100 tiles being empty, awards 300 points
   * Sequence: plays AFTER normal line clear animations complete
   * Then: all 10 columns clear first, then all 10 rows clear
   */
  fullBoardClear: {
    columns: AnimationTierConfig; // Animation for all 10 columns (plays after normal animations)
    rows: AnimationTierConfig; // Animation for all 10 rows (starts after columns)
  };
  baseStartTime?: number; // Base timestamp (defaults to performance.now())
};

const DEFAULT_CONFIG: AnimationConfig = {
  rows: {
    single: { duration: 500, waveDelay: 30, startDelay: 0 },
    double: { duration: 500, waveDelay: 30, startDelay: 0 },
    triple: { duration: 600, waveDelay: 40, startDelay: 0 },
    quad: { duration: 1600, waveDelay: 20, startDelay: 0, beatCount: 3, finishDuration: 400 },
  },
  columns: {
    single: { duration: 500, waveDelay: 30, startDelay: 0 },
    double: { duration: 500, waveDelay: 30, startDelay: 0 },
    triple: { duration: 600, waveDelay: 40, startDelay: 0 },
    quad: { duration: 1600, waveDelay: 20, startDelay: 0, beatCount: 3, finishDuration: 400 },
  },
  fullBoardClear: {
    columns: { duration: 800, waveDelay: 40, startDelay: 0 },
    rows: { duration: 800, waveDelay: 40, startDelay: 900 }, // Starts after columns finish
  },
};

/**
 * Generates a unique animation ID
 */
let animationIdCounter = 0;
function generateAnimationId(): string {
  return `anim-${Date.now()}-${animationIdCounter++}`;
}

/**
 * Calculates wave offset based on tile position
 * @param index - Tile index in the line (0-9)
 * @param waveDelay - Delay per tile
 */
function calculateWaveOffset(index: number, waveDelay: number): number {
  return index * waveDelay;
}

/**
 * Generates clearing animations and applies them directly to tiles.
 * Animations persist on tiles independently of block state changes.
 *
 * @param tiles - The tiles map to update with animations
 * @param clearedRows - Array of row objects being cleared
 * @param clearedColumns - Array of column objects being cleared
 * @param config - Animation timing configuration
 * @returns Updated tiles map with animations added
 */
export function generateClearingAnimations(
  tiles: TilesSet,
  clearedRows: ClearedLine[],
  clearedColumns: ClearedLine[],
  config: Partial<AnimationConfig> = {},
): TilesSet {
  // Deep merge config with defaults
  const finalConfig: AnimationConfig = {
    rows: {
      single: { ...DEFAULT_CONFIG.rows.single, ...config.rows?.single },
      double: { ...DEFAULT_CONFIG.rows.double, ...config.rows?.double },
      triple: { ...DEFAULT_CONFIG.rows.triple, ...config.rows?.triple },
      quad: { ...DEFAULT_CONFIG.rows.quad, ...config.rows?.quad },
    },
    columns: {
      single: { ...DEFAULT_CONFIG.columns.single, ...config.columns?.single },
      double: { ...DEFAULT_CONFIG.columns.double, ...config.columns?.double },
      triple: { ...DEFAULT_CONFIG.columns.triple, ...config.columns?.triple },
      quad: { ...DEFAULT_CONFIG.columns.quad, ...config.columns?.quad },
    },
    fullBoardClear: {
      columns: { ...DEFAULT_CONFIG.fullBoardClear.columns, ...config.fullBoardClear?.columns },
      rows: { ...DEFAULT_CONFIG.fullBoardClear.rows, ...config.fullBoardClear?.rows },
    },
    baseStartTime: config.baseStartTime,
  };
  const baseStartTime = finalConfig.baseStartTime ?? performance.now();
  const newTiles = new Map(tiles);

  // Helper to create tile key
  const makeTileKey = (row: number, column: number) => `R${row}C${column}`;

  // Determine animation types based on count
  const rowCount = clearedRows.length;
  const columnCount = clearedColumns.length;

  // Process cleared rows
  for (const { index: row, color } of clearedRows) {
    for (let column = 1; column <= 10; column++) {
      const key = makeTileKey(row, column);
      const tileData = newTiles.get(key);
      if (!tileData) continue;

      const animations: TileAnimation[] = [];

      // Single row animation (always present)
      const singleWaveOffset = calculateWaveOffset(column - 1, finalConfig.rows.single.waveDelay);
      animations.push({
        id: generateAnimationId(),
        type: 'row-cw',
        startTime: baseStartTime + finalConfig.rows.single.startDelay + singleWaveOffset,
        duration: finalConfig.rows.single.duration,
        color,
      });

      // Double row animation (2+ rows)
      if (rowCount >= 2) {
        const doubleWaveOffset = calculateWaveOffset(column - 1, finalConfig.rows.double.waveDelay);
        animations.push({
          id: generateAnimationId(),
          type: 'row-double',
          startTime: baseStartTime + finalConfig.rows.double.startDelay + doubleWaveOffset,
          duration: finalConfig.rows.double.duration,
          color,
        });
      }

      // Triple row animation (3+ rows)
      if (rowCount >= 3) {
        const tripleWaveOffset = calculateWaveOffset(column - 1, finalConfig.rows.triple.waveDelay);
        animations.push({
          id: generateAnimationId(),
          type: 'row-triple',
          startTime: baseStartTime + finalConfig.rows.triple.startDelay + tripleWaveOffset,
          duration: finalConfig.rows.triple.duration,
          color,
        });
      }

      // Quad row animation (4+ rows) - beating heart
      if (rowCount >= 4) {
        const quadWaveOffset = calculateWaveOffset(column - 1, finalConfig.rows.quad.waveDelay);
        animations.push({
          id: generateAnimationId(),
          type: 'row-quad',
          startTime: baseStartTime + finalConfig.rows.quad.startDelay + quadWaveOffset,
          duration: finalConfig.rows.quad.duration,
          beatCount: finalConfig.rows.quad.beatCount,
          finishDuration: finalConfig.rows.quad.finishDuration,
          color,
        });
      }

      tileData.activeAnimations = [...tileData.activeAnimations, ...animations];
    }
  }

  // Process cleared columns
  for (const { index: column, color } of clearedColumns) {
    for (let row = 1; row <= 10; row++) {
      const key = makeTileKey(row, column);
      const tileData = newTiles.get(key);
      if (!tileData) continue;

      const animations: TileAnimation[] = [];

      // Single column animation (always present)
      const singleWaveOffset = calculateWaveOffset(row - 1, finalConfig.columns.single.waveDelay);
      animations.push({
        id: generateAnimationId(),
        type: 'column-ccw',
        startTime: baseStartTime + finalConfig.columns.single.startDelay + singleWaveOffset,
        duration: finalConfig.columns.single.duration,
        color,
      });

      // Double column animation (2+ columns)
      if (columnCount >= 2) {
        const doubleWaveOffset = calculateWaveOffset(row - 1, finalConfig.columns.double.waveDelay);
        animations.push({
          id: generateAnimationId(),
          type: 'column-double',
          startTime: baseStartTime + finalConfig.columns.double.startDelay + doubleWaveOffset,
          duration: finalConfig.columns.double.duration,
          color,
        });
      }

      // Triple column animation (3+ columns)
      if (columnCount >= 3) {
        const tripleWaveOffset = calculateWaveOffset(row - 1, finalConfig.columns.triple.waveDelay);
        animations.push({
          id: generateAnimationId(),
          type: 'column-triple',
          startTime: baseStartTime + finalConfig.columns.triple.startDelay + tripleWaveOffset,
          duration: finalConfig.columns.triple.duration,
          color,
        });
      }

      // Quad column animation (4+ columns) - beating heart
      if (columnCount >= 4) {
        const quadWaveOffset = calculateWaveOffset(row - 1, finalConfig.columns.quad.waveDelay);
        animations.push({
          id: generateAnimationId(),
          type: 'column-quad',
          startTime: baseStartTime + finalConfig.columns.quad.startDelay + quadWaveOffset,
          duration: finalConfig.columns.quad.duration,
          beatCount: finalConfig.columns.quad.beatCount,
          finishDuration: finalConfig.columns.quad.finishDuration,
          color,
        });
      }

      tileData.activeAnimations = [...tileData.activeAnimations, ...animations];
    }
  }

  return newTiles;
}

/**
 * Generates full board clear animations when all 100 tiles are empty after line clearing.
 * This plays AFTER the normal line clearing animations complete.
 * Awards 300 points and triggers a special animation sequence:
 * 1. Normal line clear animations play first
 * 2. All 10 columns animate simultaneously (after normal animations finish)
 * 3. All 10 rows animate simultaneously (after columns complete)
 *
 * @param tiles - The tiles map to update with animations
 * @param config - Animation timing configuration
 * @param delayAfterNormalAnimations - Milliseconds to wait after normal animations finish
 * @returns Updated tiles map with full board clear animations added
 */
export function generateFullBoardClearAnimation(
  tiles: TilesSet,
  config: Partial<AnimationConfig> = {},
  delayAfterNormalAnimations: number = 0,
): TilesSet {
  // Merge config with defaults
  const finalConfig: AnimationConfig = {
    rows: {
      single: { ...DEFAULT_CONFIG.rows.single, ...config.rows?.single },
      double: { ...DEFAULT_CONFIG.rows.double, ...config.rows?.double },
      triple: { ...DEFAULT_CONFIG.rows.triple, ...config.rows?.triple },
      quad: { ...DEFAULT_CONFIG.rows.quad, ...config.rows?.quad },
    },
    columns: {
      single: { ...DEFAULT_CONFIG.columns.single, ...config.columns?.single },
      double: { ...DEFAULT_CONFIG.columns.double, ...config.columns?.double },
      triple: { ...DEFAULT_CONFIG.columns.triple, ...config.columns?.triple },
      quad: { ...DEFAULT_CONFIG.columns.quad, ...config.columns?.quad },
    },
    fullBoardClear: {
      columns: { ...DEFAULT_CONFIG.fullBoardClear.columns, ...config.fullBoardClear?.columns },
      rows: { ...DEFAULT_CONFIG.fullBoardClear.rows, ...config.fullBoardClear?.rows },
    },
    baseStartTime: config.baseStartTime,
  };

  const baseStartTime = finalConfig.baseStartTime ?? performance.now();
  const newTiles = new Map(tiles);

  // Helper to create tile key
  const makeTileKey = (row: number, column: number) => `R${row}C${column}`;

  // Apply column animations to all tiles
  // These start after the delay (which accounts for normal animations completing)
  for (let column = 1; column <= 10; column++) {
    for (let row = 1; row <= 10; row++) {
      const key = makeTileKey(row, column);
      const tileData = newTiles.get(key);
      if (!tileData) continue;

      const waveOffset = calculateWaveOffset(column - 1, finalConfig.fullBoardClear.columns.waveDelay);
      const animation: TileAnimation = {
        id: generateAnimationId(),
        type: 'full-board-columns',
        startTime: baseStartTime + delayAfterNormalAnimations + finalConfig.fullBoardClear.columns.startDelay + waveOffset,
        duration: finalConfig.fullBoardClear.columns.duration,
      };

      tileData.activeAnimations = [...tileData.activeAnimations, animation];
    }
  }

  // Apply row animations to all tiles (starts after columns)
  for (let row = 1; row <= 10; row++) {
    for (let column = 1; column <= 10; column++) {
      const key = makeTileKey(row, column);
      const tileData = newTiles.get(key);
      if (!tileData) continue;

      const waveOffset = calculateWaveOffset(row - 1, finalConfig.fullBoardClear.rows.waveDelay);
      const animation: TileAnimation = {
        id: generateAnimationId(),
        type: 'full-board-rows',
        startTime: baseStartTime + delayAfterNormalAnimations + finalConfig.fullBoardClear.rows.startDelay + waveOffset,
        duration: finalConfig.fullBoardClear.rows.duration,
      };

      tileData.activeAnimations = [...tileData.activeAnimations, animation];
    }
  }

  return newTiles;
}

/**
 * Cleans up expired animations from all tiles.
 * Should be called periodically to prevent memory buildup.
 *
 * @param tiles - The tiles map to clean
 * @param currentTime - Current timestamp (defaults to performance.now())
 * @returns Updated tiles map with expired animations removed
 */
export function cleanupExpiredAnimations(
  tiles: TilesSet,
  currentTime: number = performance.now(),
): TilesSet {
  const newTiles = new Map(tiles);
  let hasChanges = false;

  for (const [, tileData] of newTiles.entries()) {
    if (!tileData.activeAnimations || tileData.activeAnimations.length === 0) continue;

    const activeAnimations = tileData.activeAnimations.filter(
      (anim) => currentTime < anim.startTime + anim.duration,
    );

    if (activeAnimations.length !== tileData.activeAnimations.length) {
      hasChanges = true;
      tileData.activeAnimations = activeAnimations;
    }
  }

  return hasChanges ? newTiles : tiles;
}
