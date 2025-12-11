import * as THREE from 'three';
import {
  LimbType,
  LimbDimensions,
  DismembermentConfig,
  LimbColors,
} from '@/game/types/LimbTypes';

// Limb geometry dimensions (blocky Krunker-style)
export const LIMB_DIMENSIONS: Record<LimbType, LimbDimensions> = {
  [LimbType.HEAD]: { width: 0.4, height: 0.4, depth: 0.4 },
  [LimbType.TORSO]: { width: 0.7, height: 0.9, depth: 0.5 },
  [LimbType.LEFT_ARM]: { width: 0.2, height: 0.7, depth: 0.2 },
  [LimbType.RIGHT_ARM]: { width: 0.2, height: 0.7, depth: 0.2 },
  [LimbType.LEFT_LEG]: { width: 0.25, height: 0.8, depth: 0.25 },
  [LimbType.RIGHT_LEG]: { width: 0.25, height: 0.8, depth: 0.25 },
};

// Attachment points relative to entity origin (y=0 at feet)
export const LIMB_ATTACHMENT_POINTS: Record<LimbType, THREE.Vector3> = {
  [LimbType.HEAD]: new THREE.Vector3(0, 1.55, 0),
  [LimbType.TORSO]: new THREE.Vector3(0, 0.95, 0),
  [LimbType.LEFT_ARM]: new THREE.Vector3(-0.45, 1.15, 0),
  [LimbType.RIGHT_ARM]: new THREE.Vector3(0.45, 1.15, 0),
  [LimbType.LEFT_LEG]: new THREE.Vector3(-0.2, 0.4, 0),
  [LimbType.RIGHT_LEG]: new THREE.Vector3(0.2, 0.4, 0),
};

// Health per limb
export const LIMB_HEALTH: Record<LimbType, number> = {
  [LimbType.HEAD]: 30,
  [LimbType.TORSO]: 80,
  [LimbType.LEFT_ARM]: 40,
  [LimbType.RIGHT_ARM]: 40,
  [LimbType.LEFT_LEG]: 50,
  [LimbType.RIGHT_LEG]: 50,
};

// Damage multipliers (headshots hurt more)
export const LIMB_DAMAGE_MULTIPLIERS: Record<LimbType, number> = {
  [LimbType.HEAD]: 2.5,
  [LimbType.TORSO]: 1.0,
  [LimbType.LEFT_ARM]: 0.75,
  [LimbType.RIGHT_ARM]: 0.75,
  [LimbType.LEFT_LEG]: 0.8,
  [LimbType.RIGHT_LEG]: 0.8,
};

// Dismemberment physics and settings
export const DISMEMBERMENT_CONFIG: DismembermentConfig = {
  severThreshold: 35, // Instant sever if single hit does this much damage
  damageToSeverRatio: 1.2, // Sever when cumulative damage >= maxHealth * ratio
  gibExplosionForce: 25, // Arcade-style big knockbacks
  gibGravityMultiplier: 0.5, // Floaty gibs (lower = floatier)
  bloodParticleCount: 30, // Blood spray particles per severance
  gibLifetime: 8, // How long gibs persist (seconds)
  gibBounces: 4, // Max ground bounces before settling
  gibBounceDamping: 0.5, // Energy retained after bounce (0-1)
};

// Color palette for limbs and effects
export const LIMB_COLORS: LimbColors = {
  skin: 0xffcc99, // Head/skin tone
  body: 0xcc3333, // Body/clothing (red)
  blood: 0x8b0000, // Dark red blood
  stump: 0x660000, // Darker red for severed stumps
};

// Speed multipliers when limbs are lost
export const LIMB_SPEED_MODIFIERS = {
  oneLegsLost: 0.4, // 40% speed with one leg
  bothLegsLost: 0.15, // 15% speed crawling
  normal: 1.0,
};

// Accuracy penalties when arms are lost
export const LIMB_ACCURACY_MODIFIERS = {
  wrongArmPenalty: 0.3, // 30% less accurate with off-hand
  noArmsCanShoot: false,
};

// Adjacent limbs for splash damage
export const LIMB_ADJACENCY: Record<LimbType, LimbType[]> = {
  [LimbType.HEAD]: [LimbType.TORSO],
  [LimbType.TORSO]: [
    LimbType.HEAD,
    LimbType.LEFT_ARM,
    LimbType.RIGHT_ARM,
    LimbType.LEFT_LEG,
    LimbType.RIGHT_LEG,
  ],
  [LimbType.LEFT_ARM]: [LimbType.TORSO],
  [LimbType.RIGHT_ARM]: [LimbType.TORSO],
  [LimbType.LEFT_LEG]: [LimbType.TORSO, LimbType.RIGHT_LEG],
  [LimbType.RIGHT_LEG]: [LimbType.TORSO, LimbType.LEFT_LEG],
};

// Performance limits
export const LIMB_PERFORMANCE_LIMITS = {
  maxGibs: 150,
  maxBloodParticles: 500,
  maxBloodDecals: 50,
  gibUpdateDistance: 50, // Don't update gibs beyond this distance from player
};
