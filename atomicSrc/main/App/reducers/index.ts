/**
 * Combined Reducer - Composes all domain-specific reducers
 *
 * This follows the reducer composition pattern where each domain reducer
 * handles its own slice of actions, and they're applied in sequence.
 *
 * Order matters: Some reducers depend on state changes from previous reducers.
 * For example, tileReducer (COMPLETE_PLACEMENT) needs to run and update tiles/score
 * before other reducers might need that updated state.
 */

import type { TetrixReducerState, TetrixAction } from '../types/gameState';

import { dragReducer } from './dragReducer';
import { gameStateReducer, initialGameState } from './gameStateReducer';
import { scoringReducer } from './scoringReducer';
import { shapeReducer } from './shapeReducer';
import { tileReducer } from './tileReducer';

export const initialState: TetrixReducerState = initialGameState;

/**
 * Combined reducer that applies domain reducers in sequence
 *
 * Each reducer only handles its own actions and returns unchanged state for others.
 * This creates a clean separation of concerns while maintaining a single state tree.
 */
export function tetrixReducer(state: TetrixReducerState, action: TetrixAction): TetrixReducerState {
  // Apply each domain reducer in sequence
  // Each reducer will only modify state if it handles the action type
  let newState = state;

  // 1. Tile/Grid operations (includes COMPLETE_PLACEMENT which updates tiles & score)
  newState = tileReducer(newState, action);

  // 2. Drag operations (shape selection, mouse tracking, placement animations)
  newState = dragReducer(newState, action);

  // 3. Shape management (queue, rotation, addition/removal)
  newState = shapeReducer(newState, action);

  // 4. Scoring operations (gem display, spending, gem icon positioning)
  newState = scoringReducer(newState, action);

  // 5. Game state (levels, map, modifiers, reset, load)
  newState = gameStateReducer(newState, action);

  return newState;
}
