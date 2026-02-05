import React, { useCallback, useMemo, useState } from 'react';

import { solveDailyChallenge } from '../../utils/dailyChallengeSolver';
import { ScrollableMenu, type MenuSectionConfig } from '../ScrollableMenu';
import { ColorBrushSubmenu } from './ColorBrushSubmenu';
import { EditorGrid } from './EditorGrid';
import { useGridEditor } from '../../contexts/GridEditorContext';
import { NumberInputSubmenu } from './NumberInputSubmenu';
import './GridEditor.css';

type SectionId = 'rows' | 'columns' | 'brush' | 'actions';

const GridEditor: React.FC = () => {
  const {
    state,
    closeEditor,
    setColor,
    setLastActiveSection,
    setGridHeight,
    setGridWidth,
    clearAllTiles,
    exportGridLayout,
    hideInstructions,
    toggleGridDots,
  } = useGridEditor();

  // Navigation state
  const [focusedSection, setFocusedSection] = useState<SectionId>('brush');
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(null);
  const [navMode, setNavMode] = useState<'menu' | 'submenu'>('menu');

  // Date state for daily challenge export
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  // Toggle section on click
  const toggleSection = useCallback((section: SectionId) => {
    setFocusedSection(section);
    setExpandedSection((prev) => {
      const newSection = prev === section ? null : section;
      setNavMode(newSection ? 'submenu' : 'menu');
      if (newSection && newSection !== 'actions') {
        setLastActiveSection(newSection);
      }
      return newSection;
    });
  }, [setLastActiveSection]);

  // Navigation handler
  const handleNavigation = useCallback((direction: 'forward' | 'backward') => {
    if (navMode === 'menu') {
      // Navigate between section buttons
      const sections: SectionId[] = ['rows', 'columns', 'brush', 'actions'];
      const currentIndex = sections.indexOf(focusedSection);
      const delta = direction === 'forward' ? 1 : -1;
      const nextIndex = (currentIndex + delta + sections.length) % sections.length;
      setFocusedSection(sections[nextIndex]);

      if (sections[nextIndex] !== 'actions') {
        setLastActiveSection(sections[nextIndex]);
      }
    }
    // In submenu mode, the context's cycleActiveSection handles the navigation
  }, [navMode, focusedSection, setLastActiveSection]);

  // Handle export layout to clipboard
  const handleExportLayout = useCallback(() => {
    const layout = exportGridLayout();
    const layoutData = {
      width: layout.width,
      height: layout.height,
      tiles: Array.from(layout.tiles),
      tileBackgrounds: Array.from(layout.tileBackgrounds.entries()),
    };
    const jsonString = JSON.stringify(layoutData, null, 2);

    console.log('✅ Grid layout exported!');
    console.log('Layout data:', layoutData);
    console.log('JSON:', jsonString);

    const copyToClipboard = async () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(jsonString);
          alert('Grid layout copied to clipboard and logged to console!');
          return;
        } catch (err) {
          console.warn('Clipboard API failed, trying fallback:', err);
        }
      }

      try {
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Grid layout copied to clipboard and logged to console!');
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        alert('Could not copy to clipboard, but data is logged to console!');
      }
    };

    copyToClipboard();
  }, [exportGridLayout]);

  // Handle export for daily challenge
  const handleExportDailyChallenge = useCallback(() => {
    const layout = exportGridLayout();

    // Run solver to verify solvability
    // Use the selected date for the seed
    const dateObj = new Date(targetDate);
    const seed = Math.floor(dateObj.getTime() / 86400000);
    console.log('Attempting to solve with seed:', seed, 'for date:', targetDate);

    // Convert GridLayout to TilesSet for the solver
    const tilesSet = new Map();
    layout.tiles.forEach((key) => {
      const color = layout.tileBackgrounds.get(key) || 'grey';
      tilesSet.set(key, {
        block: {
          color,
          isFilled: true,
        },
      });
    });

    const solution = solveDailyChallenge(tilesSet, seed);

    if (!solution) {
      alert('❌ Grid is unsolvable with the current shape set! Try modifying the grid.');
      return;
    }

    const layoutData = {
      width: layout.width,
      height: layout.height,
      tiles: Array.from(layout.tiles),
      tileBackgrounds: Array.from(layout.tileBackgrounds.entries()),
      shapes: solution.map((s) => s.shape), // Export the specific shapes generated by the solver
    };
    const jsonString = JSON.stringify(layoutData, null, 2);

    console.log('✅ Daily Challenge Verified & Exported!');
    console.log(`Used ${solution.length} shapes.`);
    console.log('JSON:', jsonString);

    // Trigger download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ Solvable! Used ${solution.length} shapes.\nFile downloaded as ${targetDate}.json`);
  }, [exportGridLayout, targetDate]);

  // Get icon for current brush color
  const getBrushIcon = useCallback(() => {
    if (state.selectedColor === 'eraser') {
      return '✕';
    }
    return '🖌';
  }, [state.selectedColor]);

  // Define menu sections
  const menuSections: MenuSectionConfig<SectionId>[] = useMemo(() => [
    {
      id: 'rows' as const,
      label: `Rows - Current: ${state.gridLayout.height}`,
      icon: '↕',
      isFocused: focusedSection === 'rows',
      isExpanded: expandedSection === 'rows',
      onClick: () => toggleSection('rows'),
      renderContent: () => (
        <NumberInputSubmenu
          label="Grid Height (Rows)"
          value={state.gridLayout.height}
          min={2}
          max={20}
          onChange={setGridHeight}
          isExpanded={expandedSection === 'rows'}
        />
      ),
    },
    {
      id: 'columns' as const,
      label: `Columns - Current: ${state.gridLayout.width}`,
      icon: '↔',
      isFocused: focusedSection === 'columns',
      isExpanded: expandedSection === 'columns',
      onClick: () => toggleSection('columns'),
      renderContent: () => (
        <NumberInputSubmenu
          label="Grid Width (Columns)"
          value={state.gridLayout.width}
          min={2}
          max={20}
          onChange={setGridWidth}
          isExpanded={expandedSection === 'columns'}
        />
      ),
    },
    {
      id: 'brush' as const,
      label: `Brush - Color: ${state.selectedColor}`,
      icon: <span className={`grid-editor-button-icon ${state.selectedColor !== 'eraser' ? `color-${state.selectedColor}` : 'color-eraser'}`}>{getBrushIcon()}</span>,
      colorClass: state.selectedColor !== 'eraser' ? `color-${state.selectedColor}` : 'color-eraser',
      isFocused: focusedSection === 'brush',
      isExpanded: expandedSection === 'brush',
      onClick: () => toggleSection('brush'),
      renderContent: () => (
        <ColorBrushSubmenu
          selectedColor={state.selectedColor}
          onSelectColor={setColor}
        />
      ),
    },
    {
      id: 'actions' as const,
      label: 'Actions & View',
      icon: <span className="grid-editor-button-icon">⚙</span>,
      isFocused: focusedSection === 'actions',
      isExpanded: expandedSection === 'actions',
      onClick: () => toggleSection('actions'),
      renderContent: () => (
        <div className="grid-editor-actions-section">
          <button
            className={`grid-editor-toggle-button ${state.showGridDots ? 'active' : ''}`}
            onClick={toggleGridDots}
          >
            <span className="grid-editor-toggle-icon">⚏</span>
            <span className="grid-editor-toggle-text">Grid Dots</span>
          </button>
          <button
            className="grid-editor-action-button"
            onClick={clearAllTiles}
          >
            🗑 Clear All Tiles
          </button>
          <button
            className="grid-editor-action-button"
            onClick={handleExportLayout}
          >
            📋 Export Layout
          </button>

          <div className="grid-editor-date-picker">
            <label htmlFor="challenge-date">Challenge Date:</label>
            <input
              type="date"
              id="challenge-date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="grid-editor-date-input"
            />
          </div>

          <button
            className="grid-editor-action-button"
            onClick={handleExportDailyChallenge}
          >
            📅 Export Daily
          </button>
        </div>
      ),
    },
  ], [
    focusedSection,
    expandedSection,
    state.gridLayout,
    state.selectedColor,
    state.showGridDots,
    targetDate, // Add targetDate dependency
    toggleSection,
    getBrushIcon,
    setGridHeight,
    setGridWidth,
    setColor,
    toggleGridDots,
    clearAllTiles,
    handleExportLayout,
    handleExportDailyChallenge,
  ]);

  // Instructions content
  const instructionsContent = (
    <div className="grid-editor-instructions">
      <p><strong>Grid Editor</strong> lets you design custom tile layouts.</p>
      <p><strong>Rows/Columns:</strong> Adjust grid dimensions (2-20). Scroll to increase/decrease.</p>
      <p><strong>Brush:</strong> Select a color or eraser. Click tiles on the grid to paint or erase them.</p>
      <p><strong>Navigation:</strong> Tab/Scroll to navigate menu, Space to open/close submenus.</p>
      <p><strong>Export:</strong> Copy your layout to clipboard for use in game configurations.</p>
      <p>Create sparse layouts like circles, islands, or custom shapes!</p>
    </div>
  );

  return (
    <>
      {state.isEditorOpen && <EditorGrid />}
      <ScrollableMenu<SectionId>
        isOpen={state.isEditorOpen}
        title="Grid"
        sections={menuSections}
        focusedSection={focusedSection}
        expandedSection={expandedSection}
        navMode={navMode}
        showInstructions={state.showInstructions}
        instructionsContent={instructionsContent}
        onClose={closeEditor}
        onHideInstructions={hideInstructions}
        onNavigate={handleNavigation}
        initialPosition={{ x: 20, y: 120 }}
      />
    </>
  );
};

export { GridEditor };
