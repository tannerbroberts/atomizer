import './Grid.css';
import { useRef, useEffect, useMemo } from 'react';

import { useDebugGridInteractions } from '../../hooks/useDebugGridInteractions';
import { useGameSizing } from '../../hooks/useGameSizing';
import { GRID_SIZE } from '../../utils/gridConstants';
import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';
import { TetrixTile } from '../../components/TetrixTile';

interface GridProps {
  width?: number; // Grid width in tiles (default: GRID_SIZE)
  height?: number; // Grid height in tiles (default: GRID_SIZE)
  pixelSize?: number; // Optional override for grid size in pixels
}

export function Grid({ width = GRID_SIZE, height = GRID_SIZE, pixelSize }: GridProps) {
  const { tiles, dragState, gameMode, blockTheme, showBlockIcons } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();
  const gridRef = useRef<HTMLDivElement>(null);
  const { gridSize: hookGridSize, gridGap, gridCellSize: hookGridCellSize } = useGameSizing();
  const { isDebugMode, handleDebugClick } = useDebugGridInteractions();

  // Use provided pixelSize or fall back to responsive hook size
  const gridSize = pixelSize ?? hookGridSize;

  // Calculate cell size if pixelSize is provided, otherwise use hook value
  // Note: This assumes square cells. If width != height, this logic might need adjustment
  // but for now we assume square grid or at least square cells.
  const gridCellSize = pixelSize
    ? (pixelSize - (gridGap * (Math.max(width, height) - 1))) / Math.max(width, height)
    : hookGridCellSize;

  // Periodically clean up expired animations
  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch({ type: 'CLEANUP_ANIMATIONS' });
    }, 1000); // Cleanup every second

    return () => clearInterval(intervalId);
  }, [dispatch]);

  // Handle escape key to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle escape if debug editor is open
      if (e.key === 'Escape' && dragState.selectedShape && !isDebugMode) {
        dispatch({ type: 'RETURN_SHAPE_TO_SELECTOR' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragState.selectedShape, dispatch, isDebugMode]);

  // Handle debug click via event delegation
  const handleGridClick = (e: React.MouseEvent) => {
    if (!isDebugMode) return;

    const target = e.target as HTMLElement;
    const tileElement = target.closest('.tetrix-tile');
    if (tileElement) {
      const row = parseInt(tileElement.getAttribute('data-row') || '0');
      const col = parseInt(tileElement.getAttribute('data-col') || '0');
      if (row && col) {
        handleDebugClick({ row, column: col });
      }
    }
  };

  // Create a map of hovered block positions for quick lookup
  const hoveredBlockMap = new Map(
    dragState.hoveredBlockPositions.map((pos) => [
      `${pos.location.row},${pos.location.column}`,
      pos.block,
    ]),
  );

  // Generate all potential tile positions in the grid
  const allPositions = useMemo(() => {
    const positions: string[] = [];
    for (let row = 1; row <= height; row++) {
      for (let col = 1; col <= width; col++) {
        positions.push(`R${row}C${col}`);
      }
    }
    return positions;
  }, [width, height]);

  return (
    <div
      ref={gridRef}
      className={`grid ${dragState.selectedShape ? 'grid-dragging' : ''}`}
      onClick={handleGridClick}
      style={
        {
          '--grid-gap': `${gridGap}px`,
          '--grid-size': `${gridSize}px`,
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
        } as React.CSSProperties
      }
    >
      {
        allPositions.map((position) => {
          const tileData = tiles.get(position);

          // In daily challenge mode, only render tiles that exist in the tiles Map
          // This prevents out-of-bounds areas from showing as gray tiles
          if (gameMode === 'daily' && !tileData) {
            return null;
          }

          // For empty spaces, create default tile
          const defaultBlock = { isFilled: false, color: 'grey' as const };
          const backgroundColor = tileData?.backgroundColor || 'grey';
          const block = tileData ? tileData.block : defaultBlock;

          // Parse position to location
          const match = position.match(/R(\d+)C(\d+)/);
          if (!match) {
            console.error(`Invalid position format: ${position}`);
            return null;
          }
          const row = parseInt(match[1]);
          const column = parseInt(match[2]);

          const activeAnimations = tileData?.activeAnimations;
          const animationsJson = activeAnimations && activeAnimations.length > 0
            ? JSON.stringify(activeAnimations)
            : '[]';

          const posKey = `${row},${column}`;
          const hoveredBlock = hoveredBlockMap.get(posKey);
          const isHovered = hoveredBlock?.isFilled ?? false;

          const showShadow = isHovered && hoveredBlock;
          let shadowOpacity = 0;
          if (showShadow) {
            shadowOpacity = dragState.isValidPlacement ? 0.7 : 0.4;
          }

          return (
            <TetrixTile
              key={position}
              row={row}
              col={column}
              backgroundColor={backgroundColor}
              blockIsFilled={block.isFilled}
              blockColor={block.color}
              isHovered={isHovered}
              showShadow={!!showShadow}
              shadowOpacity={shadowOpacity}
              animationsJson={animationsJson}
              theme={blockTheme}
              showIcon={gameMode === 'daily' || showBlockIcons}
              size={gridCellSize}
            />
          );
        })
      }
    </div>
  );
}
