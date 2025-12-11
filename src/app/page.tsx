'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ThemeType } from '@/config/themeConfig';
import { getTheme, setTheme } from '@/utils/settings';

export default function Home() {
  const [theme, setThemeState] = useState<ThemeType>('DEFAULT');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setThemeState(getTheme());
  }, []);

  const toggleChristmasMode = () => {
    const newTheme: ThemeType = theme === 'CHRISTMAS' ? 'DEFAULT' : 'CHRISTMAS';
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  const isChristmas = theme === 'CHRISTMAS';

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isChristmas
        ? 'bg-gradient-to-b from-[#0a1628] to-[#1a0a0a]'
        : 'bg-gradient-to-b from-gray-900 to-black'
    }`}>
      <div className="text-center px-4">
        <h1 className="text-7xl font-bold text-white mb-4">
          {isChristmas ? (
            <>SANTA&apos;S <span className="text-red-500">DEFENSE</span></>
          ) : (
            <>EXPLOSION <span className="text-red-500">FPS</span></>
          )}
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-md mx-auto">
          {isChristmas ? (
            'Defend the North Pole! Launch festive ornament bombs at the naughty invaders!'
          ) : (
            'A fast-paced browser FPS with explosive rocket launcher action. Destroy enemies with blast radius damage!'
          )}
        </p>

        <Link
          href="/game"
          className={`inline-block px-12 py-5 text-white text-2xl font-bold rounded-lg transition-all hover:scale-105 shadow-lg ${
            isChristmas
              ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30'
              : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
          }`}
        >
          {isChristmas ? 'SAVE CHRISTMAS' : 'PLAY NOW'}
        </Link>

        {/* Christmas Mode Toggle */}
        {mounted && (
          <div className="mt-6">
            <button
              onClick={toggleChristmasMode}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                isChristmas
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              {isChristmas ? '🎄 Christmas Mode: ON' : '🎄 Christmas Mode: OFF'}
            </button>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {isChristmas ? (
            <>
              <div className="bg-white/5 p-6 rounded-lg border border-red-900/30">
                <div className="text-4xl mb-2">🎄</div>
                <h3 className="text-white font-bold mb-1">Ornament Launcher</h3>
                <p className="text-gray-500 text-sm">Launch explosive ornaments at the invaders</p>
              </div>
              <div className="bg-white/5 p-6 rounded-lg border border-green-900/30">
                <div className="text-4xl mb-2">👺</div>
                <h3 className="text-white font-bold mb-1">Naughty Invaders</h3>
                <p className="text-gray-500 text-sm">Evil elves, gingerbread men, and nutcrackers</p>
              </div>
              <div className="bg-white/5 p-6 rounded-lg border border-red-900/30">
                <div className="text-4xl mb-2">❄️</div>
                <h3 className="text-white font-bold mb-1">Snowy Arena</h3>
                <p className="text-gray-500 text-sm">Battle in a winter wonderland at night</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white/5 p-6 rounded-lg">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="text-white font-bold mb-1">Rocket Launcher</h3>
                <p className="text-gray-500 text-sm">Fire explosive rockets with blast radius damage</p>
              </div>
              <div className="bg-white/5 p-6 rounded-lg">
                <div className="text-4xl mb-2">🤖</div>
                <h3 className="text-white font-bold mb-1">Ranged Enemies</h3>
                <p className="text-gray-500 text-sm">AI enemies that hunt and shoot back at you</p>
              </div>
              <div className="bg-white/5 p-6 rounded-lg">
                <div className="text-4xl mb-2">💥</div>
                <h3 className="text-white font-bold mb-1">Explosions</h3>
                <p className="text-gray-500 text-sm">Chain explosions and rack up high scores</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 text-gray-600 text-sm">
          <p>Built with Next.js + Three.js</p>
        </div>
      </div>
    </div>
  );
}
