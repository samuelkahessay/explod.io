# Explod.io

A fast-paced 3D first-person shooter built for the browser with explosive rocket launcher combat, destructible enemies with limb damage, and AI opponents that fight back.

[Play Now](https://explodio.vercel.app) | Built with Next.js + Three.js

## Features

- **Rocket Launcher Combat** — Fire explosive rockets with blast radius damage and inverse-square falloff physics
- **Limb Damage System** — Enemies take localized damage with limb severance, blood effects, and gibs
- **Enemy AI** — Ranged enemies with line-of-sight detection, pathfinding, and return fire
- **Rocket Jumping** — Use explosion knockback to launch yourself across the arena
- **ADS (Aim Down Sights)** — Right-click for precision aiming with zoom
- **Christmas Mode** — Toggle a holiday theme with elves, gingerbread men, nutcrackers, and a snowy arena
- **Performance Overlay** — Built-in FPS counter and performance diagnostics

## Controls

| Action | Key |
|--------|-----|
| Move | WASD |
| Look | Mouse |
| Shoot | Left Click |
| Aim Down Sights | Right Click |
| Jump | Space |
| Sprint | Shift |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **3D Engine:** Three.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS

## Project Structure

```
src/
├── app/              # Next.js pages and layout
├── components/       # React components (GameCanvas, HUD, PerfOverlay)
├── config/           # Game configuration and theme settings
├── game/
│   ├── core/         # Game loop, scene manager, input handling
│   ├── entities/     # Player, enemies, projectiles
│   ├── systems/      # AI, damage, screen shake
│   ├── particles/    # Explosion effects, blood, gibs
│   ├── weapons/      # Rocket launcher
│   ├── world/        # Arena and lighting
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Collision detection, spatial hashing
└── utils/            # General utilities
```

## License

[MIT](LICENSE)
