import React from 'react';

import type { ColorName } from '../../../types/core';
import './ColorBrushSubmenu.css';

interface ColorBrushSubmenuProps {
  selectedColor: ColorName | 'eraser';
  onSelectColor: (color: ColorName | 'eraser') => void;
}

const COLOR_OPTIONS: Array<ColorName | 'eraser'> = [
  'grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'eraser',
];

export const ColorBrushSubmenu: React.FC<ColorBrushSubmenuProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  return (
    <div className="color-brush-submenu">
      <div className="color-brush-label">Paint Brush</div>
      <div className="color-brush-grid">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color}
            className={`color-brush-button ${color === 'eraser' ? 'eraser' : `color-${color}`} ${selectedColor === color ? 'active' : ''}`}
            onClick={() => onSelectColor(color)}
            title={color === 'eraser' ? 'Eraser' : color.charAt(0).toUpperCase() + color.slice(1)}
          >
            {color === 'eraser' ? (
              <span className="eraser-icon">✕</span>
            ) : (
              <span className="color-indicator" />
            )}
          </button>
        ))}
      </div>
      <div className="color-brush-hint">
        Click tiles to paint | Scroll to cycle colors
      </div>
    </div>
  );
};
