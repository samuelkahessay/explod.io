'use client';

import React from 'react';
import type { PerfStats } from '../game/core/Game';

interface PerfOverlayProps {
  stats: PerfStats | null;
}

export default function PerfOverlay({ stats }: PerfOverlayProps) {
  if (!stats) return null;

  const formatMs = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatInt = (n: number) => n.toLocaleString();

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-none">
      <div className="bg-black/70 text-white rounded-lg px-3 py-2 text-xs font-mono border border-white/10">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-semibold">FPS</div>
          <div className="text-sm">{stats.fps}</div>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-white/80">
          <div>Frame</div>
          <div className="text-right">{formatMs(stats.frameMs)}</div>
          <div>Scaled</div>
          <div className="text-right">{formatMs(stats.scaledFrameMs)}</div>
          <div>TimeScale</div>
          <div className="text-right">{stats.timeScale.toFixed(2)}</div>

          <div>Enemies</div>
          <div className="text-right">{formatInt(stats.enemies)}</div>
          <div>Proj</div>
          <div className="text-right">{formatInt(stats.projectiles)}</div>
          <div>EnemyProj</div>
          <div className="text-right">{formatInt(stats.enemyProjectiles)}</div>
          <div>Expl</div>
          <div className="text-right">{formatInt(stats.explosions)}</div>

          <div>Draw</div>
          <div className="text-right">{formatInt(stats.drawCalls)}</div>
          <div>Tris</div>
          <div className="text-right">{formatInt(stats.triangles)}</div>
          <div>Geom</div>
          <div className="text-right">{formatInt(stats.geometries)}</div>
          <div>Tex</div>
          <div className="text-right">{formatInt(stats.textures)}</div>
        </div>
      </div>
    </div>
  );
}

