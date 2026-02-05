import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { loadMusicSettings, saveMusicSettings } from '../../utils/persistence';

export interface MusicControlContextType {
  volume: number;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  toggleEnabled: () => void;
  shouldPlayMusic: boolean;
  triggerAutoplay: () => void;
  /** Whether the browser has allowed audio playback (user has interacted with document) */
  isAudioUnlocked: boolean;
  /** Whether audio is waiting for user interaction to play */
  isWaitingForInteraction: boolean;
}

const MusicControlContext = createContext<MusicControlContextType | null>(null);

export const useMusicControl = () => {
  const context = useContext(MusicControlContext);
  if (!context) {
    throw new Error('useMusicControl must be used within a MusicControlContext.Provider');
  }
  return context;
};

export const MusicControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [volume, setVolumeState] = useState(100);
  const [isEnabled, setIsEnabled] = useState(true);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const hasUserInteractedRef = useRef(false);

  // Detect user interaction to unlock audio
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteractedRef.current) {
        hasUserInteractedRef.current = true;
        setIsAudioUnlocked(true);
      }
    };

    // Listen for any user interaction
    const events = ['click', 'touchstart', 'keydown', 'pointerdown'];
    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  // Load music settings from IndexedDB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadMusicSettings();

        // Validate volume is a finite number, default to 100 if invalid
        const validVolume = Number.isFinite(settings.volume) && settings.volume >= 0 && settings.volume <= 100
          ? settings.volume
          : 100;

        setVolumeState(validVolume);
        setIsEnabled(settings.isEnabled);
      } catch (error) {
        console.error('Unexpected error loading music settings:', error);
        setIsEnabled(true);
        setVolumeState(100);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);

    // Save to IndexedDB (primary storage)
    saveMusicSettings(!isEnabled, clampedVolume, isEnabled).catch((error: Error) => {
      console.error('Failed to save music volume to IndexedDB:', error);
    });
  }, [isEnabled]);

  const toggleEnabled = useCallback(() => {
    const newEnabledState = !isEnabled;
    setIsEnabled(newEnabledState);

    // If enabling, we should try to play music
    if (newEnabledState) {
      setShouldPlayMusic(true);
    }

    // Save to IndexedDB (primary storage)
    saveMusicSettings(!newEnabledState, volume, newEnabledState).catch((error: Error) => {
      console.error('Failed to save music enabled state to IndexedDB:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem('tetrix-music-muted', JSON.stringify(!newEnabledState));
      } catch (localError) {
        console.error('Failed to save music mute preference to localStorage:', localError);
      }
    });
  }, [isEnabled, volume]);

  const triggerAutoplay = useCallback(() => {
    setShouldPlayMusic(true);
  }, []);

  // Audio is "waiting" if music should play, is enabled, has volume, but audio isn't unlocked yet
  const isWaitingForInteraction = shouldPlayMusic && isEnabled && volume > 0 && !isAudioUnlocked;

  const value = {
    volume: isLoading ? 100 : volume,
    setVolume,
    isEnabled: !isLoading && isEnabled,
    toggleEnabled,
    shouldPlayMusic,
    triggerAutoplay,
    isAudioUnlocked,
    isWaitingForInteraction,
  };

  return (
    <MusicControlContext.Provider value={value}>
      {children}
    </MusicControlContext.Provider>
  );
};
