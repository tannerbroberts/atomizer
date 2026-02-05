import { describe, expect, it } from 'vitest';
import { tetrixReducer, initialState } from '../main/App/reducers';
import type { ScoreData } from '../main/App/types/scoring';

describe('Test Notification Functionality', () => {
  it('should add score correctly using ADD_SCORE action', () => {
    const scoreData: ScoreData = {
      rowsCleared: 0,
      columnsCleared: 0,
      pointsEarned: 100
    };

    const action = {
      type: 'ADD_SCORE' as const,
      value: { scoreData }
    };

    const newState = tetrixReducer(initialState, action);

    expect(newState.score).toBe(100);
    expect(newState.score).toBe(initialState.score + scoreData.pointsEarned);
  });

  it('should accumulate score correctly with multiple ADD_SCORE actions', () => {
    let state = initialState;

    // Add 50 points
    state = tetrixReducer(state, {
      type: 'ADD_SCORE',
      value: {
        scoreData: {
          rowsCleared: 0,
          columnsCleared: 0,
          pointsEarned: 50
        }
      }
    });
    expect(state.score).toBe(50);

    // Add 75 more points
    state = tetrixReducer(state, {
      type: 'ADD_SCORE',
      value: {
        scoreData: {
          rowsCleared: 0,
          columnsCleared: 0,
          pointsEarned: 75
        }
      }
    });
    expect(state.score).toBe(125);
  });

  it('should handle large currency amounts', () => {
    const largeAmount = 1000000; // 1 million points

    const action = {
      type: 'ADD_SCORE' as const,
      value: {
        scoreData: {
          rowsCleared: 0,
          columnsCleared: 0,
          pointsEarned: largeAmount
        }
      }
    };

    const newState = tetrixReducer(initialState, action);

    expect(newState.score).toBe(largeAmount);
  });
});