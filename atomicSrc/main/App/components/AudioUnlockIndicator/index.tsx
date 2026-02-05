import React from 'react';

import { useMusicControl } from '../../contexts/MusicControlContext';
import './AudioUnlockIndicator.css';

/**
 * AudioUnlockIndicator displays a pulsing indicator when audio is waiting
 * for user interaction due to browser autoplay policies.
 *
 * This is a well-established pattern for handling browser audio restrictions.
 * The indicator:
 * - Shows only when audio playback is pending user interaction
 * - Uses a pulsing animation to draw attention
 * - Disappears automatically once the user interacts with the page
 * - Provides a helpful tooltip explaining why music hasn't started
 */
const AudioUnlockIndicator: React.FC = () => {
  const { isWaitingForInteraction } = useMusicControl();

  if (!isWaitingForInteraction) {
    return null;
  }

  return (
    <div
      className="audio-unlock-indicator"
      title="Click anywhere to enable audio. Browser policy requires user interaction first."
    >
      <div className="audio-unlock-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      </div>
      <span className="audio-unlock-text">Tap to enable music</span>
      <div className="audio-unlock-pulse"></div>
    </div>
  );
};

export { AudioUnlockIndicator };
