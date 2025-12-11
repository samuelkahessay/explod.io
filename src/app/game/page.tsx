'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with Three.js
const GameCanvas = dynamic(() => import('../../components/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
        <p className="text-white text-xl">Loading game...</p>
      </div>
    </div>
  ),
});

export default function GamePage() {
  const handleGameOver = (score: number) => {
    console.log('Game Over! Final Score:', score);
  };

  return (
    <main className="w-full h-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="w-full h-screen flex items-center justify-center bg-gray-900">
            <p className="text-white">Loading...</p>
          </div>
        }
      >
        <GameCanvas onGameOver={handleGameOver} />
      </Suspense>
    </main>
  );
}
