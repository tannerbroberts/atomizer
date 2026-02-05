/**
 * Line Clearing Orchestrator
 *
 * High-level orchestration of line clearing process including:
 * - Detecting full lines
 * - Clearing tiles
 * - Generating animations
 * - Playing sound effects
 * - Calculating score
 * - Detecting full board clears
 */

import { playSound } from '../../contexts/SoundEffectsContext';
import type { TilesSet } from '../../types/core';
import { generateClearingAnimations, generateFullBoardClearAnimation, AnimationConfig } from '../clearingAnimationUtils';
import { clearFullLines, isGridCompletelyEmpty } from '../lineUtils';
import { calculateScore } from '../scoringUtils';

const CLEARING_ANIMATION_CONFIG: AnimationConfig = {
  rows: {
    single: { duration: 500, waveDelay: 50, startDelay: 0 },
    double: { duration: 500, waveDelay: 50, startDelay: 500 },
    triple: { duration: 500, waveDelay: 50, startDelay: 1000 },
    quad: { duration: 3000, waveDelay: 50, startDelay: 1500, beatCount: 3 },
  },
  columns: {
    single: { duration: 500, waveDelay: 50, startDelay: 0 },
    double: { duration: 500, waveDelay: 50, startDelay: 500 },
    triple: { duration: 500, waveDelay: 50, startDelay: 1000 },
    quad: { duration: 3000, waveDelay: 50, startDelay: 1500, beatCount: 3 },
  },
  fullBoardClear: {
    columns: { duration: 800, waveDelay: 40, startDelay: 0 },
    rows: { duration: 800, waveDelay: 40, startDelay: 900 },
  },
};

export interface LineClearingResult {
  tiles: TilesSet;
  pointsEarned: number;
  clearedRowIndices: number[];
  clearedColumnIndices: number[];
  isFullBoardClear: boolean;
}

/**
 * Helper function to play line clear sound effects
 */
function playLineClearSounds(clearedRows: number[], clearedColumns: number[], baseStartTime: number) {
  const scheduleSound = (count: number, type: 'rows' | 'columns') => {
    if (count >= 1) playSound('clear_combo_1', baseStartTime + CLEARING_ANIMATION_CONFIG[type].single.startDelay);
    if (count >= 2) playSound('clear_combo_2', baseStartTime + CLEARING_ANIMATION_CONFIG[type].double.startDelay);
    if (count >= 3) playSound('clear_combo_3', baseStartTime + CLEARING_ANIMATION_CONFIG[type].triple.startDelay);
    if (count >= 4) {
      const quadStart = baseStartTime + CLEARING_ANIMATION_CONFIG[type].quad.startDelay;
      playSound('clear_combo_4', quadStart);

      // Schedule heartbeat sounds to match the 3 beats of the quad animation
      const beatInterval = 800;
      playSound('heartbeat', quadStart + 100);
      playSound('heartbeat', quadStart + 100 + beatInterval);
      playSound('heartbeat', quadStart + 100 + (beatInterval * 2));
    }
  };

  scheduleSound(clearedRows.length, 'rows');
  scheduleSound(clearedColumns.length, 'columns');
}

/**
 * Helper function to calculate when normal line clear animations finish
 */
function calculateNormalAnimationEndTime(rowCount: number, columnCount: number): number {
  let maxEndTime = 0;

  // Check row animations
  if (rowCount >= 4) {
    const quadEnd = CLEARING_ANIMATION_CONFIG.rows.quad.startDelay + CLEARING_ANIMATION_CONFIG.rows.quad.duration;
    maxEndTime = Math.max(maxEndTime, quadEnd);
  } else if (rowCount >= 3) {
    const tripleEnd = CLEARING_ANIMATION_CONFIG.rows.triple.startDelay + CLEARING_ANIMATION_CONFIG.rows.triple.duration
      + (9 * CLEARING_ANIMATION_CONFIG.rows.triple.waveDelay);
    maxEndTime = Math.max(maxEndTime, tripleEnd);
  } else if (rowCount >= 2) {
    const doubleEnd = CLEARING_ANIMATION_CONFIG.rows.double.startDelay + CLEARING_ANIMATION_CONFIG.rows.double.duration
      + (9 * CLEARING_ANIMATION_CONFIG.rows.double.waveDelay);
    maxEndTime = Math.max(maxEndTime, doubleEnd);
  } else if (rowCount >= 1) {
    const singleEnd = CLEARING_ANIMATION_CONFIG.rows.single.startDelay + CLEARING_ANIMATION_CONFIG.rows.single.duration
      + (9 * CLEARING_ANIMATION_CONFIG.rows.single.waveDelay);
    maxEndTime = Math.max(maxEndTime, singleEnd);
  }

  // Check column animations
  if (columnCount >= 4) {
    const quadEnd = CLEARING_ANIMATION_CONFIG.columns.quad.startDelay + CLEARING_ANIMATION_CONFIG.columns.quad.duration;
    maxEndTime = Math.max(maxEndTime, quadEnd);
  } else if (columnCount >= 3) {
    const tripleEnd = CLEARING_ANIMATION_CONFIG.columns.triple.startDelay + CLEARING_ANIMATION_CONFIG.columns.triple.duration
      + (9 * CLEARING_ANIMATION_CONFIG.columns.triple.waveDelay);
    maxEndTime = Math.max(maxEndTime, tripleEnd);
  } else if (columnCount >= 2) {
    const doubleEnd = CLEARING_ANIMATION_CONFIG.columns.double.startDelay + CLEARING_ANIMATION_CONFIG.columns.double.duration
      + (9 * CLEARING_ANIMATION_CONFIG.columns.double.waveDelay);
    maxEndTime = Math.max(maxEndTime, doubleEnd);
  } else if (columnCount >= 1) {
    const singleEnd = CLEARING_ANIMATION_CONFIG.columns.single.startDelay + CLEARING_ANIMATION_CONFIG.columns.single.duration
      + (9 * CLEARING_ANIMATION_CONFIG.columns.single.waveDelay);
    maxEndTime = Math.max(maxEndTime, singleEnd);
  }

  return maxEndTime;
}

/**
 * Orchestrates the complete line clearing process
 *
 * This function:
 * 1. Detects and clears full lines
 * 2. Generates clearing animations
 * 3. Plays sound effects
 * 4. Calculates score (including full board clear bonus)
 * 5. Returns updated tiles and scoring information
 *
 * @param tiles - Current tile state
 * @returns LineClearingResult with updated tiles and scoring info
 */
export function performLineClearing(tiles: TilesSet): LineClearingResult {
  const baseStartTime = performance.now();

  // Step 1: Detect and clear full lines
  const { tiles: clearedTiles, clearedRows, clearedColumns } = clearFullLines(tiles);
  const clearedRowIndices = clearedRows.map((r) => r.index);
  const clearedColumnIndices = clearedColumns.map((c) => c.index);

  // Step 2: Check if clearing resulted in an empty board (full board clear!)
  const isFullBoardClear = isGridCompletelyEmpty(clearedTiles);

  // Step 3: Generate normal clearing animations
  let finalTiles = generateClearingAnimations(
    clearedTiles,
    clearedRows,
    clearedColumns,
    {
      ...CLEARING_ANIMATION_CONFIG,
      baseStartTime,
    },
  );

  // Step 4: Play sound effects for line clearing
  playLineClearSounds(clearedRowIndices, clearedColumnIndices, baseStartTime);

  // Step 5: Calculate score for lines cleared
  let scoreData = calculateScore(clearedRowIndices.length, clearedColumnIndices.length);

  // Step 6: If full board clear, add bonus and additional animations
  if (isFullBoardClear) {
    // Calculate when normal animations finish
    const normalAnimationEndTime = calculateNormalAnimationEndTime(
      clearedRowIndices.length,
      clearedColumnIndices.length,
    );

    // Add full board clear animations that play AFTER normal animations
    finalTiles = generateFullBoardClearAnimation(
      finalTiles,
      {
        ...CLEARING_ANIMATION_CONFIG,
        baseStartTime,
      },
      normalAnimationEndTime,
    );

    // Add 300 bonus points for full board clear
    scoreData = {
      ...scoreData,
      pointsEarned: scoreData.pointsEarned + 300,
    };

    // Play special sound for full board clear (after normal animations)
    const fullBoardSoundStart = baseStartTime + normalAnimationEndTime;
    playSound('clear_combo_4', fullBoardSoundStart);
    playSound('heartbeat', fullBoardSoundStart + 200);
    playSound('heartbeat', fullBoardSoundStart + 700);
    playSound('heartbeat', fullBoardSoundStart + 1200);
  }

  return {
    tiles: finalTiles,
    pointsEarned: scoreData.pointsEarned,
    clearedRowIndices,
    clearedColumnIndices,
    isFullBoardClear,
  };
}
