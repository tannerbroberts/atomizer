import { useCallback } from 'react';

import { useTetrixDispatchContext } from '../../contexts/TetrixContext';
import type { Location } from '../../types/core';

/**
 * Custom hook for handling debug grid interactions
 * Returns a click handler that can be attached to grid tiles
 */
export function useDebugGridInteractions() {
  const dispatch = useTetrixDispatchContext();

  const handleDebugClick = useCallback((_location: Location) => {
    // Debug editor has been removed
    return;
  }, [dispatch]);

  return {
    isDebugMode: false,
    handleDebugClick,
  };
}
