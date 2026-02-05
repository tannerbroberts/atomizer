import { createContext, useContext } from 'react';

export interface SoundEffectsControlContextType {
  volume: number;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  toggleEnabled: () => void;
}

export const SoundEffectsControlContext = createContext<SoundEffectsControlContextType | null>(null);

export const useSoundEffectsControl = () => {
  const context = useContext(SoundEffectsControlContext);
  if (!context) {
    throw new Error('useSoundEffectsControl must be used within a SoundEffectsControlContext.Provider');
  }
  return context;
};
