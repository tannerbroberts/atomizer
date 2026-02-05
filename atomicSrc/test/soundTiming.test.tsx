import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { DraggingShape } from '../main/App/components/DraggingShape';
import { TetrixStateContext, TetrixDispatchContext } from '../main/App/contexts/TetrixContext';
import type { TetrixReducerState } from '../main/App/types/gameState';
import type { DragPhase } from '../main/App/types/drag';
import { INITIAL_GAME_STATS } from '../main/App/types/stats';
import { ANIMATION_TIMING } from '../main/App/utils/animationConstants';

const mocks = vi.hoisted(() => ({
  playSound: vi.fn(),
}));

// Mock the sound effects module
vi.mock('../components/SoundEffectsContext', () => ({
  playSound: mocks.playSound,
  useSoundEffects: () => ({
    playSound: mocks.playSound,
    setMuted: vi.fn(),
    isMuted: false
  })
}));

const mockDispatch = vi.fn();

const createMockState = (dragPhase: DragPhase): TetrixReducerState => ({
  gameState: 'playing',
  gameMode: 'infinite',
  currentLevel: 1,
  isMapUnlocked: false,
  mapCompletionResult: null,
  targetTiles: null,
  tiles: new Map(),
  nextShapes: [],
  savedShape: null,
  mouseGridLocation: { row: 5, column: 5 },
  mousePosition: { x: 100, y: 100 },
  gemIconPosition: { x: 100, y: 50 },
  gridTileSize: null,
  gridBounds: null,
  buttonSizeMultiplier: 1.0,
  currentTheme: 'dark',
  dragState: {
    phase: dragPhase,
    sourcePosition: dragPhase === 'picking-up' ? { x: 50, y: 50, width: 100, height: 100 } : null,
    targetPosition: dragPhase === 'placing' ? { x: 250, y: 250 } : null,
    placementLocation: null,
    startTime: dragPhase !== 'none' ? performance.now() : null,
    selectedShape: null,
    selectedShapeIndex: null,
    sourceId: null,
    isValidPlacement: false,
    hoveredBlockPositions: [],
    invalidBlockPositions: [],
    placementStartPosition: null,
    dragOffsets: null
  },
  shapeOptionBounds: [],
  openRotationMenus: [],
  score: 0,
  totalLinesCleared: 0,
  showCoinDisplay: false,
  queueSize: -1,
  shapesUsed: 0,
  queueMode: 'infinite' as const,
  queueColorProbabilities: [],
  queueHiddenShapes: [],
  hasPlacedFirstShape: false,
  isTurningModeActive: false,
  turningDirection: null,
  isDoubleTurnModeActive: false,
  unlockedModifiers: new Set(),
  removingShapeIndex: null,
  shapeRemovalAnimationState: 'none',
  newShapeAnimationStates: [],
  stats: {
    current: INITIAL_GAME_STATS,
    allTime: INITIAL_GAME_STATS,
    highScore: INITIAL_GAME_STATS,
    lastUpdated: 0,
    noTurnStreak: {
      current: 0,
      bestInGame: 0,
      allTimeBest: 0,
    },
  },
  hasLoadedPersistedState: true,
  isStatsOpen: false,
  isQueueOverlayOpen: false,
  insufficientFundsError: null,
  initialDailyState: null
});

describe('Sound Timing in DraggingShape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date']
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger sound during animation placement at correct timing', async () => {
    const mockState = createMockState('placing');

    render(
      <TetrixStateContext.Provider value={mockState}>
        <TetrixDispatchContext.Provider value={mockDispatch}>
          <DraggingShape />
        </TetrixDispatchContext.Provider>
      </TetrixStateContext.Provider>
    );

    // Calculate sound trigger time
    const soundTriggerTime = ANIMATION_TIMING.PLACING_DURATION - ANIMATION_TIMING.PLACEMENT_SOUND_DURATION;

    // Fast-forward to the sound trigger point
    await act(async () => {
      vi.advanceTimersByTime(soundTriggerTime + 10); // Add small buffer
      // Allow time for the next animation frame
      await vi.runOnlyPendingTimersAsync();
    });

    // Verify that the sound was called at the correct timing
    expect(mocks.playSound).toHaveBeenCalledWith('click_into_place');
  });

  it('should not trigger sound when not in placing animation state', async () => {
    const mockState = createMockState('none');

    render(
      <TetrixStateContext.Provider value={mockState}>
        <TetrixDispatchContext.Provider value={mockDispatch}>
          <DraggingShape />
        </TetrixDispatchContext.Provider>
      </TetrixStateContext.Provider>
    );

    // Fast-forward past the sound trigger point
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // Verify that no sound was triggered
    expect(mocks.playSound).not.toHaveBeenCalled();
  });

  it('should complete placement animation after duration', async () => {
    const mockState = createMockState('placing');

    render(
      <TetrixStateContext.Provider value={mockState}>
        <TetrixDispatchContext.Provider value={mockDispatch}>
          <DraggingShape />
        </TetrixDispatchContext.Provider>
      </TetrixStateContext.Provider>
    );

    // Fast-forward to completion
    await act(async () => {
      vi.advanceTimersByTime(ANIMATION_TIMING.PLACING_DURATION);
      // Allow time for the final animation frame
      await vi.runOnlyPendingTimersAsync();
    });

    // Verify that COMPLETE_PLACEMENT was dispatched
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'COMPLETE_PLACEMENT' });
  });
});