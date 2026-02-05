import './PurchasesContainer.css';
import { useTetrixDispatchContext, useTetrixStateContext } from '../../contexts/TetrixContext';

const PurchasesContainer = (): JSX.Element => {
  const dispatch = useTetrixDispatchContext();
  const state = useTetrixStateContext();

  const handleBuyTurnClockwise = () => {
    if (state.gameState !== 'playing') return;

    if (state.isTurningModeActive && state.turningDirection === 'cw') {
      dispatch({ type: 'DEACTIVATE_TURNING_MODE' });
    } else {
      dispatch({ type: 'ACTIVATE_TURNING_MODE', value: { direction: 'cw' } });
    }
  };

  const handleBuyTurnCounterClockwise = () => {
    if (state.gameState !== 'playing') return;

    if (state.isTurningModeActive && state.turningDirection === 'ccw') {
      dispatch({ type: 'DEACTIVATE_TURNING_MODE' });
    } else {
      dispatch({ type: 'ACTIVATE_TURNING_MODE', value: { direction: 'ccw' } });
    }
  };

  const handleBuyDoubleTurn = () => {
    if (state.gameState !== 'playing') return;

    if (state.isDoubleTurnModeActive) {
      dispatch({ type: 'DEACTIVATE_DOUBLE_TURN_MODE' });
    } else {
      dispatch({ type: 'ACTIVATE_DOUBLE_TURN_MODE' });
    }
  };

  const isClockwiseDisabled = (state.score < 2 && !state.isTurningModeActive) || state.gameState !== 'playing';
  const isCounterClockwiseDisabled = (state.score < 2 && !state.isTurningModeActive) || state.gameState !== 'playing';
  const isDoubleTurnDisabled = (state.score < 3 && !state.isDoubleTurnModeActive) || state.gameState !== 'playing';
  const isClockwiseActive = state.isTurningModeActive && state.turningDirection === 'cw';
  const isCounterClockwiseActive = state.isTurningModeActive && state.turningDirection === 'ccw';
  const isDoubleTurnActive = state.isDoubleTurnModeActive;

  return (
    <div className="purchases-container">
      <button
        className={`purchases-container-button purchases-container-button-clockwise ${isClockwiseActive ? 'active' : ''} ${isClockwiseDisabled ? 'disabled' : ''}`}
        onClick={handleBuyTurnClockwise}
        title={isClockwiseDisabled ? 'Need 2 points to buy clockwise turn' : 'Buy clockwise turn (2 points)'}
      >
        <div className="purchases-container-icon">
          ↻
        </div>
        <div className="purchases-container-cost">-2</div>
      </button>

      <button
        className={`purchases-container-button purchases-container-button-double-turn ${isDoubleTurnActive ? 'active' : ''} ${isDoubleTurnDisabled ? 'disabled' : ''}`}
        onClick={handleBuyDoubleTurn}
        title={isDoubleTurnDisabled ? 'Need 3 points to buy double turn' : 'Buy double turn (3 points)'}
      >
        <div className="purchases-container-icon">
          ↻↻
        </div>
        <div className="purchases-container-cost">-3</div>
      </button>

      <button
        className={`purchases-container-button purchases-container-button-counter-clockwise ${isCounterClockwiseActive ? 'active' : ''} ${isCounterClockwiseDisabled ? 'disabled' : ''}`}
        onClick={handleBuyTurnCounterClockwise}
        title={isCounterClockwiseDisabled ? 'Need 2 points to buy counter-clockwise turn' : 'Buy counter-clockwise turn (2 points)'}
      >
        <div className="purchases-container-icon">
          ↺
        </div>
        <div className="purchases-container-cost">-2</div>
      </button>
    </div>
  );
};

export { PurchasesContainer };
