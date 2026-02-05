import type { Shape, Block, ColorName } from '../../../types/core';
import { rotateShape, cloneShape, makeRandomColor } from '../shapeTransforms';

/**
 * Shape generation functions - Templates and random generation
 */

/**
 * Helper function to create an empty block
 */
function createEmptyBlock(): Block {
  return { color: makeRandomColor(), isFilled: false };
}

/**
 * Helper function to create a filled block with a specific color
 */
function createFilledBlock(color: ColorName): Block {
  return { color, isFilled: true };
}

/**
 * Generate an I-piece (4-block line) in base orientation with specified color
 */
export function generateIPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), _(), _(), _()],
    [X(), X(), X(), X()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate an O-piece (2x2 square) with specified color
 */
export function generateOPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), X(), X(), _()],
    [_(), X(), X(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a T-piece in base orientation with specified color
 */
export function generateTPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), X(), _(), _()],
    [X(), X(), X(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate an S-piece in base orientation with specified color
 */
export function generateSPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), X(), X(), _()],
    [X(), X(), _(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a Z-piece in base orientation with specified color
 */
export function generateZPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [X(), X(), _(), _()],
    [_(), X(), X(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a J-piece in base orientation with specified color
 */
export function generateJPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [X(), _(), _(), _()],
    [X(), X(), X(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate an L-piece in base orientation with specified color
 */
export function generateLPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [X(), X(), X(), _()],
    [X(), _(), _(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a 3x3 square piece (9 blocks)
 */
export function generate3x3Piece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [X(), X(), X(), _()],
    [X(), X(), X(), _()],
    [X(), X(), X(), _()],
  ];
}

/**
 * Generate a 3x2 rectangle piece (6 blocks)
 */
export function generate3x2Piece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [X(), X(), X(), _()],
    [X(), X(), X(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a 5x1 line piece (5 blocks)
 * Note: This requires a 5x5 grid if we want to rotate it fully without clipping,
 * but our Shape type is 4x4. We'll fit it in 4x4 if possible or truncate?
 * Wait, Shape is Block[][]. It's usually 4x4.
 * If I need 5x1, I need to expand the Shape definition or accept that it won't fit in 4x4.
 * The user said "shapes (stored as 4x4 grids)".
 * A 5x1 shape cannot fit in a 4x4 grid.
 * I will assume the user knows this and maybe I should use a larger grid for this specific shape,
 * or maybe the user meant 4x1?
 * "add a 3x3 shape... a 3x2 shape, a 5x1 shape"
 * If the system is hardcoded to 4x4, 5x1 will break it.
 * However, looking at `src/types/index.ts` (inferred), Shape is `Block[][]`.
 * Let's check if the renderer handles larger shapes.
 * `getShapeBounds` loops through `shape.length` and `shape[row].length`.
 * So it supports dynamic sizes!
 * I will make the 5x1 shape a 5x5 grid (or 1x5).
 */
export function generate5x1Piece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  // 5x5 grid to accommodate rotation
  return [
    [_(), _(), _(), _(), _()],
    [_(), _(), _(), _(), _()],
    [X(), X(), X(), X(), X()],
    [_(), _(), _(), _(), _()],
    [_(), _(), _(), _(), _()],
  ];
}

/**
 * Generate a 3x1 line piece (3 blocks)
 */
export function generate3x1Piece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), _(), _(), _()],
    [X(), X(), X(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a 2x1 line piece (2 blocks)
 */
export function generate2x1Piece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), _(), _(), _()],
    [X(), X(), _(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate a 1x1 dot piece (1 block)
 */
export function generate1x1Piece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [_(), _(), _(), _()],
    [X(), _(), _(), _()],
    [_(), _(), _(), _()],
  ];
}

/**
 * Generate an "Even L" piece (3x3 with 2x2 missing = 5 blocks)
 */
export function generateEvenLPiece(color: ColorName): Shape {
  const _ = createEmptyBlock;
  const X = () => createFilledBlock(color);

  return [
    [_(), _(), _(), _()],
    [X(), X(), X(), _()],
    [X(), _(), _(), _()],
    [X(), _(), _(), _()],
  ];
}

/**
 * Generate the super combo shape - a 4x4 diagonal piece (easter egg)
 */
export function generateSuperShape(): Shape {
  const color = makeRandomColor();
  const _ = () => ({ color: makeRandomColor(), isFilled: false });
  const X = () => ({ color, isFilled: true });

  // Create diagonal pattern with random orientation
  const baseTemplate = [
    [X(), _(), _(), _()],
    [_(), X(), _(), _()],
    [_(), _(), X(), _()],
    [_(), _(), _(), X()],
  ];

  // Randomly rotate 0 or 1 times (diagonal or anti-diagonal)
  const rotations = Math.floor(Math.random() * 2);
  let shape = cloneShape(baseTemplate);

  for (let i = 0; i < rotations; i++) {
    shape = rotateShape(shape);
  }

  return shape;
}

/**
 * Generate a random shape with balanced probability distribution
 * Each base shape type has equal likelihood of being selected, then orientation is randomly chosen
 *
 * Shape types and their rotation counts:
 * - I-piece (4-block line): 2 unique rotations
 * - O-piece (square): 1 rotation (no change)
 * - T-piece: 4 rotations
 * - S-piece: 2 unique rotations
 * - Z-piece: 2 unique rotations
 * - L-piece: 4 rotations
 * - J-piece: 4 rotations
 *
 * Note: Super combo piece is not in regular rotation - only generated as easter egg
 */
export function generateRandomShape(): Shape {
  const color = makeRandomColor();
  const _ = () => ({ color: makeRandomColor(), isFilled: false }); // empty block
  const X = () => ({ color, isFilled: true }); // filled block

  // Define base shape templates and their unique rotation counts
  const shapeTemplates: Array<{ template: Shape; rotations: number }> = [
    // I-piece (4-block line) - 2 unique rotations
    {
      template: [
        [_(), _(), _(), _()],
        [_(), _(), _(), _()],
        [X(), X(), X(), X()],
        [_(), _(), _(), _()],
      ],
      rotations: 2,
    },
    // O-piece (2x2 square) - 1 rotation (all rotations are identical)
    {
      template: [
        [_(), _(), _(), _()],
        [_(), X(), X(), _()],
        [_(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 1,
    },
    // T-piece - 4 rotations
    {
      template: [
        [_(), _(), _(), _()],
        [_(), X(), _(), _()],
        [X(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 4,
    },
    // S-piece - 2 unique rotations
    {
      template: [
        [_(), _(), _(), _()],
        [_(), X(), X(), _()],
        [X(), X(), _(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 2,
    },
    // Z-piece - 2 unique rotations
    {
      template: [
        [_(), _(), _(), _()],
        [X(), X(), _(), _()],
        [_(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 2,
    },
    // J-piece - 4 rotations
    {
      template: [
        [_(), _(), _(), _()],
        [X(), _(), _(), _()],
        [X(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 4,
    },
    // L-piece - 4 rotations
    {
      template: [
        [_(), _(), _(), _()],
        [X(), X(), X(), _()],
        [X(), _(), _(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 4,
    },
  ];

  // Select a random shape template
  const { template, rotations } = shapeTemplates[Math.floor(Math.random() * shapeTemplates.length)];

  // Apply a random number of rotations (0 to rotations-1)
  const numRotations = Math.floor(Math.random() * rotations);
  let shape = cloneShape(template);

  for (let i = 0; i < numRotations; i++) {
    shape = rotateShape(shape);
  }

  return shape;
}
