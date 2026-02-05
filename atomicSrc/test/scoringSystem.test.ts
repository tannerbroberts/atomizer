import { describe, it, expect } from 'vitest';
import { calculateScore, formatScore, getScoreMessage } from '../main/App/utils/scoringUtils';

describe('Scoring System', () => {
  describe('calculateScore', () => {
    it('should calculate exponential scoring with 5x multiplier correctly', () => {
      // Test single row clearing
      expect(calculateScore(1, 0)).toEqual({
        rowsCleared: 1,
        columnsCleared: 0,
        pointsEarned: 5, // 1² × 5
      });

      // Test multiple rows clearing
      expect(calculateScore(2, 0)).toEqual({
        rowsCleared: 2,
        columnsCleared: 0,
        pointsEarned: 20, // 2² × 5
      });

      // Test single column clearing
      expect(calculateScore(0, 1)).toEqual({
        rowsCleared: 0,
        columnsCleared: 1,
        pointsEarned: 5, // 1² × 5
      });

      // Test multiple columns clearing
      expect(calculateScore(0, 3)).toEqual({
        rowsCleared: 0,
        columnsCleared: 3,
        pointsEarned: 45, // 3² × 5
      });

      // Test mixed row and column clearing (with multiplier bonus)
      expect(calculateScore(1, 1)).toEqual({
        rowsCleared: 1,
        columnsCleared: 1,
        pointsEarned: 20, // (1² + 1² + (1×1×2)) × 5 = 4 × 5
      });

      // Test larger mixed clearing
      expect(calculateScore(2, 2)).toEqual({
        rowsCleared: 2,
        columnsCleared: 2,
        pointsEarned: 80, // (2² + 2² + (2×2×2)) × 5 = 16 × 5
      });

      // Test complex scenario from documentation
      expect(calculateScore(3, 2)).toEqual({
        rowsCleared: 3,
        columnsCleared: 2,
        pointsEarned: 125, // (3² + 2² + (3×2×2)) × 5 = 25 × 5
      });

      // Test no clearing
      expect(calculateScore(0, 0)).toEqual({
        rowsCleared: 0,
        columnsCleared: 0,
        pointsEarned: 0,
      });
    });
  });

  describe('formatScore', () => {
    it('should format scores with letter abbreviations', () => {
      // Numbers under 1000 stay as-is
      expect(formatScore(0)).toBe('0');
      expect(formatScore(42)).toBe('42');
      expect(formatScore(999)).toBe('999');

      // Thousands with k
      expect(formatScore(1000)).toBe('1.0k');
      expect(formatScore(1234)).toBe('1.2k');
      expect(formatScore(12345)).toBe('12.3k');
      expect(formatScore(99900)).toBe('99.9k');
      expect(formatScore(123000)).toBe('123k');

      // Millions with m
      expect(formatScore(1000000)).toBe('1.0m');
      expect(formatScore(1234567)).toBe('1.2m');
      expect(formatScore(12345678)).toBe('12.3m');
      expect(formatScore(123456789)).toBe('123m');

      // Billions with b
      expect(formatScore(1000000000)).toBe('1.0b');
      expect(formatScore(1234567890)).toBe('1.2b');

      // Trillions with t
      expect(formatScore(1000000000000)).toBe('1.0t');

      // Quadrillions with q
      expect(formatScore(1000000000000000)).toBe('1.0q');

      // Quintillions with Q
      expect(formatScore(1000000000000000000)).toBe('1.0Q');
    });
  });

  describe('getScoreMessage', () => {
    it('should generate appropriate score messages', () => {
      expect(getScoreMessage({
        rowsCleared: 1,
        columnsCleared: 0,
        pointsEarned: 5,
      })).toBe('Cleared 1 row! +5 points');

      expect(getScoreMessage({
        rowsCleared: 2,
        columnsCleared: 0,
        pointsEarned: 20,
      })).toBe('Cleared 2 rows! +20 points');

      expect(getScoreMessage({
        rowsCleared: 0,
        columnsCleared: 1,
        pointsEarned: 5,
      })).toBe('Cleared 1 column! +5 points');

      expect(getScoreMessage({
        rowsCleared: 0,
        columnsCleared: 3,
        pointsEarned: 45,
      })).toBe('Cleared 3 columns! +45 points');

      expect(getScoreMessage({
        rowsCleared: 1,
        columnsCleared: 1,
        pointsEarned: 20,
      })).toBe('Cleared 1 row and 1 column! +20 points');

      expect(getScoreMessage({
        rowsCleared: 2,
        columnsCleared: 3,
        pointsEarned: 125,
      })).toBe('Cleared 2 rows and 3 columns! +125 points');

      expect(getScoreMessage({
        rowsCleared: 0,
        columnsCleared: 0,
        pointsEarned: 0,
      })).toBe('');
    });
  });
});