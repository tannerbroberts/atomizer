/**
 * Game state types - Reducer state, actions, and game modes
 */

import type { ShapeRemovalAnimationState, ShapeCreationAnimationState, ShapeOptionBounds } from '../animation';
import type { Shape, QueueItem, Location, TilesSet, ColorName } from '../core';
import type { DragState } from '../drag';
import type { ScoreData } from '../scoring';
import type { QueueMode, ColorProbability } from '../shapeQueue';
import type { StatsPersistenceData } from '../stats';
import type { ThemeName, BlockTheme } from '../theme';

// Game state types - simplified for level-based play
export type GameState = 'playing' | 'gameover';

// Game mode types - different play modes
export type GameMode = 'hub' | 'infinite' | 'daily' | 'tutorial';

// Reducer types
export type TetrixReducerState = {
  // Game state management - simplified
  gameState: GameState;
  gameMode: GameMode; // Current game mode (hub menu, infinite play, daily challenge, tutorial)
  currentLevel: number; // Current level being played
  isMapUnlocked: boolean; // Whether map has been unlocked

  // Map completion tracking
  mapCompletionResult: {
    stars: number;
    matchedTiles: number;
    totalTiles: number;
    missedTiles: number;
  } | null; // Set when level is completed, null otherwise
  targetTiles: Set<string> | null; // Tiles that should be filled for completion (from challenge data)

  tiles: TilesSet; // Keyed tile storage for O(1) lookup
  nextShapes: QueueItem[]; // Visible items in queue (shapes + purchasable slots), with unique IDs for React keys
  nextShapeIdCounter: number; // Monotonically increasing counter for unique shape IDs
  savedShape: Shape | null;

  // Shape slot progression
  unlockedSlots: number; // Number of unlocked shape slots (1-4)
  mouseGridLocation: Location | null;
  mousePosition: { x: number; y: number }; // Never null - always has a position
  gemIconPosition: { x: number; y: number }; // Position of the score display gem icon
  gridTileSize: number | null;
  gridBounds: { top: number; left: number; width: number; height: number } | null;
  // Unified drag animation state with all drag-related properties
  dragState: DragState;
  // Shape removal animation
  removingShapeIndex: number | null;
  shapeRemovalAnimationState: ShapeRemovalAnimationState;
  // Shape creation animation
  newShapeAnimationStates: ShapeCreationAnimationState[]; // Track animation state for each shape
  // Bounds of each shape option for return animation
  shapeOptionBounds: (ShapeOptionBounds | null)[];
  // Scoring system
  score: number;
  totalLinesCleared: number; // Track total lines cleared for objectives
  stats: StatsPersistenceData; // Comprehensive statistics tracking
  // Coin display visibility control
  showCoinDisplay: boolean;
  // Shape queue configuration
  queueMode: QueueMode; // 'infinite' or 'finite'
  queueColorProbabilities: ColorProbability[]; // Color weights for shape generation
  queueHiddenShapes: Shape[]; // Shapes in queue but not visible (finite mode only)
  queueSize: number; // Total shapes available (-1 = infinite)
  shapesUsed: number; // Track how many shapes have been used (for finite mode)

  // Rotation menu visibility per shape
  openRotationMenus: boolean[]; // Track which shape rotation menus are open
  // Background music trigger
  hasPlacedFirstShape: boolean; // Track if first shape has been placed to trigger background music
  // Turning mode state (subset of 'playing' state)
  isTurningModeActive: boolean; // Whether turning mode is currently active
  turningDirection: 'cw' | 'ccw' | null; // Which direction turning is active for
  isDoubleTurnModeActive: boolean; // Whether double turn mode is currently active
  // Modifier system
  unlockedModifiers: Set<number>; // Set of prime IDs that have been unlocked
  // Initialization tracking
  hasLoadedPersistedState: boolean; // Whether we've loaded persisted data (prevents gem shower on load)
  // Tile clearing animation - no longer needed in state, animations live in tiles

  // UI State
  isStatsOpen: boolean; // Whether the stats overlay is currently open
  isQueueOverlayOpen: boolean; // Whether the queue overlay is currently open
  insufficientFundsError: number | null; // Timestamp of last insufficient funds error
  buttonSizeMultiplier: number; // UI scaling: 0.5 to 1.5, default 1.0

  // Theme
  currentTheme: ThemeName; // Current theme selection
  blockTheme: BlockTheme; // Current block theme selection
  showBlockIcons: boolean; // Whether to show icons on blocks

  // Daily Challenge State
  initialDailyState: {
    tiles: TilesSet;
    shapes: Shape[];
  } | null;

  // Grandpa Mode - reduces Z and S shape frequency to 1/4
  grandpaMode: boolean;
};

type SelectShapeAction = {
  type: 'SELECT_SHAPE';
  value: {
    shapeIndex: number;
  };
};

type StartDragAction = {
  type: 'START_DRAG';
  value: {
    shape: Shape;
    sourceId: string;
    sourceBounds: { top: number; left: number; width: number; height: number };
    shapeIndex?: number; // Optional, for backward compatibility with ShapeSelector logic
  };
};

type UpdateMouseLocationAction = {
  type: 'UPDATE_MOUSE_LOCATION';
  value: {
    location: Location | null;
    position?: { x: number; y: number } | null;
    tileSize?: number | null;
    gridBounds?: { top: number; left: number; width: number; height: number } | null;
    isValid?: boolean; // Whether the current placement is valid
    invalidBlocks?: Array<{ shapeRow: number; shapeCol: number }>; // Blocks that don't fit
  };
};

type PlaceShapeAction = {
  type: 'PLACE_SHAPE';
  value: {
    location: Location;
    mousePosition?: { x: number; y: number };
  };
};

type CompletePlacementAction = {
  type: 'COMPLETE_PLACEMENT';
};

type StartShapeRemovalAction = {
  type: 'START_SHAPE_REMOVAL';
  value: { shapeIndex: number };
};

type CompleteShapeRemovalAction = {
  type: 'COMPLETE_SHAPE_REMOVAL';
};

type ClearSelectionAction = {
  type: 'CLEAR_SELECTION';
};

type SetAvailableShapesAction = {
  type: 'SET_AVAILABLE_SHAPES';
  value: { shapes: Shape[] };
};

type InitializeQueueAction = {
  type: 'INITIALIZE_QUEUE';
  value: { items: QueueItem[] };
};

type SetShapeOptionBoundsAction = {
  type: 'SET_SHAPE_OPTION_BOUNDS';
  value: { index: number; bounds: ShapeOptionBounds };
};

type ReturnShapeToSelectorAction = {
  type: 'RETURN_SHAPE_TO_SELECTOR';
};

type CompleteReturnAction = {
  type: 'COMPLETE_RETURN';
};

type AddScoreAction = {
  type: 'ADD_SCORE';
  value: {
    scoreData: ScoreData;
    mousePosition?: { x: number; y: number };
  };
};

type LoadGameStateAction = {
  type: 'LOAD_GAME_STATE';
  value: {
    gameData: import('../persistence').SavedGameState;
    stats?: import('../stats').StatsPersistenceData; // Optional stats
  };
};

type ResetGameAction = {
  type: 'RESET_GAME';
};

type ShowCoinDisplayAction = {
  type: 'SHOW_COIN_DISPLAY';
};

type HideCoinDisplayAction = {
  type: 'HIDE_COIN_DISPLAY';
};

type RotateShapeAction = {
  type: 'ROTATE_SHAPE';
  value: { shapeIndex: number; clockwise: boolean };
};

type SpendCoinAction = {
  type: 'SPEND_COIN';
  value: {
    shapeIndex: number;
    mousePosition?: { x: number; y: number };
  };
};

type AddShapeOptionAction = {
  type: 'ADD_SHAPE_OPTION';
};

type RemoveShapeOptionAction = {
  type: 'REMOVE_SHAPE_OPTION';
};

type SetLevelAction = {
  type: 'SET_LEVEL';
  value: { levelIndex: number };
};

type SetGameModeAction = {
  type: 'SET_GAME_MODE';
  value: { mode: GameMode };
};

type UnlockMapAction = {
  type: 'UNLOCK_MAP';
};

type UnlockModifierAction = {
  type: 'UNLOCK_MODIFIER';
  value: { primeId: number };
};

type LoadModifiersAction = {
  type: 'LOAD_MODIFIERS';
  value: { unlockedModifiers: Set<number> };
};

type LoadStatsAction = {
  type: 'LOAD_STATS';
  value: { stats: StatsPersistenceData };
};

type TriggerBackgroundMusicAction = {
  type: 'TRIGGER_BACKGROUND_MUSIC';
};

type ActivateTurningModeAction = {
  type: 'ACTIVATE_TURNING_MODE';
  value: { direction: 'cw' | 'ccw' };
};

type DeactivateTurningModeAction = {
  type: 'DEACTIVATE_TURNING_MODE';
};

type ActivateDoubleTurnModeAction = {
  type: 'ACTIVATE_DOUBLE_TURN_MODE';
};

type DeactivateDoubleTurnModeAction = {
  type: 'DEACTIVATE_DOUBLE_TURN_MODE';
};

type GenerateSuperComboPatternAction = {
  type: 'GENERATE_SUPER_COMBO_PATTERN';
};

type UpdateGemIconPositionAction = {
  type: 'UPDATE_GEM_ICON_POSITION';
  value: { x: number; y: number };
};

type DebugFillRowAction = {
  type: 'DEBUG_FILL_ROW';
  value: { row: number; excludeColumn: number; color: ColorName };
};

type DebugFillColumnAction = {
  type: 'DEBUG_FILL_COLUMN';
  value: { column: number; excludeRow: number; color: ColorName };
};

type DebugRemoveBlockAction = {
  type: 'DEBUG_REMOVE_BLOCK';
  value: { location: Location };
};

type DebugAddBlockAction = {
  type: 'DEBUG_ADD_BLOCK';
  value: { location: Location; color: ColorName };
};

type DebugReplaceFirstShapeAction = {
  type: 'DEBUG_REPLACE_FIRST_SHAPE';
  value: { shape: Shape };
};

type DebugIncrementStatsAction = {
  type: 'DEBUG_INCREMENT_STATS';
};

type CleanupAnimationsAction = {
  type: 'CLEANUP_ANIMATIONS';
};

type OpenStatsAction = {
  type: 'OPEN_STATS';
};

type CloseStatsAction = {
  type: 'CLOSE_STATS';
};

type InitializationCompleteAction = {
  type: 'INITIALIZATION_COMPLETE';
};

type SetThemeAction = {
  type: 'SET_THEME';
  value: { theme: ThemeName };
};

type SetBlockThemeAction = {
  type: 'SET_BLOCK_THEME';
  value: { theme: BlockTheme };
};

type SetShowBlockIconsAction = {
  type: 'SET_SHOW_BLOCK_ICONS';
  value: { show: boolean };
};

type SetButtonSizeMultiplierAction = {
  type: 'SET_BUTTON_SIZE_MULTIPLIER';
  value: { multiplier: number };
};

type SetQueueModeAction = {
  type: 'SET_QUEUE_MODE';
  value: { mode: QueueMode };
};

type UpdateColorProbabilitiesAction = {
  type: 'UPDATE_COLOR_PROBABILITIES';
  value: { colorProbabilities: ColorProbability[] };
};

type PopulateFiniteQueueAction = {
  type: 'POPULATE_FINITE_QUEUE';
  value: { shapes: Shape[] };
};

type ToggleQueueOverlayAction = {
  type: 'TOGGLE_QUEUE_OVERLAY';
};

type StartDailyChallengeAction = {
  type: 'START_DAILY_CHALLENGE';
  value: {
    tiles: TilesSet;
    shapes: Shape[];
  };
};

type RestartDailyChallengeAction = {
  type: 'RESTART_DAILY_CHALLENGE';
};

type CheckMapCompletionAction = {
  type: 'CHECK_MAP_COMPLETION';
};

type ClearMapCompletionAction = {
  type: 'CLEAR_MAP_COMPLETION';
};

type SetGrandpaModeAction = {
  type: 'SET_GRANDPA_MODE';
  value: { enabled: boolean };
};

type PurchaseShapeSlotAction = {
  type: 'PURCHASE_SHAPE_SLOT';
  value: { slotIndex: number }; // Index of the purchasable slot item in the queue
};

type StartSlotPurchaseRemovalAction = {
  type: 'START_SLOT_PURCHASE_REMOVAL';
  value: { slotIndex: number };
};

type CompleteSlotPurchaseRemovalAction = {
  type: 'COMPLETE_SLOT_PURCHASE_REMOVAL';
};

// Tile clearing actions removed - animations now live directly in TileData

export type TetrixAction = | SelectShapeAction
  | StartDragAction
  | UpdateMouseLocationAction
  | PlaceShapeAction
  | CompletePlacementAction
  | StartShapeRemovalAction
  | CompleteShapeRemovalAction
  | ClearSelectionAction
  | SetAvailableShapesAction
  | SetShapeOptionBoundsAction
  | ReturnShapeToSelectorAction
  | CompleteReturnAction
  | AddScoreAction
  | LoadGameStateAction
  | ResetGameAction
  | ShowCoinDisplayAction
  | HideCoinDisplayAction
  | RotateShapeAction
  | SpendCoinAction
  | AddShapeOptionAction
  | RemoveShapeOptionAction
  | SetLevelAction
  | SetGameModeAction
  | UnlockMapAction
  | UnlockModifierAction
  | LoadModifiersAction
  | LoadStatsAction
  | TriggerBackgroundMusicAction
  | ActivateTurningModeAction
  | DeactivateTurningModeAction
  | ActivateDoubleTurnModeAction
  | DeactivateDoubleTurnModeAction
  | GenerateSuperComboPatternAction
  | UpdateGemIconPositionAction
  | DebugFillRowAction
  | DebugFillColumnAction
  | DebugRemoveBlockAction
  | DebugAddBlockAction
  | DebugReplaceFirstShapeAction
  | DebugIncrementStatsAction
  | CleanupAnimationsAction
  | OpenStatsAction
  | CloseStatsAction
  | InitializationCompleteAction
  | SetThemeAction
  | SetBlockThemeAction
  | SetShowBlockIconsAction
  | SetButtonSizeMultiplierAction
  | SetQueueModeAction
  | UpdateColorProbabilitiesAction
  | PopulateFiniteQueueAction
  | ToggleQueueOverlayAction
  | StartDailyChallengeAction
  | RestartDailyChallengeAction
  | CheckMapCompletionAction
  | ClearMapCompletionAction
  | SetGrandpaModeAction
  | PurchaseShapeSlotAction
  | StartSlotPurchaseRemovalAction
  | CompleteSlotPurchaseRemovalAction
  | InitializeQueueAction;

export type TetrixDispatch = React.Dispatch<TetrixAction>;
