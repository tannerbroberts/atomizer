import React from 'react';

interface BlueGemIconProps {
  size?: number;
  className?: string;
}

const BlueGemIcon: React.FC<BlueGemIconProps> = ({ size, className = '' }) => {
  // If size is provided, use it. Otherwise, let CSS control dimensions
  const sizeProps = size ? { width: size, height: size } : {};

  return (
    <svg
      {...sizeProps}
      viewBox="0 0 24 24"
      className={`blue-gem-icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient definitions for 3D effect */}
      <defs>
        <linearGradient id="blueGemGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#87CEEB" />
          <stop offset="30%" stopColor="#4169E1" />
          <stop offset="70%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#0F1629" />
        </linearGradient>
        <linearGradient id="blueGemGradient2" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#B0E0E6" />
          <stop offset="50%" stopColor="#4682B4" />
          <stop offset="100%" stopColor="#2E3A59" />
        </linearGradient>
        <linearGradient id="blueGemHighlight" x1="0%" y1="0%" x2="70%" y2="30%">
          <stop offset="0%" stopColor="#E0F6FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.3" />
        </linearGradient>
        <filter id="gemGlow">
          <feGaussianBlur stdDeviation="0.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.25 0 0 0 0 0.41 0 0 0 0 0.88 0 0 0 0.8 0" />
        </filter>
      </defs>

      {/* Main gem body - diamond shape */}
      <path
        d="M12 2 L18 8 L12 22 L6 8 Z"
        fill="url(#blueGemGradient1)"
        stroke="#1E40AF"
        strokeWidth="0.5"
      />

      {/* Top facet */}
      <path
        d="M12 2 L18 8 L12 10 L6 8 Z"
        fill="url(#blueGemGradient2)"
        stroke="#2563EB"
        strokeWidth="0.3"
      />

      {/* Left side highlight */}
      <path
        d="M6 8 L12 10 L12 22 Z"
        fill="url(#blueGemGradient1)"
        opacity="0.7"
      />

      {/* Right side shadow */}
      <path
        d="M12 10 L18 8 L12 22 Z"
        fill="#1E3A8A"
        opacity="0.6"
      />

      {/* Top highlight for sparkle effect */}
      <path
        d="M12 2 L15 6 L12 8 L9 6 Z"
        fill="url(#blueGemHighlight)"
      />

      {/* Glow effect */}
      <path
        d="M12 2 L18 8 L12 22 L6 8 Z"
        fill="none"
        stroke="#4169E1"
        strokeWidth="0.5"
        filter="url(#gemGlow)"
        opacity="0.6"
      />
    </svg>
  );
};

export { BlueGemIcon };
