import './Tetrix.css';
import { GameControlsPanel } from '../GameControlsPanel';
import { GameOverOverlay } from '../GameOverOverlay';
import { GemShower } from '../GemShower';
import { Grid } from '../Grid';
import { MapCompletionOverlay } from '../MapCompletionOverlay';
import { useTetrixStateContext } from '../../contexts/TetrixContext';

const Tetrix: React.FC = () => {
  const { gameState, gameMode, isStatsOpen, mapCompletionResult } = useTetrixStateContext();

  // Only render when in playing or gameover state
  if (gameState !== 'playing' && gameState !== 'gameover') {
    return null;
  }

  // Show map completion overlay for daily challenges with completion data
  const showMapCompletion = gameState === 'gameover'
    && (gameMode === 'daily' || gameMode === 'tutorial')
    && mapCompletionResult !== null
    && !isStatsOpen;

  // Show standard game over overlay for infinite mode
  const showStandardGameOver = gameState === 'gameover'
    && (gameMode === 'infinite' || gameMode === 'daily')
    && !mapCompletionResult
    && !isStatsOpen;

  return (
    <div className="tetrix">
      <Grid />
      <GameControlsPanel />
      <GemShower />
      {showStandardGameOver && <GameOverOverlay />}
      {showMapCompletion && (
        <MapCompletionOverlay
          stars={mapCompletionResult.stars}
          matchedTiles={mapCompletionResult.matchedTiles}
          totalTiles={mapCompletionResult.totalTiles}
          missedTiles={mapCompletionResult.missedTiles}
        />
      )}
    </div>
  );
};

export { Tetrix };
