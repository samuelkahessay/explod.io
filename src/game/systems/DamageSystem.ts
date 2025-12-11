import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { CollisionUtils } from '../utils/CollisionUtils';
import { GAME_CONFIG } from '@/config/gameConfig';

export interface KnockbackData {
  direction: THREE.Vector3;
  force: number;
}

export interface BlastDamageResult {
  enemiesHit: Array<{
    enemy: Enemy;
    damage: number;
    knockback: KnockbackData;
  }>;
  playerHit: boolean;
  playerDamage: number;
  playerKnockback: KnockbackData | null;
}

// Blast physics configuration
const BLAST_PHYSICS = {
  KNOCKBACK_FORCE: 18,
  KNOCKBACK_VERTICAL_BIAS: 0.4, // Adds upward component for rocket jumps
  USE_INVERSE_SQUARE: true,
  MIN_DAMAGE_MULTIPLIER: 0.1, // Minimum damage at edge of blast
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
   * Calculate and apply blast radius damage with knockback
   * Damage falls off using inverse square law
   */
  static calculateBlastDamage(
    explosionCenter: THREE.Vector3,
    blastRadius: number,
    baseDamage: number,
    enemies: Enemy[],
    player: Player,
    obstacles: THREE.Object3D[]
  ): BlastDamageResult {
    const result: BlastDamageResult = {
      enemiesHit: [],
      playerHit: false,
      playerDamage: 0,
      playerKnockback: null,
    };

    // Check each enemy
    for (const enemy of enemies) {
      if (!enemy.isActive) continue;

      const distance = explosionCenter.distanceTo(enemy.position);

      if (distance <= blastRadius * 1.2) {
        // Slightly extended range for knockback
        // Check line of sight (explosion blocked by walls)
        if (
          CollisionUtils.hasLineOfSight(
            explosionCenter,
            enemy.position,
            obstacles
          )
        ) {
          const damageMultiplier = this.calculateFalloff(distance, blastRadius);
          const damage = Math.floor(baseDamage * damageMultiplier);
          const knockback = this.calculateKnockback(
            explosionCenter,
            enemy.position,
            damageMultiplier
          );

          enemy.takeDamage(damage);

          // Apply knockback to enemy if method exists
          if (typeof enemy.applyKnockback === 'function') {
            const knockbackVector = knockback.direction
              .clone()
              .multiplyScalar(knockback.force);
            enemy.applyKnockback(knockbackVector);
          }

          result.enemiesHit.push({ enemy, damage, knockback });
        }
      }
    }

    // Check player (self-damage)
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

    return result;
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
