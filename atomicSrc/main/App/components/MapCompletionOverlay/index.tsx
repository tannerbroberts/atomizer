import React from 'react';

import './MapCompletionOverlay.css';
import { Grid } from '../Grid';
import { Overlay } from '../../../Shared/Overlay';
import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';

interface MapCompletionOverlayProps {
  stars: number; // 0-3 stars (0 = failure)
  matchedTiles: number;
  totalTiles: number;
  missedTiles: number;
}

const MapCompletionOverlay: React.FC<MapCompletionOverlayProps> = ({
  stars,
  matchedTiles,
  totalTiles,
  missedTiles,
}) => {
  const dispatch = useTetrixDispatchContext();
  const { gameMode } = useTetrixStateContext();

  const isSuccess = stars > 0;

  const handleContinue = () => {
    // Close the completion overlay and return to hub/map
    if (gameMode === 'daily') {
      dispatch({ type: 'SET_GAME_MODE', value: { mode: 'hub' } });
    } else {
      dispatch({ type: 'CLEAR_MAP_COMPLETION' });
    }
  };

  const handleRetry = () => {
    // Reset the current level
    if (gameMode === 'daily') {
      dispatch({ type: 'RESTART_DAILY_CHALLENGE' });
    } else {
      dispatch({ type: 'RESET_GAME' });
    }
  };

  return (
    <Overlay
      className="map-completion-overlay"
      contentClassName="map-completion-content"
      ariaLabel={isSuccess ? 'Level Complete' : 'Level Failed'}
    >
      <div className="map-completion-scroll-area">
        <div className="completion-grid-preview">
          <Grid pixelSize={250} />
        </div>

        <div className="completion-details">
          <h1 className={`completion-title ${isSuccess ? 'success' : 'failure'}`}>
            {stars === 3 ? 'Perfect!' : isSuccess ? 'Level Complete!' : 'Level Failed'}
          </h1>

          {isSuccess && (
            <div className="star-rating">
              {[1, 2, 3].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= stars ? 'filled' : 'empty'}`}
                >
                  ★
                </span>
              ))}
            </div>
          )}

          {stars !== 3 && (
            <div className="completion-stats">
              <div className="stat-row">
                <span className="stat-label">Matched Tiles:</span>
                <span className="stat-value">{matchedTiles} / {totalTiles}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Missed Tiles:</span>
                <span className={`stat-value ${missedTiles === 0 ? 'perfect' : 'miss'}`}>
                  {missedTiles}
                </span>
              </div>
            </div>
          )}

          {isSuccess && stars !== 3 && (
            <div className="rating-description">
              {stars === 2 && <p>Great job! Only 1-2 tiles didn't match.</p>}
              {stars === 1 && <p>Good effort! 3-5 tiles need correction.</p>}
            </div>
          )}

          {!isSuccess && (
            <div className="failure-message">
              <p>Too many tiles didn't match their target colors.</p>
              <p>Try again to achieve a better result!</p>
            </div>
          )}

          <div className="completion-actions">
            {stars !== 3 && (
              <button className="retry-button" onClick={handleRetry}>
                Try Again
              </button>
            )}
            <button className="continue-button" onClick={handleContinue}>
              {gameMode === 'daily' ? 'Back to Hub' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

export { MapCompletionOverlay };
