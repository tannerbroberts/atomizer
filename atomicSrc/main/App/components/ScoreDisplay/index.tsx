import React, { useRef, useEffect } from 'react';

import { useVisualError } from '../../hooks/useVisualError';
import { formatScore } from '../../utils/scoringUtils';
import { BlueGemIcon } from '../../../Shared/BlueGemIcon';
import { ErrorPointer } from '../Pointer/ErrorPointer';
import { StatsOverlay } from '../StatsOverlay';
import { useTetrixStateContext, useTetrixDispatchContext } from '../../contexts/TetrixContext';
import '../../styles/feedback.css';
import './ScoreDisplay.css';

const ScoreDisplay: React.FC = () => {
  const { score, gameState, isStatsOpen, insufficientFundsError } = useTetrixStateContext();
  const dispatch = useTetrixDispatchContext();
  const gemIconRef = useRef<HTMLDivElement>(null);

  // Use the reusable hook for error pulsing
  const isErrorPulsing = useVisualError(insufficientFundsError);

  // Use the reusable hook for arrow visibility (longer duration)
  const isArrowVisible = useVisualError(insufficientFundsError, 2500);

  // Update gem icon position whenever it changes (for GemShower particle physics)
  useEffect(() => {
    if (gemIconRef.current) {
      const updatePosition = () => {
        const rect = gemIconRef.current?.getBoundingClientRect();
        if (rect) {
          const position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
          dispatch({
            type: 'UPDATE_GEM_ICON_POSITION',
            value: position,
          });
        }
      };

      // Update on mount and when window resizes
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [dispatch]);

  const handleOpenStats = () => {
    dispatch({ type: 'OPEN_STATS' });
  };

  const handleCloseStats = () => {
    dispatch({ type: 'CLOSE_STATS' });
  };

  return (
    <>
      <div
        className={`score-display ${gameState === 'gameover' ? 'score-display-pulsing' : ''} ${isErrorPulsing ? 'error-pulse' : ''}`}
        onClick={handleOpenStats}
        style={{ cursor: 'pointer' }}
        title="Click to view stats"
      >
        <div ref={gemIconRef}>
          <BlueGemIcon />
        </div>
        <span className="score-display-value">
          {formatScore(score)}
        </span>
      </div>

      <ErrorPointer
        targetRef={gemIconRef}
        isVisible={isArrowVisible}
        message="Need points to turn shapes!"
        offsetFromTarget={50}
      />

      {isStatsOpen && <StatsOverlay onClose={handleCloseStats} />}
    </>
  );
};

export { ScoreDisplay };
