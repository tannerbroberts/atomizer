/**
 * Grid Shape Tests
 * 
 * Tests for non-rectangular grid shapes (diamond, circle, hexagon, custom)
 */

import { describe, it, expect } from 'vitest';
import {
  isValidGridCoordinate,
  setGridShape,
  generateShapedGridAddresses,
  getGridShapeStats,
  visualizeGridShape,
  GRID_SHAPE_PRESETS,
  createCrossShape,
  createPlusShape,
  type GridShapeConfig,
} from '../main/App/utils/gridShapes';

describe('Grid Shapes', () => {
  describe('Diamond Shape', () => {
    it('should validate center coordinate for 7x7 diamond', () => {
      setGridShape({ shape: 'diamond', size: 7 });
      expect(isValidGridCoordinate(4, 4)).toBe(true); // Center
    });

    it('should validate edge coordinates for 7x7 diamond', () => {
      setGridShape({ shape: 'diamond', size: 7 });
      expect(isValidGridCoordinate(1, 4)).toBe(true); // Top point
      expect(isValidGridCoordinate(7, 4)).toBe(true); // Bottom point
      expect(isValidGridCoordinate(4, 1)).toBe(true); // Left point
      expect(isValidGridCoordinate(4, 7)).toBe(true); // Right point
    });

    it('should reject corner coordinates for 7x7 diamond', () => {
      setGridShape({ shape: 'diamond', size: 7 });
      expect(isValidGridCoordinate(1, 1)).toBe(false); // Top-left corner
      expect(isValidGridCoordinate(1, 7)).toBe(false); // Top-right corner
      expect(isValidGridCoordinate(7, 1)).toBe(false); // Bottom-left corner
      expect(isValidGridCoordinate(7, 7)).toBe(false); // Bottom-right corner
    });

    it('should validate widest row for 7x7 diamond', () => {
      setGridShape({ shape: 'diamond', size: 7 });
      // Row 4 should have all 7 columns valid
      for (let col = 1; col <= 7; col++) {
        expect(isValidGridCoordinate(4, col)).toBe(true);
      }
    });

    it('should generate correct number of tiles for 7x7 diamond', () => {
      const config: GridShapeConfig = { shape: 'diamond', size: 7 };
      const addresses = generateShapedGridAddresses(config);
      // 7x7 diamond: 1 + 3 + 5 + 7 + 5 + 3 + 1 = 25 tiles
      expect(addresses.length).toBe(25);
    });

    it('should generate correct number of tiles for 9x9 diamond', () => {
      const config: GridShapeConfig = { shape: 'diamond', size: 9 };
      const addresses = generateShapedGridAddresses(config);
      // 9x9 diamond: 1 + 3 + 5 + 7 + 9 + 7 + 5 + 3 + 1 = 41 tiles
      expect(addresses.length).toBe(41);
    });
  });

  describe('Circle Shape', () => {
    it('should validate center for circular grid', () => {
      setGridShape({ shape: 'circle', size: 9 });
      expect(isValidGridCoordinate(5, 5)).toBe(true); // Center
    });

    it('should reject far corners for circular grid', () => {
      setGridShape({ shape: 'circle', size: 9 });
      expect(isValidGridCoordinate(1, 1)).toBe(false);
      expect(isValidGridCoordinate(1, 9)).toBe(false);
      expect(isValidGridCoordinate(9, 1)).toBe(false);
      expect(isValidGridCoordinate(9, 9)).toBe(false);
    });

    it('should have fewer tiles than square', () => {
      const circleConfig: GridShapeConfig = { shape: 'circle', size: 9 };
      const squareConfig: GridShapeConfig = { shape: 'square', size: 9 };
      
      const circleTiles = generateShapedGridAddresses(circleConfig).length;
      const squareTiles = generateShapedGridAddresses(squareConfig).length;
      
      expect(circleTiles).toBeLessThan(squareTiles);
      expect(squareTiles).toBe(81); // 9x9 = 81
      expect(circleTiles).toBeGreaterThan(50); // Roughly π * (4.5)² ≈ 63
    });
  });

  describe('Square Shape (baseline)', () => {
    it('should validate all coordinates for square grid', () => {
      setGridShape({ shape: 'square', size: 5 });
      
      for (let row = 1; row <= 5; row++) {
        for (let col = 1; col <= 5; col++) {
          expect(isValidGridCoordinate(row, col)).toBe(true);
        }
      }
    });

    it('should generate full grid for square shape', () => {
      const config: GridShapeConfig = { shape: 'square', size: 8 };
      const addresses = generateShapedGridAddresses(config);
      expect(addresses.length).toBe(64); // 8x8 = 64
    });
  });

  describe('Custom Shapes', () => {
    it('should create cross shape with correct validation', () => {
      const crossConfig = createCrossShape(9);
      setGridShape(crossConfig);
      
      // Center should be valid
      expect(isValidGridCoordinate(5, 5)).toBe(true);
      
      // Horizontal and vertical arms should be valid
      expect(isValidGridCoordinate(5, 1)).toBe(true); // Left arm
      expect(isValidGridCoordinate(5, 9)).toBe(true); // Right arm
      expect(isValidGridCoordinate(1, 5)).toBe(true); // Top arm
      expect(isValidGridCoordinate(9, 5)).toBe(true); // Bottom arm
      
      // Far corners should be invalid
      expect(isValidGridCoordinate(1, 1)).toBe(false);
      expect(isValidGridCoordinate(9, 9)).toBe(false);
    });

    it('should create plus shape (thin cross)', () => {
      const plusConfig = createPlusShape(7);
      setGridShape(plusConfig);
      
      // Only center row and column should be valid
      expect(isValidGridCoordinate(4, 4)).toBe(true); // Center
      expect(isValidGridCoordinate(4, 1)).toBe(true); // Center row
      expect(isValidGridCoordinate(1, 4)).toBe(true); // Center column
      
      // Off-center should be invalid
      expect(isValidGridCoordinate(3, 3)).toBe(false);
      expect(isValidGridCoordinate(5, 5)).toBe(false);
    });

    it('should generate correct tile count for plus shape', () => {
      const plusConfig = createPlusShape(7);
      const addresses = generateShapedGridAddresses(plusConfig);
      // Plus has 7 vertical + 7 horizontal - 1 (center counted twice) = 13 tiles
      expect(addresses.length).toBe(13);
    });
  });

  describe('Grid Shape Presets', () => {
    it('should have valid diamond presets', () => {
      const { DIAMOND_SMALL, DIAMOND_NORMAL, DIAMOND_LARGE } = GRID_SHAPE_PRESETS;
      
      expect(DIAMOND_SMALL.shape).toBe('diamond');
      expect(DIAMOND_SMALL.size).toBe(7);
      
      expect(DIAMOND_NORMAL.shape).toBe('diamond');
      expect(DIAMOND_NORMAL.size).toBe(9);
      
      expect(DIAMOND_LARGE.shape).toBe('diamond');
      expect(DIAMOND_LARGE.size).toBe(11);
    });

    it('should generate correct stats for diamond preset', () => {
      setGridShape(GRID_SHAPE_PRESETS.DIAMOND_NORMAL);
      const stats = getGridShapeStats();
      
      expect(stats.shape).toBe('diamond');
      expect(stats.size).toBe(9);
      expect(stats.totalTiles).toBe(41);
      expect(stats.boundingBox).toBe('9x9');
    });
  });

  describe('Grid Statistics', () => {
    it('should calculate efficiency for diamond shape', () => {
      setGridShape({ shape: 'diamond', size: 7 });
      const stats = getGridShapeStats();
      
      // 25 tiles in 7x7 bounding box = 51.0% efficiency
      expect(stats.efficiency).toBe('51.0%');
    });

    it('should show 100% efficiency for square', () => {
      setGridShape({ shape: 'square', size: 10 });
      const stats = getGridShapeStats();
      
      expect(stats.efficiency).toBe('100.0%');
    });

    it('should calculate circle efficiency', () => {
      setGridShape({ shape: 'circle', size: 9 });
      const stats = getGridShapeStats();
      
      // Circle should be roughly 78.5% efficient (π/4), but our discrete implementation may vary
      const efficiency = parseFloat(stats.efficiency);
      expect(efficiency).toBeGreaterThan(60);
      expect(efficiency).toBeLessThan(90);
    });
  });

  describe('Visualization', () => {
    it('should generate visualization string for diamond', () => {
      const config: GridShapeConfig = { shape: 'diamond', size: 5 };
      const viz = visualizeGridShape(config);
      
      expect(viz).toContain('DIAMOND Grid');
      expect(viz).toContain('size 5');
      expect(viz).toContain('Total tiles:');
      expect(viz).toContain('█'); // Filled tiles
      expect(viz).toContain('·'); // Empty space
    });

    it('should show correct tile count in visualization', () => {
      const config: GridShapeConfig = { shape: 'diamond', size: 7 };
      const viz = visualizeGridShape(config);
      
      expect(viz).toContain('Total tiles: 25');
    });
  });

  describe('Validation and Bounds', () => {
    it('should reject out-of-bounds coordinates regardless of shape', () => {
      setGridShape({ shape: 'diamond', size: 7 });
      
      expect(isValidGridCoordinate(0, 4)).toBe(false); // Row too small
      expect(isValidGridCoordinate(8, 4)).toBe(false); // Row too large
      expect(isValidGridCoordinate(4, 0)).toBe(false); // Column too small
      expect(isValidGridCoordinate(4, 8)).toBe(false); // Column too large
    });

    it('should enforce size constraints', () => {
      expect(() => setGridShape({ size: 3 })).toThrow('Grid size must be between 4 and 20');
      expect(() => setGridShape({ size: 21 })).toThrow('Grid size must be between 4 and 20');
    });

    it('should accept valid size range', () => {
      expect(() => setGridShape({ size: 4 })).not.toThrow();
      expect(() => setGridShape({ size: 20 })).not.toThrow();
    });
  });

  describe('Address Generation', () => {
    it('should generate addresses in row-major order', () => {
      const config: GridShapeConfig = { shape: 'square', size: 3 };
      const addresses = generateShapedGridAddresses(config);
      
      expect(addresses[0]).toBe('R1C1');
      expect(addresses[1]).toBe('R1C2');
      expect(addresses[2]).toBe('R1C3');
      expect(addresses[3]).toBe('R2C1');
    });

    it('should skip invalid coordinates for diamond', () => {
      const config: GridShapeConfig = { shape: 'diamond', size: 5 };
      const addresses = generateShapedGridAddresses(config);
      
      // Should not include corners
      expect(addresses).not.toContain('R1C1');
      expect(addresses).not.toContain('R1C5');
      expect(addresses).not.toContain('R5C1');
      expect(addresses).not.toContain('R5C5');
      
      // Should include center
      expect(addresses).toContain('R3C3');
    });
  });
});
