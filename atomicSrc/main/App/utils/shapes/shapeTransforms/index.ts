import type { Shape, ColorName } from '../../../types/core';

/**
 * Shape transformation functions - Rotation and cloning operations
 */

/**
 * Rotate a shape 90 degrees clockwise
 */
export function rotateShape(shape: Shape): Shape {
  const n = shape.length;
  const rotated: Shape = new Array(n).fill(null).map(() =>
    new Array(n).fill(null).map(() => ({ ...shape[0][0], isFilled: false })));

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      rotated[col][n - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

/**
 * Clone a shape
 */
export function cloneShape(shape: Shape): Shape {
  return shape.map((row) => row.map((block) => ({ ...block })));
}

/**
 * Generate a random color for a shape
 * @param colorCount - Number of colors to use from the palette (1-7). Defaults to 7.
 *                     Colors are used in rainbow order: Grey, Red, Orange, Yellow, Green, Blue, Purple
 */
export function makeRandomColor(colorCount: number = 7): ColorName {
  // Available colors in rainbow order (starting with grey)
  const allColors: ColorName[] = ['grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'];

  // Clamp colorCount to valid range (1-7)
  const count = Math.max(1, Math.min(7, colorCount));

  // Use only the first 'count' colors from the list
  const colors = allColors.slice(0, count);

  const randomColorIndex = Math.floor(Math.random() * colors.length);
  return colors[randomColorIndex];
}
