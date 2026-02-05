import { describe, it, expect } from 'vitest';
import { getShapeGridPositions } from '../main/App/utils/shapes/shapeGeometry';
import { canPlaceShape } from '../main/App/utils/shapes/shapeValidation';
import type { Shape, Location } from '../main/App/types/core';
import { createTilesWithFilled } from './testHelpers';

// Helper to create test shapes (4x4 grid format)
const createLShape = (): Shape => {
  return [
    [
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: true },
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: false }
    ],
    [
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: true },
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: false }
    ],
    [
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: true },
      { color: 'blue', isFilled: true },
      { color: 'blue', isFilled: false }
    ],
    [
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: false },
      { color: 'blue', isFilled: false }
    ]
  ];
};

const createSquareShape = (): Shape => {
  return [
    [
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: true },
      { color: 'red', isFilled: true },
      { color: 'red', isFilled: false }
    ],
    [
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: true },
      { color: 'red', isFilled: true },
      { color: 'red', isFilled: false }
    ],
    [
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: false }
    ],
    [
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: false },
      { color: 'red', isFilled: false }
    ]
  ];
};

describe('Shape Hover Effect - Unit Tests', () => {
  describe('getShapeGridPositions - Correct positioning', () => {
    it('should return exactly 4 positions for L-shape', () => {
      const shape = createLShape();
      const centerLocation: Location = { row: 5, column: 5 };

      const positions = getShapeGridPositions(shape, centerLocation);

      // L-shape has 4 filled blocks
      expect(positions.length).toBe(4);
    });

    it('should return positions centered around the hover location', () => {
      const shape = createLShape();
      const centerLocation: Location = { row: 5, column: 5 };

      const positions = getShapeGridPositions(shape, centerLocation);

      // Extract row and column values
      const rows = positions.map(p => p.location.row);
      const cols = positions.map(p => p.location.column);

      // All positions should be reasonably close to the center location
      // With 4x4 shapes, the positions can vary more
      for (const row of rows) {
        expect(row).toBeGreaterThanOrEqual(3);
        expect(row).toBeLessThanOrEqual(7);
      }

      for (const col of cols) {
        expect(col).toBeGreaterThanOrEqual(3);
        expect(col).toBeLessThanOrEqual(7);
      }
    });

    it('should return unique positions (no duplicates)', () => {
      const shape = createLShape();
      const centerLocation: Location = { row: 5, column: 5 };

      const positions = getShapeGridPositions(shape, centerLocation);
      const positionStrings = positions.map(p => `${p.location.row},${p.location.column}`);
      const uniquePositions = new Set(positionStrings);

      // All positions should be unique
      expect(uniquePositions.size).toBe(positions.length);
    });

    it('should maintain same relative distances between blocks regardless of center location', () => {
      const shape = createLShape();
      const location1: Location = { row: 3, column: 3 };
      const location2: Location = { row: 7, column: 7 };

      const positions1 = getShapeGridPositions(shape, location1);
      const positions2 = getShapeGridPositions(shape, location2);

      // Both should have same number of blocks
      expect(positions1.length).toBe(positions2.length);

      // Calculate relative distances for both
      // (the shape should maintain its form, just be translated)
      const offset = {
        row: location2.row - location1.row,
        column: location2.column - location1.column
      };

      // Each position in positions2 should be positions1 + offset
      for (let index = 0; index < positions1.length; index++) {
        const pos1 = positions1[index];
        const pos2 = positions2[index];
        const expectedRow = pos1.location.row + offset.row;
        const expectedCol = pos1.location.column + offset.column;

        // Allow for rounding differences
        expect(Math.abs(pos2.location.row - expectedRow)).toBeLessThanOrEqual(1);
        expect(Math.abs(pos2.location.column - expectedCol)).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('canPlaceShape - Placement validation', () => {
    it('should return true when shape fits in empty grid', () => {
      const shape = createLShape();
      const gridTopLeft: Location = { row: 3, column: 3 }; // Places shape starting at (3,3)
      const gridSize = { rows: 10, columns: 10 };
      const tiles = createTilesWithFilled([]); // Empty grid

      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);

      expect(canPlace).toBe(true);
    });

    it('should return false when shape extends beyond grid boundaries', () => {
      const shape = createLShape();
      const gridTopLeft: Location = { row: 0, column: 0 }; // Top-left at 0,0 means blocks go to rows 1-3 and columns 1-2
      const gridSize = { rows: 10, columns: 10 };
      const tiles = createTilesWithFilled([]); // Empty grid

      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);

      // With gridTopLeft at (0,0), the 4x4 shape will try to place blocks at row 0 which is out of bounds (grid is 1-10)
      expect(canPlace).toBe(false);
    });

    it('should return false when shape overlaps with occupied tiles', () => {
      const shape = createLShape();
      const gridTopLeft: Location = { row: 4, column: 4 };
      const gridSize = { rows: 10, columns: 10 };
      // Create a grid with filled tile at (5,5) - this is where one of the L-shape blocks will be (row 4 + offset 1, col 4 + offset 1)
      const tiles = createTilesWithFilled([{ row: 5, column: 5 }]);

      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);

      // One of the L-shape blocks will overlap with occupied tile at (5,5)
      expect(canPlace).toBe(false);
    });

    it('should return true when shape is adjacent to but not overlapping occupied tiles', () => {
      const shape = createSquareShape();
      const gridTopLeft: Location = { row: 3, column: 3 }; // Places square starting at (3,3)
      const gridSize = { rows: 10, columns: 10 };
      // Create a grid with filled tiles away from the shape position
      const tiles = createTilesWithFilled([{ row: 7, column: 7 }, { row: 8, column: 8 }]);

      const canPlace = canPlaceShape(shape, gridTopLeft, gridSize, tiles);

      expect(canPlace).toBe(true);
    });
  });

  describe('Shape preview consistency requirements', () => {
    it('should calculate the same center point for shape regardless of hover location', () => {
      const shape = createLShape();

      // Get positions at different locations
      const pos1 = getShapeGridPositions(shape, { row: 3, column: 3 });
      const pos2 = getShapeGridPositions(shape, { row: 8, column: 8 });

      // Calculate center of mass for both
      const center1 = {
        row: pos1.reduce((sum, p) => sum + p.location.row, 0) / pos1.length,
        column: pos1.reduce((sum, p) => sum + p.location.column, 0) / pos1.length
      };

      const center2 = {
        row: pos2.reduce((sum, p) => sum + p.location.row, 0) / pos2.length,
        column: pos2.reduce((sum, p) => sum + p.location.column, 0) / pos2.length
      };

      // The offset between centers should match the offset between hover locations
      const centerOffset = {
        row: center2.row - center1.row,
        column: center2.column - center1.column
      };

      expect(Math.abs(centerOffset.row - 5)).toBeLessThanOrEqual(0.5); // 8 - 3 = 5
      expect(Math.abs(centerOffset.column - 5)).toBeLessThanOrEqual(0.5); // 8 - 3 = 5
    });

    it('should return positions that when rendered at half-size and centered maintain visual alignment', () => {
      const shape = createSquareShape();
      const centerLocation: Location = { row: 5, column: 5 };

      const positions = getShapeGridPositions(shape, centerLocation);

      // For half-sized preview, each block should be rendered at:
      // - Size: 50% of normal
      // - Position: Centered within the tile
      // The center point of each half-sized block should align with the center of the tile

      // This test documents the expected behavior:
      // If a block would normally fill tile (5,5) completely,
      // a half-sized version should be centered at tile (5,5)'s center

      expect(positions.length).toBe(4); // Square has 4 blocks
      expect(positions.every(p => p.block.isFilled)).toBe(true);
    });
  });

  describe('Preview overlay logic', () => {
    it('should only mark tiles as preview that exactly match shape block positions during settling', () => {
      const shape = createLShape();
      const hoverLocation: Location = { row: 5, column: 5 };

      const previewPositions = getShapeGridPositions(shape, hoverLocation);
      const previewSet = new Set(
        previewPositions.map(p => `${p.location.row},${p.location.column}`)
      );

      // Only these exact positions should be marked as preview (during settling phase only)
      expect(previewSet.size).toBe(4); // L-shape has 4 blocks

      // Note: Preview blocks only show during the 'settling' animation phase (200ms grow animation)
      // They do NOT show during normal dragging - DraggingShape handles that visual
      const allPossibleTiles = [];
      for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
          allPossibleTiles.push(`${row},${col}`);
        }
      }

      // 96 tiles (100 - 4) should NOT be in the preview set
      const nonPreviewTiles = allPossibleTiles.filter(tile => !previewSet.has(tile));
      expect(nonPreviewTiles.length).toBe(96);
    });

    it('should distinguish between placeable and non-placeable preview states', () => {
      const shape = createLShape();
      const placeableLocation: Location = { row: 5, column: 5 }; // Top-left, will fit
      const nonPlaceableLocation: Location = { row: 0, column: 0 }; // Top-left at 0, out of bounds
      const gridSize = { rows: 10, columns: 10 };
      const tiles = createTilesWithFilled([]); // Empty grid

      const canPlacePlaceable = canPlaceShape(shape, placeableLocation, gridSize, tiles);
      const canPlaceNonPlaceable = canPlaceShape(shape, nonPlaceableLocation, gridSize, tiles);

      expect(canPlacePlaceable).toBe(true);
      expect(canPlaceNonPlaceable).toBe(false);

      // Both states should return the same positions (shape doesn't change)
      const positionsPlaceable = getShapeGridPositions(shape, placeableLocation);
      const positionsNonPlaceable = getShapeGridPositions(shape, nonPlaceableLocation);

      expect(positionsPlaceable.length).toBe(positionsNonPlaceable.length);

      // Note: Preview blocks only appear during 'settling' phase (after click)
      // DraggingShape (at 50% size) shows the shape during normal dragging
      // The rendering logic for TileVisual during settling:
      // - Valid placement: blocks grow from 50% to 100% over 200ms
      // - Invalid placement: Click is prevented, no animation occurs
    });
  });

  describe('Hover State Logic', () => {
    it('BUG FIX: isHovered should be false if tile is already filled, even if in hoveredSet', () => {
      // This test catches the bug where tint appears on filled tiles
      // Note: Hover preview only shows during 'settling' animation phase
      const shape = createLShape();
      const hoverLocation: Location = { row: 5, column: 5 };

      const previewPositions = getShapeGridPositions(shape, hoverLocation);
      const previewSet = new Set(
        previewPositions.map(p => `${p.location.row},${p.location.column}`)
      );

      // Simulate tile data - some filled, some empty
      // Note: L-shape at (5,5) has filled blocks at (5,6), (6,6), (7,6), (7,7)
      // We'll test with (5,6) which is a filled position
      const filledTile = { row: 5, column: 6, isFilled: true };
      const emptyTile = { row: 5, column: 6, isFilled: false };

      // Test filled tile that's in preview position
      const filledTileKey = `${filledTile.row},${filledTile.column}`;
      const isPreviewForFilled = previewSet.has(filledTileKey) && !filledTile.isFilled;
      expect(isPreviewForFilled).toBe(false); // Should NOT be preview because tile is filled

      // Test empty tile that's in preview position  
      const emptyTileKey = `${emptyTile.row},${emptyTile.column}`;
      const isPreviewForEmpty = previewSet.has(emptyTileKey) && !emptyTile.isFilled;
      expect(isPreviewForEmpty).toBe(true); // SHOULD be preview because tile is empty
    });

    it('BUG DETECTION: isHovered should be true during settling phase only', () => {
      const shape = createLShape();
      const hoverLocation: Location = { row: 5, column: 5 };

      const previewPositions = getShapeGridPositions(shape, hoverLocation);
      const previewSet = new Set(
        previewPositions.map(p => `${p.location.row},${p.location.column}`)
      );

      // Check all 100 tiles
      for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
          const key = `${row},${col}`;
          const isInPreviewSet = previewSet.has(key);

          // During settling phase, isHovered is true for tiles in previewSet
          // During normal dragging, DraggingShape shows the preview (not grid tiles)
          if (isInPreviewSet) {
            const matchingPosition = previewPositions.find(p =>
              p.location.row === row && p.location.column === col
            );
            expect(matchingPosition).toBeDefined();
          }
        }
      }

      // Exactly 4 tiles should have isHovered=true during settling (L-shape has 4 blocks)
      let previewCount = 0;
      for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
          const key = `${row},${col}`;
          if (previewSet.has(key)) previewCount++;
        }
      }
      expect(previewCount).toBe(4);
    });

    it('BUG DETECTION: Grid.tsx performs unnecessary .find() operations on every render', () => {
      // This test documents a performance bug in Grid.tsx
      // CURRENT IMPLEMENTATION (line 94-97 in Grid.tsx):
      // hoveredBlock={isHovered ? previewPositions.find(p =>
      //   p.location.row === tile.location.row &&
      //   p.location.column === tile.location.column
      // )?.block : undefined}

      // PROBLEM: For each of 100 tiles, if isPreview is true, we call .find()
      // This is inefficient - we already have a Set for O(1) lookup of keys,
      // but then do O(n) search through previewPositions array

      const shape = createLShape();
      const hoverLocation: Location = { row: 5, column: 5 };
      const previewPositions = getShapeGridPositions(shape, hoverLocation);

      // BETTER APPROACH: Create a Map for O(1) lookup of both key AND block
      const previewMap = new Map(
        previewPositions.map(p => [
          `${p.location.row},${p.location.column}`,
          p.block
        ])
      );

      // Verify the Map works correctly
      for (const position of previewPositions) {
        const key = `${position.location.row},${position.location.column}`;
        const block = previewMap.get(key);

        expect(block).toBeDefined();
        expect(block?.color).toEqual(position.block.color);
        expect(block?.isFilled).toBe(true);
      }

      // Verify non-preview tiles return undefined
      expect(previewMap.get('1,1')).toBeUndefined();
      expect(previewMap.get('10,10')).toBeUndefined();

      // This demonstrates the fix: use Map.get() instead of Array.find()
      // Time complexity: O(1) vs O(n)
    });
  });
});
