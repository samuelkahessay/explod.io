// Knockback physics configuration
export const KNOCKBACK_CONFIG = {
  // Physics
  VELOCITY_DECAY: 0.92, // Per-frame velocity multiplier (friction)
  MIN_VELOCITY_THRESHOLD: 0.1, // Below this, knockback ends
  GRAVITY_MULTIPLIER: 0.3, // How much gravity affects airborne knockback

  // Force scaling
  FORCE_TO_VELOCITY: 0.8, // Convert force magnitude to velocity
  MAX_KNOCKBACK_VELOCITY: 25, // Cap to prevent flying off map
  STACKING_DIMINISH: 0.7, // Each stacked hit is 70% as effective

  // Stagger timing
  MIN_STAGGER_DURATION: 0.3, // Minimum time in stagger state (seconds)
  STAGGER_DURATION_PER_FORCE: 0.02, // Extra stagger time per unit of force
  MAX_STAGGER_DURATION: 2.0, // Maximum stagger time

  // Visual wobble
  WOBBLE_INTENSITY: 0.3, // Max rotation wobble in radians
  WOBBLE_FREQUENCY: 15, // Wobble oscillation speed
  WOBBLE_DECAY: 0.85, // Per-frame wobble intensity decay

  // Recovery
  RECOVERY_DURATION: 0.4, // Time to smoothly reorient (seconds)
  RECOVERY_ROTATION_SPEED: 6, // Quaternion slerp speed during recovery

  // Limb interaction
  CRAWLING_KNOCKBACK_RESIST: 0.5, // Crawling enemies resist 50% knockback
  MISSING_LEG_KNOCKBACK_MULT: 1.3, // Missing legs = more knockback
};
