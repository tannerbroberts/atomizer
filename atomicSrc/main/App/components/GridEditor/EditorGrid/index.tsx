import React, { useRef, useState, useEffect, useMemo } from 'react';

import { EditorGridTile } from '../EditorGridTile';
import { useGridEditor } from '../../../contexts/GridEditorContext';
import '../Grid.css'; // Reuse grid styles

const EditorGrid: React.FC = () => {
  const { state, addTile, removeTile } = useGridEditor();
  const { gridLayout, selectedColor, showGridDots } = state;
  const gridRef = useRef<HTMLDivElement>(null);

  // Painting state
  const [isPainting, setIsPainting] = useState(false);
  const lastPaintedTileRef = useRef<string | null>(null);

  // Calculate cell size to fit screen
  const [cellSize, setCellSize] = useState(30);

  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = 40;
      // Assume menu is on the left or floating, try to fit grid in center

      const availableWidth = vw - padding * 2;
      const availableHeight = vh - padding * 2;

      const maxCellWidth = availableWidth / gridLayout.width;
      const maxCellHeight = availableHeight / gridLayout.height;

      const size = Math.min(maxCellWidth, maxCellHeight, 50); // Max 50px
      setCellSize(Math.max(size, 15)); // Min 15px
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [gridLayout.width, gridLayout.height]);

  const paintTile = (tileKey: string) => {
    if (state.currentTool === 'paint') {
      addTile(tileKey);
    } else if (state.currentTool === 'erase') {
      removeTile(tileKey);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, tileKey: string) => {
    // Only left click
    if (e.button !== 0) return;

    setIsPainting(true);
    lastPaintedTileRef.current = tileKey;
    paintTile(tileKey);
  };

  const handleMouseEnter = (_: React.MouseEvent, tileKey: string) => {
    if (isPainting && lastPaintedTileRef.current !== tileKey) {
      lastPaintedTileRef.current = tileKey;
      paintTile(tileKey);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPainting(false);
      lastPaintedTileRef.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Generate positions
  const positions = useMemo(() => {
    const pos = [];
    for (let row = 1; row <= gridLayout.height; row++) {
      for (let col = 1; col <= gridLayout.width; col++) {
        pos.push(`R${row}C${col}`);
      }
    }
    return pos;
  }, [gridLayout.width, gridLayout.height]);

  return (
    <div
      className="editor-grid-container"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50, // Below menu (100) but above game
        pointerEvents: 'auto', // Block clicks to game
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darken background to hide game
      } as React.CSSProperties}
    >
      <div
        ref={gridRef}
        className={`grid ${showGridDots ? '' : 'hide-dots'}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridLayout.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridLayout.height}, ${cellSize}px)`,
          gap: '2px',
          pointerEvents: 'auto', // Re-enable pointer events for the grid
          padding: '10px',
          borderRadius: '8px',
          // Override grid variables for children
          '--grid-gap': '2px',
          '--grid-size': `${cellSize * gridLayout.width}px`,
        } as React.CSSProperties}
      >
        {positions.map((position) => {
          const match = position.match(/R(\d+)C(\d+)/);
          if (!match) return null;
          const row = parseInt(match[1]);
          const column = parseInt(match[2]);

          const tileExists = gridLayout.tiles.has(position);
          const backgroundColor = gridLayout.tileBackgrounds.get(position) || 'grey';

          // Default block for visualization
          const block = { isFilled: false, color: 'grey' as const };

          // Editor overlay color
          const editorColor = tileExists && selectedColor !== 'eraser' ? selectedColor : undefined;

          return (
            <EditorGridTile
              key={position}
              location={{ row, column }}
              block={block}
              backgroundColor={backgroundColor}
              size={cellSize}
              editorColor={editorColor}
              tileExists={tileExists}
              onMouseDown={(e) => handleMouseDown(e, position)}
              onMouseEnter={(e) => handleMouseEnter(e, position)}
            />
          );
        })}
      </div>
    </div>
  );
};

export { EditorGrid };
