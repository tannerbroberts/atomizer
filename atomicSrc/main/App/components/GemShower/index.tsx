import React, { useState, useEffect, useRef, useMemo } from 'react';

import { GemParticle } from '../GemParticle';
import { useTetrixStateContext } from '../../contexts/TetrixContext';
import './GemShower.css';

interface GemData {
  id: string;
  startPosition: { x: number; y: number };
  velocity: { x: number; y: number };
  delay: number;
  size?: number;
  attractTo?: { x: number; y: number };
}

const GemShower: React.FC = () => {
  const { score, gemIconPosition } = useTetrixStateContext();
  const [gems, setGems] = useState<GemData[]>([]);
  const lastScoreRef = useRef<number | null>(null);

  // Calculate the two possible emission origins
  const centerScreenPosition = useMemo(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }), []);

  const gemIconOrigin = useMemo(() => gemIconPosition, [gemIconPosition]);

  // Score change detection
  useEffect(() => {
    // Skip gem shower on initial mount until persisted state is loaded
    if (lastScoreRef.current === null) {
      lastScoreRef.current = score;
      return;
    }

    // Only proceed if score actually changed
    if (score === lastScoreRef.current) {
      return;
    }

    const scoreChange = score - lastScoreRef.current;
    const pointsForEffect = Math.abs(scoreChange);
    const isGainingPoints = scoreChange > 0;

    if (pointsForEffect === 0) {
      lastScoreRef.current = score;
      return;
    }

    // Emit from center screen when gaining points, from gem icon when losing points
    const emissionOrigin: { x: number; y: number } = isGainingPoints
      ? centerScreenPosition
      : gemIconOrigin;

    // Determine gem size and count based on points earned:
    // - For 10+ points: show large gems (80px), 1 gem per 10 points, max 10 gems
    // - For <10 points: show normal gems (40px), 1 gem per point, max 100 gems
    const useLargeGems = pointsForEffect >= 10;
    const gemsToShow = useLargeGems
      ? Math.min(Math.floor(pointsForEffect / 10), 10) // 10-100 points = 1-10 large gems
      : pointsForEffect; // 1-9 points = 1-9 normal gems

    const coinsToSpawn = generateGems(gemsToShow, emissionOrigin, isGainingPoints, useLargeGems);
    setGems((prevGems) => [...prevGems, ...coinsToSpawn]);

    lastScoreRef.current = score;
  }, [score, centerScreenPosition, gemIconOrigin]);

  const generateGems = (
    gemCount: number,
    origin: { x: number; y: number },
    isGainingPoints: boolean,
    useLargeGems: boolean = false,
  ): GemData[] => {
    const gems: GemData[] = [];
    const delayIncrement = 10; // Stagger each gem by 10ms
    let currentDelay = 0;

    for (let i = 0; i < gemCount; i++) {
      let velocityX: number;
      let velocityY: number;

      if (isGainingPoints) {
        // Gaining points: 360-degree explosion with random velocities
        const angle = Math.random() * 2 * Math.PI; // Random angle in full 360 degrees
        const baseSpeed = 150 + Math.random() * 250; // Random speed between 150-400 px/s

        velocityX = baseSpeed * Math.cos(angle);
        velocityY = baseSpeed * Math.sin(angle);
      } else {
        // Losing points: gems fall downward from gem icon with slight horizontal drift
        velocityX = (Math.random() * 3 - 1.5) * 60; // Random drift between -90 and 90 px/s
        velocityY = 0; // Gravity will pull them down
      }

      gems.push({
        id: `gem-${i}-${Date.now()}-${Math.random()}`,
        startPosition: { ...origin },
        velocity: { x: velocityX, y: velocityY },
        delay: currentDelay,
        size: useLargeGems ? 80 : 40, // 80px for large gems, 40px for normal gems
        attractTo: isGainingPoints ? gemIconOrigin : undefined, // Attract to gem icon when gaining
      });

      currentDelay += delayIncrement;
    }

    return gems;
  };

  const handleGemComplete = (gemId: string) => {
    setGems((prevGems) => prevGems.filter((gem) => gem.id !== gemId));
  };

  return (
    <div className="gem-shower-container">
      {/* Render all gems */}
      {gems.map((gem) => (
        <GemParticle
          key={gem.id}
          startPosition={gem.startPosition}
          velocity={gem.velocity}
          delay={gem.delay}
          size={gem.size}
          attractTo={gem.attractTo}
          onComplete={() => handleGemComplete(gem.id)}
        />
      ))}
    </div>
  );
};

export { GemShower };
