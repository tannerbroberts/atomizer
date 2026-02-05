/**
 * Animation timing constants
 * Centralized source of truth for animation durations to ensure synchronization
 * between React components (visuals) and Reducers (state logic).
 *
 * Currently slowed down to 2000ms for debugging purposes.
 */
export const ANIMATION_TIMING = {
  // DraggingShape animations
  PICKUP_DURATION: 300,
  PLACING_DURATION: 300,
  RETURN_DURATION: 300,

  // Audio sync
  PLACEMENT_SOUND_DURATION: 97, // Length of click_into_place.mp3

  // ShapeOption animations
  REMOVAL_DURATION: 300,

  // Invalid placement animation
  INVALID_BLOCK_ANIMATION_DURATION: 200,
};
