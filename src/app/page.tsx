import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-7xl font-bold text-white mb-4">
          EXPLOSION <span className="text-red-500">FPS</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-md mx-auto">
          A fast-paced browser FPS with explosive rocket launcher action.
          Destroy enemies with blast radius damage!
        </p>

        <Link
          href="/game"
          className="inline-block px-12 py-5 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30"
        >
          PLAY NOW
        </Link>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
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
        </div>

        <div className="mt-8 text-gray-600 text-sm">
          <p>Built with Next.js + Three.js</p>
        </div>
      </div>
    </div>
  );
}
