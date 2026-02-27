'use client';

import React from 'react';
import type { PerfStats } from '../game/core/Game';

interface PerfOverlayProps {
  stats: PerfStats | null;
}

export default function PerfOverlay({ stats }: PerfOverlayProps) {
  if (!stats) return null;

  // Color-coded FPS display
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Compact number formatting
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString());

  return (
    <div className="absolute top-3 right-3 z-50 pointer-events-none">
      <div className="bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-sm rounded border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        {/* Header - FPS */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-cyan-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="text-[10px] text-cyan-400/60 font-mono uppercase tracking-wider">Perf</div>
          <div className={`ml-auto text-lg font-bold font-mono ${getFpsColor(stats.fps)}`}>
            {stats.fps}
          </div>
          <div className="text-[10px] text-white/40 font-mono">fps</div>
        </div>

        {/* Stats Grid */}
        <div className="px-2.5 py-1.5 space-y-0.5 text-[10px] font-mono">
          {/* Timing */}
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Frame</span>
            <span className="text-cyan-300">{stats.frameMs.toFixed(1)}ms</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Scaled</span>
            <span className="text-cyan-300">{stats.scaledFrameMs.toFixed(1)}ms</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Scale</span>
            <span className="text-cyan-300">{stats.timeScale.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">PP</span>
            <span className="text-cyan-300">{stats.postProcessing ? 'on' : 'off'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Shadows</span>
            <span className="text-cyan-300">{stats.shadows ? 'on' : 'off'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">PR</span>
            <span className="text-cyan-300">
              {stats.pixelRatio.toFixed(2)} (cap {stats.pixelRatioCap.toFixed(2)})
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Res</span>
            <span className="text-cyan-300">
              {Math.round(stats.resolution.width)}x{Math.round(stats.resolution.height)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-1" />

          {/* Entities */}
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Enemies</span>
            <span className="text-orange-300">{stats.enemies}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Proj</span>
            <span className="text-purple-300">{stats.projectiles + stats.enemyProjectiles}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Explo</span>
            <span className="text-red-300">{stats.explosions}</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-1" />

          {/* Renderer */}
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Draws</span>
            <span className="text-blue-300">{stats.drawCalls}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Tris</span>
            <span className="text-blue-300">{fmt(stats.triangles)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Geom</span>
            <span className="text-blue-300">{stats.geometries}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Tex</span>
            <span className="text-blue-300">{stats.textures}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
