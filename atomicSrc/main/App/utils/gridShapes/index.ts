/**
 * Grid Shapes - Support for non-rectangular grid layouts
 *
 * This module enables custom grid shapes beyond squares:
 * - Diamond/rhombus grids
 * - Hexagonal grids
 * - Circle/oval grids
 * - Custom arbitrary shapes
 */

/**
 * Grid shape types
 */
export type GridShape = 'square' | 'diamond' | 'hexagon' | 'circle' | 'custom';

/**
 * Grid shape configuration
 */
export type GridShapeConfig = {
  shape: GridShape;
  size: number; // Base size parameter (e.g., radius, side length)
  customValidator?: (row: number, column: number) => boolean;
};

/**
 * Current grid shape configuration
 */
let GRID_SHAPE_CONFIG: GridShapeConfig = {
  shape: 'square',
  size: 10,
};

/**
 * Check if a coordinate is valid for a diamond shape
 * Diamond is rotated 45° - widest at the middle
 *
 * For a diamond of size N:
 * - Center is at row = ceil(N/2), col = ceil(N/2)
 * - Valid tiles form a diamond pattern
 *
 * Example 7x7 diamond (size=7):
 *       X       row 1: only col 4
 *      XXX      row 2: cols 3,4,5
 *     XXXXX     row 3: cols 2,3,4,5,6
 *    XXXXXXX    row 4: cols 1,2,3,4,5,6,7 (widest)
 *     XXXXX     row 5: cols 2,3,4,5,6
 *      XXX      row 6: cols 3,4,5
 *       X       row 7: only col 4
 */
function isValidDiamondCoordinate(row: number, column: number, size: number): boolean {
  // Diamond must be odd-sized for symmetry
  const center = Math.ceil(size / 2);

  // Distance from center row and column
  const rowDist = Math.abs(row - center);
  const colDist = Math.abs(column - center);

  // Manhattan distance (L1 norm) defines the diamond
  // Valid if manhattan distance from center <= (size - 1) / 2
  const maxDist = Math.floor(size / 2);
  return (rowDist + colDist) <= maxDist;
}

/**
 * Check if a coordinate is valid for a hexagonal shape
 * Hexagon has flat top/bottom edges
 */
function isValidHexagonCoordinate(row: number, column: number, size: number): boolean {
  const center = Math.ceil(size / 2);
  const rowDist = Math.abs(row - center);
  const colDist = Math.abs(column - center);

  // Hexagon is like a diamond but with flatter top/bottom
  // This is a simplified version - true hexagonal grids need offset coordinates
  const maxDist = Math.floor(size / 2);
  return rowDist <= maxDist && colDist <= maxDist && (rowDist + colDist) <= maxDist + Math.floor(size / 4);
}

/**
 * Check if a coordinate is valid for a circular shape
 * Uses Euclidean distance from center
 */
function isValidCircleCoordinate(row: number, column: number, size: number): boolean {
  const center = Math.ceil(size / 2);
  const radius = size / 2;

  // Euclidean distance from center
  const rowDist = row - center;
  const colDist = column - center;
  const distance = Math.sqrt(rowDist * rowDist + colDist * colDist);

  return distance <= radius;
}

/**
 * Check if a coordinate is valid for the current grid shape
 */
export function isValidGridCoordinate(row: number, column: number): boolean {
  const { shape, size, customValidator } = GRID_SHAPE_CONFIG;

  // Base bounds check
  if (row < 1 || column < 1 || row > size || column > size) {
    return false;
  }

  switch (shape) {
    case 'square':
      return true; // All coordinates within bounds are valid

    case 'diamond':
      return isValidDiamondCoordinate(row, column, size);

    case 'hexagon':
      return isValidHexagonCoordinate(row, column, size);

    case 'circle':
      return isValidCircleCoordinate(row, column, size);

    case 'custom':
      return customValidator ? customValidator(row, column) : false;

    default:
      return true;
  }
}

/**
 * Generate grid addresses for the current shape
 * Only includes valid coordinates
 */
export function generateShapedGridAddresses(config: GridShapeConfig): readonly string[] {
  const addresses: string[] = [];

  for (let row = 1; row <= config.size; row++) {
    for (let column = 1; column <= config.size; column++) {
      // Store current config temporarily to use isValidGridCoordinate
      const prevConfig = GRID_SHAPE_CONFIG;
      GRID_SHAPE_CONFIG = config;

      if (isValidGridCoordinate(row, column)) {
        addresses.push(`R${row}C${column}`);
      }

      GRID_SHAPE_CONFIG = prevConfig;
    }
  }

  return Object.freeze(addresses);
}

/**
 * Set the grid shape configuration
 * This regenerates grid addresses and updates validation
 */
export function setGridShape(config: Partial<GridShapeConfig>): void {
  GRID_SHAPE_CONFIG = {
    ...GRID_SHAPE_CONFIG,
    ...config,
  };

  // Validate size constraints
  const size = GRID_SHAPE_CONFIG.size;
  if (size < 4 || size > 20) {
    throw new Error(`Grid size must be between 4 and 20, got ${size}`);
  }

  // For diamond/circle shapes, recommend odd sizes for symmetry
  if ((GRID_SHAPE_CONFIG.shape === 'diamond' || GRID_SHAPE_CONFIG.shape === 'circle') && size % 2 === 0) {
    console.warn(`${GRID_SHAPE_CONFIG.shape} shape works best with odd sizes. Consider using ${size + 1} instead of ${size}`);
  }
}

/**
 * Get grid statistics for current shape
 */
export function getGridShapeStats() {
  const addresses = generateShapedGridAddresses(GRID_SHAPE_CONFIG);
  const { shape, size } = GRID_SHAPE_CONFIG;

  return {
    shape,
    size,
    totalTiles: addresses.length,
    boundingBox: `${size}x${size}`,
    efficiency: `${(addresses.length / (size * size) * 100).toFixed(1)}%`,
  };
}

/**
 * Preset grid shape configurations
 */
export const GRID_SHAPE_PRESETS = {
  // Standard square grids
  SQUARE_SMALL: { shape: 'square' as GridShape, size: 8 },
  SQUARE_NORMAL: { shape: 'square' as GridShape, size: 10 },
  SQUARE_LARGE: { shape: 'square' as GridShape, size: 12 },

  // Diamond grids (best with odd sizes)
  DIAMOND_SMALL: { shape: 'diamond' as GridShape, size: 7 },
  DIAMOND_NORMAL: { shape: 'diamond' as GridShape, size: 9 },
  DIAMOND_LARGE: { shape: 'diamond' as GridShape, size: 11 },

  // Circle grids
  CIRCLE_SMALL: { shape: 'circle' as GridShape, size: 7 },
  CIRCLE_NORMAL: { shape: 'circle' as GridShape, size: 9 },
  CIRCLE_LARGE: { shape: 'circle' as GridShape, size: 11 },

  // Hexagon grids
  HEXAGON_SMALL: { shape: 'hexagon' as GridShape, size: 7 },
  HEXAGON_NORMAL: { shape: 'hexagon' as GridShape, size: 9 },
  HEXAGON_LARGE: { shape: 'hexagon' as GridShape, size: 11 },
} as const;

/**
 * Example: Custom cross shape
 */
export function createCrossShape(size: number): GridShapeConfig {
  const center = Math.ceil(size / 2);
  const armWidth = Math.floor(size / 3);

  return {
    shape: 'custom',
    size,
    customValidator: (row: number, column: number) => {
      // Valid if in horizontal or vertical arm of cross
      const inHorizontalArm = Math.abs(row - center) <= armWidth;
      const inVerticalArm = Math.abs(column - center) <= armWidth;
      return inHorizontalArm || inVerticalArm;
    },
  };
}

/**
 * Example: Custom plus shape (thinner cross)
 */
export function createPlusShape(size: number): GridShapeConfig {
  const center = Math.ceil(size / 2);

  return {
    shape: 'custom',
    size,
    customValidator: (row: number, column: number) => {
      // Valid only on center row or center column
      return row === center || column === center;
    },
  };
}

/**
 * Visualize grid shape in console (for debugging)
 */
export function visualizeGridShape(config?: GridShapeConfig): string {
  const currentConfig = config || GRID_SHAPE_CONFIG;
  const prevConfig = GRID_SHAPE_CONFIG;
  GRID_SHAPE_CONFIG = currentConfig;

  const lines: string[] = [];
  lines.push(`\n${currentConfig.shape.toUpperCase()} Grid (size ${currentConfig.size}):`);
  lines.push('');

  for (let row = 1; row <= currentConfig.size; row++) {
    let line = '';
    for (let column = 1; column <= currentConfig.size; column++) {
      line += isValidGridCoordinate(row, column) ? '█ ' : '· ';
    }
    lines.push(line);
  }

  // Calculate stats with current config
  const addresses = generateShapedGridAddresses(currentConfig);
  const totalTiles = addresses.length;
  const efficiency = `${(totalTiles / (currentConfig.size * currentConfig.size) * 100).toFixed(1)}%`;

  GRID_SHAPE_CONFIG = prevConfig;

  lines.push('');
  lines.push(`Total tiles: ${totalTiles}`);
  lines.push(`Efficiency: ${efficiency} of bounding box`);

  return lines.join('\n');
}
