/**
 * Theme definitions and utilities for visual theming
 */

import type { ThemeName } from '../../types/theme';

/**
 * Theme color definitions
 */
export type ThemeDefinition = {
  background: string;
  gameBackground: string;
  text: string;
  textSecondary: string;
  gridBg: string;
  tileBg: string;
  tileBorder: string;
  headerBg: string;
  headerBorder: string;
  shapeSelectorBg: string;
  shapeSelectorBorder: string;
  overlayBg: string;
  buttonBg: string;
  buttonHover: string;
};

/**
 * All available theme definitions
 */
export const THEME_DEFINITIONS: Record<ThemeName, ThemeDefinition> = {
  dark: {
    background: 'rgb(25, 25, 25)',
    gameBackground: 'rgb(25, 25, 25)',
    text: 'rgb(200, 200, 200)',
    textSecondary: 'rgb(150, 150, 150)',
    gridBg: 'rgb(10, 10, 10)',
    tileBg: 'rgb(30, 30, 30)',
    tileBorder: 'rgb(50, 50, 50)',
    headerBg: 'rgb(25, 25, 25)',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    shapeSelectorBg: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 50%, rgba(240, 147, 251, 0.2) 100%)',
    shapeSelectorBorder: 'rgba(255, 255, 255, 0.3)',
    overlayBg: 'rgba(0, 0, 0, 0.85)',
    buttonBg: 'rgba(255, 255, 255, 0.1)',
    buttonHover: 'rgba(255, 255, 255, 0.2)',
  },
  light: {
    background: 'rgb(245, 245, 245)',
    gameBackground: 'rgb(235, 235, 235)',
    text: 'rgb(20, 20, 20)',
    textSecondary: 'rgb(100, 100, 100)',
    gridBg: 'rgb(220, 220, 220)',
    tileBg: 'rgb(255, 255, 255)',
    tileBorder: 'rgb(200, 200, 200)',
    headerBg: 'rgb(255, 255, 255)',
    headerBorder: 'rgba(0, 0, 0, 0.1)',
    shapeSelectorBg: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 50%, rgba(240, 147, 251, 0.15) 100%)',
    shapeSelectorBorder: 'rgba(0, 0, 0, 0.2)',
    overlayBg: 'linear-gradient(135deg, rgba(245, 245, 245, 0.98) 0%, rgba(235, 235, 235, 0.98) 100%)',
    buttonBg: 'rgba(0, 0, 0, 0.05)',
    buttonHover: 'rgba(0, 0, 0, 0.1)',
  },
  'block-blast': {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gameBackground: 'rgba(0, 0, 0, 0.15)',
    text: 'rgb(255, 255, 255)',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    gridBg: 'rgba(255, 255, 255, 0.1)',
    tileBg: 'rgba(255, 255, 255, 0.05)',
    tileBorder: 'rgba(255, 255, 255, 0.2)',
    headerBg: 'rgba(255, 255, 255, 0.1)',
    headerBorder: 'rgba(255, 255, 255, 0.2)',
    shapeSelectorBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%)',
    shapeSelectorBorder: 'rgba(255, 255, 255, 0.4)',
    overlayBg: 'rgba(102, 126, 234, 0.95)',
    buttonBg: 'rgba(255, 255, 255, 0.15)',
    buttonHover: 'rgba(255, 255, 255, 0.25)',
  },
};

/**
 * Converts theme definition to CSS custom properties
 */
export function themeToCssVars(theme: ThemeDefinition, themeName: ThemeName): Record<string, string> {
  return {
    '--theme-text': theme.text,
    '--theme-text-secondary': theme.textSecondary,
    '--theme-game-bg': theme.gameBackground,
    '--theme-grid-bg': theme.gridBg,
    '--theme-tile-bg': theme.tileBg,
    '--theme-tile-border': theme.tileBorder,
    '--theme-header-bg': theme.headerBg,
    '--theme-header-border': theme.headerBorder,
    '--theme-shape-selector-bg': theme.shapeSelectorBg,
    '--theme-shape-selector-border': theme.shapeSelectorBorder,
    '--theme-overlay-bg': theme.overlayBg,
    '--theme-button-bg': theme.buttonBg,
    '--theme-button-hover': theme.buttonHover,
    '--theme-animation-color': themeName === 'light' ? 'rgba(100, 100, 100, 0.55)' : 'rgba(255, 255, 255, 0.55)',
  };
}
