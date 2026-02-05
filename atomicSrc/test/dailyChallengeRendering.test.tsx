/**
 * Tests for daily challenge grid rendering
 * 
 * In daily challenge mode, only tiles that exist in the tiles Map should be rendered.
 * Out-of-bounds areas (missing tiles) should not render at all.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Grid } from '../main/Shared/Grid';
import { TetrixStateContext, TetrixDispatchContext } from '../main/App/contexts/TetrixContext';
import type { TetrixReducerState, TetrixDispatch } from '../main/App/types/gameState';
import { initialState } from '../main/App/reducers';

describe('Daily Challenge Grid Rendering', () => {
  const mockDispatch: TetrixDispatch = () => {};

  it('should render all tiles in infinite mode', () => {
    // Create state for infinite mode with standard 10x10 grid
    const state: TetrixReducerState = {
      ...initialState,
      gameMode: 'infinite',
    };

    const { container } = render(
      <TetrixDispatchContext.Provider value={mockDispatch}>
        <TetrixStateContext.Provider value={state}>
          <Grid width={10} height={10} />
        </TetrixStateContext.Provider>
      </TetrixDispatchContext.Provider>
    );

    // Should render 100 tiles (10x10 grid)
    const tiles = container.querySelectorAll('.tetrix-tile');
    expect(tiles).toHaveLength(100);
  });

  it('should only render existing tiles in daily challenge mode', () => {
    // Create state for daily challenge with partial grid
    // Only include center 4 tiles: R5C5, R5C6, R6C5, R6C6
    const partialTiles = new Map();
    ['R5C5', 'R5C6', 'R6C5', 'R6C6'].forEach(position => {
      partialTiles.set(position, {
        position,
        backgroundColor: 'blue' as const,
        block: { isFilled: false, color: 'grey' as const },
        activeAnimations: []
      });
    });

    const state: TetrixReducerState = {
      ...initialState,
      gameMode: 'daily',
      tiles: partialTiles,
    };

    const { container } = render(
      <TetrixDispatchContext.Provider value={mockDispatch}>
        <TetrixStateContext.Provider value={state}>
          <Grid width={10} height={10} />
        </TetrixStateContext.Provider>
      </TetrixDispatchContext.Provider>
    );

    // Should only render 4 tiles (the ones in the tiles Map)
    const tiles = container.querySelectorAll('.tetrix-tile');
    expect(tiles).toHaveLength(4);
  });

  it('should not render gray tiles for missing positions in daily challenge', () => {
    // Create a diamond-shaped grid for daily challenge
    const diamondTiles = new Map();
    const positions = [
      'R3C5', 'R3C6', // Top row
      'R4C4', 'R4C5', 'R4C6', 'R4C7', // Second row
      'R5C3', 'R5C4', 'R5C5', 'R5C6', 'R5C7', 'R5C8', // Middle row
      'R6C4', 'R6C5', 'R6C6', 'R6C7', // Second to last row
      'R7C5', 'R7C6', // Bottom row
    ];
    
    positions.forEach(position => {
      diamondTiles.set(position, {
        position,
        backgroundColor: 'red' as const,
        block: { isFilled: false, color: 'grey' as const },
        activeAnimations: []
      });
    });

    const state: TetrixReducerState = {
      ...initialState,
      gameMode: 'daily',
      tiles: diamondTiles,
    };

    const { container } = render(
      <TetrixDispatchContext.Provider value={mockDispatch}>
        <TetrixStateContext.Provider value={state}>
          <Grid width={10} height={10} />
        </TetrixStateContext.Provider>
      </TetrixDispatchContext.Provider>
    );

    // Should only render diamond tiles (18 total)
    const tiles = container.querySelectorAll('.tetrix-tile');
    expect(tiles).toHaveLength(18);

    // In daily challenge mode, tiles with custom backgrounds should not use default gray classes
    // All rendered tiles should have custom backgrounds
    const customBackgroundTiles = container.querySelectorAll('.tile-base-custom');
    expect(customBackgroundTiles.length).toBeGreaterThan(0);
  });
});
