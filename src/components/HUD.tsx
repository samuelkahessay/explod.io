'use client';

import React from 'react';

interface HUDProps {
  health: number;
  maxHealth: number;
  score: number;
  enemiesKilled: number;
}

const HUD: React.FC<HUDProps> = ({ health, maxHealth, score, enemiesKilled }) => {
  const healthPercent = (health / maxHealth) * 100;
  const healthColor =
    healthPercent > 60 ? 'bg-green-500' : healthPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar - Score */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/50 px-6 py-2 rounded-lg">
          <span className="text-white text-2xl font-bold">{score.toLocaleString()}</span>
        </div>
      </div>

      {/* Bottom left - Health */}
      <div className="absolute bottom-8 left-8">
        <div className="bg-black/50 p-4 rounded-lg">
          <div className="text-white text-sm mb-1">HEALTH</div>
          <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${healthColor} transition-all duration-200`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <div className="text-white text-lg font-bold mt-1">
            {health} / {maxHealth}
          </div>
        </div>
      </div>

      {/* Bottom right - Stats */}
      <div className="absolute bottom-8 right-8">
        <div className="bg-black/50 p-4 rounded-lg text-right">
          <div className="text-gray-400 text-sm">KILLS</div>
          <div className="text-white text-2xl font-bold">{enemiesKilled}</div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="text-white/50 text-xs">
          WASD move | Mouse aim | Click shoot | Space jump | ESC pause
        </div>
      </div>
    </div>
  );
};

export default HUD;
