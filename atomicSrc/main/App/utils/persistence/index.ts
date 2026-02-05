/**
 * Persistence Utilities - Convenience Layer
 *
 * Provides easy-to-use functions for common persistence operations.
 */

import type { Shape, TileData, QueueItem } from '../../types/core';
import type { SavedGameState, LoadResult, SerializedQueueItem } from '../../types/persistence';
import type { StatsPersistenceData } from '../../types/stats';
import {
  saveGameState as saveGameStateAdapter,
  loadGameState as loadGameStateAdapter,
  updateGameState as updateGameStateAdapter,
  clearGameBoard,
  loadSettings as loadSettingsAdapter,
  saveMusicSettings as saveMusicSettingsAdapter,
  loadMusicSettings as loadMusicSettingsAdapter,
  saveSoundEffectsSettings as saveSoundEffectsSettingsAdapter,
  loadSoundEffectsSettings as loadSoundEffectsSettingsAdapter,
  saveDebugSettings as saveDebugSettingsAdapter,
  loadDebugSettings as loadDebugSettingsAdapter,
  saveTheme as saveThemeAdapter,
  loadTheme as loadThemeAdapter,
  saveBlockTheme as saveBlockThemeAdapter,
  saveModifiers,
  loadModifiers,
  clearAllDataAndReload,
  initializePersistence,
  saveCallToActionTimestamp,
  loadCallToActionTimestamp,
} from '../persistenceAdapter';

// Re-export the main functions
export {
  // Game state
  clearGameBoard,

  // Modifiers
  saveModifiers,
  loadModifiers,

  // Cleanup
  clearAllDataAndReload,

  // Initialization
  initializePersistence,

  // Call to Action
  saveCallToActionTimestamp,
  loadCallToActionTimestamp,
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Save complete game state
 */
async function saveGameState(data: {
  score: number;
  tiles: TileData[];
  nextShapes?: Shape[]; // Legacy - for backwards compatibility
  nextQueue?: QueueItem[]; // New - full queue with purchasable slots
  savedShape: Shape | null;
  totalLinesCleared?: number;
  shapesUsed?: number;
  hasPlacedFirstShape?: boolean;
  stats?: StatsPersistenceData;
  queueMode?: import('../../types/shapeQueue').QueueMode;
  queueColorProbabilities?: import('../../types/shapeQueue').ColorProbability[];
  queueHiddenShapes?: Shape[];
  queueSize?: number;
  unlockedSlots?: number;
  // NOTE: isGameOver is NOT persisted - it's a derived state
}): Promise<void> {
  // Serialize queue items (strip IDs, keep types and data)
  const serializedQueue: SerializedQueueItem[] | undefined = data.nextQueue?.map((item) => {
    if (item.type === 'shape') {
      return { type: 'shape' as const, shape: item.shape };
    }
    return {
      type: 'purchasable-slot' as const,
      cost: item.cost,
      slotNumber: item.slotNumber,
    };
  });

  // For backwards compatibility, also extract plain shapes
  const legacyShapes = data.nextQueue
    ? data.nextQueue.filter((item) => item.type === 'shape').map((item) => item.shape)
    : (data.nextShapes ?? []);

  const gameState: SavedGameState = {
    score: data.score,
    tiles: data.tiles,
    nextShapes: legacyShapes, // Keep for backwards compatibility
    nextQueue: serializedQueue, // New field - full queue structure
    savedShape: data.savedShape,
    totalLinesCleared: data.totalLinesCleared ?? 0,
    shapesUsed: data.shapesUsed ?? 0,
    hasPlacedFirstShape: data.hasPlacedFirstShape ?? false,
    stats: data.stats ?? (await import('../../types/stats')).INITIAL_STATS_PERSISTENCE,
    queueMode: data.queueMode,
    queueColorProbabilities: data.queueColorProbabilities,
    queueHiddenShapes: data.queueHiddenShapes,
    queueSize: data.queueSize,
    unlockedSlots: data.unlockedSlots,
    lastUpdated: Date.now(),
  };

  await saveGameStateAdapter(gameState);
}

/**
 * Load game state
 */
export async function loadGameState(): Promise<{
  score: number;
  tiles: TileData[];
  nextShapes: Shape[]; // Legacy
  nextQueue?: SerializedQueueItem[]; // New - full queue
  savedShape: Shape | null;
  totalLinesCleared: number;
  shapesUsed: number;
  hasPlacedFirstShape: boolean;
  stats: StatsPersistenceData;
  queueMode?: import('../../types/shapeQueue').QueueMode;
  queueColorProbabilities?: import('../../types/shapeQueue').ColorProbability[];
  queueHiddenShapes?: Shape[];
  queueSize?: number;
  unlockedSlots?: number;
  lastUpdated: number;
  // NOTE: isGameOver is NOT returned - it's calculated on load
} | null> {
  const result = await loadGameStateAdapter();

  if (result.status !== 'success') {
    return null;
  }

  return result.data;
}

/**
 * Batch save game data and stats
 */
export async function safeBatchSave(data: {
  score?: number;
  tiles?: TileData[];
  nextShapes?: Shape[]; // Legacy
  nextQueue?: QueueItem[]; // New - full queue
  savedShape?: Shape | null;
  stats?: StatsPersistenceData;
  totalLinesCleared?: number;
  shapesUsed?: number;
  hasPlacedFirstShape?: boolean;
  queueMode?: import('../../types/shapeQueue').QueueMode;
  queueColorProbabilities?: import('../../types/shapeQueue').ColorProbability[];
  queueHiddenShapes?: Shape[];
  queueSize?: number;
  unlockedSlots?: number;
  // NOTE: isGameOver is NOT saved - it's a derived state
}): Promise<void> {
  try {
    await updateGameStateAdapter(data);
  } catch (error) {
    // If no state exists yet, create it
    await saveGameState({
      score: data.score ?? 0,
      tiles: data.tiles ?? [],
      nextShapes: data.nextShapes,
      nextQueue: data.nextQueue,
      savedShape: data.savedShape ?? null,
      totalLinesCleared: data.totalLinesCleared,
      shapesUsed: data.shapesUsed,
      hasPlacedFirstShape: data.hasPlacedFirstShape,
      stats: data.stats,
      queueMode: data.queueMode,
      queueColorProbabilities: data.queueColorProbabilities,
      queueHiddenShapes: data.queueHiddenShapes,
      queueSize: data.queueSize,
      unlockedSlots: data.unlockedSlots,
    });
  }
}

/**
 * Load music settings with defaults
 */
export async function loadMusicSettings(): Promise<{
  isMuted: boolean;
  volume: number;
  isEnabled: boolean;
}> {
  const result = await loadMusicSettingsAdapter();

  if (result.status === 'success') {
    return result.data;
  }

  return {
    isMuted: false,
    volume: 100,
    isEnabled: true,
  };
}

/**
 * Save music settings
 */
export async function saveMusicSettings(
  isMuted: boolean,
  volume: number = 100,
  isEnabled: boolean = true,
): Promise<void> {
  await saveMusicSettingsAdapter(isMuted, volume, isEnabled);
}

/**
 * Load sound effects settings with defaults
 */
export async function loadSoundEffectsSettings(): Promise<{
  isMuted: boolean;
  volume: number;
  isEnabled: boolean;
}> {
  const result = await loadSoundEffectsSettingsAdapter();

  if (result.status === 'success') {
    return result.data;
  }

  return {
    isMuted: false,
    volume: 100,
    isEnabled: true,
  };
}

/**
 * Save sound effects settings
 */
export async function saveSoundEffectsSettings(
  isMuted: boolean,
  volume: number = 100,
  isEnabled: boolean = true,
): Promise<void> {
  await saveSoundEffectsSettingsAdapter(isMuted, volume, isEnabled);
}

/**
 * Load debug unlock status
 */
export async function loadDebugSettings(): Promise<boolean> {
  const result = await loadDebugSettingsAdapter();
  return result.status === 'success' ? result.data : false;
}

/**
 * Save debug settings
 */
export async function saveDebugSettings(unlocked: boolean): Promise<void> {
  await saveDebugSettingsAdapter(unlocked);
}

/**
 * Load theme preference
 */
export async function loadTheme(): Promise<string | null> {
  const result = await loadThemeAdapter();
  return result.status === 'success' ? result.data : null;
}

/**
 * Save theme
 */
export async function saveTheme(theme: string): Promise<void> {
  await saveThemeAdapter(theme);
}

/**
 * Save block theme
 */
export async function saveBlockTheme(blockTheme: string): Promise<void> {
  await saveBlockThemeAdapter(blockTheme);
}

/**
 * Load settings
 */
export async function loadSettingsData(): Promise<LoadResult<import('../../types/persistence').GameSettingsPersistenceData>> {
  return await loadSettingsAdapter();
}
