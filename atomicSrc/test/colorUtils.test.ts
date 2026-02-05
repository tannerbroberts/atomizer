import { describe, it, expect } from 'vitest';
import { adjustLuminosity, BLOCK_COLOR_PALETTES, blockPaletteToCssVars } from '../main/App/utils/colorUtils';

describe('Color Utilities', () => {
  describe('adjustLuminosity', () => {
    it('should lighten a color by positive percentage', () => {
      const baseColor = 'rgb(100, 100, 100)';
      const lightened = adjustLuminosity(baseColor, 20);
      // Should produce a lighter color
      expect(lightened).toMatch(/rgb\(\d+, \d+, \d+\)/);
      // Parse and verify it's lighter
      const [r, g, b] = lightened.match(/\d+/g)!.map(Number);
      expect(r).toBeGreaterThan(100);
      expect(g).toBeGreaterThan(100);
      expect(b).toBeGreaterThan(100);
    });

    it('should darken a color by negative percentage', () => {
      const baseColor = 'rgb(150, 150, 150)';
      const darkened = adjustLuminosity(baseColor, -20);
      // Should produce a darker color
      expect(darkened).toMatch(/rgb\(\d+, \d+, \d+\)/);
      // Parse and verify it's darker
      const [r, g, b] = darkened.match(/\d+/g)!.map(Number);
      expect(r).toBeLessThan(150);
      expect(g).toBeLessThan(150);
      expect(b).toBeLessThan(150);
    });

    it('should handle edge cases without crashing', () => {
      expect(adjustLuminosity('rgb(0, 0, 0)', -50)).toBe('rgb(0, 0, 0)');
      expect(adjustLuminosity('rgb(255, 255, 255)', 50)).toBe('rgb(255, 255, 255)');
    });
  });

  describe('BLOCK_COLOR_PALETTES', () => {
    it('should have palettes for all three themes', () => {
      expect(BLOCK_COLOR_PALETTES).toHaveProperty('dark');
      expect(BLOCK_COLOR_PALETTES).toHaveProperty('light');
      expect(BLOCK_COLOR_PALETTES).toHaveProperty('block-blast');
    });

    it('should have all seven colors in each palette', () => {
      const colorNames = ['grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'];
      
      for (const theme of ['dark', 'light', 'block-blast'] as const) {
        const palette = BLOCK_COLOR_PALETTES[theme];
        for (const colorName of colorNames) {
          expect(palette).toHaveProperty(colorName);
          expect(palette[colorName as keyof typeof palette]).toHaveProperty('bg');
          expect(palette[colorName as keyof typeof palette]).toHaveProperty('borderTop');
          expect(palette[colorName as keyof typeof palette]).toHaveProperty('borderLeft');
          expect(palette[colorName as keyof typeof palette]).toHaveProperty('borderRight');
          expect(palette[colorName as keyof typeof palette]).toHaveProperty('borderBottom');
        }
      }
    });

    it('should have correct luminosity adjustments for 3D effect', () => {
      const darkPalette = BLOCK_COLOR_PALETTES.dark;
      const redColor = darkPalette.red;
      
      // Parse base color
      const [rBase] = redColor.bg.match(/\d+/g)!.map(Number);
      
      // Parse border colors
      const [rTop] = redColor.borderTop.match(/\d+/g)!.map(Number);
      const [rLeft] = redColor.borderLeft.match(/\d+/g)!.map(Number);
      const [rRight] = redColor.borderRight.match(/\d+/g)!.map(Number);
      const [rBottom] = redColor.borderBottom.match(/\d+/g)!.map(Number);
      
      // Top should be lighter than base
      expect(rTop).toBeGreaterThan(rBase);
      // Left should be lighter than base (but less than top)
      expect(rLeft).toBeGreaterThan(rBase);
      // Right should be darker than base
      expect(rRight).toBeLessThan(rBase);
      // Bottom should be darker than base (and darker than right)
      expect(rBottom).toBeLessThan(rBase);
      expect(rBottom).toBeLessThan(rRight);
    });
  });

  describe('blockPaletteToCssVars', () => {
    it('should generate CSS variables for a palette', () => {
      const cssVars = blockPaletteToCssVars(BLOCK_COLOR_PALETTES.dark);
      
      // Should have 35 variables (7 colors × 5 properties each)
      expect(Object.keys(cssVars)).toHaveLength(35);
      
      // Check some specific variables exist
      expect(cssVars).toHaveProperty('--color-red-bg');
      expect(cssVars).toHaveProperty('--color-red-border-top');
      expect(cssVars).toHaveProperty('--color-red-border-left');
      expect(cssVars).toHaveProperty('--color-red-border-right');
      expect(cssVars).toHaveProperty('--color-red-border-bottom');
      
      expect(cssVars).toHaveProperty('--color-blue-bg');
      expect(cssVars).toHaveProperty('--color-purple-border-top');
    });

    it('should produce valid RGB color strings', () => {
      const cssVars = blockPaletteToCssVars(BLOCK_COLOR_PALETTES.light);
      
      for (const value of Object.values(cssVars)) {
        expect(value).toMatch(/rgb\(\d+, \d+, \d+\)/);
      }
    });
  });

  describe('Theme-specific color choices', () => {
    it('dark mode colors should be vibrant', () => {
      const darkRed = BLOCK_COLOR_PALETTES.dark.red.bg;
      const [r] = darkRed.match(/\d+/g)!.map(Number);
      // Dark mode colors should be fairly bright
      expect(r).toBeGreaterThan(200);
    });

    it('light mode colors should be slightly muted', () => {
      const lightRed = BLOCK_COLOR_PALETTES.light.red.bg;
      const [r] = lightRed.match(/\d+/g)!.map(Number);
      // Light mode colors should be less saturated
      expect(r).toBeLessThan(240);
      expect(r).toBeGreaterThan(180);
    });

    it('block-blast mode colors should be bright/pastel', () => {
      const blastRed = BLOCK_COLOR_PALETTES['block-blast'].red.bg;
      const [r] = blastRed.match(/\d+/g)!.map(Number);
      // Block blast colors should be bright (220 is bright red)
      expect(r).toBeGreaterThan(200);
    });
  });
});
