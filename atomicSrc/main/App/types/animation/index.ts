/**
 * Animation types - Animation states for shapes and UI elements
 */

// Legacy animation states (keep for shape removal and creation)
export type ShapeRemovalAnimationState = 'none' | 'removing';
export type ShapeCreationAnimationState = 'none' | 'animating-in';

// Bounds for shape options (for return animation)
export type ShapeOptionBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};
