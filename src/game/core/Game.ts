import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { HumanoidEnemy } from '../entities/HumanoidEnemy';
import { Projectile } from '../entities/Projectile';
import { Explosion } from '../entities/Explosion';
import { ScorchMark } from '../entities/ScorchMark';
import { Arena } from '../world/Arena';
import { Lighting } from '../world/Lighting';
import { EnemyAISystem } from '../systems/EnemyAISystem';
import { DamageSystem } from '../systems/DamageSystem';
import { ScreenShakeSystem } from '../systems/ScreenShakeSystem';
import { GibSystem } from '../systems/GibSystem';
import { BloodSystem } from '../systems/BloodSystem';
import { ParticleSystem } from '../particles/ParticleSystem';
import { DebrisSystem } from '../particles/DebrisSystem';
import { SmokeSystem } from '../particles/SmokeSystem';
import { DustPuff } from '../particles/DustPuff';
import { GameState, EnemyConfig } from '../types/GameTypes';
import { LimbType, LimbState } from '../types/LimbTypes';
import { GAME_CONFIG } from '@/config/gameConfig';

export class Game {
  private sceneManager: SceneManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;

  private player: Player;
  private enemies: HumanoidEnemy[] = [];
  private projectiles: Projectile[] = [];
  private explosions: Explosion[] = [];
  private scorchMarks: ScorchMark[] = [];
  private dustPuffs: DustPuff[] = [];

  private arena: Arena;
  private aiSystem: EnemyAISystem;

  // Particle and effect systems
  private screenShake: ScreenShakeSystem;
  private sparkParticles: ParticleSystem;
  private debrisSystem: DebrisSystem;
  private smokeSystem: SmokeSystem;

  // Ragdoll and blood systems
  private gibSystem: GibSystem;
  private bloodSystem: BloodSystem;

  private state: GameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    playerHealth: GAME_CONFIG.PLAYER.HEALTH,
    enemiesKilled: 0,
    timeElapsed: 0,
  };

  // Spawn timer
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = GAME_CONFIG.ENEMY.SPAWN_INTERVAL;

  // Bullet time settings
  private readonly BULLET_TIME_SCALE = 0.05; // 5% speed when idle
  private readonly NORMAL_TIME_SCALE = 1.0;
  private readonly TIME_SCALE_LERP_SPEED = 8.0; // Smooth transition speed
  private currentTimeScale: number = 1.0;

  // Callbacks
  public onStateUpdate: ((state: GameState) => void) | null = null;

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.gameLoop = new GameLoop();
    this.inputManager = new InputManager();

    // Create player
    this.player = new Player(
      this.sceneManager.scene,
      this.sceneManager.camera,
      container
    );

    // Create arena
    this.arena = new Arena(this.sceneManager.scene);

    // Setup lighting
    new Lighting(this.sceneManager.scene);

    // Create AI system
    this.aiSystem = new EnemyAISystem(this.sceneManager.scene);

    // Create particle/effect systems
    this.screenShake = new ScreenShakeSystem(this.sceneManager.camera);
    this.sparkParticles = new ParticleSystem(this.sceneManager.scene, 500, {
      size: 0.15,
      blending: THREE.AdditiveBlending,
    });
    this.debrisSystem = new DebrisSystem(this.sceneManager.scene, 100);
    this.smokeSystem = new SmokeSystem(this.sceneManager.scene, 200);

    // Create ragdoll and blood systems
    this.bloodSystem = new BloodSystem(this.sceneManager.scene);
    this.gibSystem = new GibSystem(this.sceneManager.scene, this.bloodSystem);
  }

  public init(): void {
    // Build arena
    this.arena.build();

    // Set collidables for weapon and AI
    const collidables = this.sceneManager.getCollidableObjects();
    this.player.setCollidables(collidables);
    this.aiSystem.setObstacles(collidables);

    // Handle projectile fired
    this.player.weapon.onProjectileFired = (projectile) => {
      this.projectiles.push(projectile);
    };

    // Setup game loop
    this.gameLoop.addUpdateCallback(this.update.bind(this));
    this.gameLoop.setRenderCallback(() => {
      this.sceneManager.render();
    });

    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
      this.spawnEnemy();
    }
  }

  public start(): void {
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.gameLoop.start();
    this.updateState();
  }

  public stop(): void {
    this.state.isRunning = false;
    this.gameLoop.stop();
    this.updateState();
  }

  public togglePause(): void {
    this.state.isPaused = !this.state.isPaused;
    this.updateState();
  }

  private update(deltaTime: number): void {
    // Update bullet time based on player activity
    const isActive = this.inputManager.isPlayerActive();
    const targetTimeScale = isActive
      ? this.NORMAL_TIME_SCALE
      : this.BULLET_TIME_SCALE;

    // Smooth interpolation between time scales
    // Use unscaled deltaTime for smooth transition regardless of current time scale
    const rawDelta = deltaTime / Math.max(this.currentTimeScale, 0.01);
    this.currentTimeScale = THREE.MathUtils.lerp(
      this.currentTimeScale,
      targetTimeScale,
      Math.min(1, this.TIME_SCALE_LERP_SPEED * rawDelta)
    );

    // Apply time scale to game loop
    this.gameLoop.timeScale = this.currentTimeScale;

    if (this.state.isPaused || !this.player.isLocked()) return;

    this.state.timeElapsed += deltaTime;

    // Process input
    const input = this.inputManager.getInputState();
    this.player.processInput(input);

    // Update player
    this.player.update(deltaTime);
    this.state.playerHealth = this.player.health;

    // Update projectiles
    this.updateProjectiles(deltaTime);

    // Update explosions
    this.updateExplosions(deltaTime);

    // Update particle systems
    this.sparkParticles.update(deltaTime);
    this.debrisSystem.update(deltaTime);
    this.smokeSystem.update(deltaTime);

    // Update ragdoll and blood systems
    this.gibSystem.update(deltaTime);
    this.bloodSystem.update(deltaTime);

    // Update scorch marks
    this.updateScorchMarks(deltaTime);

    // Update dust puffs
    this.updateDustPuffs(deltaTime);

    // Update screen shake
    this.screenShake.update(deltaTime);

    // Update AI
    this.aiSystem.update(deltaTime, this.player);

    // Clean up dead enemies
    this.cleanupDeadEnemies();

    // Spawn enemies
    this.spawnTimer += deltaTime;
    if (
      this.spawnTimer >= this.SPAWN_INTERVAL &&
      this.enemies.length < GAME_CONFIG.ENEMY.MAX_ENEMIES
    ) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Check game over
    if (this.player.isDead()) {
      this.gameOver();
    }

    // Update state
    this.updateState();
  }

  private updateProjectiles(deltaTime: number): void {
    // Get all collidable objects including enemies
    const collidables = [
      ...this.sceneManager.getCollidableObjects(),
      ...this.enemies.filter((e) => e.isActive).map((e) => e.mesh),
    ];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.setCollidables(collidables);

      const result = projectile.update(deltaTime);

      if (result.hit || !projectile.isActive) {
        // Create explosion at hit point or current position
        const explosionPos = result.point || projectile.position.clone();

        // Check if we hit an enemy (don't create scorch marks on enemies)
        const hitEnemy = result.object && this.isEnemyMesh(result.object);
        this.createExplosion(
          explosionPos,
          projectile.config,
          hitEnemy ? undefined : result.normal,
          hitEnemy ? undefined : result.object
        );

        // Remove projectile
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private createExplosion(
    position: THREE.Vector3,
    config: { blastRadius: number; damage: number },
    normal?: THREE.Vector3,
    hitObject?: THREE.Object3D
  ): void {
    // Visual explosion with particle systems
    const explosion = new Explosion(
      this.sceneManager.scene,
      position,
      config.blastRadius,
      2, // duration
      {
        sparks: this.sparkParticles,
        debris: this.debrisSystem,
        smoke: this.smokeSystem,
      }
    );
    this.explosions.push(explosion);

    // Create scorch mark on the hit surface
    if (normal && hitObject) {
      // Calculate safe radius that doesn't extend past the surface edge
      const safeRadius = this.calculateSafeScorchRadius(
        position,
        normal,
        config.blastRadius,
        hitObject
      );

      const scorchMark = new ScorchMark(
        this.sceneManager.scene,
        position.clone(),
        safeRadius,
        30, // lifetime
        normal
      );
      this.scorchMarks.push(scorchMark);

      // Create dust puff for floor/ground hits
      if (normal.y > 0.5) {
        const dustPuff = new DustPuff(
          this.sceneManager.scene,
          position.clone(),
          config.blastRadius * 0.8
        );
        this.dustPuffs.push(dustPuff);
      }
    } else if (position.y < 2) {
      // Fallback for explosions without normal (e.g., timeout)
      const scorchPos = position.clone();
      scorchPos.y = 0;
      const scorchMark = new ScorchMark(
        this.sceneManager.scene,
        scorchPos,
        config.blastRadius,
        30 // lifetime
      );
      this.scorchMarks.push(scorchMark);

      // Create dust puff
      const dustPuff = new DustPuff(
        this.sceneManager.scene,
        scorchPos,
        config.blastRadius * 0.8
      );
      this.dustPuffs.push(dustPuff);
    }

    // Trigger screen shake based on distance to player
    this.screenShake.shakeFromExplosion(
      position,
      this.player.position,
      config.blastRadius
    );

    // Trigger bloom spike
    this.sceneManager.triggerExplosionBloom();

    // Apply damage with limb-specific targeting
    const damageResult = DamageSystem.calculateBlastDamageWithLimbs(
      position,
      config.blastRadius,
      config.damage,
      this.enemies.filter((e) => e.isActive),
      this.player,
      this.sceneManager.getCollidableObjects()
    );

    // Handle enemy deaths and limb damage
    damageResult.enemiesHit.forEach(({ enemy }) => {
      if (enemy.isDead()) {
        this.state.score += GAME_CONFIG.SCORING.ENEMY_KILL;
        this.state.enemiesKilled++;
      }
    });

    // Check for severed limbs and emit additional blood
    damageResult.limbDamage.forEach(({ limbResults }) => {
      limbResults.forEach((result) => {
        if (result.severed) {
          // Extra score for dismemberment
          this.state.score += 25;
        }
      });
    });
  }

  private updateExplosions(deltaTime: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i];
      explosion.update(deltaTime);

      if (!explosion.isActive) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private updateScorchMarks(deltaTime: number): void {
    for (let i = this.scorchMarks.length - 1; i >= 0; i--) {
      const scorchMark = this.scorchMarks[i];
      const stillActive = scorchMark.update(deltaTime);

      if (!stillActive) {
        this.scorchMarks.splice(i, 1);
      }
    }
  }

  private updateDustPuffs(deltaTime: number): void {
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const dustPuff = this.dustPuffs[i];
      dustPuff.update(deltaTime);

      if (!dustPuff.isActive) {
        this.dustPuffs.splice(i, 1);
      }
    }
  }

  /**
   * Calculate the maximum safe radius for a scorch mark by raycasting along the surface
   * to find the nearest edge
   */
  private calculateSafeScorchRadius(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    maxRadius: number,
    hitObject: THREE.Object3D
  ): number {
    const raycaster = new THREE.Raycaster();
    let minDistance = maxRadius;

    // Create two perpendicular vectors on the surface plane
    const tangent1 = new THREE.Vector3();
    const tangent2 = new THREE.Vector3();

    // Find a vector not parallel to the normal
    const up = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    tangent1.crossVectors(normal, up).normalize();
    tangent2.crossVectors(normal, tangent1).normalize();

    // Raycast in 8 directions along the surface to find edges
    const directions = [
      tangent1,
      tangent2,
      tangent1.clone().negate(),
      tangent2.clone().negate(),
      tangent1.clone().add(tangent2).normalize(),
      tangent1.clone().sub(tangent2).normalize(),
      tangent1.clone().negate().add(tangent2).normalize(),
      tangent1.clone().negate().sub(tangent2).normalize(),
    ];

    // Offset start position slightly off the surface
    const startPos = position.clone().add(normal.clone().multiplyScalar(0.1));

    for (const dir of directions) {
      raycaster.set(startPos, dir);
      raycaster.far = maxRadius;

      // Cast back toward the surface at increasing distances
      // If we don't hit the same object, we've found an edge
      for (let dist = 0.2; dist <= maxRadius; dist += 0.2) {
        const testPoint = startPos.clone().add(dir.clone().multiplyScalar(dist));
        const backRay = new THREE.Raycaster(
          testPoint,
          normal.clone().negate(),
          0,
          0.3
        );

        const hits = backRay.intersectObject(hitObject, true);
        if (hits.length === 0) {
          // No surface here - we've found an edge
          minDistance = Math.min(minDistance, dist - 0.1);
          break;
        }
      }
    }

    // Ensure minimum size and some margin
    return Math.max(0.3, minDistance * 0.85);
  }

  private isEnemyMesh(object: THREE.Object3D): boolean {
    // Check if the object or any of its parents is an enemy mesh
    let current: THREE.Object3D | null = object;
    while (current) {
      for (const enemy of this.enemies) {
        if (enemy.mesh === current) {
          return true;
        }
      }
      current = current.parent;
    }
    return false;
  }

  private cleanupDeadEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDead()) {
        // Check if death was from explosion - trigger full gib explosion
        if (enemy.wasKilledByExplosion) {
          // Convert limbs map to the format GibSystem expects
          const limbsForGib = new Map<LimbType, { mesh: THREE.Mesh; state: string }>();
          enemy.limbs.forEach((limb, limbType) => {
            limbsForGib.set(limbType, {
              mesh: limb.mesh,
              state: limb.state === LimbState.ATTACHED ? 'attached' : 'severed',
            });
          });

          this.gibSystem.emitDeathGibs(
            limbsForGib,
            enemy.position,
            enemy.lastExplosionCenter
          );

          // Extra blood spray at death location
          this.bloodSystem.emitSpray(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)), 50);
        }

        this.aiSystem.removeEnemy(enemy.id);
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  private spawnEnemy(): void {
    const config: EnemyConfig = {
      health: GAME_CONFIG.ENEMY.HEALTH,
      speed: GAME_CONFIG.ENEMY.SPEED,
      damage: GAME_CONFIG.ENEMY.DAMAGE,
      attackRange: GAME_CONFIG.ENEMY.ATTACK_RANGE,
      detectionRange: GAME_CONFIG.ENEMY.DETECTION_RANGE,
      fireRate: GAME_CONFIG.ENEMY.FIRE_RATE,
    };

    // Random position on arena edges
    const side = Math.floor(Math.random() * 4);
    const arenaSize = GAME_CONFIG.ARENA.SIZE;
    let x = 0,
      z = 0;

    switch (side) {
      case 0:
        x = -arenaSize / 2 + 3;
        z = Math.random() * (arenaSize - 6) - (arenaSize / 2 - 3);
        break;
      case 1:
        x = arenaSize / 2 - 3;
        z = Math.random() * (arenaSize - 6) - (arenaSize / 2 - 3);
        break;
      case 2:
        z = -arenaSize / 2 + 3;
        x = Math.random() * (arenaSize - 6) - (arenaSize / 2 - 3);
        break;
      case 3:
        z = arenaSize / 2 - 3;
        x = Math.random() * (arenaSize - 6) - (arenaSize / 2 - 3);
        break;
    }

    const position = new THREE.Vector3(x, 0, z);
    const enemy = new HumanoidEnemy(this.sceneManager.scene, position, config);

    // Set up callbacks for limb events
    enemy.onLimbSevered = (limbType, worldPos, explosionCenter, mesh) => {
      this.gibSystem.emitLimbGib(mesh, worldPos, explosionCenter, limbType);
    };

    enemy.onBloodSpray = (position, count) => {
      this.bloodSystem.emitSpray(position, count);
    };

    this.enemies.push(enemy);
    this.aiSystem.addEnemy(enemy);
  }

  private gameOver(): void {
    this.stop();
    this.player.unlock();
  }

  private updateState(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state });
    }
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public restart(): void {
    // Clear enemies
    this.enemies.forEach((e) => e.destroy());
    this.enemies = [];

    // Clear projectiles
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];

    // Clear explosions
    this.explosions.forEach((e) => e.destroy());
    this.explosions = [];

    // Clear scorch marks
    this.scorchMarks.forEach((s) => s.dispose());
    this.scorchMarks = [];

    // Clear dust puffs
    this.dustPuffs.forEach((d) => d.dispose());
    this.dustPuffs = [];

    // Clear particle systems
    this.sparkParticles.clear();
    this.debrisSystem.clear();
    this.smokeSystem.clear();

    // Clear AI
    this.aiSystem.dispose();
    this.aiSystem = new EnemyAISystem(this.sceneManager.scene);
    this.aiSystem.setObstacles(this.sceneManager.getCollidableObjects());

    // Recreate gib and blood systems
    this.bloodSystem.destroy();
    this.gibSystem.destroy();
    this.bloodSystem = new BloodSystem(this.sceneManager.scene);
    this.gibSystem = new GibSystem(this.sceneManager.scene, this.bloodSystem);

    // Reset player
    this.player.reset();

    // Reset state
    this.state = {
      isRunning: false,
      isPaused: false,
      score: 0,
      playerHealth: GAME_CONFIG.PLAYER.HEALTH,
      enemiesKilled: 0,
      timeElapsed: 0,
    };

    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
      this.spawnEnemy();
    }

    this.updateState();
  }

  public dispose(): void {
    this.stop();

    // Clean up all entities
    this.projectiles.forEach((p) => p.destroy());
    this.explosions.forEach((e) => e.destroy());
    this.enemies.forEach((e) => e.destroy());
    this.scorchMarks.forEach((s) => s.dispose());
    this.dustPuffs.forEach((d) => d.dispose());

    // Clean up particle systems
    this.sparkParticles.dispose();
    this.debrisSystem.dispose();
    this.smokeSystem.dispose();

    // Clean up ragdoll and blood systems
    this.gibSystem.destroy();
    this.bloodSystem.destroy();

    this.aiSystem.dispose();
    this.sceneManager.dispose();
    this.inputManager.dispose();
  }
}
