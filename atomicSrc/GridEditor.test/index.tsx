import { describe, it, expect } from 'vitest';
import { GridEditorProvider, useGridEditor } from '../main/App/components/GridEditorContext';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// Wrapper component for hooks that need GridEditorProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <GridEditorProvider>{children}</GridEditorProvider>
);

describe('GridEditor - Basic Functionality', () => {
  it('should initialize with default 10x10 grid', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    expect(result.current.state.gridLayout.width).toBe(10);
    expect(result.current.state.gridLayout.height).toBe(10);
    expect(result.current.state.gridLayout.tiles.size).toBe(100); // All tiles present
  });

  it('should open and close the editor', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    expect(result.current.state.isEditorOpen).toBe(false);
    
    act(() => {
      result.current.openEditor();
    });
    
    expect(result.current.state.isEditorOpen).toBe(true);
    expect(result.current.state.currentTool).toBe('paint');
    
    act(() => {
      result.current.closeEditor();
    });
    
    expect(result.current.state.isEditorOpen).toBe(false);
  });

  it('should adjust grid width within bounds', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    // Increase width
    act(() => {
      result.current.setGridWidth(15);
    });
    expect(result.current.state.gridLayout.width).toBe(15);
    
    // Try to set above max (should clamp to 20)
    act(() => {
      result.current.setGridWidth(25);
    });
    expect(result.current.state.gridLayout.width).toBe(20);
    
    // Try to set below min (should clamp to 2)
    act(() => {
      result.current.setGridWidth(1);
    });
    expect(result.current.state.gridLayout.width).toBe(2);
  });

  it('should adjust grid height within bounds', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    // Increase height
    act(() => {
      result.current.setGridHeight(12);
    });
    expect(result.current.state.gridLayout.height).toBe(12);
    
    // Try to set above max (should clamp to 20)
    act(() => {
      result.current.setGridHeight(30);
    });
    expect(result.current.state.gridLayout.height).toBe(20);
    
    // Try to set below min (should clamp to 2)
    act(() => {
      result.current.setGridHeight(0);
    });
    expect(result.current.state.gridLayout.height).toBe(2);
  });

  it('should remove tiles when shrinking grid', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    const initialTileCount = result.current.state.gridLayout.tiles.size;
    expect(initialTileCount).toBe(100); // 10x10
    
    // Shrink to 5x5
    act(() => {
      result.current.setGridWidth(5);
      result.current.setGridHeight(5);
    });
    
    expect(result.current.state.gridLayout.tiles.size).toBeLessThan(initialTileCount);
    // Should only have tiles within R1-R5, C1-C5
    const layout = result.current.state.gridLayout;
    layout.tiles.forEach(key => {
      const match = key.match(/R(\d+)C(\d+)/);
      expect(match).toBeTruthy();
      if (match) {
        const row = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);
        expect(row).toBeLessThanOrEqual(5);
        expect(col).toBeLessThanOrEqual(5);
      }
    });
  });

  it('should add and remove individual tiles', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    const tileKey = 'R5C5';
    
    // Remove a tile
    act(() => {
      result.current.removeTile(tileKey);
    });
    expect(result.current.state.gridLayout.tiles.has(tileKey)).toBe(false);
    
    // Add it back
    act(() => {
      result.current.addTile(tileKey);
    });
    expect(result.current.state.gridLayout.tiles.has(tileKey)).toBe(true);
  });

  it('should clear all tiles', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    expect(result.current.state.gridLayout.tiles.size).toBeGreaterThan(0);
    
    act(() => {
      result.current.clearAllTiles();
    });
    
    expect(result.current.state.gridLayout.tiles.size).toBe(0);
  });

  it('should cycle through brush colors', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    const initialColor = result.current.state.selectedColor;
    expect(initialColor).toBe('blue');
    
    act(() => {
      result.current.cycleColor('forward');
    });
    expect(result.current.state.selectedColor).toBe('purple');
    
    act(() => {
      result.current.cycleColor('forward');
    });
    expect(result.current.state.selectedColor).toBe('eraser');
    expect(result.current.state.currentTool).toBe('erase');
    
    act(() => {
      result.current.cycleColor('backward');
    });
    expect(result.current.state.selectedColor).toBe('purple');
    expect(result.current.state.currentTool).toBe('paint');
  });

  it('should export and import grid layout', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    // Customize the grid
    act(() => {
      result.current.setGridWidth(8);
      result.current.setGridHeight(6);
      result.current.clearAllTiles();
      result.current.addTile('R1C1');
      result.current.addTile('R1C8');
      result.current.addTile('R6C1');
      result.current.addTile('R6C8');
    });
    
    // Export the layout
    const exported = result.current.exportGridLayout();
    expect(exported.width).toBe(8);
    expect(exported.height).toBe(6);
    expect(exported.tiles.size).toBe(4);
    
    // Reset to default
    act(() => {
      result.current.setGridWidth(10);
      result.current.setGridHeight(10);
    });
    
    // Import the exported layout
    act(() => {
      result.current.importGridLayout(exported);
    });
    
    expect(result.current.state.gridLayout.width).toBe(8);
    expect(result.current.state.gridLayout.height).toBe(6);
    expect(result.current.state.gridLayout.tiles.size).toBe(4);
    expect(result.current.state.gridLayout.tiles.has('R1C1')).toBe(true);
    expect(result.current.state.gridLayout.tiles.has('R1C8')).toBe(true);
  });

  it('should create sparse layouts (circle example)', () => {
    const { result } = renderHook(() => useGridEditor(), { wrapper });
    
    // Create a rough circle pattern by removing corner tiles
    act(() => {
      result.current.setGridWidth(10);
      result.current.setGridHeight(10);
      // Remove corners
      result.current.removeTile('R1C1');
      result.current.removeTile('R1C2');
      result.current.removeTile('R2C1');
      result.current.removeTile('R1C9');
      result.current.removeTile('R1C10');
      result.current.removeTile('R2C10');
      result.current.removeTile('R9C1');
      result.current.removeTile('R10C1');
      result.current.removeTile('R10C2');
      result.current.removeTile('R9C10');
      result.current.removeTile('R10C9');
      result.current.removeTile('R10C10');
    });
    
    const tileCount = result.current.state.gridLayout.tiles.size;
    expect(tileCount).toBe(100 - 12); // 10x10 minus 12 corner tiles
    
    // Verify corners are removed
    expect(result.current.state.gridLayout.tiles.has('R1C1')).toBe(false);
    expect(result.current.state.gridLayout.tiles.has('R10C10')).toBe(false);
    
    // Verify center tiles still exist
    expect(result.current.state.gridLayout.tiles.has('R5C5')).toBe(true);
  });
});
