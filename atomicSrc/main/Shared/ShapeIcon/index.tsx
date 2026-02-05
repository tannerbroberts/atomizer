import type { ColorName } from '../../App/types/core';
import './ShapeIcon.css';

type ShapeIconProps = {
  color: ColorName;
  size?: number;
  opacity?: number;
  useBorderLeftColor?: boolean;
};

/**
 * Renders an SVG shape icon based on color for accessibility.
 * - red: circle
 * - orange: triangle
 * - yellow: sun (8 rays)
 * - green: leaf
 * - blue: wave
 * - purple: crescent moon
 * - grey: diamond (rotated square)
 */
export function ShapeIcon({ color, size = 24, opacity = 1, useBorderLeftColor = false }: ShapeIconProps): JSX.Element {
  const viewBoxSize = 100;
  const center = viewBoxSize / 2;

  const className = `shape-icon shape-icon-${color}${useBorderLeftColor ? ' shape-icon-border-left' : ''}`;

  const renderShape = () => {
    switch (color) {
      case 'red':
        // Circle (half size)
        return <circle cx={center} cy={center} r={20} fill="currentColor" />;

      case 'orange':
        // Triangle (pointing up)
        return (
          <polygon
            points={`${center},15 85,85 15,85`}
            fill="currentColor"
          />
        );

      case 'yellow':
        // Sun with 8 triangular rays
        return (
          <g fill="currentColor">
            {/* Center circle */}
            <circle cx={center} cy={center} r={20} />
            {/* 8 rays at 45-degree intervals */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => {
              const radian = (angle * Math.PI) / 180;
              const innerRadius = 25;
              const outerRadius = 45;

              // Calculate three points of the triangle
              const tipX = center + Math.cos(radian) * outerRadius;
              const tipY = center + Math.sin(radian) * outerRadius;

              const leftAngle = radian - Math.PI / 8;
              const leftX = center + Math.cos(leftAngle) * innerRadius;
              const leftY = center + Math.sin(leftAngle) * innerRadius;

              const rightAngle = radian + Math.PI / 8;
              const rightX = center + Math.cos(rightAngle) * innerRadius;
              const rightY = center + Math.sin(rightAngle) * innerRadius;

              return (
                <polygon
                  key={idx}
                  points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
                />
              );
            })}
          </g>
        );

      case 'green':
        // Natural leaf shape (teardrop with stem and vein) - scaled to 80%
        return (
          <g transform={`translate(${center}, ${center}) scale(0.8) translate(-${center}, -${center})`}>
            <path
              d="M 81.2 73.2c0 0 3.2 5.3 6.2 13.5c2.7 7.3 1.8 14.1-4.9 13.1c-6.5-1-2.5-7.7-0.3-13.1
                 c-3.2-7.9-7.5-11.4-8-11.3c-9.5 1.5-29.1 2.6-41.9-10C16.2 48.2 28.9 22.3 9.7 10.2
                 c29.3-19 63.5-9.1 76.1 10c9.5 19.8 2 38.7-2.6 45.6c0 0-23.3-36.8-34.8-40.2
                 C63 37.6 81.2 73.2 81.2 73.2z"
              fill="currentColor"
            />
          </g>
        );

      case 'blue':
        // Water droplet (teardrop shape with concave top)
        return (
          <path
            d={`M ${center} 15 
                C 38 25, 28 40, 25 55 
                C 25 75, 35 85, ${center} 85 
                C 65 85, 75 75, 75 55 
                C 72 40, 62 25, ${center} 15 Z`}
            fill="currentColor"
          />
        );

      case 'purple':
        // Crescent moon - outer arc curves left, inner arc curves right (C shape)
        // Outer circle: r=33 (66% of 100), centered at (50,50)
        // Inner circle: r=28 (85% of 33), centered at (62,50) - shifted right
        return (
          <path
            d="M 68.7 22.8 A 33 33 0 1 0 68.7 77.2 A 28 28 0 1 1 68.7 22.8 Z"
            fill="currentColor"
          />
        );

      case 'grey':
        // Diamond (rotated square)
        return (
          <polygon
            points={`${center},15 85,${center} ${center},85 15,${center}`}
            fill="currentColor"
          />
        );

      default:
        return null;
    }
  };

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {renderShape()}
    </svg>
  );
}
