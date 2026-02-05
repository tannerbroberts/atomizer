/**
 * Tests for shape placement validation on grids with missing tiles
 * 
 * When a tile position doesn't exist in the tiles Map (e.g., R1C1 is missing),
 * shapes should not be able to place blocks on that position.
 */

import { describe, it, expect } from 'vitest';
import { canPlaceShape, isValidPlacement, getInvalidBlocks } from '../main/App/utils/shapes/shapeValidation';
import type { Shape, TilesSet, Location, Tile } from '../main/App/types/core';

// Helper to create a simple 2x2 square shape in top-left of 4x4 grid
function createSquareShape(): Shape {
  const emptyBlock = { isFilled: false, color: 'grey' as const };
  const filledBlock = { isFilled: true, color: 'blue' as const };

  return [
    [filledBlock, filledBlock, emptyBlock, emptyBlock],
    [filledBlock, filledBlock, emptyBlock, emptyBlock],
    [emptyBlock, emptyBlock, emptyBlock, emptyBlock],
    [emptyBlock, emptyBlock, emptyBlock, emptyBlock],
  ];
}

// Helper to create a tiles Map with only specific positions
function createPartialTiles(positions: string[]): TilesSet {
  const tiles = new Map<string, Tile>();
  
  positions.forEach(position => {
    const tile: Tile = {
      position,
      backgroundColor: 'grey',
      block: { isFilled: false, color: 'grey' },
      activeAnimations: []
    };
    tiles.set(position, tile);
  });
  
  return tiles;
}

describe('Shape placement on grids with missing tiles', () => {
  describe('canPlaceShape', () => {
    it('should return false when shape would place on missing tile position', () => {
      const shape = createSquareShape();
      // Shape at (1,1) will try to place blocks at R1C1, R1C2, R2C1, R2C2
      const gridTopLeft: Location = { row: 1, column: 1 };
      const gridSize = { rows: 10, columns: 10 };
      
      // Create tiles missing R1C1
      const tiles = createPartialTiles(['R1C2', 'R2C1', 'R2C2', 'R3C3', 'R4C4']);
      
      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);
      
      // Should be false because R1C1 doesn't exist
      expect(canPlace).toBe(false);
    });

    it('should return true when all shape blocks land on existing tiles', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 1, column: 1 };
      const gridSize = { rows: 10, columns: 10 };
      
      // Create tiles with all required positions
      const tiles = createPartialTiles(['R1C1', 'R1C2', 'R2C1', 'R2C2', 'R3C3']);
      
      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);
      
      expect(canPlace).toBe(true);
    });

    it('should return false when shape partially overlaps missing tiles', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 1, column: 1 };
      const gridSize = { rows: 10, columns: 10 };
      
      // Missing R1C2 - only one of the four required positions
      const tiles = createPartialTiles(['R1C1', 'R2C1', 'R2C2', 'R3C3']);
      
      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);
      
      expect(canPlace).toBe(false);
    });
  });

  describe('isValidPlacement', () => {
    it('should return false when shape would place on missing tile position', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 1, column: 1 };
      
      // Missing R2C2
      const tiles = createPartialTiles(['R1C1', 'R1C2', 'R2C1', 'R3C3']);
      
      const isValid = isValidPlacement(shape, gridTopLeft, tiles);
      
      expect(isValid).toBe(false);
    });

    it('should return true when all blocks land on existing tiles', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 1, column: 1 };
      
      const tiles = createPartialTiles(['R1C1', 'R1C2', 'R2C1', 'R2C2']);
      
      const isValid = isValidPlacement(shape, gridTopLeft, tiles);
      
      expect(isValid).toBe(true);
    });
  });

  describe('getInvalidBlocks', () => {
    it('should mark blocks as invalid when they would land on missing tiles', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 1, column: 1 };
      
      // Missing R1C1 and R2C2
      const tiles = createPartialTiles(['R1C2', 'R2C1', 'R3C3']);
      
      const invalidBlocks = getInvalidBlocks(shape, gridTopLeft, tiles);
      
      // Should have 2 invalid blocks (at shape positions [0,0] and [1,1])
      expect(invalidBlocks).toHaveLength(2);
      expect(invalidBlocks).toContainEqual({ shapeRow: 0, shapeCol: 0 }); // Maps to R1C1
      expect(invalidBlocks).toContainEqual({ shapeRow: 1, shapeCol: 1 }); // Maps to R2C2
    });

    it('should return empty array when all blocks land on existing tiles', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 1, column: 1 };
      
      const tiles = createPartialTiles(['R1C1', 'R1C2', 'R2C1', 'R2C2']);
      
      const invalidBlocks = getInvalidBlocks(shape, gridTopLeft, tiles);
      
      expect(invalidBlocks).toHaveLength(0);
    });
  });
});
