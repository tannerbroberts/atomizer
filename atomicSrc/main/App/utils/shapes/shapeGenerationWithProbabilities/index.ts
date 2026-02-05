import type { Shape, ColorName } from '../../../types/core';
import type { ColorProbability } from '../../../types/shapeQueue';
import { rotateShape, cloneShape } from '../shapeTransforms';

/**
 * Shape generation with configurable color probabilities
 */

/**
 * Select a random color based on probability weights
 * @param probabilities Array of colors and their weights
 * @returns Selected color
 */
function selectColorByProbability(probabilities: ColorProbability[]): ColorName {
  // Calculate total weight
  const totalWeight = probabilities.reduce((sum, p) => sum + p.weight, 0);

  if (totalWeight === 0) {
    // Fallback to first color if no weights
    return probabilities[0]?.color || 'blue';
  }

  // Generate random number between 0 and totalWeight
  const random = Math.random() * totalWeight;

  // Find which color this random value corresponds to
  let cumulativeWeight = 0;
  for (const { color, weight } of probabilities) {
    cumulativeWeight += weight;
    if (random < cumulativeWeight) {
      return color;
    }
  }

  // Fallback (should never reach here)
  return probabilities[probabilities.length - 1].color;
}

/**
 * Generate a random shape with specified color probabilities
 * @param colorProbabilities Array of colors and their weights
 * @returns Random shape with color selected by probability
 */
export function generateRandomShapeWithProbabilities(
  colorProbabilities: ColorProbability[],
): Shape {
  const color = selectColorByProbability(colorProbabilities);

  // Use same logic as generateRandomShape but with selected color
  const _ = () => ({ color: selectColorByProbability(colorProbabilities), isFilled: false });
  const X = () => ({ color, isFilled: true });

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

/**
 * Generate multiple shapes with color probabilities
 * @param count Number of shapes to generate
 * @param colorProbabilities Array of colors and their weights
 * @returns Array of generated shapes
 */
export function generateShapesWithProbabilities(
  count: number,
  colorProbabilities: ColorProbability[],
): Shape[] {
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    shapes.push(generateRandomShapeWithProbabilities(colorProbabilities));
  }
  return shapes;
}

/**
 * Shape type enum for weighted selection
 */
type ShapeType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/**
 * Generate a random shape with specified color probabilities and optional grandpa mode
 * In grandpa mode, Z and S shapes occur at 1/4 their normal frequency
 * @param colorProbabilities Array of colors and their weights
 * @param grandpaMode If true, reduce Z and S shape frequency to 1/4
 * @returns Random shape with color selected by probability
 */
export function generateRandomShapeWithGrandpaMode(
  colorProbabilities: ColorProbability[],
  grandpaMode: boolean = false,
): Shape {
  const color = selectColorByProbability(colorProbabilities);

  const _ = () => ({ color: selectColorByProbability(colorProbabilities), isFilled: false });
  const X = () => ({ color, isFilled: true });

  // Shape types with their weights (normal = 1, grandpa mode reduces Z/S to 0.25)
  const shapeWeights: Array<{ type: ShapeType; weight: number }> = [
    { type: 'I', weight: 1 },
    { type: 'O', weight: 1 },
    { type: 'T', weight: 1 },
    { type: 'S', weight: grandpaMode ? 0.25 : 1 },
    { type: 'Z', weight: grandpaMode ? 0.25 : 1 },
    { type: 'J', weight: 1 },
    { type: 'L', weight: 1 },
  ];

  // Select shape type based on weights
  const totalWeight = shapeWeights.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  let selectedType: ShapeType = 'I';

  for (const { type, weight } of shapeWeights) {
    cumulativeWeight += weight;
    if (random < cumulativeWeight) {
      selectedType = type;
      break;
    }
  }

  // Map shape type to template
  const shapeTemplates: Record<ShapeType, { template: Shape; rotations: number }> = {
    'I': {
      template: [
        [_(), _(), _(), _()],
        [_(), _(), _(), _()],
        [X(), X(), X(), X()],
        [_(), _(), _(), _()],
      ],
      rotations: 2,
    },
    'O': {
      template: [
        [_(), _(), _(), _()],
        [_(), X(), X(), _()],
        [_(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 1,
    },
    'T': {
      template: [
        [_(), _(), _(), _()],
        [_(), X(), _(), _()],
        [X(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 4,
    },
    'S': {
      template: [
        [_(), _(), _(), _()],
        [_(), X(), X(), _()],
        [X(), X(), _(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 2,
    },
    'Z': {
      template: [
        [_(), _(), _(), _()],
        [X(), X(), _(), _()],
        [_(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 2,
    },
    'J': {
      template: [
        [_(), _(), _(), _()],
        [X(), _(), _(), _()],
        [X(), X(), X(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 4,
    },
    'L': {
      template: [
        [_(), _(), _(), _()],
        [X(), X(), X(), _()],
        [X(), _(), _(), _()],
        [_(), _(), _(), _()],
      ],
      rotations: 4,
    },
  };

  const { template, rotations } = shapeTemplates[selectedType];
  const numRotations = Math.floor(Math.random() * rotations);
  let shape = cloneShape(template);

  for (let i = 0; i < numRotations; i++) {
    shape = rotateShape(shape);
  }

  return shape;
}
