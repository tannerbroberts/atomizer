import { describe, it, expect, beforeEach } from 'vitest';
import { mousePositionToGridLocation } from '../main/App/utils/shapes/shapeGeometry';
import type { Shape, Block } from '../main/App/types/core';

describe('Edge Hover Positioning', () => {
  let mockGridElement: HTMLElement;

  beforeEach(() => {
    // Create a mock grid element with a known size
    mockGridElement = document.createElement('div');

    // Mock getBoundingClientRect to return a 500x500 grid starting at (100, 100)
    mockGridElement.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 600,
      bottom: 600,
      width: 500,
      height: 500,
      x: 100,
      y: 100,
      toJSON: () => { },
    });
  });

  const createBlock = (isFilled: boolean): Block => ({
    color: 'blue',
    isFilled,
  });

  const _ = () => createBlock(false);
  const X = () => createBlock(true);

  it('should detect edge tile (column 1) when hovering on outer half', () => {
    // Create a vertical I-piece (4x1)
    const shape: Shape = [
      [_(), X(), _(), _()],
      [_(), X(), _(), _()],
      [_(), X(), _(), _()],
      [_(), X(), _(), _()],
    ];

    // Grid setup:
    // - Grid is 500px wide (100-600)
    // - 10 columns with 9 gaps of 2px = 500px total
    // - Tile size = (500 - 18) / 10 = 48.2px
    // - Tile with gap = 48.2 + 2 = 50.2px
    const GRID_GAP = 2;
    const TILE_SIZE = (500 - 9 * GRID_GAP) / 10; // 48.2px
    const TILE_WITH_GAP = TILE_SIZE + GRID_GAP; // 50.2px

    // For the vertical I-piece centered at column 1:
    // - The 4x4 shape's top-left corner should be at column 1 (0-indexed: column 0)
    // - Shape bounds: minCol=1, maxCol=1 (within 4x4)
    // - Anchor block (center): col = 1 + floor((1-1)/2) = 1
    // - Filled blocks relative to anchor: col offset = 1 - 1 = 0

    // When placing this shape at grid location (1, 1):
    // - The 4x4 top-left corner is at grid position (1, 1)
    // - The single filled column is at grid position 1 + 1 = 2 (in 1-indexed)
    // Wait, that doesn't match... let me recalculate

    // Actually, for grid location {row: 1, column: 1}:
    // - This represents where the 4x4 grid's top-left (0,0) maps to grid position (1,1)
    // - A filled block at shape[0][1] maps to grid position (1 + 0, 1 + 1) = (1, 2)

    // For this vertical I-piece with filled blocks at shape[0-3][1]:
    // - They map to grid positions: (1,2), (2,2), (3,2), (4,2)
    // So when the function returns {row: 1, column: 1}, it means the leftmost filled
    // blocks are at column 2.

    // For placing along column 1 (leftmost edge), we need location {row: 1, column: 0}
    // This would place filled blocks at: (1,1), (2,1), (3,1), (4,1)

    // Simulate precomputed offsets for this shape
    // - Shape bounds: minRow=0, maxRow=3, minCol=1, maxCol=1
    // - Filled center: (1.5, 1)
    // - 4x4 grid center: (1.5, 1.5)
    // - Visual offset: ((1 - 1.5) * 50.2, (1.5 - 1.5) * 50.2) = (-25.1, 0)
    const shapeWidth = 4 * TILE_SIZE + 3 * GRID_GAP;
    const shapeHeight = 4 * TILE_SIZE + 3 * GRID_GAP;
    const visualOffsetX = (1 - 1.5) * TILE_WITH_GAP; // -25.1
    const visualOffsetY = (1.5 - 1.5) * TILE_WITH_GAP; // 0
    const gridOffsetX = -shapeWidth / 2 - visualOffsetX;
    const gridOffsetY = -shapeHeight / 2 - visualOffsetY;

    // Test hovering on the OUTER HALF of the leftmost tile (column 1)
    // Column 1 tile spans from x=100 to x=148.2 (48.2px wide)
    // Outer half is x=100 to x=124.1
    // Let's test at x=110 (well within outer half)
    const mouseX = 110;
    const mouseY = 300; // Middle of the grid vertically

    const location = mousePositionToGridLocation(
      mouseX,
      mouseY,
      mockGridElement,
      { rows: 10, columns: 10 },
      0,
      shape,
      {
        gridOffsetX,
        gridOffsetY,
        tileSize: TILE_SIZE,
        gridGap: GRID_GAP,
      }
    );

    // With the current Math.round() implementation:
    // - gridTopLeftX = 110 + gridOffsetX = 110 + (-shapeWidth/2 - (-25.1))
    // - shapeWidth = 4 * 48.2 + 3 * 2 = 192.8 + 6 = 198.8
    // - gridOffsetX = -198.8/2 - (-25.1) = -99.4 + 25.1 = -74.3
    // - gridTopLeftX = 110 - 74.3 = 35.7
    // - relativeX = 35.7 - 100 = -64.3
    // - exactColumn = -64.3 / 50.2 = -1.28
    // - column = Math.round(-1.28) + 1 = -1 + 1 = 0
    // This gives column 0, which is WRONG (should be 1 for edge placement)

    // With Math.floor() + 0.5 (centering):
    // - exactColumn = -64.3 / 50.2 = -1.28
    // - column = Math.floor(-1.28 + 0.5) + 1 = Math.floor(-0.78) + 1 = -1 + 1 = 0
    // Still wrong!

    // Actually, we need to think about this differently...
    // When the mouse is at x=110, the user is hovering on grid tile column 1
    // Grid tile 1 spans x=100 to x=148.2

    // For the shape to place its filled blocks at column 1, the 4x4 top-left needs to be at column 0
    // Grid tile 0 (which is off-grid) would be at x=49.8 to x=98 (if it existed)

    // So the correct behavior is:
    // - When hovering at x=110 (within tile 1), and we want to place at tile 1
    // - The 4x4 top-left should map to column 0 (so filled block at shape[*][1] goes to grid column 1)

    expect(location).not.toBeNull();
    expect(location?.column).toBe(0); // 4x4 top-left at column 0 places filled blocks at column 1
  });

  it('should detect edge tile consistently across full tile width', () => {
    // Create a horizontal I-piece (1x4)
    const shape: Shape = [
      [_(), _(), _(), _()],
      [_(), _(), _(), _()],
      [X(), X(), X(), X()],
      [_(), _(), _(), _()],
    ];

    const GRID_GAP = 2;
    const TILE_SIZE = (500 - 9 * GRID_GAP) / 10; // 48.2px
    const TILE_WITH_GAP = TILE_SIZE + GRID_GAP; // 50.2px

    // Shape bounds: minRow=2, maxRow=2, minCol=0, maxCol=3
    // Filled center: (2, 1.5)
    // 4x4 center: (1.5, 1.5)
    // Visual offset: ((1.5 - 1.5) * 50.2, (2 - 1.5) * 50.2) = (0, 25.1)
    const shapeWidth = 4 * TILE_SIZE + 3 * GRID_GAP;
    const shapeHeight = 4 * TILE_SIZE + 3 * GRID_GAP;
    const visualOffsetX = (1.5 - 1.5) * TILE_WITH_GAP; // 0
    const visualOffsetY = (2 - 1.5) * TILE_WITH_GAP; // 25.1
    const gridOffsetX = -shapeWidth / 2 - visualOffsetX;
    const gridOffsetY = -shapeHeight / 2 - visualOffsetY;

    // Test multiple points across the top row (row 1)
    // Row 1 spans y=100 to y=148.2
    const testPoints = [
      { y: 105, desc: 'near top edge' },
      { y: 124, desc: 'center' },
      { y: 145, desc: 'near bottom edge' },
    ];

    for (const { y, desc } of testPoints) {
      const location = mousePositionToGridLocation(
        300, // middle of grid horizontally
        y,
        mockGridElement,
        { rows: 10, columns: 10 },
        0,
        shape,
        {
          gridOffsetX,
          gridOffsetY,
          tileSize: TILE_SIZE,
          gridGap: GRID_GAP,
        }
      );

      expect(location, `Failed at ${desc} (y=${y})`).not.toBeNull();
      // For row 1 placement, 4x4 top-left should be at row 0
      // (so filled blocks at shape[2][*] map to grid row 0 + 2 = 2... wait that's row 2)
      // Actually for grid row 1: 4x4 top-left at row -1 would place shape[2][*] at row -1 + 2 = 1
      expect(location?.row, `Failed at ${desc} (y=${y})`).toBe(-1);
    }
  });
});
