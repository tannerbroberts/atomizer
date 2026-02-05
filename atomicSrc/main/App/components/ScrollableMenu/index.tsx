import React, { useEffect, useCallback, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { MenuSection } from './MenuSection';
import './ScrollableMenu.css';

export interface MenuSectionConfig<T extends string = string> {
  id: T;
  label: string;
  icon: string | ReactNode;
  isFocused: boolean;
  isExpanded: boolean;
  onClick: () => void;
  colorClass?: string;
  renderContent?: () => ReactNode;
}

export interface ScrollableMenuProps<T extends string = string> {
  isOpen: boolean;
  title: string;
  sections: MenuSectionConfig<T>[];
  focusedSection: T;
  expandedSection: T | null;
  navMode: 'menu' | 'submenu';
  showInstructions?: boolean;
  instructionsContent?: ReactNode;
  onClose: () => void;
  onHideInstructions?: () => void;
  onNavigate: (direction: 'forward' | 'backward') => void;
  onGlobalClick?: (e: MouseEvent) => void;
  initialPosition?: { x: number; y: number };
}

export function ScrollableMenu<T extends string = string>({
  isOpen,
  title,
  sections,
  focusedSection,
  navMode,
  showInstructions = false,
  instructionsContent,
  onClose,
  onHideInstructions,
  onNavigate,
  onGlobalClick,
  initialPosition = { x: 20, y: 20 },
}: ScrollableMenuProps<T>) {
  // Dragging state
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const paletteRef = useRef<HTMLDivElement>(null);

  // Mouse down - start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!paletteRef.current) return;

    const rect = paletteRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  // Mouse move - drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle mouse wheel
  useEffect(() => {
    if (!isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? 'forward' : 'backward';
      onNavigate(direction);
    };

    globalThis.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      globalThis.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, onNavigate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Always capture Tab, Space, and Escape when menu is open
      if (e.key === 'Tab' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab') {
        // Tab does the same thing as scrolling
        const direction = e.shiftKey ? 'backward' : 'forward';
        onNavigate(direction);
      } else if (e.key === ' ') {
        // Space toggles between menu and submenu modes
        // This is handled by the parent component through section onClick
        const focusedSectionConfig = sections.find((s) => s.id === focusedSection);
        if (focusedSectionConfig) {
          focusedSectionConfig.onClick();
        }
      }
    };

    // Use capture phase to ensure we get Tab before other handlers
    globalThis.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, onClose, navMode, focusedSection, sections, onNavigate]);

  // Handle global click events (for tools that need to interact with the grid)
  useEffect(() => {
    if (!isOpen || navMode !== 'submenu' || !onGlobalClick) return;

    globalThis.addEventListener('click', onGlobalClick);
    return () => {
      globalThis.removeEventListener('click', onGlobalClick);
    };
  }, [isOpen, navMode, onGlobalClick]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Instructions overlay - only show if showInstructions is true */}
      {showInstructions && instructionsContent && (
        <div className="scrollable-menu-overlay">
          <div className="scrollable-menu-container">
            <div className="scrollable-menu-header">
              <h2 className="scrollable-menu-title">{title}</h2>
              <button className="scrollable-menu-close-button" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="scrollable-menu-content">
              {instructionsContent}
              {onHideInstructions && (
                <div className="scrollable-menu-actions">
                  <button className="scrollable-menu-continue-button" onClick={onHideInstructions}>
                    Continue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact draggable menu palette */}
      <div
        ref={paletteRef}
        className={`scrollable-menu-palette ${isDragging ? 'dragging' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Drag handle */}
        <div className="scrollable-menu-drag-handle" onMouseDown={handleMouseDown}>
          <span className="scrollable-menu-drag-icon">⋮⋮</span>
          <span className="scrollable-menu-title-compact">{title}</span>
          <button className="scrollable-menu-close-x" onClick={onClose}>✕</button>
        </div>

        {/* Compact buttons */}
        <div className="scrollable-menu-buttons">
          {sections.map((section) => (
            <MenuSection key={section.id} {...section} />
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}
