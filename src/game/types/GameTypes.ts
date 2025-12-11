import * as THREE from 'three';

// Game state
export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  playerHealth: number;
  enemiesKilled: number;
  timeElapsed: number;
  adsProgress: number;  // 0-1 for crosshair interpolation
}

// Entity base interface
export interface IEntity {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh: THREE.Object3D;
  isActive: boolean;

  update(deltaTime: number): void;
  destroy(): void;
}

// Damageable entities
export interface IDamageable {
  health: number;
  maxHealth: number;
  takeDamage(amount: number): void;
  isDead(): boolean;
}

// Moveable entities
export interface IMoveable {
  velocity: THREE.Vector3;
  speed: number;
  move(direction: THREE.Vector3, deltaTime: number): void;
}

// Projectile configuration
export interface ProjectileConfig {
  speed: number;
  damage: number;
  blastRadius: number;
  lifetime: number;
}

// Weapon configuration
export interface WeaponConfig {
  name: string;
  fireRate: number;
  projectileConfig: ProjectileConfig;
  ammo: number;
  maxAmmo: number;
}

// Enemy configuration
export interface EnemyConfig {
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  detectionRange: number;
  fireRate: number;
}

// Collision result
export interface CollisionResult {
  hit: boolean;
  point?: THREE.Vector3;
  normal?: THREE.Vector3;
  object?: THREE.Object3D;
  distance?: number;
}

// Input state
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  fire: boolean;
  aim: boolean;  // Right-click ADS state
}

// Game events
export type GameEventType =
  | 'projectile_fired'
  | 'projectile_hit'
  | 'explosion'
  | 'enemy_damaged'
  | 'enemy_killed'
  | 'player_damaged'
  | 'player_killed'
  | 'game_over'
  | 'score_update';

export interface GameEvent {
  type: GameEventType;
  data: unknown;
}
