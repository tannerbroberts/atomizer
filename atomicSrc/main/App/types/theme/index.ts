/**
 * Theme types - Theme configuration and color schemes
 */

export type ThemeName = 'dark' | 'light' | 'block-blast';

export type BlockTheme = 'gem' | 'simple' | 'pixel';

export const BLOCK_THEMES: Record<BlockTheme, string> = {
  gem: 'Gem',
  simple: 'Simple',
  pixel: 'Pixel',
};

export type Theme = {
  name: ThemeName;
  displayName: string;
  colors: {
    background: string;
    gameBackground: string;
    gridBackground: string;
    text: string;
    textSecondary: string;
    border: string;
    buttonBg: string;
    buttonText: string;
    buttonHover: string;
    overlayBg: string;
    overlayText: string;
    tileEmpty: string;
    tileBorder: string;
  };
};

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    colors: {
      background: 'rgb(25, 25, 25)',
      gameBackground: 'rgb(25, 25, 25)',
      gridBackground: 'rgb(40, 40, 40)',
      text: 'rgb(255, 255, 255)',
      textSecondary: 'rgb(200, 200, 200)',
      border: 'rgb(60, 60, 60)',
      buttonBg: 'rgb(50, 50, 50)',
      buttonText: 'rgb(255, 255, 255)',
      buttonHover: 'rgb(70, 70, 70)',
      overlayBg: 'rgba(0, 0, 0, 0.85)',
      overlayText: 'rgb(255, 255, 255)',
      tileEmpty: 'rgb(30, 30, 30)',
      tileBorder: 'rgb(50, 50, 50)',
    },
  },
  light: {
    name: 'light',
    displayName: 'Light Mode',
    colors: {
      background: 'rgb(245, 245, 245)',
      gameBackground: 'rgb(255, 255, 255)',
      gridBackground: 'rgb(250, 250, 250)',
      text: 'rgb(20, 20, 20)',
      textSecondary: 'rgb(80, 80, 80)',
      border: 'rgb(200, 200, 200)',
      buttonBg: 'rgb(230, 230, 230)',
      buttonText: 'rgb(20, 20, 20)',
      buttonHover: 'rgb(210, 210, 210)',
      overlayBg: 'rgba(255, 255, 255, 0.95)',
      overlayText: 'rgb(20, 20, 20)',
      tileEmpty: 'rgb(255, 255, 255)',
      tileBorder: 'rgb(220, 220, 220)',
    },
  },
  'block-blast': {
    name: 'block-blast',
    displayName: 'Having A Blast',
    colors: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      gameBackground: 'rgba(255, 255, 255, 0.1)',
      gridBackground: 'rgba(255, 255, 255, 0.15)',
      text: 'rgb(255, 255, 255)',
      textSecondary: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(255, 255, 255, 0.3)',
      buttonBg: 'rgba(255, 255, 255, 0.2)',
      buttonText: 'rgb(255, 255, 255)',
      buttonHover: 'rgba(255, 255, 255, 0.3)',
      overlayBg: 'rgba(102, 126, 234, 0.95)',
      overlayText: 'rgb(255, 255, 255)',
      tileEmpty: 'rgba(255, 255, 255, 0.05)',
      tileBorder: 'rgba(255, 255, 255, 0.2)',
    },
  },
};
