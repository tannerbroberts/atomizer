import React, { useEffect, useRef } from 'react';

import { useMusicControl } from '../../contexts/MusicControlContext';
import { useTetrixStateContext } from '../../contexts/TetrixContext';
import './BackgroundMusic.css';

// Per-track volume multipliers to normalize loudness across all BGM tracks
// Based on measured mean_volume levels - quieter tracks get higher multipliers
// Target: normalize all tracks to sound like they're at -16 dB mean
const TRACK_VOLUME_MULTIPLIERS: Record<string, number> = {
  '/sound/bgm/Jazz2_KEY_C_in_C.mp3': 1.3, // -18.0 dB mean (quieter)
  '/sound/bgm/Jazz4_KEY_C_in_C.mp3': 1.3, // -18.2 dB mean (quieter)
  '/sound/bgm/daytime-smooth-jazz-2025-2-458721.mp3': 0.9, // -14.6 dB mean (louder)
  '/sound/bgm/smooth-jazz-2025-1-458715.mp3': 1.0, // -16.1 dB mean
  '/sound/bgm/smooth-jazz-2025-2-458713.mp3': 1.0, // -15.9 dB mean
  '/sound/bgm/smooth-jazz-2025-3-458714.mp3': 0.95, // -15.4 dB mean
  '/sound/bgm/smooth-jazz-2025-4-458717.mp3': 0.95, // -15.6 dB mean
  '/sound/bgm/smooth-jazz-2025-5-458716.mp3': 1.0, // -16.3 dB mean
  '/sound/bgm/smooth-jazz-2025-6-458712.mp3': 1.0, // -16.6 dB mean
};

// Base volume scale (0-1) - pleasant background music level
const BASE_BGM_VOLUME = 0.5;

const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrackRef = useRef<string>('');
  const { hasPlacedFirstShape } = useTetrixStateContext();
  const { isEnabled, volume, shouldPlayMusic, triggerAutoplay } = useMusicControl();

  // Track if we've already triggered autoplay from first shape
  const hasTriggeredFromShapeRef = useRef(false);
  // Track if music was playing before visibility change
  const wasPlayingBeforeHiddenRef = useRef(false);

  // List of available tracks (using useMemo to prevent recreation on each render)
  const tracks = React.useMemo(() => [
    '/sound/bgm/Jazz2_KEY_C_in_C.mp3',
    '/sound/bgm/Jazz4_KEY_C_in_C.mp3',
    '/sound/bgm/daytime-smooth-jazz-2025-2-458721.mp3',
    '/sound/bgm/smooth-jazz-2025-1-458715.mp3',
    '/sound/bgm/smooth-jazz-2025-2-458713.mp3',
    '/sound/bgm/smooth-jazz-2025-3-458714.mp3',
    '/sound/bgm/smooth-jazz-2025-4-458717.mp3',
    '/sound/bgm/smooth-jazz-2025-5-458716.mp3',
    '/sound/bgm/smooth-jazz-2025-6-458712.mp3',
  ], []);

  // Trigger background music 1 second after first shape placement
  useEffect(() => {
    if (hasPlacedFirstShape && !hasTriggeredFromShapeRef.current) {
      const timer = setTimeout(() => {
        hasTriggeredFromShapeRef.current = true;
        triggerAutoplay();
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    } if (!hasPlacedFirstShape && hasTriggeredFromShapeRef.current) {
      // Reset trigger if game is reset
      hasTriggeredFromShapeRef.current = false;
    }
  }, [hasPlacedFirstShape, triggerAutoplay]);

  // Update volume when it changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const trackMultiplier = TRACK_VOLUME_MULTIPLIERS[currentTrackRef.current] ?? 1.0;
      const calculatedVolume = (volume / 100) * BASE_BGM_VOLUME * trackMultiplier;
      // Ensure volume is a valid finite number between 0 and 1
      audio.volume = Number.isFinite(calculatedVolume) ? Math.max(0, Math.min(1, calculatedVolume)) : 0;
    }
  }, [volume]);

  // Handle page visibility changes (app backgrounded/foregrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        // App is going to background - pause music
        wasPlayingBeforeHiddenRef.current = !audio.paused;
        if (!audio.paused) {
          audio.pause();
        }
      } else {
        // App is coming to foreground - resume if it was playing before
        if (wasPlayingBeforeHiddenRef.current && shouldPlayMusic && isEnabled && volume > 0) {
          audio.play().catch((error) => {
            console.log('Failed to resume music after visibility change:', error);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldPlayMusic, isEnabled, volume]);

  // Set up audio and handle track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Function to get a random track
    const getRandomTrack = () => {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      return tracks[randomIndex];
    };

    // Function to play a random track
    const playRandomTrack = async () => {
      if (shouldPlayMusic && isEnabled && volume > 0) {
        const track = getRandomTrack();
        currentTrackRef.current = track;
        audio.src = track;
        audio.loop = false;
        const trackMultiplier = TRACK_VOLUME_MULTIPLIERS[track] ?? 1.0;
        const calculatedVolume = (volume / 100) * BASE_BGM_VOLUME * trackMultiplier;
        // Ensure volume is a valid finite number between 0 and 1
        audio.volume = Number.isFinite(calculatedVolume) ? Math.max(0, Math.min(1, calculatedVolume)) : 0;

        try {
          await audio.play();
        } catch (error) {
          console.log('Auto-play was prevented by browser policy:', error);
        }
      }
    };

    // Handle track ending to play another random track
    const handleTrackEnd = () => {
      if (shouldPlayMusic && isEnabled && volume > 0) {
        playRandomTrack();
      }
    };

    audio.addEventListener('ended', handleTrackEnd);

    // Start playing if conditions are met and not currently playing
    if (shouldPlayMusic && isEnabled && volume > 0) {
      if (audio.paused) {
        playRandomTrack();
      }
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
    };
  }, [shouldPlayMusic, isEnabled, volume, tracks]);

  return (
    <div className="background-music">
      <audio
        ref={audioRef}
        preload="auto"
      >
        <track kind="captions" />
      </audio>
    </div>
  );
};

export { BackgroundMusic };
