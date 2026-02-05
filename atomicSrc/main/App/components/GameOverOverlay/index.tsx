import React from 'react';

import './GameOverOverlay.css';
import { Overlay } from '../../../Shared/Overlay';
import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';

const GameOverOverlay: React.FC = () => {
  const { gameMode } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();

  const handleRestart = () => {
    if (gameMode === 'daily') {
      dispatch({ type: 'RESTART_DAILY_CHALLENGE' });
    } else {
      dispatch({ type: 'RESET_GAME' });
    }
  };

  return (
    <Overlay
      className="game-over-overlay"
      contentClassName="game-over-content"
      ariaLabel="Game Over"
    >
      <h1 className="game-over-title">Game Over</h1>
      <p className="game-over-subtitle">
        Check your stats to see how you did!
      </p>
      <button className="new-game-button" onClick={handleRestart}>
        {gameMode === 'daily' ? 'Restart Challenge' : 'Back to Menu'}
      </button>
    </Overlay>
  );
};

export { GameOverOverlay };
