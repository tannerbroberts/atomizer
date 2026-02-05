import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GridEditorProvider, useGridEditor } from '../main/App/components/GridEditorContext';

describe('Grid Editor Paint Functionality', () => {
  it('should add tiles individually when painting', () => {
    const { result } = renderHook(() => useGridEditor(), {
      wrapper: GridEditorProvider,
    });

    act(() => {
      result.current.openEditor();
      result.current.setColor('blue');
    });

    // Initially, grid should have all tiles (10x10 default)
    expect(result.current.state.gridLayout.tiles.size).toBe(100);

    act(() => {
      result.current.clearAllTiles();
    });

    // After clearing, should have 0 tiles
    expect(result.current.state.gridLayout.tiles.size).toBe(0);

    // Add individual tiles
    act(() => {
      result.current.addTile('R1C1');
    });
    expect(result.current.state.gridLayout.tiles.size).toBe(1);
    expect(result.current.state.gridLayout.tiles.has('R1C1')).toBe(true);

    act(() => {
      result.current.addTile('R1C2');
    });
    expect(result.current.state.gridLayout.tiles.size).toBe(2);
    expect(result.current.state.gridLayout.tiles.has('R1C2')).toBe(true);

    act(() => {
      result.current.addTile('R2C1');
    });
    expect(result.current.state.gridLayout.tiles.size).toBe(3);
    expect(result.current.state.gridLayout.tiles.has('R2C1')).toBe(true);
  });

  it('should remove tiles individually when erasing', () => {
    const { result } = renderHook(() => useGridEditor(), {
      wrapper: GridEditorProvider,
    });

    act(() => {
      result.current.openEditor();
    });

    // Start with full grid
    expect(result.current.state.gridLayout.tiles.size).toBe(100);

    // Remove individual tiles
    act(() => {
      result.current.removeTile('R1C1');
    });
    expect(result.current.state.gridLayout.tiles.size).toBe(99);
    expect(result.current.state.gridLayout.tiles.has('R1C1')).toBe(false);

    act(() => {
      result.current.removeTile('R1C2');
    });
    expect(result.current.state.gridLayout.tiles.size).toBe(98);
    expect(result.current.state.gridLayout.tiles.has('R1C2')).toBe(false);

    act(() => {
      result.current.removeTile('R5C5');
    });
    expect(result.current.state.gridLayout.tiles.size).toBe(97);
    expect(result.current.state.gridLayout.tiles.has('R5C5')).toBe(false);
  });

  it('should change tool when selecting eraser', () => {
    const { result } = renderHook(() => useGridEditor(), {
      wrapper: GridEditorProvider,
    });

    act(() => {
      result.current.openEditor();
      result.current.setColor('blue');
    });

    expect(result.current.state.currentTool).toBe('paint');
    expect(result.current.state.selectedColor).toBe('blue');

    act(() => {
      result.current.setColor('eraser');
    });

    expect(result.current.state.currentTool).toBe('erase');
    expect(result.current.state.selectedColor).toBe('eraser');
  });

  it('should not add duplicate tiles when painting same tile multiple times', () => {
    const { result } = renderHook(() => useGridEditor(), {
      wrapper: GridEditorProvider,
    });

    act(() => {
      result.current.openEditor();
      result.current.clearAllTiles();
      result.current.setColor('blue');
    });

    expect(result.current.state.gridLayout.tiles.size).toBe(0);

    // Add the same tile multiple times
    act(() => {
      result.current.addTile('R1C1');
      result.current.addTile('R1C1');
      result.current.addTile('R1C1');
    });

    // Should still only have 1 tile (Set prevents duplicates)
    expect(result.current.state.gridLayout.tiles.size).toBe(1);
    expect(result.current.state.gridLayout.tiles.has('R1C1')).toBe(true);
  });
});
