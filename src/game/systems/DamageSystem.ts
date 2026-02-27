import * as THREE from 'three';
import { HumanoidEnemy } from '../entities/HumanoidEnemy';
import { Player } from '../entities/Player';
import { CollisionUtils } from '../utils/CollisionUtils';
import { GAME_CONFIG } from '@/config/gameConfig';
import { LimbType, LimbDamageResult, LimbState } from '../types/LimbTypes';
import { LIMB_ADJACENCY } from '@/config/limbConfig';

export interface KnockbackData {
  direction: THREE.Vector3;
  force: number;
}

export interface BlastDamageResult {
  enemiesHit: Array<{
    enemy: HumanoidEnemy;
    damage: number;
    knockback: KnockbackData;
  }>;
  playerHit: boolean;
  playerDamage: number;
  playerKnockback: KnockbackData | null;
}

export interface EnhancedBlastDamageResult extends BlastDamageResult {
  limbDamage: Array<{
    enemy: HumanoidEnemy;
    limbResults: LimbDamageResult[];
  }>;
}

// Blast physics configuration
const BLAST_PHYSICS = {
  KNOCKBACK_FORCE: 18,
  KNOCKBACK_VERTICAL_BIAS: 0.4, // Adds upward component for rocket jumps
  USE_INVERSE_SQUARE: true,
  MIN_DAMAGE_MULTIPLIER: 0.1, // Minimum damage at edge of blast
  CLOSE_HIT_THRESHOLD: 0.3, // Within 30% of blast radius = close hit (multi-limb damage)
  ADJACENT_LIMB_DAMAGE_RATIO: 0.4, // Adjacent limbs take 40% of primary damage
};

export class DamageSystem {
  /**
   * Calculate damage multiplier using inverse square falloff
   * More realistic than linear - damage drops off quickly with distance
   */
  private static calculateFalloff(
    distance: number,
    blastRadius: number
  ): number {
    if (BLAST_PHYSICS.USE_INVERSE_SQUARE) {
      // Inverse square falloff: 1 / (1 + (d/r)^2)
      // At center (d=0): multiplier = 1
      // At edge (d=r): multiplier = 0.5
      // Beyond edge: continues to fall off
      const normalizedDist = distance / blastRadius;
      const multiplier = 1 / (1 + normalizedDist * normalizedDist);
      return Math.max(multiplier, BLAST_PHYSICS.MIN_DAMAGE_MULTIPLIER);
    } else {
      // Linear falloff (original behavior)
      return Math.max(1 - distance / blastRadius, 0);
    }
  }

  /**
   * Calculate knockback vector from explosion center to target
   */
  private static calculateKnockback(
    explosionCenter: THREE.Vector3,
    targetPosition: THREE.Vector3,
    damageMultiplier: number
  ): KnockbackData {
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, explosionCenter)
      .normalize();

    // Add vertical bias for more satisfying knockback (rocket jumps!)
    direction.y += BLAST_PHYSICS.KNOCKBACK_VERTICAL_BIAS;
    direction.normalize();

    const force = BLAST_PHYSICS.KNOCKBACK_FORCE * damageMultiplier;

    return { direction, force };
  }

  /**
   * Determine which limb is closest to the explosion center
   */
  static determineLimbHit(
    explosionCenter: THREE.Vector3,
    enemy: HumanoidEnemy
  ): LimbType {
    let closestLimb = LimbType.TORSO;
    let closestDistance = Infinity;

    enemy.limbs.forEach((limbData, limbType) => {
      if (limbData.state === LimbState.SEVERED) return;

      // Get world position of limb
      const limbWorldPos = new THREE.Vector3();
      limbData.mesh.getWorldPosition(limbWorldPos);

      const distance = explosionCenter.distanceTo(limbWorldPos);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestLimb = limbType;
      }
    });

    return closestLimb;
  }

  /**
   * Get adjacent limbs for splash damage
   */
  private static getAdjacentLimbs(limbType: LimbType): LimbType[] {
    return LIMB_ADJACENCY[limbType] || [];
  }

  /**
   * Calculate and apply blast radius damage with limb-specific targeting and knockback.
   * Damage falls off using inverse square law.
   */
  static calculateBlastDamageWithLimbs(
    explosionCenter: THREE.Vector3,
    blastRadius: number,
    baseDamage: number,
    enemies: HumanoidEnemy[],
    player: Player,
    obstacles: THREE.Object3D[]
  ): EnhancedBlastDamageResult {
    const result: EnhancedBlastDamageResult = {
      enemiesHit: [],
      playerHit: false,
      playerDamage: 0,
      playerKnockback: null,
      limbDamage: [],
    };

    // Check each enemy
    for (const enemy of enemies) {
      if (!enemy.isActive) continue;

      const distance = explosionCenter.distanceTo(enemy.position);

      if (distance <= blastRadius * 1.2) {
        // Ensure bounding boxes are current before limb damage calculation
        enemy.ensureBoundingBoxesUpdated();

        // Check line of sight
        if (
          CollisionUtils.hasLineOfSight(
            explosionCenter,
            enemy.position,
            obstacles
          )
        ) {
          const damageMultiplier = this.calculateFalloff(distance, blastRadius);
          const damage = Math.floor(baseDamage * damageMultiplier);

          // Determine which limb(s) get hit based on proximity
          const limbResults: LimbDamageResult[] = [];

          // Check if this is a close hit (affects multiple limbs)
          const isCloseHit = distance < blastRadius * BLAST_PHYSICS.CLOSE_HIT_THRESHOLD;

          if (isCloseHit) {
            // Very close - multiple limbs take damage
            const primaryLimb = this.determineLimbHit(explosionCenter, enemy);
            const adjacentLimbs = this.getAdjacentLimbs(primaryLimb);

            // Primary limb takes full damage
            limbResults.push(
              enemy.takeLimbDamage(primaryLimb, damage, explosionCenter)
            );

            // Adjacent limbs take reduced damage
            for (const adjLimb of adjacentLimbs) {
              const adjDamage = Math.floor(damage * BLAST_PHYSICS.ADJACENT_LIMB_DAMAGE_RATIO);
              if (adjDamage > 0) {
                limbResults.push(
                  enemy.takeLimbDamage(adjLimb, adjDamage, explosionCenter)
                );
              }
            }
          } else {
            // Further away - single limb damage
            const hitLimb = this.determineLimbHit(explosionCenter, enemy);
            limbResults.push(
              enemy.takeLimbDamage(hitLimb, damage, explosionCenter)
            );
          }

          // Calculate and apply knockback
          const knockback = this.calculateKnockback(
            explosionCenter,
            enemy.position,
            damageMultiplier
          );

          const knockbackVector = knockback.direction
            .clone()
            .multiplyScalar(knockback.force);
          enemy.applyKnockback(knockbackVector);

          // Calculate total damage for result
          const totalDamage = limbResults.reduce((sum, r) => sum + r.damage, 0);

          result.enemiesHit.push({
            enemy,
            damage: totalDamage,
            knockback,
          });

          result.limbDamage.push({
            enemy,
            limbResults,
          });
        }
      }
    }

    // Check player (self-damage)
    this.applyPlayerDamage(explosionCenter, blastRadius, baseDamage, player, obstacles, result);

    return result;
  }

  /**
   * Apply damage to player (shared logic)
   */
  private static applyPlayerDamage(
    explosionCenter: THREE.Vector3,
    blastRadius: number,
    baseDamage: number,
    player: Player,
    obstacles: THREE.Object3D[],
    result: BlastDamageResult
  ): void {
    const playerDistance = explosionCenter.distanceTo(player.position);

    if (playerDistance <= blastRadius * 1.2) {
      if (
        CollisionUtils.hasLineOfSight(
          explosionCenter,
          player.position,
          obstacles
        )
      ) {
        const damageMultiplier = this.calculateFalloff(
          playerDistance,
          blastRadius
        );

        // Apply self-damage reduction
        result.playerDamage = Math.floor(
          baseDamage * damageMultiplier * GAME_CONFIG.SELF_DAMAGE_MULTIPLIER
        );
        result.playerHit = true;

        // Calculate knockback (full force for rocket jumping!)
        result.playerKnockback = this.calculateKnockback(
          explosionCenter,
          player.position,
          damageMultiplier
        );

        player.takeDamage(result.playerDamage);

        // Apply knockback to player if method exists
        if (typeof player.applyKnockback === 'function') {
          const knockbackVector = result.playerKnockback.direction
            .clone()
            .multiplyScalar(result.playerKnockback.force);
          player.applyKnockback(knockbackVector);
        }
      }
    }
  }

  /**
   * Get the distance at which damage is at 50%
   */
  static getHalfDamageDistance(blastRadius: number): number {
    if (BLAST_PHYSICS.USE_INVERSE_SQUARE) {
      // For inverse square: 0.5 = 1 / (1 + d^2), solve for d
      // d = 1, so half damage at 1 * blastRadius = blastRadius
      return blastRadius;
    } else {
      return blastRadius / 2;
    }
  }
}
