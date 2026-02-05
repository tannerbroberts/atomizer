import type { Shape, TilesSet } from '../../types/core';
import type { GameMode } from '../../types/gameState';
import { rotateShape } from '../shapes/shapeTransforms';
import { isValidPlacement } from '../shapes/shapeValidation';

/**
 * Check if the game is over (no valid moves left)
 *
 * @param tiles - The current state of the grid
 * @param shapes - The list of available shapes in the queue
 * @param openRotationMenus - The state of rotation menus for each shape
 * @param gameMode - The current game mode (optional, defaults to 'infinite')
 * @returns true if no shape can be placed anywhere on the grid
 */
export function checkGameOver(
  tiles: TilesSet,
  shapes: Shape[],
  openRotationMenus: boolean[],
  gameMode: GameMode = 'infinite',
): boolean {
  // If no shapes left, it's not game over (new ones will spawn)
  if (shapes.length === 0) {
    return false;
  }

  // For each available shape
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    const isRotationUnlocked = openRotationMenus[i];

    // Determine how many rotations we can check
    // If rotation menu is already open for this shape, check all 4 rotations
    // Otherwise, only check the current orientation (1 rotation)
    const rotationsToCheck = isRotationUnlocked ? 4 : 1;

    let currentShape = shape;
    for (let rotation = 0; rotation < rotationsToCheck; rotation++) {
      // Check all possible grid positions
      // The grid is 10x10. The shape is 4x4.
      // We need to check placement where the top-left of the 4x4 grid
      // could be such that the shape fits.
      // Since isValidPlacement handles bounds checking, we can iterate
      // a slightly larger range to be safe.
      // Range: -3 to 10 covers all possibilities where at least one block might be in bounds
      // (though isValidPlacement requires ALL filled blocks to be in bounds)
      for (let row = -3; row <= 10; row++) {
        for (let col = -3; col <= 10; col++) {
          if (isValidPlacement(currentShape, { row, column: col }, tiles, gameMode)) {
            return false; // Found a valid move!
          }
        }
      }

      // Rotate for next iteration (only if we're going to check it)
      if (rotation < rotationsToCheck - 1) {
        currentShape = rotateShape(currentShape);
      }
    }
  }

  return true; // No valid moves found for any shape in any rotation
}
