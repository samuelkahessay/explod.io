'use client';

import React from 'react';
import { ThemeType } from '@/config/themeConfig';

interface HUDProps {
  health: number;
  maxHealth: number;
  score: number;
  enemiesKilled: number;
  theme?: ThemeType;
}

const HUD: React.FC<HUDProps> = ({ health, maxHealth, score, enemiesKilled, theme = 'DEFAULT' }) => {
  const healthPercent = (health / maxHealth) * 100;
  const isChristmas = theme === 'CHRISTMAS';

  // Christmas theme uses festive colors
  const healthColor = isChristmas
    ? healthPercent > 60
      ? 'bg-green-500'
      : healthPercent > 30
        ? 'bg-yellow-400'
        : 'bg-red-600'
    : healthPercent > 60
      ? 'bg-green-500'
      : healthPercent > 30
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const bgColor = isChristmas ? 'bg-red-900/60' : 'bg-black/50';
  const borderStyle = isChristmas ? 'border-2 border-green-500/50' : '';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar - Score */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className={`${bgColor} ${borderStyle} px-6 py-2 rounded-lg`}>
          {isChristmas && <span className="text-yellow-400 mr-2">⭐</span>}
          <span className={`text-2xl font-bold ${isChristmas ? 'text-yellow-300' : 'text-white'}`}>
            {score.toLocaleString()}
          </span>
          {isChristmas && <span className="text-yellow-400 ml-2">⭐</span>}
        </div>
      </div>

      {/* Bottom left - Health */}
      <div className="absolute bottom-8 left-8">
        <div className={`${bgColor} ${borderStyle} p-4 rounded-lg`}>
          <div className={`text-sm mb-1 ${isChristmas ? 'text-green-300' : 'text-white'}`}>
            {isChristmas ? '🎄 HOLIDAY SPIRIT' : 'HEALTH'}
          </div>
          <div className={`w-48 h-4 rounded-full overflow-hidden ${isChristmas ? 'bg-green-900' : 'bg-gray-700'}`}>
            <div
              className={`h-full ${healthColor} transition-all duration-200`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <div className={`text-lg font-bold mt-1 ${isChristmas ? 'text-white' : 'text-white'}`}>
            {health} / {maxHealth}
          </div>
        </div>
      </div>

      {/* Bottom right - Stats */}
      <div className="absolute bottom-8 right-8">
        <div className={`${bgColor} ${borderStyle} p-4 rounded-lg text-right`}>
          <div className={`text-sm ${isChristmas ? 'text-red-300' : 'text-gray-400'}`}>
            {isChristmas ? '🎁 GIFTS DELIVERED' : 'KILLS'}
          </div>
          <div className={`text-2xl font-bold ${isChristmas ? 'text-green-300' : 'text-white'}`}>
            {enemiesKilled}
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className={`text-xs ${isChristmas ? 'text-green-300/50' : 'text-white/50'}`}>
          WASD move | Mouse aim | Click shoot | Space jump | ESC pause
        </div>
      </div>

      {/* Christmas decorative corners */}
      {isChristmas && (
        <>
          <div className="absolute top-2 left-2 text-2xl opacity-30">🎄</div>
          <div className="absolute top-2 right-2 text-2xl opacity-30">🎄</div>
        </>
      )}
    </div>
  );
};

export default HUD;
