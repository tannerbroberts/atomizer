import React from 'react';

import type { Block, ColorName, Location } from '../../../types/core';
import { BlockVisual } from '../../../../Shared/BlockVisual';
import { Tile } from '../../../../Shared/Tile';
import './EditorGridTile.css';

type EditorGridTileProps = {
  location: Location;
  block: Block;
  backgroundColor: ColorName;
  size?: number;
  editorColor?: ColorName;
  tileExists?: boolean;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
};

const EditorGridTile: React.FC<EditorGridTileProps> = ({
  location,
  block,
  backgroundColor,
  size,
  editorColor,
  tileExists = true,
  onClick,
  onMouseEnter,
  onMouseDown,
}) => {
  // Determine tile opacity in editor mode - dim tiles that don't exist
  const tileOpacity = !tileExists ? 0.2 : 1;

  return (
    <Tile
      row={location.row}
      col={location.column}
      backgroundColor={backgroundColor}
      opacity={tileOpacity}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
      className="editor-grid-tile"
      style={{ cursor: 'pointer' }}
    >
      <BlockVisual isFilled={block.isFilled} color={block.color} size={size} />

      {editorColor && (
        <div className={`editor-grid-tile-overlay color-${editorColor}`} />
      )}
    </Tile>
  );
};

const MemoizedEditorGridTile = React.memo(EditorGridTile);
export { MemoizedEditorGridTile as EditorGridTile };
