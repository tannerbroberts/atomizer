/**
 * Test for quad (4-line) clearing animations with beating heart effect
 */

import { describe, it, expect } from 'vitest';
import { generateClearingAnimations } from '../main/App/utils/clearingAnimationUtils';
import { createTilesWithFilled } from './testHelpers';
import type { ClearedLine } from '../main/App/utils/lineUtils';

describe('Quad clearing animations (beating heart)', () => {
  it('should generate row-quad animation when 4 rows are cleared', () => {
    const tiles = createTilesWithFilled([]);
    const clearedRows: ClearedLine[] = [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }];
    const clearedColumns: ClearedLine[] = [];

    const result = generateClearingAnimations(tiles, clearedRows, clearedColumns);

    // Check that tiles in the cleared rows have row-quad animations
    const tile = result.get('R1C5');
    expect(tile).toBeDefined();
    expect(tile?.activeAnimations).toBeDefined();

    const quadAnim = tile?.activeAnimations?.find(anim => anim.type === 'row-quad');
    expect(quadAnim).toBeDefined();
    expect(quadAnim?.duration).toBeGreaterThan(0);
    expect(quadAnim?.beatCount).toBe(3); // Default beat count
  });

  it('should generate column-quad animation when 4 columns are cleared', () => {
    const tiles = createTilesWithFilled([]);
    const clearedRows: ClearedLine[] = [];
    const clearedColumns: ClearedLine[] = [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }];

    const result = generateClearingAnimations(tiles, clearedRows, clearedColumns);

    // Check that tiles in the cleared columns have column-quad animations
    const tile = result.get('R5C1');
    expect(tile).toBeDefined();
    expect(tile?.activeAnimations).toBeDefined();

    const quadAnim = tile?.activeAnimations?.find(anim => anim.type === 'column-quad');
    expect(quadAnim).toBeDefined();
    expect(quadAnim?.duration).toBeGreaterThan(0);
    expect(quadAnim?.beatCount).toBe(3); // Default beat count
  });

  it('should allow custom beat count', () => {
    const tiles = createTilesWithFilled([]);
    const clearedRows: ClearedLine[] = [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }];
    const clearedColumns: ClearedLine[] = [];

    const result = generateClearingAnimations(tiles, clearedRows, clearedColumns, {
      rows: {
        single: { duration: 500, waveDelay: 30, startDelay: 0 },
        double: { duration: 500, waveDelay: 30, startDelay: 0 },
        triple: { duration: 600, waveDelay: 40, startDelay: 0 },
        quad: { duration: 2000, waveDelay: 20, startDelay: 0, beatCount: 5 },
      },
      columns: {
        single: { duration: 500, waveDelay: 30, startDelay: 0 },
        double: { duration: 500, waveDelay: 30, startDelay: 0 },
        triple: { duration: 600, waveDelay: 40, startDelay: 0 },
        quad: { duration: 1200, waveDelay: 20, startDelay: 0, beatCount: 3 },
      },
    });

    const tile = result.get('R1C5');
    const quadAnim = tile?.activeAnimations?.find(anim => anim.type === 'row-quad');

    expect(quadAnim?.duration).toBe(2000);
    expect(quadAnim?.beatCount).toBe(5);
  });

  it('should not generate quad animation when less than 4 lines are cleared', () => {
    const tiles = createTilesWithFilled([]);
    const clearedRows: ClearedLine[] = [{ index: 1 }, { index: 2 }, { index: 3 }];
    const clearedColumns: ClearedLine[] = [];

    const result = generateClearingAnimations(tiles, clearedRows, clearedColumns);

    const tile = result.get('R1C5');
    const quadAnim = tile?.activeAnimations?.find(anim => anim.type === 'row-quad');

    expect(quadAnim).toBeUndefined();
  });

  it('should generate both row-quad and column-quad for 4x4 clear', () => {
    const tiles = createTilesWithFilled([]);
    const clearedRows: ClearedLine[] = [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }];
    const clearedColumns: ClearedLine[] = [{ index: 5 }, { index: 6 }, { index: 7 }, { index: 8 }];

    const result = generateClearingAnimations(tiles, clearedRows, clearedColumns);

    // Tile at intersection should have both animations
    const tile = result.get('R2C6');
    expect(tile).toBeDefined();

    const rowQuadAnim = tile?.activeAnimations?.find(anim => anim.type === 'row-quad');
    const colQuadAnim = tile?.activeAnimations?.find(anim => anim.type === 'column-quad');

    expect(rowQuadAnim).toBeDefined();
    expect(colQuadAnim).toBeDefined();
  });

  it('should layer quad on top of single, double, and triple animations', () => {
    const tiles = createTilesWithFilled([]);
    const clearedRows: ClearedLine[] = [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }];
    const clearedColumns: ClearedLine[] = [];

    const result = generateClearingAnimations(tiles, clearedRows, clearedColumns);

    const tile = result.get('R1C5');
    const animations = tile?.activeAnimations || [];

    // Should have all 4 row animation types
    expect(animations.some(a => a.type === 'row-cw')).toBe(true);
    expect(animations.some(a => a.type === 'row-double')).toBe(true);
    expect(animations.some(a => a.type === 'row-triple')).toBe(true);
    expect(animations.some(a => a.type === 'row-quad')).toBe(true);
    expect(animations.length).toBe(4);
  });
});
