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

    // Fire position slightly in front of camera
    const position = this.camera.position.clone().add(direction.clone().multiplyScalar(1));

    // Create projectile
    const projectile = new Projectile(
      this.scene,
      position,
      direction,
      this.config.projectileConfig,
      this.collidables
    );

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
