import type { Shape, Block, Location } from '../../../types/core';

/**
 * Shape geometry functions - Calculate bounds, centers, and anchor points
 */

/**
 * Get the bounding box of a shape (smallest rectangle that contains all filled blocks)
 */
export function getShapeBounds(shape: Shape): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  width: number;
  height: number;
} {
  let minRow = shape.length;
  let maxRow = -1;
  let minCol = shape[0]?.length ?? 0;
  let maxCol = -1;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col].isFilled) {
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

/**
 * Calculate grid positions for a shape placed at a specific location
 * The location represents where the 4x4 grid's top-left corner (0,0) would be placed
 *
 * Handles any location values (including negative and > 10) gracefully.
 * Simply calculates positions - validation happens elsewhere.
 */
export function getShapeGridPositions(
  shape: Shape,
  gridTopLeftLocation: Location,
): Array<{ location: Location; block: Block }> {
  const positions: Array<{ location: Location; block: Block }> = [];

  // Iterate through all 16 tiles of the 4x4 shape
  for (let shapeRow = 0; shapeRow < 4; shapeRow++) {
    for (let shapeCol = 0; shapeCol < 4; shapeCol++) {
      const block = shape[shapeRow][shapeCol];
      if (block.isFilled) {
        positions.push({
          location: {
            row: gridTopLeftLocation.row + shapeRow,
            column: gridTopLeftLocation.column + shapeCol,
          },
          block,
        });
      }
    }
  }

  return positions;
}

/**
 * Get all filled blocks from a shape
 */
export function getFilledBlocks(shape: Shape): Array<{ row: number; col: number; block: Block }> {
  const filledBlocks: Array<{ row: number; col: number; block: Block }> = [];

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col].isFilled) {
        filledBlocks.push({ row, col, block: shape[row][col] });
      }
    }
  }

  return filledBlocks;
}

/**
 * Calculate the visual offset from 4x4 grid center to filled blocks center
 * This is used to position the dragging shape visual so filled blocks appear centered on the mouse
 */
export function getShapeVisualOffset(
  shape: Shape,
  tileSize: number,
  gridGap: number,
): { offsetX: number; offsetY: number } {
  const bounds = getShapeBounds(shape);

  // Calculate center of filled blocks within the 4x4 grid (0-indexed)
  const filledCenterCol = bounds.minCol + (bounds.width - 1) / 2;
  const filledCenterRow = bounds.minRow + (bounds.height - 1) / 2;

  // The 4x4 grid's center is at (1.5, 1.5) in 0-indexed coordinates
  const gridCenter = 1.5;

  // Calculate offset from 4x4 center to filled blocks center
  const offsetX = (filledCenterCol - gridCenter) * (tileSize + gridGap);
  const offsetY = (filledCenterRow - gridCenter) * (tileSize + gridGap);

  return { offsetX, offsetY };
}

/**
 * Convert a mouse position to a grid location
 * Returns null if the mouse is outside the grid bounds
 *
 * Uses pre-computed gridOffset to directly map mouse position to the 4x4 grid's top-left corner.
 * The returned location represents where the top-left corner (row 0, col 0) of the 4x4 shape
 * would be placed on the grid.
 *
 * @param precomputedOffsets - Pre-calculated offsets (REQUIRED when shape is provided)
 */
export function mousePositionToGridLocation(
  mouseX: number,
  mouseY: number,
  gridElement: HTMLElement,
  gridSize: { rows: number; columns: number },
  offsetY: number = 0,
  shape?: Shape,
  precomputedOffsets?: {
    gridOffsetX: number;
    gridOffsetY: number;
    tileSize: number;
    gridGap: number;
  },
): Location | null {
  const rect = gridElement.getBoundingClientRect();

  // When shape is provided, precomputedOffsets are REQUIRED
  if (shape && !precomputedOffsets) {
    console.error('mousePositionToGridLocation called with shape but no precomputedOffsets - this is a logic error');
    return null;
  }

  const GRID_GAP = precomputedOffsets?.gridGap ?? 2;
  const tileSize = precomputedOffsets?.tileSize ?? (rect.width - GRID_GAP * 9) / gridSize.columns;
  const tileWithGap = tileSize + GRID_GAP;

  // Apply offset (for mobile touch positioning)
  const adjustedMouseX = mouseX;
  const adjustedMouseY = mouseY - offsetY;

  // Calculate the 4x4 grid's top-left corner position using pre-computed offset
  let gridTopLeftX = adjustedMouseX;
  let gridTopLeftY = adjustedMouseY;

  if (shape && precomputedOffsets) {
    // Use pre-computed grid offset to directly get 4x4 top-left corner
    gridTopLeftX = adjustedMouseX + precomputedOffsets.gridOffsetX;
    gridTopLeftY = adjustedMouseY + precomputedOffsets.gridOffsetY;
  }

  // Check if the grid's top-left corner is within reasonable bounds
  // Allow significant tolerance for shapes near the edge since the 4x4 grid's
  // top-left corner will be outside the grid bounds for edge placements
  // For a 4x4 shape, the top-left can be up to 3 tiles outside the grid
  const tolerance = tileSize * 3.5; // Allow up to 3.5 tiles outside
  if (
    gridTopLeftX < rect.left - tolerance
    || gridTopLeftX > rect.right + tolerance
    || gridTopLeftY < rect.top - tolerance
    || gridTopLeftY > rect.bottom + tolerance
  ) {
    return null;
  }

  // Calculate grid position relative to the grid element's top-left corner
  const relativeX = gridTopLeftX - rect.left;
  const relativeY = gridTopLeftY - rect.top;

  // Calculate which tile the 4x4 grid's top-left corner is in
  const exactColumn = relativeX / tileWithGap;
  const exactRow = relativeY / tileWithGap;

  // Use floor to map any position within a tile to that tile's location
  // This ensures edge tiles are detected across their full width/height
  // Adding 0.5 before floor effectively rounds to nearest, which gives better
  // behavior when the position is between tiles
  const column = Math.floor(exactColumn + 0.5) + 1; // +1 for 1-indexed
  const row = Math.floor(exactRow + 0.5) + 1; // +1 for 1-indexed

  // Return unclamped values - validation functions handle out-of-bounds gracefully
  // This allows shapes to show "does not fit" visual when hovering outside the grid
  return { row, column };
}
