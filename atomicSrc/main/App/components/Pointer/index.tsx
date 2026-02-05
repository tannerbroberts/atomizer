import React, { useMemo, useEffect, useState } from 'react';
import './Pointer.css';

type Point = { x: number; y: number };

export type PointerProps = {
  targetRef: React.RefObject<HTMLElement>;
  isVisible: boolean;
  arrowLength?: number;
  offsetFromTarget?: number;
  children?: React.ReactNode;
};

/**
 * Generic Pointer component that draws an animated arrow pointing to a DOM element.
 * Takes a React ref to calculate the target element's center point dynamically.
 */
const Pointer: React.FC<PointerProps> = ({
  targetRef,
  isVisible,
  arrowLength = 100,
  offsetFromTarget = 60,
  children,
}) => {
  const [targetPosition, setTargetPosition] = useState<Point | null>(null);

  const screenCenter = useMemo(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }), []);

  // Calculate target position from ref
  useEffect(() => {
    const updatePosition = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setTargetPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    if (isVisible) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [targetRef, isVisible]);

  if (!isVisible || !targetPosition) return null;

  // Vector from center to target
  const vector = {
    x: targetPosition.x - screenCenter.x,
    y: targetPosition.y - screenCenter.y,
  };

  const angleRad = Math.atan2(vector.y, vector.x);
  const angleDeg = angleRad * (180 / Math.PI);

  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  const unitVector = {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };

  const tipPosition = {
    x: targetPosition.x - (unitVector.x * offsetFromTarget),
    y: targetPosition.y - (unitVector.y * offsetFromTarget),
  };

  return (
    <div
      className="pointer-container"
      style={{
        left: tipPosition.x,
        top: tipPosition.y,
        transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
        '--arrow-length': `${arrowLength}px`,
      } as React.CSSProperties}
    >
      <div className="pointer-arrow-body">
        <div className="pointer-arrow-shaft"></div>
        <div className="pointer-arrow-head"></div>
      </div>

      {children && (
        <div
          className="pointer-content"
          style={{
            transform: `rotate(${-angleDeg}deg)`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export { Pointer };
