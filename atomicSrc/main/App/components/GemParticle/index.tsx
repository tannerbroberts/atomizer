import React, { useEffect, useState, useRef } from 'react';

import { BlueGemIcon } from '../../../Shared/BlueGemIcon';
import './GemParticle.css';

interface GemParticleProps {
  startPosition: { x: number; y: number };
  velocity: { x: number; y: number };
  onComplete: () => void;
  delay?: number; // Stagger animation start
  size?: number; // Size of the gem (default 40)
  attractTo?: { x: number; y: number }; // If set, gem will be attracted to this point
}

const GemParticle: React.FC<GemParticleProps> = ({
  startPosition,
  velocity,
  onComplete,
  delay = 0,
  size = 40,
  attractTo,
}) => {
  const [currentPosition, setCurrentPosition] = useState(startPosition);
  const [opacity, setOpacity] = useState(0); // Start transparent for smooth fade-in
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Store initial props in refs to prevent re-renders from affecting animation
  const initialPropsRef = useRef({
    startPosition,
    velocity,
    onComplete,
    delay,
    attractTo,
  });

  // Animation constants
  const isAttractionMode = !!attractTo;
  const ANIMATION_DURATION = isAttractionMode ? 2000 : 1500; // 2 seconds for attraction, 1.5 for fall
  const GRAVITY = isAttractionMode ? 0 : 450; // No downward gravity in attraction mode
  const ATTRACTION_STRENGTH = 800; // pixels per second squared toward target
  const FADE_IN_DURATION = 100; // Fade in over 100ms
  const FADE_OUT_START_PERCENT = 0.7; // Start fading out at 70% through animation
  const SNAP_DISTANCE = 5; // Distance at which gem "snaps" to target

  useEffect(() => {
    // Use initial props from ref to prevent animation restart on re-renders
    const { startPosition: initialStart, velocity: initialVelocity, onComplete: initialOnComplete, delay: initialDelay, attractTo: target } = initialPropsRef.current;

    // Store velocity in a ref so it can be updated during animation (for attraction)
    const currentVelocity = { x: initialVelocity.x, y: initialVelocity.y };

    // Apply the delay before starting the animation
    const startDelay = setTimeout(() => {
      startTimeRef.current = performance.now();
      let lastFrameTime = performance.now();
      const currentPos = { ...initialStart };

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return;

        const elapsed = (currentTime - startTimeRef.current) / 1000; // Convert to seconds
        const elapsedMs = elapsed * 1000;
        const deltaTime = (currentTime - lastFrameTime) / 1000; // Time since last frame
        lastFrameTime = currentTime;

        // Check if animation is complete
        if (elapsedMs >= ANIMATION_DURATION) {
          initialOnComplete();
          return;
        }

        if (target) {
          // Attraction mode: calculate direction and distance to target
          const dx = target.x - currentPos.x;
          const dy = target.y - currentPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check if we've reached the target
          if (distance <= SNAP_DISTANCE) {
            // Snap to target
            setCurrentPosition(target);
            setOpacity(1);
            // Complete after a brief moment at the target
            setTimeout(() => initialOnComplete(), 50);
            return;
          }

          // Apply attraction force toward target
          const dirX = dx / distance;
          const dirY = dy / distance;
          const attractionForce = ATTRACTION_STRENGTH * deltaTime;

          currentVelocity.x += dirX * attractionForce;
          currentVelocity.y += dirY * attractionForce;

          // Update position based on velocity
          currentPos.x += currentVelocity.x * deltaTime;
          currentPos.y += currentVelocity.y * deltaTime;
        } else {
          // Fall mode: standard physics with downward gravity
          currentPos.x = initialStart.x + currentVelocity.x * elapsed;
          currentPos.y = initialStart.y + currentVelocity.y * elapsed + 0.5 * GRAVITY * elapsed * elapsed;
        }

        // Calculate opacity with fade in and fade out
        const progress = elapsedMs / ANIMATION_DURATION;
        let newOpacity = 1;

        if (elapsedMs < FADE_IN_DURATION) {
          // Fade in during first 100ms
          newOpacity = elapsedMs / FADE_IN_DURATION;
        } else if (!target && progress >= FADE_OUT_START_PERCENT) {
          // Only fade out in fall mode (not in attraction mode)
          const fadeProgress = (progress - FADE_OUT_START_PERCENT) / (1 - FADE_OUT_START_PERCENT);
          newOpacity = Math.max(0, 1 - fadeProgress);
        }

        setCurrentPosition({ x: currentPos.x, y: currentPos.y });
        setOpacity(newOpacity);

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }, initialDelay);

    return () => {
      clearTimeout(startDelay);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Empty dependency array - animation should only run once

  return (
    <div
      className="gem-particle"
      style={{
        '--particle-x': `${currentPosition.x}px`,
        '--particle-y': `${currentPosition.y}px`,
        '--particle-opacity': opacity,
      } as React.CSSProperties}
    >
      <BlueGemIcon size={size} />
    </div>
  );
};

export { GemParticle };
