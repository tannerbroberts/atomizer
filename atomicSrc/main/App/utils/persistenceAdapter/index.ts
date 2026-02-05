/**
 * Persistence Adapter
 *
 * Provides high-level persistence functions for game state and settings.
 * Uses the CRUD pattern for IndexedDB operations.
 */

import type {
  SavedGameState,
  GameSettingsPersistenceData,
  ModifiersPersistenceData,
  LoadResult,
} from '../../types/persistence';
import { generateChecksumManifest, verifyChecksumManifest, type ChecksumManifest } from '../checksumUtils';
import * as crud from '../indexedDBCrud';
import { STORES } from '../indexedDBCrud';

// Toggle this to enable/disable persistence logging
const DEBUG_PERSISTENCE_CHECKSUMS = false;

// ============================================================================
// GAME STATE
// ============================================================================

/**
 * Save complete game state
 */
export async function saveGameState(state: SavedGameState): Promise<void> {
  // CRITICAL: Strip isGameOver from persisted data.
  // It's a derived state calculated on load, NOT persisted.

  const cleanedState = { ...state };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (cleanedState as any).isGameOver;

  // Generate the Shadow Manifest (Merkle Tree)
  const manifest = generateChecksumManifest(cleanedState);

  // Atomic-like write: Save Data AND Manifest
  await crud.batchWrite([
    { storeName: STORES.GAME_STATE, key: 'current', data: cleanedState },
    { storeName: STORES.CHECKSUMS, key: 'game_manifest', data: manifest },
  ]);

  if (DEBUG_PERSISTENCE_CHECKSUMS) {
    console.log(`[Persistence] Saved game state with Root Hash: ${manifest.root.hash}`);
  }
}

/**
 * Load complete game state
 */
export async function loadGameState(): Promise<LoadResult<SavedGameState>> {
  try {
    // Load Data and Manifest in parallel using a single transaction for consistency
    const [state, manifest] = await crud.batchRead([
      { storeName: STORES.GAME_STATE, key: 'current' },
      { storeName: STORES.CHECKSUMS, key: 'game_manifest' },
    ]) as [SavedGameState | null, ChecksumManifest | null];

    if (state) {
      // Helper to sanitize numeric values (handles NaN, Infinity, non-numbers)
      const sanitizeNumber = (val: unknown, fallback: number = 0): number => {
        if (typeof val === 'number' && Number.isFinite(val)) {
          return val;
        }
        return fallback;
      };

      // Sanitize state to ensure all required fields exist (handles partial/corrupted data)
      // NOTE: isGameOver is NOT loaded - it's a derived state calculated on load
      const sanitizedState: SavedGameState = {
        score: sanitizeNumber(state.score, 0),
        tiles: Array.isArray(state.tiles) ? state.tiles : [],
        nextShapes: Array.isArray(state.nextShapes) ? state.nextShapes : [],
        savedShape: state.savedShape ?? null,
        totalLinesCleared: sanitizeNumber(state.totalLinesCleared, 0),
        shapesUsed: sanitizeNumber(state.shapesUsed, 0),
        hasPlacedFirstShape: typeof state.hasPlacedFirstShape === 'boolean' ? state.hasPlacedFirstShape : false,
        stats: state.stats ?? (await import('../../types/stats')).INITIAL_STATS_PERSISTENCE,
        queueMode: state.queueMode,
        queueColorProbabilities: state.queueColorProbabilities,
        queueHiddenShapes: state.queueHiddenShapes,
        queueSize: state.queueSize,
        lastUpdated: sanitizeNumber(state.lastUpdated, Date.now()),
      };

      // Perform Strict Merkle Tree Verification
      if (manifest) {
        const result = verifyChecksumManifest(sanitizedState, manifest);

        if (!result.isValid) {
          console.error('%c[Persistence] CRITICAL DATA CORRUPTION!', 'color: red; font-weight: bold; font-size: 14px;');
          console.error(`%cRoot Hash Mismatch! Expected: ${manifest.root.hash}`, 'color: red;');
          console.group('%cCorruption Triage Report', 'color: orange;');
          result.mismatches.forEach((mismatch) => {
            console.error(`❌ Validation Failed at Node: ${mismatch}`);
          });
          console.groupEnd();

          // We DO NOT fix it. We report it.
          // The app will still load the data (to prevent crash), but the console is screaming.
        } else if (DEBUG_PERSISTENCE_CHECKSUMS) {
          console.log(`%c[Persistence] Integrity Verified. Root: ${manifest.root.hash}`, 'color: green;');
        }
      } else {
        console.warn('[Persistence] No checksum manifest found. This might be a legacy save.');
      }

      return { status: 'success', data: sanitizedState };
    }

    if (DEBUG_PERSISTENCE_CHECKSUMS) {
      console.warn('[Persistence] No saved state found');
    }
    return { status: 'not_found' };
  } catch (error) {
    console.error('Failed to load game state:', error);
    return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Clear game state (board + score), but preserve stats
 */
export async function clearGameBoard(): Promise<void> {
  const currentResult = await loadGameState();

  if (currentResult.status === 'success') {
    const current = currentResult.data;

    // Reset board and score, but keep stats
    // NOTE: isGameOver is not persisted - it's derived on load
    const resetState: SavedGameState = {
      ...current,
      score: 0,
      tiles: [],
      nextShapes: [],
      savedShape: null,
      totalLinesCleared: 0,
      shapesUsed: 0,
      hasPlacedFirstShape: false,
      lastUpdated: Date.now(),
      // stats: preserved from current
    };

    await saveGameState(resetState);
  }

  if (DEBUG_PERSISTENCE_CHECKSUMS) {
    console.log('[Persistence] Cleared game board (stats preserved)');
  }
}

/**
 * Update partial game state (only specified fields)
 */
export async function updateGameState(updates: Partial<SavedGameState>): Promise<void> {
  const current = await crud.read<SavedGameState>(STORES.GAME_STATE, 'current');

  if (!current) {
    throw new Error('Cannot update non-existent game state');
  }

  const updated: SavedGameState = {
    ...current,
    ...updates,
    lastUpdated: Date.now(),
  };

  // CRITICAL: Strip isGameOver from persisted data.
  // It's a derived state calculated on load, NOT persisted.
  // This ensures any legacy data with isGameOver doesn't corrupt new saves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (updated as any).isGameOver;

  // Use the main save function to ensure checksums are updated correctly
  await saveGameState(updated);
}

// ============================================================================
// SETTINGS (Global)
// ============================================================================

/**
 * Save game settings (internal)
 */
async function saveSettings(settings: GameSettingsPersistenceData): Promise<void> {
  await crud.write(STORES.SETTINGS, 'current', settings);
}

/**
 * Load game settings
 */
export async function loadSettings(): Promise<LoadResult<GameSettingsPersistenceData>> {
  try {
    const settings = await crud.read<GameSettingsPersistenceData>(STORES.SETTINGS, 'current');
    if (settings) {
      return { status: 'success', data: settings };
    }
    return { status: 'not_found' };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Update partial settings
 */
export async function updateSettings(
  updates: Partial<GameSettingsPersistenceData>,
): Promise<void> {
  const currentResult = await loadSettings();
  const current = currentResult.status === 'success' ? currentResult.data : null;

  const updated: GameSettingsPersistenceData = {
    music: current?.music || { isMuted: false, volume: 100, isEnabled: true, lastUpdated: Date.now() },
    soundEffects: current?.soundEffects || { isMuted: false, volume: 100, isEnabled: true, lastUpdated: Date.now() },
    ...current,
    ...updates,
    lastUpdated: Date.now(),
  };

  await saveSettings(updated);
}

/**
 * Save music settings specifically
 */
export async function saveMusicSettings(
  isMuted: boolean,
  volume: number = 100,
  isEnabled: boolean = true,
): Promise<void> {
  await updateSettings({
    music: {
      isMuted,
      volume,
      isEnabled,
      lastUpdated: Date.now(),
    },
  });
}

/**
 * Load music settings
 */
export async function loadMusicSettings(): Promise<LoadResult<{ isMuted: boolean; volume: number; isEnabled: boolean }>> {
  const result = await loadSettings();
  if (result.status === 'success') {
    return { status: 'success', data: result.data.music };
  }
  return result.status === 'not_found'
    ? { status: 'not_found' }
    : { status: 'error', error: result.error };
}

/**
 * Save sound effects settings specifically
 */
export async function saveSoundEffectsSettings(
  isMuted: boolean,
  volume: number = 100,
  isEnabled: boolean = true,
): Promise<void> {
  await updateSettings({
    soundEffects: {
      isMuted,
      volume,
      isEnabled,
      lastUpdated: Date.now(),
    },
  });
}

/**
 * Load sound effects settings
 */
export async function loadSoundEffectsSettings(): Promise<LoadResult<{ isMuted: boolean; volume: number; isEnabled: boolean }>> {
  const result = await loadSettings();
  if (result.status === 'success') {
    return { status: 'success', data: result.data.soundEffects };
  }
  return result.status === 'not_found'
    ? { status: 'not_found' }
    : { status: 'error', error: result.error };
}

/**
 * Save debug unlock status
 */
export async function saveDebugSettings(unlocked: boolean): Promise<void> {
  await updateSettings({ debugUnlocked: unlocked });
}

/**
 * Load debug settings
 */
export async function loadDebugSettings(): Promise<LoadResult<boolean>> {
  const result = await loadSettings();
  if (result.status === 'success') {
    return { status: 'success', data: result.data.debugUnlocked || false };
  }
  return result.status === 'not_found'
    ? { status: 'not_found' }
    : { status: 'error', error: result.error };
}

/**
 * Save theme preference
 */
export async function saveTheme(theme: string): Promise<void> {
  await updateSettings({ theme });
}

/**
 * Load theme
 */
export async function loadTheme(): Promise<LoadResult<string>> {
  const result = await loadSettings();
  if (result.status === 'success' && result.data.theme) {
    return { status: 'success', data: result.data.theme };
  }
  return { status: 'not_found' };
}

/**
 * Save block theme preference
 */
export async function saveBlockTheme(blockTheme: string): Promise<void> {
  await updateSettings({ blockTheme });
}

// ============================================================================
// MODIFIERS (cross-game)
// ============================================================================

/**
 * Save unlocked modifiers
 */
export async function saveModifiers(unlockedModifiers: Set<number>): Promise<void> {
  const data: ModifiersPersistenceData = {
    unlockedModifiers: Array.from(unlockedModifiers),
    lastUpdated: Date.now(),
  };
  await crud.write(STORES.MODIFIERS, 'current', data);
}

/**
 * Load unlocked modifiers
 */
export async function loadModifiers(): Promise<LoadResult<Set<number>>> {
  try {
    const data = await crud.read<ModifiersPersistenceData>(STORES.MODIFIERS, 'current');
    if (data?.unlockedModifiers) {
      return { status: 'success', data: new Set(data.unlockedModifiers) };
    }
    return { status: 'not_found' };
  } catch (error) {
    console.error('Failed to load modifiers:', error);
    return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear ALL data including settings, but PRESERVE long-term statistics
 *
 * This function extracts all-time and high-score stats before clearing,
 * then restores them after. This ensures user progress is never lost.
 */
export async function clearAllDataAndReload(): Promise<void> {
  try {
    // STEP 1: Extract and preserve long-term statistics
    let preservedStats: {
      allTime: any;
      highScore: any;
      noTurnStreak: { allTimeBest: number };
    } | null = null;

    try {
      const gameStateResult = await loadGameState();
      if (gameStateResult.status === 'success' && gameStateResult.data.stats) {
        // Preserve only the long-term data: allTime, highScore, and allTimeBest streak
        preservedStats = {
          allTime: JSON.parse(JSON.stringify(gameStateResult.data.stats.allTime)),
          highScore: JSON.parse(JSON.stringify(gameStateResult.data.stats.highScore)),
          noTurnStreak: {
            allTimeBest: gameStateResult.data.stats.noTurnStreak.allTimeBest,
          },
        };
        console.log('[Persistence] Preserved long-term stats before clearing data');
      }
    } catch (error) {
      console.warn('[Persistence] Could not extract stats before clearing:', error);
      // Continue with clearing even if stats extraction fails
    }

    // STEP 2: Clear all stores
    await Promise.all(
      Object.values(STORES).map((store) => crud.clear(store)),
    );

    // Clear localStorage backup
    localStorage.clear();

    // Clear caches
    if ('caches' in globalThis) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // STEP 3: Restore preserved stats if they were successfully extracted
    if (preservedStats) {
      try {
        const { INITIAL_STATS_PERSISTENCE } = await import('../../types/stats');

        const restoredStats = {
          ...INITIAL_STATS_PERSISTENCE,
          allTime: preservedStats.allTime,
          highScore: preservedStats.highScore,
          noTurnStreak: {
            current: 0,
            bestInGame: 0,
            allTimeBest: preservedStats.noTurnStreak.allTimeBest,
          },
          lastUpdated: Date.now(),
        };

        // Save the restored stats to a fresh game state
        const freshGameState: SavedGameState = {
          score: 0,
          tiles: [],
          nextShapes: [],
          savedShape: null,
          totalLinesCleared: 0,
          shapesUsed: 0,
          hasPlacedFirstShape: false,
          stats: restoredStats,
          lastUpdated: Date.now(),
        };

        await saveGameState(freshGameState);
        console.log('[Persistence] Successfully restored long-term stats after clearing');
      } catch (error) {
        console.error('[Persistence] Failed to restore stats after clearing:', error);
        // Continue with reload even if restoration fails
      }
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }

  // Force reload
  globalThis.location.reload();
}

/**
 * Initialize persistence system on app startup
 */
export async function initializePersistence(): Promise<void> {
  await crud.initDB();
}

// ============================================================================
// CALL TO ACTION TIMESTAMPS
// ============================================================================

/**
 * Save call-to-action timestamp
 */
export async function saveCallToActionTimestamp(callKey: string, timestamp: number): Promise<void> {
  const key = `cta-${callKey}`;
  await crud.write(STORES.SETTINGS, key, timestamp);
}

/**
 * Load call-to-action timestamp
 */
export async function loadCallToActionTimestamp(callKey: string): Promise<LoadResult<number>> {
  const key = `cta-${callKey}`;
  try {
    const timestamp = await crud.read<number>(STORES.SETTINGS, key);
    if (timestamp !== null && typeof timestamp === 'number') {
      return { status: 'success', data: timestamp };
    }
    return { status: 'not_found' };
  } catch (error) {
    console.error('Failed to load call-to-action timestamp:', error);
    return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
  }
}
