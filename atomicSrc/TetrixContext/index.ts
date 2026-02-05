import { createContext, useContext } from 'react';

import type { TetrixDispatch, TetrixReducerState } from '../../types/gameState';

export const TetrixStateContext = createContext<TetrixReducerState | null>(null); // null is the default value
export const TetrixDispatchContext = createContext<TetrixDispatch | null>(null); // null is the default value

export function useTetrixStateContext() {
  const context = useContext(TetrixStateContext);
  if (!context) {
    throw new Error('useTetrixStateContext must be used within a TetrixStateProvider');
  }
  return context;
}

export function useTetrixDispatchContext() {
  const context = useContext(TetrixDispatchContext);
  if (!context) {
    throw new Error('useTetrixDispatchContext must be used within a TetrixDispatchProvider');
  }
  return context;
}
