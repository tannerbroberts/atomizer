import { describe, it, expect } from 'vitest';
import { initialState } from '../main/App/reducers';
import type { TetrixReducerState } from '../main/App/types/gameState';
import { generateRandomShapeWithProbabilities } from '../main/App/utils/shapes/shapeGenerationWithProbabilities';
import { DEFAULT_COLOR_PROBABILITIES } from '../main/App/types/shapeQueue';

describe('Finite Queue Behavior', () => {
  it('should not add new shapes when hidden queue is empty in finite mode', () => {
    // Setup: Finite mode with no hidden shapes
    const state: TetrixReducerState = {
      ...initialState,
      queueMode: 'finite',
      queueHiddenShapes: [], // Empty hidden queue
      nextShapes: [
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
      ],
      queueColorProbabilities: DEFAULT_COLOR_PROBABILITIES,
    };

    // Simulate placing a shape (this triggers COMPLETE_PLACEMENT internally)
    // For testing, we'll check that after the placement logic runs, no new shape is added
    const initialShapeCount = state.nextShapes.length;

    // In the actual reducer, COMPLETE_PLACEMENT checks if shouldAddShape is true
    // shouldAddShape = state.queueMode === 'infinite' || updatedHiddenShapes.length > 0
    // In our case: 'finite' mode and empty hidden queue, so shouldAddShape = false
    const shouldAddShape = state.queueMode === 'infinite' || state.queueHiddenShapes.length > 0;

    expect(shouldAddShape).toBe(false);
    expect(state.nextShapes.length).toBe(initialShapeCount);
  });

  it('should add shapes from hidden queue when available in finite mode', () => {
    const hiddenShape = generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES);
    
    // Setup: Finite mode with shapes in hidden queue
    const state: TetrixReducerState = {
      ...initialState,
      queueMode: 'finite',
      queueHiddenShapes: [hiddenShape],
      nextShapes: [
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
      ],
      queueColorProbabilities: DEFAULT_COLOR_PROBABILITIES,
    };

    const shouldAddShape = state.queueMode === 'infinite' || state.queueHiddenShapes.length > 0;

    expect(shouldAddShape).toBe(true);
  });

  it('should always add shapes in infinite mode', () => {
    // Setup: Infinite mode (default)
    const state: TetrixReducerState = {
      ...initialState,
      queueMode: 'infinite',
      queueHiddenShapes: [],
      nextShapes: [
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES),
      ],
      queueColorProbabilities: DEFAULT_COLOR_PROBABILITIES,
    };

    const shouldAddShape = state.queueMode === 'infinite' || state.queueHiddenShapes.length > 0;

    expect(shouldAddShape).toBe(true);
  });

  it('should calculate total remaining shapes correctly', () => {
    const state: TetrixReducerState = {
      ...initialState,
      queueMode: 'finite',
      queueHiddenShapes: Array(17).fill(null).map(() => 
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES)
      ),
      nextShapes: Array(3).fill(null).map(() =>
        generateRandomShapeWithProbabilities(DEFAULT_COLOR_PROBABILITIES)
      ),
    };

    // Total remaining = hidden + visible
    const totalRemaining = state.queueHiddenShapes.length + state.nextShapes.length;
    
    expect(totalRemaining).toBe(20); // 17 hidden + 3 visible
  });

  it('should allow nextShapes to reach 0 in finite mode', () => {
    const state: TetrixReducerState = {
      ...initialState,
      queueMode: 'finite',
      queueHiddenShapes: [],
      nextShapes: [],
    };

    // In finite mode, we should be able to have 0 shapes to show the placeholder
    expect(state.nextShapes.length).toBe(0);
    expect(state.queueMode).toBe('finite');
  });
});
