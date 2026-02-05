import type { ScoreData } from '../../types/scoring';

/**
 * Calculates score using exponential formula with 5x multiplier:
 * ((rows_cleared)² + (columns_cleared)² + (rows × columns × 2)) × 5
 *
 * Examples:
 * - 1 row: 1² × 5 = 5 points
 * - 2 rows: 2² × 5 = 20 points
 * - 1 row + 1 column: (1² + 1² + (1×1×2)) × 5 = 4 × 5 = 20 points
 * - 3 rows + 2 columns: (3² + 2² + (3×2×2)) × 5 = 25 × 5 = 125 points
 */
export function calculateScore(rowsCleared: number, columnsCleared: number): ScoreData {
  const rowScore = Math.pow(rowsCleared, 2);
  const columnScore = Math.pow(columnsCleared, 2);
  const mixedBonus = rowsCleared > 0 && columnsCleared > 0 ? rowsCleared * columnsCleared * 2 : 0;

  const basePoints = rowScore + columnScore + mixedBonus;
  const pointsEarned = basePoints * 5; // Apply 5x multiplier

  return {
    rowsCleared,
    columnsCleared,
    pointsEarned,
  };
}

/**
 * Formats score for display with letter abbreviations (k, m, b, t, q, Q)
 * Maximum of 3 digits with 1 decimal place, rounded to nearest tenth
 */
export function formatScore(score: number): string {
  // Handle invalid inputs gracefully
  if (score === undefined || score === null || isNaN(score)) {
    return '0';
  }

  if (score < 1000) {
    return score.toString();
  }

  const abbreviations = [
    { value: 1e18, suffix: 'Q' }, // Quintillion
    { value: 1e15, suffix: 'q' }, // Quadrillion
    { value: 1e12, suffix: 't' }, // Trillion
    { value: 1e9, suffix: 'b' }, // Billion
    { value: 1e6, suffix: 'm' }, // Million
    { value: 1e3, suffix: 'k' }, // Thousand
  ];

  for (const { value, suffix } of abbreviations) {
    if (score >= value) {
      const formatted = score / value;
      if (formatted >= 100) {
        // 3 digits, no decimal (e.g., "123k")
        return Math.round(formatted) + suffix;
      }
      // 2 digits + 1 decimal (e.g., "12.3k")
      return (Math.round(formatted * 10) / 10).toFixed(1) + suffix;
    }
  }

  return score.toString();
}

/**
 * Creates a descriptive message about what was cleared and points earned
 */
export function getScoreMessage(scoreData: ScoreData): string {
  const { rowsCleared, columnsCleared, pointsEarned } = scoreData;

  if (pointsEarned === 0) return '';

  const parts: string[] = [];

  if (rowsCleared > 0) {
    parts.push(`${rowsCleared} row${rowsCleared > 1 ? 's' : ''}`);
  }

  if (columnsCleared > 0) {
    parts.push(`${columnsCleared} column${columnsCleared > 1 ? 's' : ''}`);
  }

  const clearedText = parts.join(' and ');
  const pointText = pointsEarned === 1 ? 'point' : 'points';

  return `Cleared ${clearedText}! +${pointsEarned} ${pointText}`;
}
