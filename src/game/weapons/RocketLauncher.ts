import * as THREE from 'three';
import { Projectile } from '../entities/Projectile';
import { ProjectileConfig } from '../types/GameTypes';
import { GAME_CONFIG } from '@/config/gameConfig';

export class RocketLauncher {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private cooldown: number = 0;
  private collidables: THREE.Object3D[] = [];

  public onProjectileFired: ((projectile: Projectile) => void) | null = null;

  // Optional callback to get muzzle position from weapon view model
  public getMuzzlePosition: (() => THREE.Vector3) | null = null;

  // Optional callback to acquire projectile from pool (performance optimization)
  public acquireProjectile: ((
    scene: THREE.Scene,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    config: ProjectileConfig,
    collidables: THREE.Object3D[]
  ) => Projectile) | null = null;

  private readonly config = {
    fireRate: GAME_CONFIG.ROCKET_LAUNCHER.FIRE_RATE,
    projectileConfig: {
      speed: GAME_CONFIG.ROCKET_LAUNCHER.PROJECTILE_SPEED,
      damage: GAME_CONFIG.ROCKET_LAUNCHER.PROJECTILE_DAMAGE,
      blastRadius: GAME_CONFIG.ROCKET_LAUNCHER.BLAST_RADIUS,
      lifetime: GAME_CONFIG.ROCKET_LAUNCHER.PROJECTILE_LIFETIME,
    } as ProjectileConfig,
  };

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  public setCollidables(objects: THREE.Object3D[]): void {
    this.collidables = objects;
  }

  public update(deltaTime: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= deltaTime;
    }
  }

  public fire(): Projectile | null {
    if (this.cooldown > 0) {
      return null;
    }

    // Get fire direction from camera
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Get muzzle position from weapon view model, or fallback to camera position
    let position: THREE.Vector3;
    if (this.getMuzzlePosition) {
      position = this.getMuzzlePosition();
    } else {
      // Fallback: fire position slightly in front of camera
      position = this.camera.position.clone().add(direction.clone().multiplyScalar(1));
    }

    // Create projectile (use pool if available, otherwise create new)
    let projectile: Projectile;
    if (this.acquireProjectile) {
      projectile = this.acquireProjectile(
        this.scene,
        position,
        direction,
        this.config.projectileConfig,
        this.collidables
      );
    } else {
      // Fallback: create without pooling (theme defaults to DEFAULT)
      projectile = new Projectile(
        this.scene,
        'DEFAULT',
        position,
        direction,
        this.config.projectileConfig,
        this.collidables
      );
    }

    this.cooldown = 1 / this.config.fireRate;

    if (this.onProjectileFired) {
      this.onProjectileFired(projectile);
    }

    return projectile;
  }

  public getProjectileConfig(): ProjectileConfig {
    return this.config.projectileConfig;
  }

  public canFire(): boolean {
    return this.cooldown <= 0;
  }

  public getCooldownPercent(): number {
    if (this.cooldown <= 0) return 0;
    return this.cooldown / (1 / this.config.fireRate);
  }
}
