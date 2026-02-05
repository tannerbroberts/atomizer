import { describe, it, expect } from 'vitest';
import { solveDailyChallenge } from '../main/App/utils/dailyChallengeSolver';
import type { TilesSet } from '../main/App/types/core';

describe('solveDailyChallenge', () => {
    it('should solve a simple 2x2 grid', () => {
        // Mock TilesSet
        const tiles = new Map() as TilesSet;
        // Add a 2x2 square of red tiles
        tiles.set('R1C1', { block: { color: 'red', isFilled: true } } as any);
        tiles.set('R1C2', { block: { color: 'red', isFilled: true } } as any);
        tiles.set('R2C1', { block: { color: 'red', isFilled: true } } as any);
        tiles.set('R2C2', { block: { color: 'red', isFilled: true } } as any);

        const seed = 12345;
        const solution = solveDailyChallenge(tiles, seed);

        console.log('Solution length:', solution ? solution.length : 'null');

        expect(solution).not.toBeNull();
        expect(solution!.length).toBeGreaterThan(0);
    });
});
