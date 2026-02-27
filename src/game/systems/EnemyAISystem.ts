import * as THREE from 'three';
import { HumanoidEnemy } from '../entities/HumanoidEnemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { Player } from '../entities/Player';
import { CollisionUtils } from '../utils/CollisionUtils';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ThemeType } from '@/config/themeConfig';

interface EnemyAIState {
  enemy: HumanoidEnemy;
  state: 'idle' | 'chase' | 'attack';
}

export class EnemyAISystem {
  private scene: THREE.Scene;
  private theme: ThemeType;
  private enemies: Map<string, EnemyAIState> = new Map();
  private obstacles: THREE.Object3D[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];

  private readonly DETECTION_RANGE = GAME_CONFIG.ENEMY.DETECTION_RANGE;
  private readonly ATTACK_RANGE = GAME_CONFIG.ENEMY.ATTACK_RANGE;
  private readonly AI_UPDATE_INTERVAL = 0.1; // seconds
  private updateTimer: number = 0;

  // Visibility cache for throttling line-of-sight checks
  private visibilityCache: Map<string, { visible: boolean; timestamp: number }> = new Map();
  private readonly VISIBILITY_CACHE_TTL = 0.3; // 300ms cache
  private currentTime: number = 0;

  public onEnemyProjectileFired: ((projectile: EnemyProjectile) => void) | null = null;

  constructor(scene: THREE.Scene, theme: ThemeType = 'DEFAULT') {
    this.scene = scene;
    this.theme = theme;
  }

  public setObstacles(obstacles: THREE.Object3D[]): void {
    this.obstacles = obstacles;
  }

  public addEnemy(enemy: HumanoidEnemy): void {
    this.enemies.set(enemy.id, {
      enemy,
      state: 'idle',
    });
    // Set collidables for obstacle avoidance
    if ('setCollidables' in enemy) {
      (enemy as HumanoidEnemy).setCollidables(this.obstacles);
    }
  }

  public removeEnemy(enemyId: string): void {
    this.enemies.delete(enemyId);
    this.visibilityCache.delete(enemyId);
  }

  public getEnemies(): HumanoidEnemy[] {
    return Array.from(this.enemies.values()).map((e) => e.enemy);
  }

  public getEnemyProjectiles(): EnemyProjectile[] {
    return this.enemyProjectiles;
  }

  public update(deltaTime: number, player: Player): void {
    this.updateTimer += deltaTime;
    this.currentTime += deltaTime;

    const shouldUpdateAI = this.updateTimer >= this.AI_UPDATE_INTERVAL;
    if (shouldUpdateAI) {
      this.updateTimer = 0;
    }

    // Update all enemies
    this.enemies.forEach((aiState) => {
      const { enemy } = aiState;
      if (!enemy.isActive) return;

      // Check if enemy can act (not staggered/recovering from knockback)
      const canAct =
        'canAct' in enemy ? (enemy as HumanoidEnemy).canAct() : true;

      // If enemy is staggered, skip AI decisions but still update physics
      if (!canAct) {
        aiState.state = 'idle'; // Reset AI state while staggered
        enemy.update(deltaTime);
        return;
      }

      const distanceToPlayer = enemy.position.distanceTo(player.position);
      const canSeePlayer = this.canSeeTarget(enemy.position, player.position, enemy.id);

      // AI state machine (only update decisions periodically)
      if (shouldUpdateAI) {
        if (distanceToPlayer <= this.DETECTION_RANGE && canSeePlayer) {
          if (distanceToPlayer <= this.ATTACK_RANGE) {
            aiState.state = 'attack';
          } else {
            aiState.state = 'chase';
          }
          enemy.setTarget(player.position);
        } else {
          aiState.state = 'idle';
        }
      }

      // Attack behavior - fire at player (only if not staggered)
      if (aiState.state === 'attack' && canSeePlayer && enemy.canFire()) {
        this.fireAtPlayer(enemy, player);
      }

      // Update enemy movement
      enemy.update(deltaTime);
    });

    // Update enemy projectiles
    this.updateProjectiles(deltaTime, player);
  }

  private canSeeTarget(from: THREE.Vector3, to: THREE.Vector3, enemyId: string): boolean {
    // Check visibility cache first
    const cached = this.visibilityCache.get(enemyId);
    if (cached && (this.currentTime - cached.timestamp) < this.VISIBILITY_CACHE_TTL) {
      return cached.visible;
    }

    // Cache miss or stale - perform raycast
    const visible = CollisionUtils.hasLineOfSight(
      from.clone().setY(1),
      to.clone().setY(1),
      this.obstacles
    );

    // Update cache
    this.visibilityCache.set(enemyId, { visible, timestamp: this.currentTime });
    return visible;
  }

  private fireAtPlayer(enemy: HumanoidEnemy, player: Player): void {
    enemy.fire();

    const firePosition = enemy.getFirePosition();
    const fireDirection = enemy.getFireDirection();

    const projectile = new EnemyProjectile(
      this.scene,
      firePosition,
      fireDirection,
      this.obstacles,
      player.position,
      this.theme
    );

    this.enemyProjectiles.push(projectile);

    if (this.onEnemyProjectileFired) {
      this.onEnemyProjectileFired(projectile);
    }
  }

  private updateProjectiles(deltaTime: number, player: Player): void {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.enemyProjectiles[i];

      // Update player position reference
      projectile.setPlayerPosition(player.position);

      const result = projectile.update(deltaTime);

      if (result.hit) {
        if (result.hitPlayer) {
          player.takeDamage(projectile.damage);
        }
        projectile.destroy();
        this.enemyProjectiles.splice(i, 1);
      } else if (!projectile.isActive) {
        projectile.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  public clearProjectiles(): void {
    this.enemyProjectiles.forEach((p) => p.destroy());
    this.enemyProjectiles = [];
  }

  public dispose(): void {
    this.clearProjectiles();
    this.enemies.clear();
    this.visibilityCache.clear();
    this.currentTime = 0;
  }
}
