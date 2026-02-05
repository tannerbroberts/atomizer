import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MusicOffIcon from '@mui/icons-material/MusicOff';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { THEMES, BLOCK_THEMES } from '../../types/theme';
import type { ThemeName, BlockTheme } from '../../types/theme';
import {
  loadDebugSettings,
  saveDebugSettings,
} from '../../utils/persistence';
import { generateShapesWithProbabilities } from '../../utils/shapes/shapeGenerationWithProbabilities';
import { APP_VERSION } from '../../../version';
import { useGridEditor } from '../../contexts/GridEditorContext';
import { useMusicControl } from '../../contexts/MusicControlContext';
import { useSoundEffectsControl } from '../Header/SoundEffectsControlContext';
import { InstallButton } from '../InstallButton';
import { useTetrixDispatchContext, useTetrixStateContext } from '../../contexts/TetrixContext';
import './SettingsOverlay.css';

const ThemeSelector: React.FC = () => {
  const { currentTheme } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();

  const handleThemeChange = (theme: ThemeName) => {
    dispatch({ type: 'SET_THEME', value: { theme } });
  };

  return (
    <div className="menu-item theme-selector">
      <span className="menu-label">Theme</span>
      <div className="theme-buttons">
        {Object.values(THEMES).map((theme) => (
          <button
            key={theme.name}
            className={`theme-button ${currentTheme === theme.name ? 'active' : ''}`}
            onClick={() => handleThemeChange(theme.name)}
            title={theme.displayName}
          >
            {theme.displayName}
          </button>
        ))}
      </div>
    </div>
  );
};

const BlockThemeSelector: React.FC = () => {
  const { blockTheme } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();

  const handleThemeChange = (theme: BlockTheme) => {
    dispatch({ type: 'SET_BLOCK_THEME', value: { theme } });
  };

  return (
    <div className="menu-item theme-selector">
      <span className="menu-label">Block Style</span>
      <div className="theme-buttons">
        {(Object.keys(BLOCK_THEMES) as BlockTheme[]).map((themeKey) => (
          <button
            key={themeKey}
            className={`theme-button ${blockTheme === themeKey ? 'active' : ''}`}
            onClick={() => handleThemeChange(themeKey)}
            title={BLOCK_THEMES[themeKey]}
          >
            {BLOCK_THEMES[themeKey]}
          </button>
        ))}
      </div>
    </div>
  );
};

const BlockIconToggle: React.FC = () => {
  const { showBlockIcons } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();

  return (
    <div className="menu-item theme-selector">
      <span className="menu-label">Block Icons</span>
      <div className="theme-buttons">
        <button
          className={`theme-button ${showBlockIcons ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_SHOW_BLOCK_ICONS', value: { show: true } })}
        >
          On
        </button>
        <button
          className={`theme-button ${!showBlockIcons ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_SHOW_BLOCK_ICONS', value: { show: false } })}
        >
          Off
        </button>
      </div>
    </div>
  );
};

const GrandpaModeToggle: React.FC = () => {
  const { grandpaMode } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();

  return (
    <div className="menu-item theme-selector">
      <span className="menu-label">Grandpa Mode</span>
      <div className="theme-buttons">
        <button
          className={`theme-button ${grandpaMode ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_GRANDPA_MODE', value: { enabled: true } })}
          title="Reduces Z and S piece frequency to 1/4"
        >
          On
        </button>
        <button
          className={`theme-button ${!grandpaMode ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_GRANDPA_MODE', value: { enabled: false } })}
        >
          Off
        </button>
      </div>
    </div>
  );
};

const SettingsOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { volume: musicVolume, setVolume: setMusicVolume, isEnabled: isMusicEnabled, toggleEnabled: toggleMusicEnabled, isWaitingForInteraction } = useMusicControl();
  const { volume: soundVolume, setVolume: setSoundVolume, isEnabled: isSoundEnabled, toggleEnabled: toggleSoundEnabled } = useSoundEffectsControl();
  const state = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();
  const { openEditor: openGridEditor } = useGridEditor();
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const [debugClickCount, setDebugClickCount] = useState(0);

  useEffect(() => {
    loadDebugSettings().then(setDebugUnlocked);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDebugClickCount(0);
    }

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleHiddenDebugClick = (e: React.MouseEvent) => {
    const newCount = debugClickCount + 1;
    setDebugClickCount(newCount);

    if (newCount >= 20) {
      setDebugUnlocked(true);
      saveDebugSettings(true);

      // Trigger 20 gem shower
      dispatch({
        type: 'ADD_SCORE',
        value: {
          scoreData: {
            rowsCleared: 0,
            columnsCleared: 0,
            pointsEarned: 20,
          },
          mousePosition: { x: e.clientX, y: e.clientY },
        },
      });
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const toggleDebugMenu = () => {
    setIsDebugOpen(!isDebugOpen);
  };

  // New game function - resets game state while preserving stats and settings
  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  // Test notification function for debugging - injects 1000 points
  const testNotification = (e: React.MouseEvent) => {
    // Capture the click position for gem emission
    const clickPosition = { x: e.clientX, y: e.clientY };

    // Dispatch ADD_SCORE action to update the score
    // This will trigger the gem shower animation automatically
    dispatch({
      type: 'ADD_SCORE',
      value: {
        scoreData: {
          rowsCleared: 0,
          columnsCleared: 0,
          pointsEarned: 1000,
        },
        mousePosition: clickPosition,
      },
    });
  };

  // Toggle finite queue mode and populate with 20 shapes if enabling
  const toggleFiniteMode = () => {
    const newMode = state.queueMode === 'infinite' ? 'finite' : 'infinite';

    dispatch({
      type: 'SET_QUEUE_MODE',
      value: { mode: newMode },
    });

    // If switching to finite mode, populate with 20 shapes
    if (newMode === 'finite') {
      const shapes = generateShapesWithProbabilities(20, state.queueColorProbabilities);
      dispatch({
        type: 'POPULATE_FINITE_QUEUE',
        value: { shapes },
      });
    }
  };

  // Handle clicking on the overlay background (not the content)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay (not its children)
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <div className="menu-dropdown" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="hamburger-button"
        onClick={toggleDropdown}
        title="Menu"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <div className="hamburger-lines">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && createPortal(
        <div
          className="dropdown-overlay"
          onClick={handleOverlayClick}
        >
          <div className="dropdown-content">
            <div className="menu-qr-code">
              <p className="qr-label">Share this game</p>
              <div className="qr-code-wrapper">
                <QRCodeSVG
                  value="https://tetrix-game.github.io"
                  size={128}
                  bgColor="#023f80"
                  fgColor="#ffffff"
                />
              </div>
            </div>

            <div className="menu-item volume-control">
              <div className="volume-control-header">
                <IconButton
                  onClick={toggleMusicEnabled}
                  size="small"
                  title={isMusicEnabled ? 'Disable music' : 'Enable music'}
                  sx={{
                    color: '#ffffff',
                    padding: '4px',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {!isMusicEnabled || musicVolume === 0 ? (
                    <MusicOffIcon sx={{ fontSize: 24 }} />
                  ) : (
                    <MusicNoteIcon sx={{ fontSize: 24 }} />
                  )}
                </IconButton>
                <span className="menu-label">Music</span>
                {isWaitingForInteraction && (
                  <span className="audio-waiting-badge" title="Click anywhere to enable audio playback">
                    Tap to unlock
                  </span>
                )}
              </div>
              <Slider
                value={musicVolume}
                onChange={(_, value) => setMusicVolume(value as number)}
                min={0}
                max={100}
                disabled={!isMusicEnabled}
                sx={{
                  color: '#4fc3f7',
                  width: 'calc(100% - 16px)',
                  margin: '0 8px',
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0 0 0 8px rgba(79, 195, 247, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 4,
                  },
                  '& .MuiSlider-rail': {
                    height: 4,
                    opacity: 0.3,
                  },
                }}
              />
            </div>

            <div className="menu-item volume-control">
              <div className="volume-control-header">
                <IconButton
                  onClick={toggleSoundEnabled}
                  size="small"
                  title={isSoundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
                  sx={{
                    color: '#ffffff',
                    padding: '4px',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {!isSoundEnabled || soundVolume === 0 ? (
                    <VolumeOffIcon sx={{ fontSize: 24 }} />
                  ) : (
                    <VolumeUpIcon sx={{ fontSize: 24 }} />
                  )}
                </IconButton>
                <span className="menu-label">Sound Effects</span>
              </div>
              <Slider
                value={soundVolume}
                onChange={(_, value) => setSoundVolume(value as number)}
                min={0}
                max={100}
                disabled={!isSoundEnabled}
                sx={{
                  color: '#4fc3f7',
                  width: 'calc(100% - 16px)',
                  margin: '0 8px',
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0 0 0 8px rgba(79, 195, 247, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 4,
                  },
                  '& .MuiSlider-rail': {
                    height: 4,
                    opacity: 0.3,
                  },
                }}
              />
            </div>

            <ThemeSelector />
            <BlockThemeSelector />
            <BlockIconToggle />
            <GrandpaModeToggle />

            <div className="menu-item">
              <button
                className="menu-action-button"
                onClick={handleNewGame}
                title="Reset the game and clear all saved data (preserves settings)"
              >
                New Game
              </button>
            </div>

            <div className="menu-item">
              <a
                className="menu-action-button menu-link-button"
                href="/strategy-guide.html"
                title="Read the Tetrix strategy guide"
              >
                Strategy Guide
              </a>
            </div>

            <div className="menu-item">
              <InstallButton />
            </div>

            <div className="menu-item version-display">
              <span className="menu-label version-label">Version {APP_VERSION}</span>
            </div>

            <div className="menu-item debug-submenu">
              {debugUnlocked ? (
                <button
                  className="debug-toggle"
                  onClick={toggleDebugMenu}
                  aria-expanded={isDebugOpen}
                >
                  <span className="menu-label">Debug</span>
                  <span className={`debug-arrow ${isDebugOpen ? 'open' : ''}`}>▶</span>
                </button>
              ) : (
                <button
                  className="debug-toggle hidden-debug-trigger"
                  onClick={handleHiddenDebugClick}
                  style={{ opacity: 0, cursor: 'default' }}
                  aria-hidden="true"
                >
                  <span className="menu-label">Debug</span>
                </button>
              )}
            </div>

            {isDebugOpen && (
              <div className="debug-submenu-content">
                <div className="menu-item submenu-item button-size-control">
                  <div className="button-size-control-header">
                    <span className="menu-label">Button Size: {Math.round(state.buttonSizeMultiplier * 100)}%</span>
                    <button
                      className="reset-button"
                      onClick={() => dispatch({ type: 'SET_BUTTON_SIZE_MULTIPLIER', value: { multiplier: 1.0 } })}
                      title="Reset to 100%"
                    >
                      Reset
                    </button>
                  </div>
                  <Slider
                    value={state.buttonSizeMultiplier}
                    onChange={(_, value) => dispatch({ type: 'SET_BUTTON_SIZE_MULTIPLIER', value: { multiplier: value as number } })}
                    min={0.5}
                    max={1.5}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '50%' },
                      { value: 1.0, label: '100%' },
                      { value: 1.5, label: '150%' },
                    ]}
                    sx={{
                      color: '#4fc3f7',
                      width: 'calc(100% - 16px)',
                      margin: '8px 8px 0',
                      '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0 0 0 8px rgba(79, 195, 247, 0.16)',
                        },
                      },
                      '& .MuiSlider-track': {
                        height: 4,
                      },
                      '& .MuiSlider-rail': {
                        height: 4,
                        opacity: 0.3,
                      },
                      '& .MuiSlider-mark': {
                        height: 8,
                        width: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '& .MuiSlider-markLabel': {
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </div>
                <div className="menu-item submenu-item">
                  <button
                    className="debug-action-button"
                    onClick={testNotification}
                    title="Inject points to test the gem shower system! Try 100, 1000, or 999999 points."
                  >
                    Inject Points
                  </button>
                </div>
                <div className="menu-item submenu-item">
                  <button
                    className="debug-action-button"
                    onClick={() => {
                      openGridEditor();
                      setIsOpen(false);
                    }}
                    title="Open the grid editor to design custom tile layouts"
                  >
                    Grid Editor
                  </button>
                </div>
                <div className="menu-item submenu-item">
                  <button
                    className={`debug-action-button ${state.queueMode === 'finite' ? 'active' : ''}`}
                    onClick={toggleFiniteMode}
                    title="Toggle between infinite and finite queue modes. Finite mode populates 20 shapes for testing."
                  >
                    {state.queueMode === 'finite' ? '✓ Finite Queue (20)' : 'Infinite Queue'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export { SettingsOverlay };
