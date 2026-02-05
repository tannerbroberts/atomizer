/**
 * Drag and drop types - Drag state and phase management
 */

import type { Shape, Location, Block } from '../core';

// Drag phase-based animation system
export type DragPhase = 'none' | 'picking-up' | 'dragging' | 'placing' | 'returning';

// Pre-calculated offsets for drag operations - calculated once when shape is selected
export type DragOffsets = {
  visualOffsetX: number; // X offset from 4x4 center to filled blocks center
  visualOffsetY: number; // Y offset from 4x4 center to filled blocks center
  gridOffsetX: number; // X offset from mouse to 4x4 grid top-left corner
  gridOffsetY: number; // Y offset from mouse to 4x4 grid top-left corner
  touchOffset: number; // Y offset for mobile touch (shape above finger)
  tileSize: number; // Grid tile size at time of selection
  gridGap: number; // Gap between tiles at time of selection
};

export type DragState = {
  phase: DragPhase;
  selectedShape: Shape | null;
  selectedShapeIndex: number | null; // Deprecated: use sourceId instead
  sourceId: string | null; // Unique ID of the component that initiated the drag
  isValidPlacement: boolean;
  hoveredBlockPositions: Array<{ location: Location; block: Block }>;
  invalidBlockPositions: Array<{ shapeRow: number; shapeCol: number }>; // Blocks that don't fit
  sourcePosition: { x: number; y: number; width: number; height: number } | null; // ShapeOption bounds
  targetPosition: { x: number; y: number } | null; // Grid cell position for placement
  placementLocation: Location | null; // Locked-in grid location at release time
  placementStartPosition: { x: number; y: number } | null; // Where the shape was visually when placement started
  startTime: number | null;
  dragOffsets: DragOffsets | null; // Pre-calculated offsets for this drag operation
};
