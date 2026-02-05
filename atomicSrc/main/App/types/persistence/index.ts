/**
 * Persistence types - Data structures for saving/loading game state
 */

import type { Shape, TileData } from '../core';

// Serialized queue item for persistence
export type SerializedQueueItem = | { type: 'shape'; shape: Shape }
  | { type: 'purchasable-slot'; cost: number; slotNumber: number };

// Saved game state for persistence
// NOTE: isGameOver is intentionally NOT persisted - it's a derived state
// that gets recalculated on load based on actual board state.
export type SavedGameState = {
  score: number;
  tiles: TileData[];
  nextShapes: Shape[]; // Legacy field for backwards compatibility
  nextQueue?: SerializedQueueItem[]; // New field - full queue with shapes and purchasable slots
  savedShape: Shape | null;
  totalLinesCleared: number;
  shapesUsed: number;
  hasPlacedFirstShape: boolean;
  stats: import('../stats').StatsPersistenceData;
  queueMode?: import('../shapeQueue').QueueMode;
  queueColorProbabilities?: import('../shapeQueue').ColorProbability[];
  queueHiddenShapes?: Shape[];
  queueSize?: number;
  unlockedSlots?: number; // Number of unlocked shape slots (1-4)
  // isGameOver is NOT persisted - see gameStateReducer.ts LOAD_GAME_STATE
  lastUpdated: number;
};

export type MusicPersistenceData = {
  isMuted: boolean;
  volume: number; // 0-100
  isEnabled: boolean; // separate from volume level
  lastUpdated: number;
};

export type SoundEffectsPersistenceData = {
  isMuted: boolean;
  volume: number; // 0-100
  isEnabled: boolean; // separate from volume level
  lastUpdated: number;
};

export type GameSettingsPersistenceData = {
  music: MusicPersistenceData;
  soundEffects: SoundEffectsPersistenceData;
  debugUnlocked?: boolean;
  theme?: string; // Theme name
  blockTheme?: string; // Block theme name
  showBlockIcons?: boolean; // Whether to show icons on blocks
  buttonSizeMultiplier?: number; // UI scaling: 0.5 to 1.5, default 1.0
  grandpaMode?: boolean; // Reduce Z and S shape frequency to 1/4 normal rate
  lastUpdated: number;
};

export type ModifiersPersistenceData = {
  unlockedModifiers: number[]; // Array of prime IDs for JSON serialization
  lastUpdated: number;
};

export type StatsPersistenceData = import('../stats').StatsPersistenceData;

// Load result type distinguishes between empty (new user) and error states
export type LoadResult<T> = | { status: 'success'; data: T }
  | { status: 'not_found' } // Valid: New user
  | { status: 'error'; error: Error }; // Critical: Do not overwrite!
