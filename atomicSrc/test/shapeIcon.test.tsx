import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShapeIcon } from '../main/Shared/ShapeIcon';
import type { ColorName } from '../main/App/types/core';

describe('ShapeIcon Component', () => {
  const colors: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'grey'];

  test('should render an icon for each color', () => {
    colors.forEach(color => {
      const { container } = render(<ShapeIcon color={color} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.classList.contains(`shape-icon-${color}`)).toBe(true);
    });
  });

  test('should apply custom size when provided', () => {
    const customSize = 48;
    const { container } = render(<ShapeIcon color="red" size={customSize} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe(String(customSize));
    expect(svg?.getAttribute('height')).toBe(String(customSize));
  });

  test('should apply custom opacity when provided', () => {
    const customOpacity = 0.5;
    const { container } = render(<ShapeIcon color="blue" opacity={customOpacity} />);
    const svg = container.querySelector('svg');
    expect(svg?.style.opacity).toBe(String(customOpacity));
  });

  test('should render different shapes for different colors', () => {
    // Red should have a circle
    const { container: redContainer } = render(<ShapeIcon color="red" />);
    expect(redContainer.querySelector('circle')).toBeTruthy();

    // Orange should have a polygon (triangle)
    const { container: orangeContainer } = render(<ShapeIcon color="orange" />);
    const orangePolygons = orangeContainer.querySelectorAll('polygon');
    expect(orangePolygons.length).toBeGreaterThan(0);

    // Yellow should have multiple elements (sun with rays)
    const { container: yellowContainer } = render(<ShapeIcon color="yellow" />);
    const yellowGroup = yellowContainer.querySelector('g');
    expect(yellowGroup).toBeTruthy();
    expect(yellowContainer.querySelector('circle')).toBeTruthy(); // Center
    expect(yellowContainer.querySelectorAll('polygon').length).toBe(8); // 8 rays

    // Green should have a path (leaf)
    const { container: greenContainer } = render(<ShapeIcon color="green" />);
    expect(greenContainer.querySelector('path')).toBeTruthy();

    // Blue should have a path (wave)
    const { container: blueContainer } = render(<ShapeIcon color="blue" />);
    expect(blueContainer.querySelector('path')).toBeTruthy();

    // Purple should have a path (crescent moon)
    const { container: purpleContainer } = render(<ShapeIcon color="purple" />);
    expect(purpleContainer.querySelector('path')).toBeTruthy();

    // Grey should have a polygon (diamond)
    const { container: greyContainer } = render(<ShapeIcon color="grey" />);
    expect(greyContainer.querySelector('polygon')).toBeTruthy();
  });

  test('should have aria-hidden attribute for accessibility', () => {
    const { container } = render(<ShapeIcon color="red" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  test('should use default size of 24 when not provided', () => {
    const { container } = render(<ShapeIcon color="green" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
  });

  test('should use default opacity of 1 when not provided', () => {
    const { container } = render(<ShapeIcon color="purple" />);
    const svg = container.querySelector('svg');
    expect(svg?.style.opacity).toBe('1');
  });
});
