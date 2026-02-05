import { describe, it, expect } from 'vitest';
import { getShapeBounds } from '../main/App/utils/shapes/shapeGeometry';
import type { Shape, Block } from '../main/App/types/core';

describe('Shape Centering', () => {
  const createBlock = (isFilled: boolean): Block => ({
    color: 'blue',
    isFilled,
  });

  const _ = () => createBlock(false);
  const X = () => createBlock(true);

  it('should calculate correct bounds for 2x2 square (O-piece)', () => {
    const shape: Shape = [
      [_(), _(), _(), _()],
      [_(), X(), X(), _()],
      [_(), X(), X(), _()],
      [_(), _(), _(), _()],
    ];

    const bounds = getShapeBounds(shape);
    expect(bounds).toEqual({
      minRow: 1,
      maxRow: 2,
      minCol: 1,
      maxCol: 2,
      width: 2,
      height: 2,
    });

    // Visual center should be at (1.5, 1.5) in the bounds
    const visualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const visualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    expect(visualCenterRow).toBe(1.5);
    expect(visualCenterCol).toBe(1.5);

    // Grid center is also (1.5, 1.5), so offset should be 0
    const gridCenter = 1.5;
    const offsetX = gridCenter - visualCenterCol;
    const offsetY = gridCenter - visualCenterRow;
    expect(offsetX).toBe(0);
    expect(offsetY).toBe(0);
  });

  it('should calculate correct centering offset for 3x2 T-piece', () => {
    const shape: Shape = [
      [_(), _(), _(), _()],
      [_(), X(), _(), _()],
      [X(), X(), X(), _()],
      [_(), _(), _(), _()],
    ];

    const bounds = getShapeBounds(shape);
    expect(bounds).toEqual({
      minRow: 1,
      maxRow: 2,
      minCol: 0,
      maxCol: 2,
      width: 3,
      height: 2,
    });

    // Visual center: col = 0 + (3-1)/2 = 1, row = 1 + (2-1)/2 = 1.5
    const visualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const visualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    expect(visualCenterRow).toBe(1.5);
    expect(visualCenterCol).toBe(1);

    // Grid center is (1.5, 1.5), so we need to shift right by 0.5 cells
    const gridCenter = 1.5;
    const offsetX = gridCenter - visualCenterCol;
    const offsetY = gridCenter - visualCenterRow;
    expect(offsetX).toBe(0.5);
    expect(offsetY).toBe(0);
  });

  it('should calculate correct centering offset for 1x4 I-piece (horizontal)', () => {
    const shape: Shape = [
      [_(), _(), _(), _()],
      [_(), _(), _(), _()],
      [X(), X(), X(), X()],
      [_(), _(), _(), _()],
    ];

    const bounds = getShapeBounds(shape);
    expect(bounds).toEqual({
      minRow: 2,
      maxRow: 2,
      minCol: 0,
      maxCol: 3,
      width: 4,
      height: 1,
    });

    // Visual center: col = 0 + (4-1)/2 = 1.5, row = 2 + (1-1)/2 = 2
    const visualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const visualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    expect(visualCenterRow).toBe(2);
    expect(visualCenterCol).toBe(1.5);

    // Grid center is (1.5, 1.5), so we need to shift up by 0.5 cells (no horizontal shift)
    const gridCenter = 1.5;
    const offsetX = gridCenter - visualCenterCol;
    const offsetY = gridCenter - visualCenterRow;
    expect(offsetX).toBe(0);
    expect(offsetY).toBe(-0.5);
  });

  it('should calculate correct centering offset for 4x1 I-piece (vertical)', () => {
    const shape: Shape = [
      [_(), X(), _(), _()],
      [_(), X(), _(), _()],
      [_(), X(), _(), _()],
      [_(), X(), _(), _()],
    ];

    const bounds = getShapeBounds(shape);
    expect(bounds).toEqual({
      minRow: 0,
      maxRow: 3,
      minCol: 1,
      maxCol: 1,
      width: 1,
      height: 4,
    });

    // Visual center: col = 1 + (1-1)/2 = 1, row = 0 + (4-1)/2 = 1.5
    const visualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const visualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    expect(visualCenterRow).toBe(1.5);
    expect(visualCenterCol).toBe(1);

    // Grid center is (1.5, 1.5), so we need to shift right by 0.5 cells (no vertical shift)
    const gridCenter = 1.5;
    const offsetX = gridCenter - visualCenterCol;
    const offsetY = gridCenter - visualCenterRow;
    expect(offsetX).toBe(0.5);
    expect(offsetY).toBe(0);
  });

  it('should calculate correct centering offset for 3x2 L-piece', () => {
    const shape: Shape = [
      [_(), _(), _(), _()],
      [X(), X(), X(), _()],
      [X(), _(), _(), _()],
      [_(), _(), _(), _()],
    ];

    const bounds = getShapeBounds(shape);
    expect(bounds).toEqual({
      minRow: 1,
      maxRow: 2,
      minCol: 0,
      maxCol: 2,
      width: 3,
      height: 2,
    });

    // Visual center: col = 0 + (3-1)/2 = 1, row = 1 + (2-1)/2 = 1.5
    const visualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const visualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    expect(visualCenterRow).toBe(1.5);
    expect(visualCenterCol).toBe(1);

    // Grid center is (1.5, 1.5), so we need to shift right by 0.5 cells
    const gridCenter = 1.5;
    const offsetX = gridCenter - visualCenterCol;
    const offsetY = gridCenter - visualCenterRow;
    expect(offsetX).toBe(0.5);
    expect(offsetY).toBe(0);
  });

  it('should calculate correct centering offset for 2x3 S-piece', () => {
    const shape: Shape = [
      [_(), _(), _(), _()],
      [_(), X(), X(), _()],
      [X(), X(), _(), _()],
      [_(), _(), _(), _()],
    ];

    const bounds = getShapeBounds(shape);
    expect(bounds).toEqual({
      minRow: 1,
      maxRow: 2,
      minCol: 0,
      maxCol: 2,
      width: 3,
      height: 2,
    });

    // Visual center: col = 0 + (3-1)/2 = 1, row = 1 + (2-1)/2 = 1.5
    const visualCenterRow = bounds.minRow + (bounds.height - 1) / 2;
    const visualCenterCol = bounds.minCol + (bounds.width - 1) / 2;
    expect(visualCenterRow).toBe(1.5);
    expect(visualCenterCol).toBe(1);

    // Grid center is (1.5, 1.5), so we need to shift right by 0.5 cells
    const gridCenter = 1.5;
    const offsetX = gridCenter - visualCenterCol;
    const offsetY = gridCenter - visualCenterRow;
    expect(offsetX).toBe(0.5);
    expect(offsetY).toBe(0);
  });
});
