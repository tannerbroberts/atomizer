
import type { ColorName } from '../core';

export type StatCategory = | 'shapesPlaced'
  | 'linesCleared'
  | 'coloredLinesCleared'
  | 'rowsCleared'
  | 'doubleRows'
  | 'tripleRows'
  | 'quadrupleRows'
  | 'doubleRowsWithSingleColumns'
  | 'tripleRowsWithSingleColumns'
  | 'tripleRowsWithDoubleColumns'
  | 'quadrupleRowsWithSingleColumns'
  | 'columnsCleared'
  | 'doubleColumns'
  | 'tripleColumns'
  | 'quadrupleColumns'
  | 'doubleColumnsWithSingleRows'
  | 'tripleColumnsWithDoubleRows'
  | 'tripleColumnsWithSingleRows'
  | 'quadrupleColumnsWithSingleRows'
  | 'singleColumnBySingleRow'
  | 'doubleColumnByDoubleRow'
  | 'quadrupleRowByQuadrupleColumn';

export type ColorStat = {
  [key in ColorName]?: number;
};

export type StatValue = {
  total: number;
  colors: ColorStat;
};

export type GameStats = {
  [key in StatCategory]: StatValue;
};

export type StatsPersistenceData = {
  allTime: GameStats;
  highScore: GameStats; // Stores the highest single-game record for each stat
  current: GameStats;
  lastUpdated: number;
  // No-turn streak tracking
  noTurnStreak: {
    current: number; // Current streak for ongoing game
    bestInGame: number; // Best streak in current game
    allTimeBest: number; // Best streak across all games
  };
};

const INITIAL_STAT_VALUE: StatValue = {
  total: 0,
  colors: {},
};

export const INITIAL_GAME_STATS: GameStats = {
  shapesPlaced: { ...INITIAL_STAT_VALUE },
  linesCleared: { ...INITIAL_STAT_VALUE },
  coloredLinesCleared: { ...INITIAL_STAT_VALUE },
  rowsCleared: { ...INITIAL_STAT_VALUE },
  doubleRows: { ...INITIAL_STAT_VALUE },
  tripleRows: { ...INITIAL_STAT_VALUE },
  quadrupleRows: { ...INITIAL_STAT_VALUE },
  doubleRowsWithSingleColumns: { ...INITIAL_STAT_VALUE },
  tripleRowsWithSingleColumns: { ...INITIAL_STAT_VALUE },
  tripleRowsWithDoubleColumns: { ...INITIAL_STAT_VALUE },
  quadrupleRowsWithSingleColumns: { ...INITIAL_STAT_VALUE },
  columnsCleared: { ...INITIAL_STAT_VALUE },
  doubleColumns: { ...INITIAL_STAT_VALUE },
  tripleColumns: { ...INITIAL_STAT_VALUE },
  quadrupleColumns: { ...INITIAL_STAT_VALUE },
  doubleColumnsWithSingleRows: { ...INITIAL_STAT_VALUE },
  tripleColumnsWithDoubleRows: { ...INITIAL_STAT_VALUE },
  tripleColumnsWithSingleRows: { ...INITIAL_STAT_VALUE },
  quadrupleColumnsWithSingleRows: { ...INITIAL_STAT_VALUE },
  singleColumnBySingleRow: { ...INITIAL_STAT_VALUE },
  doubleColumnByDoubleRow: { ...INITIAL_STAT_VALUE },
  quadrupleRowByQuadrupleColumn: { ...INITIAL_STAT_VALUE },
};

export const INITIAL_STATS_PERSISTENCE: StatsPersistenceData = {
  allTime: JSON.parse(JSON.stringify(INITIAL_GAME_STATS)),
  highScore: JSON.parse(JSON.stringify(INITIAL_GAME_STATS)),
  current: JSON.parse(JSON.stringify(INITIAL_GAME_STATS)),
  lastUpdated: Date.now(),
  noTurnStreak: {
    current: 0,
    bestInGame: 0,
    allTimeBest: 0,
  },
};
