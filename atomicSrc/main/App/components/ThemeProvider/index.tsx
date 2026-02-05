/**
 * ThemeProvider - Applies theme styles to the application via CSS custom properties
 */

import React from 'react';

import { BLOCK_COLOR_PALETTES, blockPaletteToCssVars } from '../../utils/colorUtils';
import { THEME_DEFINITIONS, themeToCssVars } from '../../utils/themeUtils';
import { useTetrixStateContext } from '../../contexts/TetrixContext';

type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * Component that applies theme-specific CSS custom properties to its children
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { currentTheme } = useTetrixStateContext();

  // Get theme definitions
  const theme = THEME_DEFINITIONS[currentTheme];
  const blockColors = blockPaletteToCssVars(BLOCK_COLOR_PALETTES[currentTheme]);

  // Combine theme CSS variables with block color variables
  const themeStyle = {
    background: theme.background,
    color: theme.text,
    ...themeToCssVars(theme, currentTheme),
    ...blockColors,
  } as React.CSSProperties & Record<string, string>;

  return (
    <div className="App" style={themeStyle}>
      {children}
    </div>
  );
};
