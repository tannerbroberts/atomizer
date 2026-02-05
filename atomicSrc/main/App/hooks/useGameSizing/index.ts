import { useState, useEffect, useMemo } from 'react';

import { GRID_SIZE, GRID_GAP } from '../../utils/gridConstants';

export interface GameSizing {
  gridSize: number;
  gridCellSize: number;
  gridGap: number;
  gameControlsButtonSize: number;
}

/**
 * Hook to calculate responsive sizing for game elements
 *
 * Core principle:
 * - Portrait: Grid and controls stack vertically, share available height (2/3 + 1/3)
 * - Landscape: Grid and controls sit side-by-side, share available width (2/3 + 1/3)
 * - Grid is constrained to fit within viewport dimensions (won't overflow)
 * - All buttons in GameControlsPanel use same size (shapes, indicator, turn buttons)
 * - Button size can be scaled by user preference (0.5x to 1.5x)
 */
export const useGameSizing = (buttonSizeMultiplier: number = 1.0): GameSizing => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sizing = useMemo(() => {
    const { width: vw, height: vh } = windowSize;

    // Header takes 10vh
    const headerHeight = vh * 0.1;
    const availableHeight = vh - headerHeight;

    // Determine orientation
    const isPortrait = vw < vh;

    // In portrait: Grid and controls stack vertically (share available height)
    // In landscape: Grid and controls sit side-by-side (share available width)
    // Both need to fit within viewport constraints

    let gridSize: number;
    let gameControlsPanelSize: number;

    // Calculate grid gap first (used for padding calculation)
    const gridGap = GRID_GAP;
    const gridPadding = gridGap * 2; // Grid has padding on all sides

    // Minimum edge spacing: ensure grid stays away from viewport edges
    // This should be at least half a tile's width
    const minEdgeSpacing = 20; // Minimum pixels from screen edge

    if (isPortrait) {
      // Portrait: Stack vertically, use available height, account for gap
      const gap = 20; // From Tetrix.css
      const availableForContent = availableHeight - gap;

      // Grid gets 2/3, controls get 1/3
      const gridHeightTarget = (availableForContent * 2) / 3;
      const controlsHeightTarget = availableForContent / 3;

      // Subtract padding from target size (grid has box-sizing: content-box)
      // Also ensure grid fits within viewport width with edge spacing
      const maxWidthConstraint = vw - gridPadding - (minEdgeSpacing * 2);
      gridSize = Math.min(gridHeightTarget - gridPadding, maxWidthConstraint);
      gameControlsPanelSize = controlsHeightTarget;
    } else {
      // Landscape: Side-by-side, use available width, account for gap
      const gap = 20; // From Tetrix.css
      const availableForContent = vw - gap;

      // Grid gets 2/3, controls get 1/3
      const gridWidthTarget = (availableForContent * 2) / 3;
      const controlsWidthTarget = availableForContent / 3;

      // Subtract padding from target size (grid has box-sizing: content-box)
      // Also ensure grid fits within available height with edge spacing
      const maxHeightConstraint = availableHeight - gridPadding - (minEdgeSpacing * 2);
      gridSize = Math.min(gridWidthTarget - gridPadding, maxHeightConstraint);
      gameControlsPanelSize = controlsWidthTarget;
    }

    // Calculate grid internals
    const gridGapSpace = gridGap * (GRID_SIZE - 1);
    const gridCellSize = (gridSize - gridGapSpace) / GRID_SIZE;

    // Calculate button size from controls panel size
    // Panel needs to fit: 3 buttons + padding + indicator + spacing
    // With padding 24px (12px each side), we have gameControlsPanelSize - 24 for content
    // Content: 3 buttons + 1 indicator + natural spacing from flex space-around
    // Buttons and indicator are same size, so effectively 4 button widths worth of space
    // But with space-around, we get extra space, so let's be conservative
    const panelPadding = 24;
    const availableSpace = gameControlsPanelSize - panelPadding;

    // Conservative estimate: 3.5 button widths (accounts for indicator + spacing)
    const baseButtonSize = availableSpace / 3.5;

    // Apply user multiplier (clamped between 0.5 and 1.5)
    const clampedMultiplier = Math.max(0.5, Math.min(1.5, buttonSizeMultiplier));
    const gameControlsButtonSize = baseButtonSize * clampedMultiplier;

    return {
      gridSize,
      gridCellSize,
      gridGap,
      gameControlsButtonSize,
    };
  }, [windowSize, buttonSizeMultiplier]);

  return sizing;
};
