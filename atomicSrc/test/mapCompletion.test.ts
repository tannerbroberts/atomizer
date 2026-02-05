import { describe, it, expect } from 'vitest';
import { checkMapCompletion, createTargetTilesSet } from '../main/App/utils/mapCompletionUtils';
import type { TilesSet, Tile } from '../main/App/types/core';

describe('Map Completion Utils', () => {
  const createTile = (
    position: string,
    backgroundColor: 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple',
    blockColor: 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple',
    isFilled: boolean
  ): Tile => ({
    position,
    backgroundColor,
    block: { color: blockColor, isFilled },
    activeAnimations: [],
  });

  describe('checkMapCompletion', () => {
    it('should return 3 stars for perfect match (all tiles match)', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));
      tiles.set('R1C2', createTile('R1C2', 'green', 'green', true));
      tiles.set('R2C1', createTile('R2C1', 'blue', 'blue', true));
      tiles.set('R2C2', createTile('R2C2', 'yellow', 'yellow', true));

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C1', 'R2C2']);
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(3);
      expect(result.matchedTiles).toBe(4);
      expect(result.missedTiles).toBe(0);
      expect(result.totalTiles).toBe(4);
    });

    it('should return 2 stars for 1 mismatch', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));
      tiles.set('R1C2', createTile('R1C2', 'green', 'blue', true)); // Mismatch
      tiles.set('R2C1', createTile('R2C1', 'blue', 'blue', true));
      tiles.set('R2C2', createTile('R2C2', 'yellow', 'yellow', true));

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C1', 'R2C2']);
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(2);
      expect(result.matchedTiles).toBe(3);
      expect(result.missedTiles).toBe(1);
    });

    it('should return 2 stars for 2 mismatches', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));
      tiles.set('R1C2', createTile('R1C2', 'green', 'blue', true)); // Mismatch
      tiles.set('R2C1', createTile('R2C1', 'blue', 'yellow', true)); // Mismatch
      tiles.set('R2C2', createTile('R2C2', 'yellow', 'yellow', true));

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C1', 'R2C2']);
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(2);
      expect(result.matchedTiles).toBe(2);
      expect(result.missedTiles).toBe(2);
    });

    it('should return 1 star for 3-5 mismatches', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'blue', true)); // Mismatch
      tiles.set('R1C2', createTile('R1C2', 'green', 'red', true)); // Mismatch
      tiles.set('R2C1', createTile('R2C1', 'blue', 'green', true)); // Mismatch
      tiles.set('R2C2', createTile('R2C2', 'yellow', 'yellow', true));

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C1', 'R2C2']);
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(1);
      expect(result.matchedTiles).toBe(1);
      expect(result.missedTiles).toBe(3);
    });

    it('should return 0 stars (failure) for more than 5 mismatches', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'blue', true)); // Mismatch
      tiles.set('R1C2', createTile('R1C2', 'green', 'red', true)); // Mismatch
      tiles.set('R2C1', createTile('R2C1', 'blue', 'green', true)); // Mismatch
      tiles.set('R2C2', createTile('R2C2', 'yellow', 'red', true)); // Mismatch
      tiles.set('R3C1', createTile('R3C1', 'purple', 'orange', true)); // Mismatch
      tiles.set('R3C2', createTile('R3C2', 'orange', 'purple', true)); // Mismatch

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C1', 'R2C2', 'R3C1', 'R3C2']);
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(0); // Failure
      expect(result.matchedTiles).toBe(0);
      expect(result.missedTiles).toBe(6);
    });

    it('should return incomplete if not all tiles are filled', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));
      tiles.set('R1C2', createTile('R1C2', 'green', 'grey', false)); // Not filled
      tiles.set('R2C1', createTile('R2C1', 'blue', 'blue', true));

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C1']);
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(false);
      expect(result.stars).toBe(0);
      expect(result.matchedTiles).toBe(2);
      expect(result.missedTiles).toBe(0); // Unfilled tiles aren't counted as misses
    });

    it('should work without targetTiles (check all tiles)', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));
      tiles.set('R1C2', createTile('R1C2', 'green', 'green', true));

      const result = checkMapCompletion(tiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(3);
      expect(result.matchedTiles).toBe(2);
      expect(result.totalTiles).toBe(2);
    });

    it('should handle empty target tiles set', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));

      const targetTiles = new Set<string>();
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(false);
      expect(result.stars).toBe(0);
      expect(result.matchedTiles).toBe(0);
      expect(result.totalTiles).toBe(0);
    });

    it('should only check tiles in targetTiles set', () => {
      const tiles: TilesSet = new Map();
      tiles.set('R1C1', createTile('R1C1', 'red', 'red', true));
      tiles.set('R1C2', createTile('R1C2', 'green', 'blue', true)); // Mismatch
      tiles.set('R2C1', createTile('R2C1', 'blue', 'yellow', true)); // Not in target, ignored
      tiles.set('R2C2', createTile('R2C2', 'yellow', 'yellow', true));

      const targetTiles = new Set(['R1C1', 'R1C2', 'R2C2']); // R2C1 not included
      const result = checkMapCompletion(tiles, targetTiles);

      expect(result.isComplete).toBe(true);
      expect(result.stars).toBe(2); // 1 mismatch (R1C2)
      expect(result.matchedTiles).toBe(2);
      expect(result.missedTiles).toBe(1);
      expect(result.totalTiles).toBe(3);
    });
  });

  describe('createTargetTilesSet', () => {
    it('should create a Set from array of tile positions', () => {
      const positions = ['R1C1', 'R1C2', 'R2C1', 'R2C2'];
      const result = createTargetTilesSet(positions);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(4);
      expect(result.has('R1C1')).toBe(true);
      expect(result.has('R1C2')).toBe(true);
      expect(result.has('R2C1')).toBe(true);
      expect(result.has('R2C2')).toBe(true);
    });

    it('should handle empty array', () => {
      const result = createTargetTilesSet([]);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should handle duplicate positions', () => {
      const positions = ['R1C1', 'R1C1', 'R1C2'];
      const result = createTargetTilesSet(positions);

      expect(result.size).toBe(2); // Duplicates removed
      expect(result.has('R1C1')).toBe(true);
      expect(result.has('R1C2')).toBe(true);
    });
  });
});
