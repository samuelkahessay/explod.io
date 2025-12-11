'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Game } from '../game/core/Game';
import { GameState } from '../game/types/GameTypes';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ThemeType } from '@/config/themeConfig';
import { getTheme } from '@/utils/settings';
import HUD from './HUD';

interface GameCanvasProps {
  onGameOver?: (score: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const showGameOverRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    isRunning: false,
    isPaused: false,
    score: 0,
    playerHealth: GAME_CONFIG.PLAYER.HEALTH,
    enemiesKilled: 0,
    timeElapsed: 0,
  });

  const [isLocked, setIsLocked] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('DEFAULT');

  // Load theme on mount
  useEffect(() => {
    setTheme(getTheme());
  }, []);

  const isChristmas = theme === 'CHRISTMAS';

  // Keep ref in sync with state
  useEffect(() => {
    showGameOverRef.current = showGameOver;
  }, [showGameOver]);

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    // Create game instance with theme
    const game = new Game(containerRef.current, theme);
    gameRef.current = game;

    // Subscribe to state updates
    game.onStateUpdate = (newState: GameState) => {
      setGameState(newState);

      // Check for game over - use ref to avoid stale closure
      if (newState.playerHealth <= 0 && !showGameOverRef.current) {
        setShowGameOver(true);
        showGameOverRef.current = true;
        if (onGameOver) {
          onGameOver(newState.score);
        }
      }
    };

    // Handle pointer lock changes
    const handleLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      setIsLocked(locked);
    };

    document.addEventListener('pointerlockchange', handleLockChange);

    // Initialize
    game.init();

    // Cleanup
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      game.dispose();
    };
  }, [onGameOver, theme]);

  // Handle click to start/lock
  const handleClick = useCallback(() => {
    if (!gameRef.current) return;

    if (showGameOver) {
      // Restart game
      gameRef.current.restart();
      setShowGameOver(false);
      showGameOverRef.current = false;
      containerRef.current?.requestPointerLock();
      gameRef.current.start();
    } else if (!isLocked) {
      // Start or resume
      containerRef.current?.requestPointerLock();
      if (!gameRef.current.getState().isRunning) {
        gameRef.current.start();
      }
      // If already running (paused), just re-acquiring pointer lock is enough
    }
  }, [isLocked, showGameOver]);

  // Handle escape to pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameRef.current && !showGameOver) {
        // Pointer lock will be released automatically
        // We could toggle pause here if we wanted
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showGameOver]);

  return (
    <div className="relative w-full h-screen bg-black">
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
      />

      {/* HUD Overlay */}
      {isLocked && !showGameOver && (
        <HUD
          health={gameState.playerHealth}
          maxHealth={GAME_CONFIG.PLAYER.HEALTH}
          score={gameState.score}
          enemiesKilled={gameState.enemiesKilled}
          theme={theme}
        />
      )}

      {/* Crosshair */}
      {isLocked && !showGameOver && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative w-6 h-6">
            <div className="absolute top-1/2 left-0 w-2 h-0.5 bg-white -translate-y-1/2" />
            <div className="absolute top-1/2 right-0 w-2 h-0.5 bg-white -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 w-0.5 h-2 bg-white -translate-x-1/2" />
            <div className="absolute left-1/2 bottom-0 w-0.5 h-2 bg-white -translate-x-1/2" />
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Start Screen */}
      {!isLocked && !showGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              {isChristmas ? "SANTA'S DEFENSE" : 'EXPLOSION FPS'}
            </h1>
            <p className="text-2xl text-gray-300 mb-8">
              {isChristmas ? 'Defend the North Pole!' : 'Rocket Launcher Arena'}
            </p>
            <button
              onClick={handleClick}
              className={`px-8 py-4 text-white text-xl font-bold rounded-lg transition-colors ${
                isChristmas
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isChristmas ? 'SAVE CHRISTMAS' : 'CLICK TO PLAY'}
            </button>
            <div className="mt-8 text-gray-400">
              <p className="mb-2">Controls:</p>
              <p>WASD - Move | Mouse - Aim | Click - Fire</p>
              <p>Space - Jump | ESC - Pause</p>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {showGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-red-500 mb-4">
              {isChristmas ? 'CHRISTMAS LOST' : 'GAME OVER'}
            </h1>
            <div className="text-white mb-8">
              <p className="text-3xl mb-2">Score: {gameState.score.toLocaleString()}</p>
              <p className="text-xl text-gray-400">
                {isChristmas ? 'Invaders Defeated' : 'Enemies Killed'}: {gameState.enemiesKilled}
              </p>
              <p className="text-xl text-gray-400">
                Time Survived: {Math.floor(gameState.timeElapsed)}s
              </p>
            </div>
            <button
              onClick={handleClick}
              className={`px-8 py-4 text-white text-xl font-bold rounded-lg transition-colors ${
                isChristmas
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isChristmas ? 'TRY AGAIN' : 'PLAY AGAIN'}
            </button>
          </div>
        </div>
      )}

      {/* Paused Screen */}
      {!isLocked && !showGameOver && gameState.isRunning && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
          onClick={handleClick}
        >
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">PAUSED</h2>
            <p className="text-xl">Click to resume</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
