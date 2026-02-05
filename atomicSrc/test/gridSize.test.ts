/**
 * Grid Size Configuration Tests
 * 
 * Tests for dynamic grid size functionality, verifying that the grid can be
 * configured to different sizes beyond the default 10x10.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GRID_SIZE, GRID_ADDRESSES, setGridSize, makeTileKey } from '../main/App/utils/gridConstants';
import { createTilesWithFilled } from './testHelpers';

describe('Dynamic Grid Size', () => {
  // Store original size to restore after tests
  const originalSize = GRID_SIZE;

  // Reset to default size after each test
  beforeEach(() => {
    if (GRID_SIZE !== originalSize) {
      setGridSize(originalSize);
    }
  });

  describe('setGridSize', () => {
    it('should change GRID_SIZE to 8', () => {
      setGridSize(8);
      expect(GRID_SIZE).toBe(8);
    });

    it('should change GRID_SIZE to 12', () => {
      setGridSize(12);
      expect(GRID_SIZE).toBe(12);
    });

    it('should change GRID_SIZE to 15', () => {
      setGridSize(15);
      expect(GRID_SIZE).toBe(15);
    });

    it('should reject sizes below 4', () => {
      expect(() => setGridSize(3)).toThrow('Grid size must be between 4 and 20');
    });

    it('should reject sizes above 20', () => {
      expect(() => setGridSize(21)).toThrow('Grid size must be between 4 and 20');
    });

    it('should accept minimum valid size of 4', () => {
      setGridSize(4);
      expect(GRID_SIZE).toBe(4);
    });

    it('should accept maximum valid size of 20', () => {
      setGridSize(20);
      expect(GRID_SIZE).toBe(20);
    });
  });

  describe('GRID_ADDRESSES regeneration', () => {
    it('should generate 64 addresses for 8x8 grid', () => {
      setGridSize(8);
      expect(GRID_ADDRESSES.length).toBe(64);
      expect(GRID_ADDRESSES[0]).toBe('R1C1');
      expect(GRID_ADDRESSES[63]).toBe('R8C8');
    });

    it('should generate 144 addresses for 12x12 grid', () => {
      setGridSize(12);
      expect(GRID_ADDRESSES.length).toBe(144);
      expect(GRID_ADDRESSES[0]).toBe('R1C1');
      expect(GRID_ADDRESSES[143]).toBe('R12C12');
    });

    it('should generate 225 addresses for 15x15 grid', () => {
      setGridSize(15);
      expect(GRID_ADDRESSES.length).toBe(225);
      expect(GRID_ADDRESSES[0]).toBe('R1C1');
      expect(GRID_ADDRESSES[224]).toBe('R15C15');
    });

    it('should contain all correct addresses in row-major order for 5x5', () => {
      setGridSize(5);
      expect(GRID_ADDRESSES.length).toBe(25);

      // Check first row
      expect(GRID_ADDRESSES[0]).toBe('R1C1');
      expect(GRID_ADDRESSES[4]).toBe('R1C5');

      // Check last row
      expect(GRID_ADDRESSES[20]).toBe('R5C1');
      expect(GRID_ADDRESSES[24]).toBe('R5C5');
    });
  });

  describe('Tile key generation with different sizes', () => {
    it('should generate valid keys for 8x8 grid', () => {
      setGridSize(8);
      expect(makeTileKey(1, 1)).toBe('R1C1');
      expect(makeTileKey(8, 8)).toBe('R8C8');
      expect(makeTileKey(4, 6)).toBe('R4C6');
    });

    it('should generate valid keys for 15x15 grid', () => {
      setGridSize(15);
      expect(makeTileKey(1, 1)).toBe('R1C1');
      expect(makeTileKey(15, 15)).toBe('R15C15');
      expect(makeTileKey(10, 12)).toBe('R10C12');
    });
  });

  describe('Test helpers with different grid sizes', () => {
    it('should create correct tile set for 6x6 grid', () => {
      setGridSize(6);
      const tiles = createTilesWithFilled([
        { row: 1, column: 1, color: 'blue' },
        { row: 6, column: 6, color: 'red' },
      ]);

      expect(tiles.size).toBe(36);
      expect(tiles.get('R1C1')?.block.isFilled).toBe(true);
      expect(tiles.get('R6C6')?.block.isFilled).toBe(true);
      expect(tiles.get('R3C3')?.block.isFilled).toBe(false);
    });

    it('should create correct tile set for 12x12 grid', () => {
      setGridSize(12);
      const tiles = createTilesWithFilled([
        { row: 1, column: 1, color: 'blue' },
        { row: 12, column: 12, color: 'red' },
      ]);

      expect(tiles.size).toBe(144);
      expect(tiles.get('R1C1')?.block.isFilled).toBe(true);
      expect(tiles.get('R12C12')?.block.isFilled).toBe(true);
    });
  });

  describe('Grid size persistence across changes', () => {
    it('should maintain new size after multiple operations', () => {
      setGridSize(7);
      expect(GRID_SIZE).toBe(7);
      expect(GRID_ADDRESSES.length).toBe(49);

      // Perform some operations
      const key = makeTileKey(4, 5);
      expect(key).toBe('R4C5');

      // Size should still be 7
      expect(GRID_SIZE).toBe(7);
    });

    it('should properly reset to default 10x10', () => {
      setGridSize(8);
      expect(GRID_SIZE).toBe(8);

      setGridSize(10);
      expect(GRID_SIZE).toBe(10);
      expect(GRID_ADDRESSES.length).toBe(100);
    });
  });
});
