/**
 * Color utilities for block color management and luminosity adjustments
 */

import type { ColorName } from '../../types/core';

/**
 * Converts RGB string to HSL values
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Converts HSL values to RGB string
 */
function hslToRgb(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * Parses an RGB string like "rgb(255, 0, 0)" into [r, g, b] values
 */
function parseRgb(rgbString: string): [number, number, number] {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    throw new Error(`Invalid RGB string: ${rgbString}`);
  }
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * Adjusts the luminosity of an RGB color string by a percentage
 * @param rgbString - RGB color string like "rgb(255, 0, 0)"
 * @param percent - Percentage to adjust (-100 to 100). Positive = lighter, negative = darker
 */
export function adjustLuminosity(rgbString: string, percent: number): string {
  const [r, g, b] = parseRgb(rgbString);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Adjust luminosity, clamping between 0 and 100
  const newL = Math.max(0, Math.min(100, l + percent));

  return hslToRgb(h, s, newL);
}

/**
 * Block color definitions for each theme
 */
export type BlockColorPalette = {
  [K in ColorName]: {
    bg: string;
    borderTop: string;
    borderLeft: string;
    borderRight: string;
    borderBottom: string;
  };
};

/**
 * Creates a complete block color palette with 3D effect borders
 * @param baseColors - Base RGB color for each block color name
 */
function createBlockPalette(baseColors: Record<ColorName, string>): BlockColorPalette {
  const palette: Partial<BlockColorPalette> = {};

  for (const colorName of Object.keys(baseColors) as ColorName[]) {
    const baseColor = baseColors[colorName];
    palette[colorName] = {
      bg: baseColor,
      borderTop: adjustLuminosity(baseColor, 20), // +20% lighter for top edge
      borderLeft: adjustLuminosity(baseColor, 10), // +10% lighter for left edge
      borderRight: adjustLuminosity(baseColor, -10), // -10% darker for right edge
      borderBottom: adjustLuminosity(baseColor, -20), // -20% darker for bottom edge
    };
  }

  return palette as BlockColorPalette;
}

/**
 * Dark mode block colors - vibrant colors that pop against dark background
 */
const DARK_MODE_BASE_COLORS: Record<ColorName, string> = {
  grey: 'rgb(140, 140, 140)',
  red: 'rgb(239, 68, 68)',
  orange: 'rgb(249, 115, 22)',
  yellow: 'rgb(250, 204, 21)',
  green: 'rgb(34, 197, 94)',
  blue: 'rgb(59, 130, 246)',
  purple: 'rgb(168, 85, 247)',
};

/**
 * Light mode block colors - slightly muted colors that work on light background
 */
const LIGHT_MODE_BASE_COLORS: Record<ColorName, string> = {
  grey: 'rgb(115, 115, 115)',
  red: 'rgb(220, 38, 38)',
  orange: 'rgb(234, 88, 12)',
  yellow: 'rgb(202, 138, 4)',
  green: 'rgb(22, 163, 74)',
  blue: 'rgb(37, 99, 235)',
  purple: 'rgb(147, 51, 234)',
};

/**
 * Block blast mode block colors - saturated, vibrant colors for the gradient background
 */
const BLOCK_BLAST_BASE_COLORS: Record<ColorName, string> = {
  grey: 'rgb(120, 140, 160)',
  red: 'rgb(220, 50, 50)',
  orange: 'rgb(230, 100, 30)',
  yellow: 'rgb(230, 180, 20)',
  green: 'rgb(40, 200, 80)',
  blue: 'rgb(50, 120, 230)',
  purple: 'rgb(180, 80, 230)',
};

/**
 * Pre-generated block color palettes for each theme
 */
export const BLOCK_COLOR_PALETTES = {
  dark: createBlockPalette(DARK_MODE_BASE_COLORS),
  light: createBlockPalette(LIGHT_MODE_BASE_COLORS),
  'block-blast': createBlockPalette(BLOCK_BLAST_BASE_COLORS),
};

/**
 * Converts a block color palette to CSS custom property definitions
 */
export function blockPaletteToCssVars(palette: BlockColorPalette): Record<string, string> {
  const cssVars: Record<string, string> = {};

  for (const colorName of Object.keys(palette) as ColorName[]) {
    const colors = palette[colorName];
    cssVars[`--color-${colorName}-bg`] = colors.bg;
    cssVars[`--color-${colorName}-border-top`] = colors.borderTop;
    cssVars[`--color-${colorName}-border-left`] = colors.borderLeft;
    cssVars[`--color-${colorName}-border-right`] = colors.borderRight;
    cssVars[`--color-${colorName}-border-bottom`] = colors.borderBottom;
  }

  return cssVars;
}
