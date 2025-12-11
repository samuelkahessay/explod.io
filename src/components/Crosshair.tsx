'use client';

import React from 'react';

interface CrosshairProps {
  adsProgress: number;  // 0 = hip fire (wide), 1 = ADS (narrow)
}

const Crosshair: React.FC<CrosshairProps> = ({ adsProgress }) => {
  // Interpolate crosshair size: wider at hip (10px gap), narrower at ADS (2px gap)
  const baseGap = 10;   // Hip fire gap (wider than original)
  const adsGap = 2;     // ADS gap (tighter)
  const gap = baseGap - (baseGap - adsGap) * adsProgress;

  // Line length: longer at hip, shorter at ADS
  const baseLength = 12;  // Hip fire line length (wider)
  const adsLength = 6;    // ADS line length
  const lineLength = baseLength - (baseLength - adsLength) * adsProgress;

  // Line thickness: slightly thinner when ADS for precision feel
  const baseThickness = 2;
  const adsThickness = 1.5;
  const thickness = baseThickness - (baseThickness - adsThickness) * adsProgress;

  // Opacity: slightly more visible when ADS
  const opacity = 0.8 + 0.2 * adsProgress;

  // Center dot size: smaller when ADS
  const baseDotSize = 4;
  const adsDotSize = 3;
  const dotSize = baseDotSize - (baseDotSize - adsDotSize) * adsProgress;

  const containerSize = gap + lineLength * 2;

  return (
    <div
      className="absolute top-1/2 left-1/2 pointer-events-none"
      style={{
        transform: 'translate(-50%, -50%)',
        width: `${containerSize}px`,
        height: `${containerSize}px`,
      }}
    >
      {/* Left line */}
      <div
        className="absolute bg-white"
        style={{
          left: 0,
          top: '50%',
          width: `${lineLength}px`,
          height: `${thickness}px`,
          transform: 'translateY(-50%)',
          opacity,
        }}
      />
      {/* Right line */}
      <div
        className="absolute bg-white"
        style={{
          right: 0,
          top: '50%',
          width: `${lineLength}px`,
          height: `${thickness}px`,
          transform: 'translateY(-50%)',
          opacity,
        }}
      />
      {/* Top line */}
      <div
        className="absolute bg-white"
        style={{
          left: '50%',
          top: 0,
          width: `${thickness}px`,
          height: `${lineLength}px`,
          transform: 'translateX(-50%)',
          opacity,
        }}
      />
      {/* Bottom line */}
      <div
        className="absolute bg-white"
        style={{
          left: '50%',
          bottom: 0,
          width: `${thickness}px`,
          height: `${lineLength}px`,
          transform: 'translateX(-50%)',
          opacity,
        }}
      />
      {/* Center dot */}
      <div
        className="absolute bg-red-500 rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          transform: 'translate(-50%, -50%)',
          opacity,
        }}
      />
    </div>
  );
};

export default Crosshair;
