export const GAME_CONFIG = {
  // Player settings
  PLAYER: {
    HEALTH: 100,
    SPEED: 10,
    JUMP_SPEED: 8,
    HEIGHT: 1.8,
    RADIUS: 0.5,
    // ADS settings
    ADS_FOV: 55,
    DEFAULT_FOV: 75,
    ADS_SPEED_MULTIPLIER: 0.5,
    ADS_TRANSITION_SPEED: 10,
  },

  // Arena settings
  ARENA: {
    SIZE: 40,
    WALL_HEIGHT: 4,
  },

  // Weapon settings
  ROCKET_LAUNCHER: {
    FIRE_RATE: 1.5,
    PROJECTILE_SPEED: 30,
    PROJECTILE_DAMAGE: 50,
    BLAST_RADIUS: 5,
    PROJECTILE_LIFETIME: 5,
  },

  // Enemy settings
  ENEMY: {
    HEALTH: 100,
    SPEED: 4,
    DAMAGE: 15,
    ATTACK_RANGE: 15,
    DETECTION_RANGE: 30,
    FIRE_RATE: 0.4, // Reduced from 1 - enemies now fire every 2.5 seconds instead of every 1 second
    SPAWN_INTERVAL: 5,
    MAX_ENEMIES: 5,
    PROJECTILE_SPEED: 15, // Slightly slower projectiles
  },

  // Physics
  PHYSICS: {
    GRAVITY: 30,
    FRICTION: 0.9,
  },

  // Scoring
  SCORING: {
    ENEMY_KILL: 100,
  },

  // Self-damage
  SELF_DAMAGE_MULTIPLIER: 0.5,
};
