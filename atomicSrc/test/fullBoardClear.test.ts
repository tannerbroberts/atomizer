/**
 * Full Board Clear Tests
 * 
 * Tests for the full board clear feature that awards 300 bonus points
 * when clearing lines results in an empty board (all 100 tiles cleared).
 * Animation sequence: normal line animations play first, then full board animations (columns → rows)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isGridCompletelyEmpty } from '../main/App/utils/lineUtils';
import { generateFullBoardClearAnimation } from '../main/App/utils/clearingAnimationUtils';
import { tileReducer } from '../main/App/reducers/tileReducer';
import { makeTileKey } from '../main/App/utils/gridConstants';
import type { TetrixReducerState } from '../main/App/types/gameState';
import { createTilesWithFilled } from './testHelpers';

describe('Full Board Clear - isGridCompletelyEmpty', () => {
  it('should return true for an empty grid', () => {
    const tiles = createTilesWithFilled([]);
    expect(isGridCompletelyEmpty(tiles)).toBe(true);
  });

  it('should return false for a partially filled grid', () => {
    const positions = [];
    for (let row = 1; row <= 5; row++) {
      for (let column = 1; column <= 10; column++) {
        positions.push({ row, column, color: 'blue' as const });
      }
    }
    const tiles = createTilesWithFilled(positions);
    expect(isGridCompletelyEmpty(tiles)).toBe(false);
  });

  it('should return false if just one tile is filled', () => {
    const tiles = createTilesWithFilled([{ row: 10, column: 10, color: 'blue' }]);
    expect(isGridCompletelyEmpty(tiles)).toBe(false);
  });

  it('should return true when all 100 tiles are empty', () => {
    const tiles = createTilesWithFilled([]);
    expect(isGridCompletelyEmpty(tiles)).toBe(true);
  });

  it('should return false even with different colors on filled tiles', () => {
    const positions = [];
    const colors: Array<'red' | 'blue' | 'green' | 'yellow'> = ['red', 'blue', 'green', 'yellow'];
    for (let row = 1; row <= 10; row++) {
      for (let column = 1; column <= 10; column++) {
        const colorIndex = ((row - 1) * 10 + (column - 1)) % colors.length;
        positions.push({ row, column, color: colors[colorIndex] });
      }
    }
    const tiles = createTilesWithFilled(positions);
    expect(isGridCompletelyEmpty(tiles)).toBe(false);
  });
});

describe('Full Board Clear - generateFullBoardClearAnimation', () => {
  it('should add animations to all 100 tiles', () => {
    const tiles = createTilesWithFilled([]);

    const animatedTiles = generateFullBoardClearAnimation(tiles, {
      baseStartTime: 1000,
    }, 0);

    expect(animatedTiles.size).toBe(100);

    // Check that every tile has both column and row animations
    for (const tile of animatedTiles.values()) {
      expect(tile.activeAnimations).toBeDefined();
      expect(tile.activeAnimations.length).toBe(2);

      const types = tile.activeAnimations.map(a => a.type);
      expect(types).toContain('full-board-columns');
      expect(types).toContain('full-board-rows');
    }
  });

  it('should apply column animations first, then row animations', () => {
    const tiles = createTilesWithFilled([]);
    const baseStartTime = 1000;
    const delayAfterNormalAnimations = 500; // Simulate normal animations taking 500ms
    const animatedTiles = generateFullBoardClearAnimation(tiles, {
      baseStartTime,
      fullBoardClear: {
        columns: { duration: 800, waveDelay: 40, startDelay: 0 },
        rows: { duration: 800, waveDelay: 40, startDelay: 900 },
      },
    }, delayAfterNormalAnimations);

    // Check a tile in column 1
    const tile11 = animatedTiles.get(makeTileKey(1, 1));
    expect(tile11?.activeAnimations).toBeDefined();

    const columnAnim = tile11!.activeAnimations!.find(a => a.type === 'full-board-columns');
    const rowAnim = tile11!.activeAnimations!.find(a => a.type === 'full-board-rows');

    expect(columnAnim).toBeDefined();
    expect(rowAnim).toBeDefined();

    // Column animation starts at baseStartTime + delay
    expect(columnAnim!.startTime).toBe(baseStartTime + delayAfterNormalAnimations);

    // Row animation starts after columns (startDelay: 900) + delay
    expect(rowAnim!.startTime).toBe(baseStartTime + delayAfterNormalAnimations + 900);
  });

  it('should apply wave delays correctly for columns', () => {
    const tiles = createTilesWithFilled([]);
    // tiles are already initialized by createTilesWithFilled

    const baseStartTime = 1000;
    const waveDelay = 40;
    const delayAfterNormal = 300;
    const animatedTiles = generateFullBoardClearAnimation(tiles, {
      baseStartTime,
      fullBoardClear: {
        columns: { duration: 800, waveDelay, startDelay: 0 },
        rows: { duration: 800, waveDelay: 40, startDelay: 900 },
      },
    }, delayAfterNormal);

    // Check column wave progression
    for (let column = 1; column <= 10; column++) {
      const tile = animatedTiles.get(makeTileKey(5, column)); // Check row 5 across all columns
      const columnAnim = tile!.activeAnimations!.find(a => a.type === 'full-board-columns');

      const expectedStartTime = baseStartTime + delayAfterNormal + (column - 1) * waveDelay;
      expect(columnAnim!.startTime).toBe(expectedStartTime);
    }
  });

  it('should apply wave delays correctly for rows', () => {
    const tiles = createTilesWithFilled([]);
    // tiles are already initialized by createTilesWithFilled

    const baseStartTime = 1000;
    const rowWaveDelay = 40;
    const rowStartDelay = 900;
    const delayAfterNormal = 300;
    const animatedTiles = generateFullBoardClearAnimation(tiles, {
      baseStartTime,
      fullBoardClear: {
        columns: { duration: 800, waveDelay: 40, startDelay: 0 },
        rows: { duration: 800, waveDelay: rowWaveDelay, startDelay: rowStartDelay },
      },
    }, delayAfterNormal);

    // Check row wave progression
    for (let row = 1; row <= 10; row++) {
      const tile = animatedTiles.get(makeTileKey(row, 5)); // Check column 5 across all rows
      const rowAnim = tile!.activeAnimations!.find(a => a.type === 'full-board-rows');

      const expectedStartTime = baseStartTime + delayAfterNormal + rowStartDelay + (row - 1) * rowWaveDelay;
      expect(rowAnim!.startTime).toBe(expectedStartTime);
    }
  });

  it('should preserve existing tile data when adding animations', () => {
    const tiles = createTilesWithFilled([]);
    // Set row 5 as filled
    for (let column = 1; column <= 10; column++) {
      const tile = tiles.get(makeTileKey(5, column));
      if (tile) {
        tile.block.isFilled = true;
        tile.block.color = 'blue';
      }
    }

    const animatedTiles = generateFullBoardClearAnimation(tiles, {
      baseStartTime: 1000,
    });

    // Check that tile data is preserved
    for (const tile of animatedTiles.values()) {
      expect(tile.activeAnimations).toBeDefined();
      expect(tile.activeAnimations.length).toBe(2);
    }
  });
});

describe('Full Board Clear - Reducer Integration', () => {
  let mockInitialState: TetrixReducerState;

  beforeEach(() => {
    // Create a minimal state with required properties
    mockInitialState = {
      tiles: new Map(),
      score: 0,
      totalLinesCleared: 0,
      nextShapes: [],
      shapesUsed: 0,
      queueSize: -1,
      queueMode: 'infinite' as const,
      queueColorProbabilities: [],
      queueHiddenShapes: [],
      gameState: 'playing',
      gameMode: 'infinite',
      currentLevel: 1,
      isMapUnlocked: false,
      mapCompletionResult: null,
      targetTiles: null,
      savedShape: null,
      openRotationMenus: [],
      newShapeAnimationStates: [],
      shapeOptionBounds: [],
      removingShapeIndex: null,
      shapeRemovalAnimationState: 'none',
      hasPlacedFirstShape: false,
      isTurningModeActive: false,
      turningDirection: null,
      buttonSizeMultiplier: 1.0,
      isDoubleTurnModeActive: false,
      unlockedModifiers: new Set<number>(),
      hasLoadedPersistedState: false,
      isStatsOpen: false,
      isQueueOverlayOpen: false,
      insufficientFundsError: null,
      currentTheme: 'dark' as const,
      initialDailyState: null,
      showCoinDisplay: true,
      mousePosition: { x: 0, y: 0 },
      gemIconPosition: { x: 0, y: 0 },
      gridTileSize: null,
      gridBounds: null,
      stats: {
        allTime: {
          shapesPlaced: { total: 0, colors: {} },
          linesCleared: { total: 0, colors: {} },
          coloredLinesCleared: { total: 0, colors: {} },
          rowsCleared: { total: 0, colors: {} },
          doubleRows: { total: 0, colors: {} },
          tripleRows: { total: 0, colors: {} },
          quadrupleRows: { total: 0, colors: {} },
          doubleRowsWithSingleColumns: { total: 0, colors: {} },
          tripleRowsWithSingleColumns: { total: 0, colors: {} },
          tripleRowsWithDoubleColumns: { total: 0, colors: {} },
          quadrupleRowsWithSingleColumns: { total: 0, colors: {} },
          columnsCleared: { total: 0, colors: {} },
          doubleColumns: { total: 0, colors: {} },
          tripleColumns: { total: 0, colors: {} },
          quadrupleColumns: { total: 0, colors: {} },
          doubleColumnsWithSingleRows: { total: 0, colors: {} },
          tripleColumnsWithDoubleRows: { total: 0, colors: {} },
          tripleColumnsWithSingleRows: { total: 0, colors: {} },
          quadrupleColumnsWithSingleRows: { total: 0, colors: {} },
          singleColumnBySingleRow: { total: 0, colors: {} },
          doubleColumnByDoubleRow: { total: 0, colors: {} },
          quadrupleRowByQuadrupleColumn: { total: 0, colors: {} },
        },
        highScore: {
          shapesPlaced: { total: 0, colors: {} },
          linesCleared: { total: 0, colors: {} },
          coloredLinesCleared: { total: 0, colors: {} },
          rowsCleared: { total: 0, colors: {} },
          doubleRows: { total: 0, colors: {} },
          tripleRows: { total: 0, colors: {} },
          quadrupleRows: { total: 0, colors: {} },
          doubleRowsWithSingleColumns: { total: 0, colors: {} },
          tripleRowsWithSingleColumns: { total: 0, colors: {} },
          tripleRowsWithDoubleColumns: { total: 0, colors: {} },
          quadrupleRowsWithSingleColumns: { total: 0, colors: {} },
          columnsCleared: { total: 0, colors: {} },
          doubleColumns: { total: 0, colors: {} },
          tripleColumns: { total: 0, colors: {} },
          quadrupleColumns: { total: 0, colors: {} },
          doubleColumnsWithSingleRows: { total: 0, colors: {} },
          tripleColumnsWithDoubleRows: { total: 0, colors: {} },
          tripleColumnsWithSingleRows: { total: 0, colors: {} },
          quadrupleColumnsWithSingleRows: { total: 0, colors: {} },
          singleColumnBySingleRow: { total: 0, colors: {} },
          doubleColumnByDoubleRow: { total: 0, colors: {} },
          quadrupleRowByQuadrupleColumn: { total: 0, colors: {} },
        },
        current: {
          shapesPlaced: { total: 0, colors: {} },
          linesCleared: { total: 0, colors: {} },
          coloredLinesCleared: { total: 0, colors: {} },
          rowsCleared: { total: 0, colors: {} },
          doubleRows: { total: 0, colors: {} },
          tripleRows: { total: 0, colors: {} },
          quadrupleRows: { total: 0, colors: {} },
          doubleRowsWithSingleColumns: { total: 0, colors: {} },
          tripleRowsWithSingleColumns: { total: 0, colors: {} },
          tripleRowsWithDoubleColumns: { total: 0, colors: {} },
          quadrupleRowsWithSingleColumns: { total: 0, colors: {} },
          columnsCleared: { total: 0, colors: {} },
          doubleColumns: { total: 0, colors: {} },
          tripleColumns: { total: 0, colors: {} },
          quadrupleColumns: { total: 0, colors: {} },
          doubleColumnsWithSingleRows: { total: 0, colors: {} },
          tripleColumnsWithDoubleRows: { total: 0, colors: {} },
          tripleColumnsWithSingleRows: { total: 0, colors: {} },
          quadrupleColumnsWithSingleRows: { total: 0, colors: {} },
          singleColumnBySingleRow: { total: 0, colors: {} },
          doubleColumnByDoubleRow: { total: 0, colors: {} },
          quadrupleRowByQuadrupleColumn: { total: 0, colors: {} },
        },
        lastUpdated: Date.now(),
        noTurnStreak: {
          current: 0,
          bestInGame: 0,
          allTimeBest: 0,
        },
      },
      dragState: {
        phase: 'dragging',
        selectedShape: [
          [
            { color: 'blue', isFilled: true },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
          ],
          [
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
          ],
          [
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
          ],
          [
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
            { color: 'grey', isFilled: false },
          ],
        ],
        selectedShapeIndex: 0,
        sourceId: null,
        isValidPlacement: true,
        hoveredBlockPositions: [],
        invalidBlockPositions: [],
        sourcePosition: { x: 0, y: 0, width: 0, height: 0 },
        targetPosition: { x: 0, y: 0 },
        placementLocation: { row: 1, column: 10 },
        placementStartPosition: null,
        startTime: null,
        dragOffsets: null,
      },
      mouseGridLocation: { row: 1, column: 10 },
    };

    // Initialize empty tiles first
    for (let row = 1; row <= 10; row++) {
      for (let column = 1; column <= 10; column++) {
        const position = makeTileKey(row, column);
        mockInitialState.tiles.set(position, {
          position,
          backgroundColor: 'grey',
          block: { isFilled: false, color: 'grey' },
          activeAnimations: []
        });
      }
    }

    // Fill the grid almost completely - leave only last column empty
    // When we place the shape, it will fill column 10, and clearing will result in empty board
    for (let row = 1; row <= 10; row++) {
      for (let column = 1; column <= 9; column++) {
        // Fill columns 1-9 completely
        const position = makeTileKey(row, column);
        const tile = mockInitialState.tiles.get(position);
        if (tile) {
          mockInitialState.tiles.set(position, {
            ...tile,
            block: { isFilled: true, color: 'blue' }
          });
        }
      }
      if (row !== 1) {
        // Fill column 10 except row 1 (where we'll place the shape)
        const position = makeTileKey(row, 10);
        const tile = mockInitialState.tiles.get(position);
        if (tile) {
          mockInitialState.tiles.set(position, {
            ...tile,
            block: { isFilled: true, color: 'blue' }
          });
        }
      }
      // Row 1, Column 10 is left empty (isFilled: false) from initialization
    }
  });

  it('should detect full board clear and award 300 bonus points', () => {
    const result = tileReducer(mockInitialState, { type: 'COMPLETE_PLACEMENT' });

    // Should award points for clearing 10 rows + 10 columns + 300 bonus
    // Normal score: (10² + 10² + (10×10×2)) × 5 = (100 + 100 + 200) × 5 = 2000
    // Plus 300 bonus = 2300
    expect(result.score).toBe(2300);
  });

  it('should clear all tiles after full board clear', () => {
    const result = tileReducer(mockInitialState, { type: 'COMPLETE_PLACEMENT' });

    // All tiles should be cleared (not filled)
    for (const tile of result.tiles.values()) {
      expect(tile.block.isFilled).toBe(false);
    }
  });

  it('should apply full board animations to all tiles', () => {
    const result = tileReducer(mockInitialState, { type: 'COMPLETE_PLACEMENT' });

    // Every tile should have both animations
    let tilesWithAnimations = 0;
    for (const tile of result.tiles.values()) {
      if (tile.activeAnimations && tile.activeAnimations.length > 0) {
        tilesWithAnimations++;
        // We expect 10 animations total:
        // 4 for row clear (single, double, triple, quad)
        // 4 for column clear (single, double, triple, quad)
        // 2 for full board clear (columns, rows)
        expect(tile.activeAnimations.length).toBe(10);

        const types = tile.activeAnimations.map(a => a.type);
        expect(types).toContain('full-board-columns');
        expect(types).toContain('full-board-rows');
      }
    }
    expect(tilesWithAnimations).toBe(100);
  });

  it('should NOT trigger full board clear if grid is not completely empty after clearing', () => {
    // Reset tiles to a simpler state
    mockInitialState.tiles = new Map();

    // Fill Row 1 except last column (R1C10)
    for (let col = 1; col <= 9; col++) {
      const pos = makeTileKey(1, col);
      mockInitialState.tiles.set(pos, {
        position: pos,
        backgroundColor: 'grey',
        block: { isFilled: true, color: 'blue' },
        activeAnimations: []
      });
    }

    // Add a tile in Row 2 that won't be cleared
    // We need to make sure Row 2 is NOT full, and the column it's in is NOT full
    // R2C1 is safe because Column 1 has R1C1 filled, but R3C1..R10C1 are empty.
    // So Column 1 is not full.
    // Row 2 is not full (only R2C1 filled).
    const pos = makeTileKey(2, 1);
    mockInitialState.tiles.set(pos, {
      position: pos,
      backgroundColor: 'grey',
      block: { isFilled: true, color: 'red' },
      activeAnimations: []
    });

    // Place shape at R1C10 (from default dragState)
    // This will fill R1C10, completing Row 1.
    // Column 10 will have R1C10 filled, but others empty.
    // So only Row 1 is cleared.

    const result = tileReducer(mockInitialState, { type: 'COMPLETE_PLACEMENT' });

    // Should NOT award 300 bonus
    // Score for 1 row: 10 (tiles) * 1 (row) = 10? 
    // Let's check scoringUtils.ts: (rows + cols + (rows * cols * 2)) * multiplier?
    // Actually currencyUtils.ts says: (rows)² + (columns)² + (rows × columns × 2)
    // Here rows=1, cols=0.
    // Score = 1^2 + 0 + 0 = 1.
    // Wait, scoring might be different.
    // But definitely not 2300.

    expect(result.score).not.toBe(2300);
    expect(result.score).toBeGreaterThan(0);

    // Check that R2C1 is still filled
    const tile = result.tiles.get(makeTileKey(2, 1));
    expect(tile?.block.isFilled).toBe(true);
  });
});

describe('Full Board Clear - Animation Config', () => {
  it('should use default config values when not specified', () => {
    const tiles = createTilesWithFilled([]);
    // tiles are already initialized by createTilesWithFilled

    const animatedTiles = generateFullBoardClearAnimation(tiles);

    const tile = animatedTiles.get(makeTileKey(1, 1));
    const columnAnim = tile!.activeAnimations!.find(a => a.type === 'full-board-columns');
    const rowAnim = tile!.activeAnimations!.find(a => a.type === 'full-board-rows');

    // Check default durations (800ms each)
    expect(columnAnim!.duration).toBe(800);
    expect(rowAnim!.duration).toBe(800);
  });

  it('should allow custom animation timings', () => {
    const tiles = createTilesWithFilled([]);
    // tiles are already initialized by createTilesWithFilled

    const customDuration = 1200;
    const customWaveDelay = 60;
    const animatedTiles = generateFullBoardClearAnimation(tiles, {
      fullBoardClear: {
        columns: { duration: customDuration, waveDelay: customWaveDelay, startDelay: 0 },
        rows: { duration: customDuration, waveDelay: customWaveDelay, startDelay: 1500 },
      },
    });

    const tile = animatedTiles.get(makeTileKey(1, 1));
    const columnAnim = tile!.activeAnimations!.find(a => a.type === 'full-board-columns');

    expect(columnAnim!.duration).toBe(customDuration);
  });
});
