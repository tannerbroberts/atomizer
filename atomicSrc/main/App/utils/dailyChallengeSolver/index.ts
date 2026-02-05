import type { Shape, TilesSet, ColorName } from '../../types/core';
import {
  generateIPiece, generateOPiece, generateTPiece, generateSPiece, generateZPiece, generateJPiece, generateLPiece,
  generate3x3Piece, generate3x2Piece, generate5x1Piece, generate3x1Piece, generate2x1Piece, generate1x1Piece, generateEvenLPiece,
} from '../shapes/shapeGeneration';
import { getFilledBlocks } from '../shapes/shapeGeometry';
import { rotateShape } from '../shapes/shapeTransforms';

// Simple seeded RNG (Linear Congruential Generator)
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a number between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Fisher-Yates shuffle
  shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

type SolverShape = {
  shape: Shape;
  name: string;
};

// All available shape generators
const SHAPE_GENERATORS = [
  { gen: generateIPiece, name: 'I' },
  { gen: generateOPiece, name: 'O' },
  { gen: generateTPiece, name: 'T' },
  { gen: generateSPiece, name: 'S' },
  { gen: generateZPiece, name: 'Z' },
  { gen: generateJPiece, name: 'J' },
  { gen: generateLPiece, name: 'L' },
  { gen: generate3x3Piece, name: '3x3' },
  { gen: generate3x2Piece, name: '3x2' },
  { gen: generate5x1Piece, name: '5x1' },
  { gen: generate3x1Piece, name: '3x1' },
  { gen: generate2x1Piece, name: '2x1' },
  { gen: generate1x1Piece, name: '1x1' },
  { gen: generateEvenLPiece, name: 'EvenL' },
];

// Pre-compute all unique rotations for each shape type
// We use a dummy color 'blue' for generation, but will overwrite colors during solving
const ALL_SHAPE_VARIANTS: SolverShape[] = [];

SHAPE_GENERATORS.forEach(({ gen, name }) => {
  const baseShape = gen('blue');
  const variants: Shape[] = [baseShape];

  // Generate rotations
  let current = baseShape;
  for (let i = 0; i < 3; i++) {
    current = rotateShape(current);
    // Check if this rotation is unique
    const isUnique = !variants.some((v) => areShapesEqual(v, current));
    if (isUnique) {
      variants.push(current);
    }
  }

  variants.forEach((v) => {
    ALL_SHAPE_VARIANTS.push({ shape: v, name });
  });
});

function areShapesEqual(s1: Shape, s2: Shape): boolean {
  if (s1.length !== s2.length || s1[0].length !== s2[0].length) return false;
  for (let r = 0; r < s1.length; r++) {
    for (let c = 0; c < s1[r].length; c++) {
      if (s1[r][c].isFilled !== s2[r][c].isFilled) return false;
    }
  }
  return true;
}

export type SolvedShape = {
  shape: Shape;
  gridPosition: { row: number; col: number }; // Top-left of the shape grid
};

// State for best-first search
type PartialSolution = {
  grid: (ColorName | null)[][];
  usedShapes: SolvedShape[];
  score: number;
  smallShapesUsed: { [key: string]: number }; // Track usage of small shapes
};

// Calculate heuristic score for a partial solution
function calculateScore(
  grid: (ColorName | null)[][],
  usedShapes: SolvedShape[],
  smallShapesUsed: { [key: string]: number },
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): number {
  let score = 0;

  // Penalty for small shapes (heavily discourage 1x1 and 2x1)
  score -= (smallShapesUsed['1x1'] || 0) * 15;
  score -= (smallShapesUsed['2x1'] || 0) * 8;
  score -= (smallShapesUsed['3x1'] || 0) * 4;

  // Reward for larger shapes
  for (const solved of usedShapes) {
    const size = getFilledBlocks(solved.shape).length;
    if (size >= 4) {
      score += 10;
    }
    if (size >= 6) {
      score += 5; // Extra bonus for very large shapes
    }
  }

  // Penalty for isolated/trapped cells (cells that can't be easily filled)
  let trappedCells = 0;
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (grid[r][c] !== null) {
        // Check if this cell has limited neighbors (potential trap)
        let neighbors = 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= minRow && nr <= maxRow && nc >= minCol && nc <= maxCol && grid[nr][nc] !== null) {
            neighbors++;
          }
        }
        // Isolated cells (0-1 neighbors) are hard to fill efficiently
        if (neighbors <= 1) {
          trappedCells++;
        }
      }
    }
  }
  score -= trappedCells * 12;

  // Bonus for progress (tiles covered)
  score += usedShapes.length * 3;

  return score;
}

export function solveDailyChallenge(tiles: TilesSet, seed: number): SolvedShape[] | null {
  const rng = new SeededRNG(seed);

  // Convert TilesSet to a boolean grid for easier processing
  // 1-indexed to 0-indexed for internal solver logic
  const gridHeight = 20; // Max height
  const gridWidth = 20; // Max width
  const grid: (ColorName | null)[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(null));

  let minRow = gridHeight, maxRow = 0, minCol = gridWidth, maxCol = 0;
  let tileCount = 0;

  tiles.forEach((tile, key) => {
    if (tile.block.isFilled) {
      // Parse key "R{row}C{col}"
      const match = key.match(/R(\d+)C(\d+)/);
      if (!match) return;

      const r = parseInt(match[1]) - 1; // 0-indexed
      const c = parseInt(match[2]) - 1; // 0-indexed

      if (r >= 0 && r < gridHeight && c >= 0 && c < gridWidth) {
        grid[r][c] = tile.block.color;
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
        tileCount++;
      }
    }
  });

  if (tileCount === 0) return [];

  // Priority queue implemented as sorted array (simple for small search spaces)
  const queue: PartialSolution[] = [{
    grid: grid.map((row) => [...row]),
    usedShapes: [],
    score: 0,
    smallShapesUsed: {},
  }];

  let iterations = 0;
  const MAX_ITERATIONS = 50000; // Prevent infinite loops

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Pop best solution
    queue.sort((a, b) => b.score - a.score);
    const current = queue.shift()!;

    // Find first empty cell
    let targetR = -1, targetC = -1;
    outer: for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (current.grid[r][c] !== null) {
          targetR = r;
          targetC = c;
          break outer;
        }
      }
    }

    // If no target found, we have a complete solution!
    if (targetR === -1) {
      // Randomize the order of shapes in the queue so it doesn't look like a linear scan
      return rng.shuffle(current.usedShapes);
    }

    // Find all shapes that can cover targetR, targetC
    const candidates: { shape: Shape, gridPos: { row: number, col: number }, variant: SolverShape }[] = [];

    for (const variant of ALL_SHAPE_VARIANTS) {
      const shape = variant.shape;
      const filledBlocks = getFilledBlocks(shape);
      if (filledBlocks.length === 0) continue;

      // Try all positions where this shape can cover the target cell
      for (const fb of filledBlocks) {
        const shapeGridRow = targetR - fb.row;
        const shapeGridCol = targetC - fb.col;

        // Check if this placement is valid
        let isValid = true;
        const coloredShape: Shape = shape.map((row) => row.map((b) => ({ ...b }))); // Deep copy

        for (const block of filledBlocks) {
          const gridR = shapeGridRow + block.row;
          const gridC = shapeGridCol + block.col;

          // Check bounds
          if (gridR < 0 || gridR >= gridHeight || gridC < 0 || gridC >= gridWidth) {
            isValid = false;
            break;
          }

          // Check if grid has a tile here
          if (current.grid[gridR][gridC] === null) {
            isValid = false;
            break;
          }

          // Apply color from grid to shape
          coloredShape[block.row][block.col].color = current.grid[gridR][gridC]!;
        }

        if (isValid) {
          candidates.push({
            shape: coloredShape,
            gridPos: { row: shapeGridRow + 1, col: shapeGridCol + 1 },
            variant,
          });
        }
      }
    }

    // Limit candidates with seeded randomization to keep queue manageable
    const shuffledCandidates = rng.shuffle(candidates);
    const limitedCandidates = shuffledCandidates.slice(0, 30); // Explore top 30 options

    // Create new states for each candidate
    for (const candidate of limitedCandidates) {
      const nextGrid = current.grid.map((row) => [...row]);
      const filledBlocks = getFilledBlocks(candidate.shape);

      // Remove covered tiles from grid
      const startR = candidate.gridPos.row - 1;
      const startC = candidate.gridPos.col - 1;

      for (const fb of filledBlocks) {
        nextGrid[startR + fb.row][startC + fb.col] = null;
      }

      // Track small shape usage
      const nextSmallShapesUsed = { ...current.smallShapesUsed };
      const shapeSize = filledBlocks.length;
      if (shapeSize <= 3) {
        const key = `${shapeSize}x1`; // Simplified tracking
        nextSmallShapesUsed[key] = (nextSmallShapesUsed[key] || 0) + 1;
      }

      const nextSolution: PartialSolution = {
        grid: nextGrid,
        usedShapes: [...current.usedShapes, { shape: candidate.shape, gridPosition: candidate.gridPos }],
        smallShapesUsed: nextSmallShapesUsed,
        score: 0, // Will be calculated below
      };

      nextSolution.score = calculateScore(
        nextGrid,
        nextSolution.usedShapes,
        nextSolution.smallShapesUsed,
        minRow,
        maxRow,
        minCol,
        maxCol,
      );

      queue.push(nextSolution);
    }

    // Keep queue size manageable
    if (queue.length > 1000) {
      queue.sort((a, b) => b.score - a.score);
      queue.splice(500); // Keep top 500
    }
  }

  // If we exhausted iterations, return null (no solution found)
  return null;
}
