import * as THREE from 'three';

// Limb type enumeration
export enum LimbType {
  HEAD = 'head',
  TORSO = 'torso',
  LEFT_ARM = 'left_arm',
  RIGHT_ARM = 'right_arm',
  LEFT_LEG = 'left_leg',
  RIGHT_LEG = 'right_leg',
}

// State of a limb
export enum LimbState {
  ATTACHED = 'attached',
  DAMAGED = 'damaged',
  SEVERED = 'severed',
}

// Data structure for each limb
export interface LimbData {
  type: LimbType;
  state: LimbState;
  health: number;
  maxHealth: number;
  mesh: THREE.Mesh;
  attachmentPoint: THREE.Vector3;
  boundingBox: THREE.Box3;
  damageMultiplier: number;
}

// Result of damage to a specific limb
export interface LimbDamageResult {
  limb: LimbType;
  damage: number;
  severed: boolean;
  killed: boolean;
}

// Dimensions for limb geometry
export interface LimbDimensions {
  width: number;
  height: number;
  depth: number;
}

// Configuration for dismemberment physics
export interface DismembermentConfig {
  severThreshold: number;
  damageToSeverRatio: number;
  gibExplosionForce: number;
  gibGravityMultiplier: number;
  bloodParticleCount: number;
  gibLifetime: number;
  gibBounces: number;
  gibBounceDamping: number;
}

// Gib data for physics simulation
export interface GibData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  bounces: number;
  isLimb: boolean;
  limbType?: LimbType;
  trailParticles: boolean;
}

// Colors used in the limb system
export interface LimbColors {
  skin: number;
  body: number;
  blood: number;
  stump: number;
}

// Enemy combat state for knockback system
export enum EnemyCombatState {
  NORMAL = 'normal',
  STAGGERED = 'staggered',
  RECOVERING = 'recovering',
}

// Knockback physics state data
export interface KnockbackState {
  velocity: THREE.Vector3;
  staggerTimeRemaining: number;
  wobbleIntensity: number;
  wobblePhase: number;
  preKnockbackRotation: THREE.Quaternion;
  lastImpactDirection: THREE.Vector3;
}
