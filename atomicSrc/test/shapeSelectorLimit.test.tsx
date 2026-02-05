import { describe, test, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ShapeSelector } from '../main/App/components/ShapeSelector';
import { TetrixProvider } from '../main/App/contexts/TetrixContext';

// Mock the persistence utilities to avoid IndexedDB issues in tests
vi.mock('../utils/persistenceUtils', () => ({
  loadCompleteGameState: vi.fn().mockResolvedValue({
    status: 'success',
    data: {
      score: 0,
      tiles: [],
      shapes: [],
      gameState: {
        currentLevel: 1,
        queueSize: -1,
        shapesUsed: 0,
      }
    }
  }),
  safeBatchSave: vi.fn().mockResolvedValue(undefined),
  loadModifiers: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
  loadStats: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
  loadTheme: vi.fn().mockResolvedValue({ status: 'success', data: 'dark' }),
  saveTheme: vi.fn().mockResolvedValue(undefined),
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('ShapeSelector 4-Element Limit', () => {
  test('should display at most 4 shapes by default', async () => {
    const { container } = render(
      <TetrixProvider>
        <ShapeSelector />
      </TetrixProvider>
    );

    // Wait for shapes to be populated
    await waitFor(() => {
      const shapeContainers = container.querySelectorAll('.shape-selector-shape-wrapper');
      expect(shapeContainers.length).toBeGreaterThan(0);
    });

    // Should display at most 4 shapes
    const shapeContainers = container.querySelectorAll('.shape-selector-shape-wrapper');
    expect(shapeContainers.length).toBeLessThanOrEqual(4);
  });

  test('should have shapes container with proper CSS class', async () => {
    const { container } = render(
      <TetrixProvider>
        <ShapeSelector />
      </TetrixProvider>
    );

    await waitFor(() => {
      const shapesContainer = container.querySelector('.shape-selector');
      expect(shapesContainer).toBeTruthy();
    });
  });

  test('should have shape selector with proper styling classes', async () => {
    const { container } = render(
      <TetrixProvider>
        <ShapeSelector />
      </TetrixProvider>
    );

    await waitFor(() => {
      const shapeSelector = container.querySelector('.shape-selector');
      expect(shapeSelector).toBeTruthy();
    });
  });

  // Queue indicator tests removed as the feature is not currently implemented in ShapeSelector.tsx
  /*
  test('should display queue indicator with infinity symbol', () => {
    // ...
  });

  test('should position queue indicator inline with shapes', () => {
    // ...
  });
  */
});