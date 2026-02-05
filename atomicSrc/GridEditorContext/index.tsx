import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';

import type { ColorName } from '../../types/core';

export type GridEditorTool = 'paint' | 'erase' | 'none';
export type SectionType = 'rows' | 'columns' | 'brush' | null;

// Grid layout configuration
export type GridLayout = {
  width: number; // Number of columns (2-20)
  height: number; // Number of rows (2-20)
  tiles: Set<string>; // Set of tile keys that exist (e.g., 'R1C1', 'R2C5')
  tileBackgrounds: Map<string, ColorName>; // Map of tile keys to their background colors
};

type GridEditorState = {
  isEditorOpen: boolean;
  currentTool: GridEditorTool;
  selectedColor: ColorName | 'eraser';
  gridLayout: GridLayout;
  showInstructions: boolean;
  hasShownInstructions: boolean;
  showGridDots: boolean;
  lastActiveSection: SectionType;
};

type GridEditorContextValue = {
  state: GridEditorState;
  openEditor: () => void;
  closeEditor: () => void;
  setTool: (tool: GridEditorTool) => void;
  setColor: (color: ColorName | 'eraser') => void;
  setLastActiveSection: (section: SectionType) => void;
  cycleColor: (direction: 'forward' | 'backward') => void;
  cycleActiveSection: (direction: 'forward' | 'backward') => void;
  setGridWidth: (width: number) => void;
  setGridHeight: (height: number) => void;
  adjustGridWidth: (delta: number) => void;
  adjustGridHeight: (delta: number) => void;
  addTile: (key: string) => void;
  removeTile: (key: string) => void;
  clearAllTiles: () => void;
  exportGridLayout: () => GridLayout;
  importGridLayout: (layout: GridLayout) => void;
  hideInstructions: () => void;
  toggleGridDots: () => void;
};

const GridEditorContext = createContext<GridEditorContextValue | null>(null);

// Default color order includes eraser at the end
const COLOR_ORDER: Array<ColorName | 'eraser'> = ['grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'eraser'];

// Create default grid layout (10x10 with all tiles present)
function createDefaultGridLayout(): GridLayout {
  const tiles = new Set<string>();
  const tileBackgrounds = new Map<string, ColorName>();
  for (let row = 1; row <= 10; row++) {
    for (let col = 1; col <= 10; col++) {
      const key = `R${row}C${col}`;
      tiles.add(key);
      // Create checkerboard pattern
      const isDark = (row + col) % 2 === 0;
      if (isDark) {
        tileBackgrounds.set(key, 'grey');
      }
    }
  }
  return {
    width: 10,
    height: 10,
    tiles,
    tileBackgrounds,
  };
}

export function GridEditorProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<GridEditorState>({
    isEditorOpen: false,
    currentTool: 'none',
    selectedColor: 'blue',
    gridLayout: createDefaultGridLayout(),
    showInstructions: true,
    hasShownInstructions: false,
    showGridDots: true,
    lastActiveSection: 'brush',
  });

  const openEditor = () => {
    setState((prev) => ({
      ...prev,
      isEditorOpen: true,
      currentTool: 'paint',
      showInstructions: !prev.hasShownInstructions,
      hasShownInstructions: true,
    }));
  };

  const closeEditor = () => {
    setState((prev) => ({
      ...prev,
      isEditorOpen: false,
      currentTool: 'none',
    }));
  };

  const hideInstructions = () => {
    setState((prev) => ({
      ...prev,
      showInstructions: false,
    }));
  };

  const toggleGridDots = () => {
    setState((prev) => ({
      ...prev,
      showGridDots: !prev.showGridDots,
    }));
  };

  const setTool = (tool: GridEditorTool) => {
    setState((prev) => ({ ...prev, currentTool: tool }));
  };

  const setColor = (color: ColorName | 'eraser') => {
    setState((prev) => ({
      ...prev,
      selectedColor: color,
      currentTool: color === 'eraser' ? 'erase' : 'paint',
    }));
  };

  const setLastActiveSection = (section: SectionType) => {
    setState((prev) => ({ ...prev, lastActiveSection: section }));
  };

  const cycleColor = (direction: 'forward' | 'backward') => {
    setState((prev) => {
      const currentIndex = COLOR_ORDER.indexOf(prev.selectedColor);
      let newIndex: number;

      if (direction === 'forward') {
        newIndex = (currentIndex + 1) % COLOR_ORDER.length;
      } else {
        newIndex = (currentIndex - 1 + COLOR_ORDER.length) % COLOR_ORDER.length;
      }

      const newColor = COLOR_ORDER[newIndex];
      return {
        ...prev,
        selectedColor: newColor,
        currentTool: newColor === 'eraser' ? 'erase' : 'paint',
      };
    });
  };

  const setGridWidth = (width: number) => {
    const clampedWidth = Math.max(2, Math.min(20, width));
    setState((prev) => {
      const newTiles = new Set<string>();
      const newTileBackgrounds = new Map<string, ColorName>();
      // Keep existing tiles that fit within new dimensions
      prev.gridLayout.tiles.forEach((key) => {
        const match = key.match(/R(\d+)C(\d+)/);
        if (match) {
          const col = parseInt(match[2], 10);
          if (col <= clampedWidth) {
            newTiles.add(key);
            const bg = prev.gridLayout.tileBackgrounds.get(key);
            if (bg) {
              newTileBackgrounds.set(key, bg);
            }
          }
        }
      });

      return {
        ...prev,
        gridLayout: {
          ...prev.gridLayout,
          width: clampedWidth,
          tiles: newTiles,
          tileBackgrounds: newTileBackgrounds,
        },
      };
    });
  };

  const setGridHeight = (height: number) => {
    const clampedHeight = Math.max(2, Math.min(20, height));
    setState((prev) => {
      const newTiles = new Set<string>();
      const newTileBackgrounds = new Map<string, ColorName>();
      // Keep existing tiles that fit within new dimensions
      prev.gridLayout.tiles.forEach((key) => {
        const match = key.match(/R(\d+)C(\d+)/);
        if (match) {
          const row = parseInt(match[1], 10);
          if (row <= clampedHeight) {
            newTiles.add(key);
            const bg = prev.gridLayout.tileBackgrounds.get(key);
            if (bg) {
              newTileBackgrounds.set(key, bg);
            }
          }
        }
      });

      return {
        ...prev,
        gridLayout: {
          ...prev.gridLayout,
          height: clampedHeight,
          tiles: newTiles,
          tileBackgrounds: newTileBackgrounds,
        },
      };
    });
  };

  const adjustGridWidth = (delta: number) => {
    setState((prev) => {
      const newWidth = Math.max(2, Math.min(20, prev.gridLayout.width + delta));
      if (newWidth === prev.gridLayout.width) return prev;

      const newTiles = new Set<string>();
      const newTileBackgrounds = new Map<string, ColorName>();
      prev.gridLayout.tiles.forEach((key) => {
        const match = key.match(/R(\d+)C(\d+)/);
        if (match) {
          const col = parseInt(match[2], 10);
          if (col <= newWidth) {
            newTiles.add(key);
            const bg = prev.gridLayout.tileBackgrounds.get(key);
            if (bg) {
              newTileBackgrounds.set(key, bg);
            }
          }
        }
      });

      return {
        ...prev,
        gridLayout: {
          ...prev.gridLayout,
          width: newWidth,
          tiles: newTiles,
          tileBackgrounds: newTileBackgrounds,
        },
      };
    });
  };

  const adjustGridHeight = (delta: number) => {
    setState((prev) => {
      const newHeight = Math.max(2, Math.min(20, prev.gridLayout.height + delta));
      if (newHeight === prev.gridLayout.height) return prev;

      const newTiles = new Set<string>();
      const newTileBackgrounds = new Map<string, ColorName>();
      prev.gridLayout.tiles.forEach((key) => {
        const match = key.match(/R(\d+)C(\d+)/);
        if (match) {
          const row = parseInt(match[1], 10);
          if (row <= newHeight) {
            newTiles.add(key);
            const bg = prev.gridLayout.tileBackgrounds.get(key);
            if (bg) {
              newTileBackgrounds.set(key, bg);
            }
          }
        }
      });

      return {
        ...prev,
        gridLayout: {
          ...prev.gridLayout,
          height: newHeight,
          tiles: newTiles,
          tileBackgrounds: newTileBackgrounds,
        },
      };
    });
  };

  const addTile = (key: string) => {
    setState((prev) => {
      const newTiles = new Set(prev.gridLayout.tiles);
      newTiles.add(key);
      const newTileBackgrounds = new Map(prev.gridLayout.tileBackgrounds);
      // Set tile background color if a color is selected (not eraser)
      if (prev.selectedColor !== 'eraser') {
        newTileBackgrounds.set(key, prev.selectedColor);
      }
      return {
        ...prev,
        gridLayout: {
          ...prev.gridLayout,
          tiles: newTiles,
          tileBackgrounds: newTileBackgrounds,
        },
      };
    });
  };

  const removeTile = (key: string) => {
    setState((prev) => {
      const newTiles = new Set(prev.gridLayout.tiles);
      newTiles.delete(key);
      const newTileBackgrounds = new Map(prev.gridLayout.tileBackgrounds);
      newTileBackgrounds.delete(key);
      return {
        ...prev,
        gridLayout: {
          ...prev.gridLayout,
          tiles: newTiles,
          tileBackgrounds: newTileBackgrounds,
        },
      };
    });
  };

  const clearAllTiles = () => {
    setState((prev) => ({
      ...prev,
      gridLayout: {
        ...prev.gridLayout,
        tiles: new Set(),
        tileBackgrounds: new Map(),
      },
    }));
  };

  const importGridLayout = (layout: GridLayout) => {
    setState((prev) => ({
      ...prev,
      gridLayout: {
        width: Math.max(2, Math.min(20, layout.width)),
        height: Math.max(2, Math.min(20, layout.height)),
        tiles: new Set(layout.tiles),
        tileBackgrounds: new Map(layout.tileBackgrounds),
      },
    }));
  };

  const cycleActiveSection = useCallback((direction: 'forward' | 'backward') => {
    const delta = direction === 'forward' ? 1 : -1;
    setState((prev) => {
      switch (prev.lastActiveSection) {
        case 'rows': {
          const newHeight = Math.max(2, Math.min(20, prev.gridLayout.height + delta));
          if (newHeight === prev.gridLayout.height) return prev;

          const newTiles = new Set<string>();
          const newTileBackgrounds = new Map<string, ColorName>();
          prev.gridLayout.tiles.forEach((key) => {
            const match = key.match(/R(\d+)C(\d+)/);
            if (match) {
              const row = parseInt(match[1], 10);
              if (row <= newHeight) {
                newTiles.add(key);
                const bg = prev.gridLayout.tileBackgrounds.get(key);
                if (bg) {
                  newTileBackgrounds.set(key, bg);
                }
              }
            }
          });

          return {
            ...prev,
            gridLayout: {
              ...prev.gridLayout,
              height: newHeight,
              tiles: newTiles,
              tileBackgrounds: newTileBackgrounds,
            },
          };
        }
        case 'columns': {
          const newWidth = Math.max(2, Math.min(20, prev.gridLayout.width + delta));
          if (newWidth === prev.gridLayout.width) return prev;

          const newTiles = new Set<string>();
          const newTileBackgrounds = new Map<string, ColorName>();
          prev.gridLayout.tiles.forEach((key) => {
            const match = key.match(/R(\d+)C(\d+)/);
            if (match) {
              const col = parseInt(match[2], 10);
              if (col <= newWidth) {
                newTiles.add(key);
                const bg = prev.gridLayout.tileBackgrounds.get(key);
                if (bg) {
                  newTileBackgrounds.set(key, bg);
                }
              }
            }
          });

          return {
            ...prev,
            gridLayout: {
              ...prev.gridLayout,
              width: newWidth,
              tiles: newTiles,
              tileBackgrounds: newTileBackgrounds,
            },
          };
        }
        case 'brush': {
          const newColorIndex = (COLOR_ORDER.indexOf(prev.selectedColor) + delta + COLOR_ORDER.length) % COLOR_ORDER.length;
          const newColor = COLOR_ORDER[newColorIndex];
          return {
            ...prev,
            selectedColor: newColor,
            currentTool: newColor === 'eraser' ? 'erase' : 'paint',
          };
        }
        default:
          return prev;
      }
    });
  }, []);

  const exportGridLayoutFn = useCallback((): GridLayout => {
    return {
      width: state.gridLayout.width,
      height: state.gridLayout.height,
      tiles: new Set(state.gridLayout.tiles),
      tileBackgrounds: new Map(state.gridLayout.tileBackgrounds),
    };
  }, [state.gridLayout]);

  const value: GridEditorContextValue = useMemo(() => ({
    state,
    openEditor,
    closeEditor,
    setTool,
    setColor,
    setLastActiveSection,
    cycleColor,
    cycleActiveSection,
    setGridWidth,
    setGridHeight,
    adjustGridWidth,
    adjustGridHeight,
    addTile,
    removeTile,
    clearAllTiles,
    exportGridLayout: exportGridLayoutFn,
    importGridLayout,
    hideInstructions,
    toggleGridDots,
  }), [state, exportGridLayoutFn, cycleActiveSection]);

  return (
    <GridEditorContext.Provider value={value}>
      {children}
    </GridEditorContext.Provider>
  );
}

export function useGridEditor() {
  const context = useContext(GridEditorContext);
  if (!context) {
    throw new Error('useGridEditor must be used within a GridEditorProvider');
  }
  return context;
}
