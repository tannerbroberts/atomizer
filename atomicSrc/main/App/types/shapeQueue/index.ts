/**
 * Shape Queue Types - Queue modes, color probabilities, and queue state
 */

import type { ColorName, Shape } from '../core';

/**
 * Queue mode - determines how shapes are generated and stored
 * - infinite: Shapes generated on-demand, no queue storage
 * - finite: Fixed number of shapes, stored in queue
 */
export type QueueMode = 'infinite' | 'finite';

/**
 * Color probability weight
 * Higher numbers = more likely to appear
 * Total of all weights = denominator for probability calculation
 */
export type ColorProbability = {
  color: ColorName;
  weight: number; // Any positive number (e.g., 1000, 57, 2, etc.)
};

/**
 * Shape queue configuration
 */
export type ShapeQueueConfig = {
  mode: QueueMode;
  colorProbabilities: ColorProbability[]; // Array of colors and their weights
  totalShapes?: number; // Only used in finite mode (e.g., 20 shapes total)
};

/**
 * Shape queue state
 */
export type ShapeQueueState = {
  mode: QueueMode;
  colorProbabilities: ColorProbability[];
  hiddenShapes: Shape[]; // Shapes not currently visible (only in finite mode)
  totalShapes: number; // Total shapes in finite mode, -1 for infinite
};

/**
 * Default color probabilities - equal weight for all colors
 */
export const DEFAULT_COLOR_PROBABILITIES: ColorProbability[] = [
  { color: 'red', weight: 1 },
  { color: 'orange', weight: 1 },
  { color: 'yellow', weight: 1 },
  { color: 'green', weight: 1 },
  { color: 'blue', weight: 1 },
  { color: 'purple', weight: 1 },
];
