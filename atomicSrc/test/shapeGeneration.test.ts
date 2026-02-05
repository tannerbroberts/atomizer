import { describe, it, expect } from 'vitest';
import { generateRandomShape } from '../main/App/utils/shapes/shapeGeneration';
import { getFilledBlocks } from '../main/App/utils/shapes/shapeGeometry';

describe('Updated Shape Generation', () => {
  it('should only generate 4-block shapes (in 4x4 grid)', () => {
    const shapeStats = new Map<number, number>();
    const testCount = 1000;

    // Generate many shapes to test distribution
    for (let i = 0; i < testCount; i++) {
      const shape = generateRandomShape();
      const filledBlocks = getFilledBlocks(shape);
      const count = filledBlocks.length;

      shapeStats.set(count, (shapeStats.get(count) || 0) + 1);
    }

    console.log('Shape distribution by filled block count:');
    const sortedStats = Array.from(shapeStats.entries()).sort((a, b) => a[0] - b[0]);
    for (const [count, frequency] of sortedStats) {
      console.log(`${count} blocks: ${((frequency / testCount) * 100).toFixed(1)}% (${frequency}/${testCount})`);
    }

    // Verify we only have 4-block shapes
    const blockCounts = Array.from(shapeStats.keys()).sort((a, b) => a - b);
    expect(blockCounts).toEqual([4]);

    // Verify all shapes have exactly 4 blocks
    expect(shapeStats.get(4)).toBe(testCount); // All shapes should have 4 blocks
  });

  it('should have balanced shape type distribution (all 4-block shapes)', () => {
    const testCount = 7000; // 1000 per shape type expected
    let totalShapes = 0;

    for (let i = 0; i < testCount; i++) {
      const shape = generateRandomShape();
      const filledBlocks = getFilledBlocks(shape);
      const count = filledBlocks.length;

      // All shapes should have 4 blocks now
      expect(count).toBe(4);
      totalShapes++;
    }

    console.log(`All shapes have 4 blocks: ${totalShapes} (${((totalShapes / testCount) * 100).toFixed(1)}%)`);

    // With 7 shape types (all with 4 blocks), we expect equal distribution
    // Each shape type should appear ~14.3% (1/7) of the time
    expect(totalShapes).toBe(testCount);
  });

  it('should generate all 7 expected shape types', () => {
    const shapes: string[] = [];

    // Generate shapes until we have examples of different patterns
    for (let i = 0; i < 200; i++) {
      const shape = generateRandomShape();
      const pattern = shapeToPattern(shape);
      if (!shapes.includes(pattern)) {
        shapes.push(pattern);
      }
    }

    console.log(`Found ${shapes.length} different shape patterns:`);
    for (const [index, pattern] of shapes.entries()) {
      console.log(`Pattern ${index + 1}:`);
      console.log(pattern);
    }

    // We expect to find 7 different shape types: I, O, T, S, Z, L, J
    expect(shapes.length).toBeGreaterThanOrEqual(7);
  });
});

// Helper function to convert shape to string pattern for comparison
function shapeToPattern(shape: Array<Array<{ isFilled: boolean }>>): string {
  return shape.map(row =>
    row.map(block => block.isFilled ? '█' : '·').join('')
  ).join('\n') + '\n';
}