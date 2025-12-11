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
import { SnowSystem } from '../particles/SnowSystem';
import { DustPuff } from '../particles/DustPuff';
import { GameState, EnemyConfig } from '../types/GameTypes';
import { LimbType, LimbState } from '../types/LimbTypes';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ThemeType, getThemeColors, getRandomChristmasEnemyType, CHRISTMAS_ENEMIES, ChristmasEnemyType } from '@/config/themeConfig';
import { ObjectPool } from '../utils/ObjectPool';
import { SpatialHash } from '../utils/SpatialHash';

export class Game {
  private sceneManager: SceneManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;

  private player: Player;
  private enemies: HumanoidEnemy[] = [];
  private scorchMarks: ScorchMark[] = [];
  private dustPuffs: DustPuff[] = [];

  // Object pools for frequently created/destroyed entities
  private projectilePool: ObjectPool<Projectile>;
  private explosionPool: ObjectPool<Explosion>;

  // Spatial hash for efficient collision queries
  private spatialHash: SpatialHash;

  // Floor mesh reference (always included in projectile collisions since it covers entire arena)
  private floorMesh: THREE.Object3D | null = null;

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

  // Snow system (Christmas mode only)
  private snowSystem: SnowSystem | null = null;

  // Theme
  private theme: ThemeType;

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

  constructor(container: HTMLElement, theme: ThemeType = 'DEFAULT') {
    this.theme = theme;
    const themeColors = getThemeColors(theme);

    this.sceneManager = new SceneManager(container, theme);
    this.gameLoop = new GameLoop();
    this.inputManager = new InputManager();

    // Create player with theme
    this.player = new Player(
      this.sceneManager.scene,
      this.sceneManager.camera,
      container,
      theme
    );

    // Create arena with theme
    this.arena = new Arena(this.sceneManager.scene, theme);

    // Setup lighting
    new Lighting(this.sceneManager.scene);

    // Create AI system with theme
    this.aiSystem = new EnemyAISystem(this.sceneManager.scene, theme);

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

    // Initialize object pools with theme
    this.projectilePool = new ObjectPool<Projectile>(
      () => new Projectile(this.sceneManager.scene, this.theme),
      (p) => p.deactivate(),
      20, // Pre-allocate 20 projectiles
      50  // Max 50 pooled
    );

    this.explosionPool = new ObjectPool<Explosion>(
      () => new Explosion(this.sceneManager.scene, this.theme),
      (e) => e.deactivate(),
      10, // Pre-allocate 10 explosions
      20  // Max 20 pooled
    );

    // Initialize snow system for Christmas mode
    if (theme === 'CHRISTMAS') {
      this.snowSystem = new SnowSystem(this.sceneManager.scene);
    }

    // Initialize spatial hash for collision optimization
    // Cell size of 5 units works well for a 40x40 arena
    this.spatialHash = new SpatialHash(5);
  }

  public init(): void {
    // Build arena
    this.arena.build();

    // Set collidables for weapon and AI
    const collidables = this.sceneManager.getCollidableObjects();
    this.player.setCollidables(collidables);
    this.aiSystem.setObstacles(collidables);

    // Find and store floor reference (floor covers entire arena, can't use spatial hash)
    this.floorMesh = collidables.find(obj => obj.userData.type === 'floor') || null;

    // Populate spatial hash with static arena collidables (except floor which is global)
    for (const obj of collidables) {
      if (obj.userData.type !== 'floor') {
        this.spatialHash.insert(obj, 2); // Use radius of 2 for static objects
      }
    }

    // Set up projectile pool acquisition callback
    this.player.weapon.acquireProjectile = (scene, position, direction, config, collidables) => {
      const projectile = this.projectilePool.acquire();
      projectile.reset(position, direction, config, collidables);
      return projectile;
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

    // Update snow system (Christmas mode)
    if (this.snowSystem) {
      this.snowSystem.update(deltaTime, this.player.position);
    }

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
    // Force matrix world update for all enemies before collision checks
    // This ensures raycasting uses current world positions, not stale matrices
    for (const enemy of this.enemies) {
      if (enemy.isActive) {
        enemy.mesh.updateMatrixWorld(true);
      }
    }

    // Get active projectiles from pool and collect ones to release
    const activeProjectiles = this.projectilePool.getActiveObjects();
    const toRelease: Projectile[] = [];

    for (const projectile of activeProjectiles) {
      // Use spatial hash to get nearby collidables (much faster than checking all)
      const nearbyStatic = this.spatialHash.getNearby(projectile.position, 5);
      const nearbyEnemies = this.enemies
        .filter((e) => e.isActive && e.position.distanceTo(projectile.position) < 10)
        .map((e) => e.mesh);
      // Always include floor (it covers entire arena, not in spatial hash)
      const collidables = this.floorMesh
        ? [...nearbyStatic, ...nearbyEnemies, this.floorMesh]
        : [...nearbyStatic, ...nearbyEnemies];
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

        // Mark for release to pool
        toRelease.push(projectile);
      }
    }

    // Release finished projectiles back to pool
    for (const projectile of toRelease) {
      this.projectilePool.release(projectile);
    }
  }

  private createExplosion(
    position: THREE.Vector3,
    config: { blastRadius: number; damage: number },
    normal?: THREE.Vector3,
    hitObject?: THREE.Object3D
  ): void {
    // Visual explosion with particle systems (from pool)
    const explosion = this.explosionPool.acquire();
    explosion.reset(position, config.blastRadius, 2, {
      sparks: this.sparkParticles,
      debris: this.debrisSystem,
      smoke: this.smokeSystem,
    });

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
    const activeExplosions = this.explosionPool.getActiveObjects();
    const toRelease: Explosion[] = [];

    for (const explosion of activeExplosions) {
      explosion.update(deltaTime);

      if (!explosion.isActive) {
        toRelease.push(explosion);
      }
    }

    // Release finished explosions back to pool
    for (const explosion of toRelease) {
      this.explosionPool.release(explosion);
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

  // Spawn distance constraints
  private readonly MIN_SPAWN_DISTANCE_FROM_PLAYER = 10;
  private readonly MIN_SPAWN_DISTANCE_FROM_ENEMIES = 3;
  private readonly MAX_SPAWN_ATTEMPTS = 20;

  private spawnEnemy(): void {
    // Determine enemy type and config based on theme
    let christmasEnemyType: ChristmasEnemyType | null = null;
    let config: EnemyConfig;

    if (this.theme === 'CHRISTMAS') {
      christmasEnemyType = getRandomChristmasEnemyType();
      const enemyConfig = CHRISTMAS_ENEMIES[christmasEnemyType];

      config = {
        health: GAME_CONFIG.ENEMY.HEALTH * enemyConfig.healthMultiplier,
        speed: GAME_CONFIG.ENEMY.SPEED * enemyConfig.speedMultiplier,
        damage: GAME_CONFIG.ENEMY.DAMAGE,
        attackRange: GAME_CONFIG.ENEMY.ATTACK_RANGE,
        detectionRange: GAME_CONFIG.ENEMY.DETECTION_RANGE,
        fireRate: GAME_CONFIG.ENEMY.FIRE_RATE,
      };
    } else {
      config = {
        health: GAME_CONFIG.ENEMY.HEALTH,
        speed: GAME_CONFIG.ENEMY.SPEED,
        damage: GAME_CONFIG.ENEMY.DAMAGE,
        attackRange: GAME_CONFIG.ENEMY.ATTACK_RANGE,
        detectionRange: GAME_CONFIG.ENEMY.DETECTION_RANGE,
        fireRate: GAME_CONFIG.ENEMY.FIRE_RATE,
      };
    }

    const arenaSize = GAME_CONFIG.ARENA.SIZE;
    let position: THREE.Vector3 | null = null;

    // Try to find a valid spawn position
    for (let attempt = 0; attempt < this.MAX_SPAWN_ATTEMPTS; attempt++) {
      const candidatePos = this.getRandomEdgePosition(arenaSize);

      if (this.isValidSpawnPosition(candidatePos)) {
        position = candidatePos;
        break;
      }
    }

    // If no valid position found after max attempts, skip spawning this enemy
    if (!position) {
      return;
    }

    const enemy = new HumanoidEnemy(this.sceneManager.scene, position, config, this.theme, christmasEnemyType);

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

  private getRandomEdgePosition(arenaSize: number): THREE.Vector3 {
    const side = Math.floor(Math.random() * 4);
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

    return new THREE.Vector3(x, 0, z);
  }

  private isValidSpawnPosition(position: THREE.Vector3): boolean {
    // Check distance from player (only X and Z, ignore Y)
    const playerDistance = Math.sqrt(
      Math.pow(position.x - this.player.position.x, 2) +
      Math.pow(position.z - this.player.position.z, 2)
    );

    if (playerDistance < this.MIN_SPAWN_DISTANCE_FROM_PLAYER) {
      return false;
    }

    // Check distance from all existing enemies
    for (const enemy of this.enemies) {
      if (!enemy.isActive) continue;

      const enemyDistance = Math.sqrt(
        Math.pow(position.x - enemy.position.x, 2) +
        Math.pow(position.z - enemy.position.z, 2)
      );

      if (enemyDistance < this.MIN_SPAWN_DISTANCE_FROM_ENEMIES) {
        return false;
      }
    }

    // Check if position overlaps with any obstacle
    const collidables = this.sceneManager.getCollidableObjects();
    const enemyRadius = 0.5;
    for (const obj of collidables) {
      if (obj.userData?.type !== 'obstacle') continue;

      const box = new THREE.Box3().setFromObject(obj);
      // Expand box by enemy radius to prevent spawning too close
      box.expandByScalar(enemyRadius);

      if (
        position.x >= box.min.x &&
        position.x <= box.max.x &&
        position.z >= box.min.z &&
        position.z <= box.max.z
      ) {
        return false;
      }
    }

    return true;
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

    // Release all pooled objects back to pools
    this.projectilePool.releaseAll();
    this.explosionPool.releaseAll();

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

    // Clean up pooled entities
    this.projectilePool.releaseAll();
    this.explosionPool.releaseAll();

    // Clean up non-pooled entities
    this.enemies.forEach((e) => e.destroy());
    this.scorchMarks.forEach((s) => s.dispose());
    this.dustPuffs.forEach((d) => d.dispose());

    // Clean up particle systems
    this.sparkParticles.dispose();
    this.debrisSystem.dispose();
    this.smokeSystem.dispose();

    // Clean up snow system
    if (this.snowSystem) {
      this.snowSystem.dispose();
    }

    // Clean up ragdoll and blood systems
    this.gibSystem.destroy();
    this.bloodSystem.destroy();

    this.aiSystem.dispose();
    this.sceneManager.dispose();
    this.inputManager.dispose();
  }
}
