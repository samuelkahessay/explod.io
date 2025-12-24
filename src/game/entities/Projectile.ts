import * as THREE from 'three';
import { Entity } from './Entity';
import { ProjectileConfig, CollisionResult } from '../types/GameTypes';
import { ThemeType, getThemeColors } from '@/config/themeConfig';

// Default config for pool initialization
const DEFAULT_CONFIG: ProjectileConfig = {
  speed: 50,
  damage: 100,
  blastRadius: 5,
  lifetime: 5,
};

export class Projectile extends Entity {
  public velocity: THREE.Vector3;
  public config: ProjectileConfig;
  public lifetime: number;

  private raycaster: THREE.Raycaster;
  private collidables: THREE.Object3D[] = [];
  private light: THREE.PointLight;
  private initialized: boolean = false;
  private theme: ThemeType;

  // Scratch vectors to reduce per-frame allocations (not re-entrant)
  private readonly scratchDirection = new THREE.Vector3();
  private readonly scratchMovement = new THREE.Vector3();
  private readonly scratchLookAt = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    theme: ThemeType = 'DEFAULT',
    position?: THREE.Vector3,
    direction?: THREE.Vector3,
    config?: ProjectileConfig,
    collidables?: THREE.Object3D[]
  ) {
    super(scene, position || new THREE.Vector3());
    this.theme = theme;
    this.config = config || DEFAULT_CONFIG;
    this.velocity = new THREE.Vector3();
    if (direction && config) {
      this.velocity.copy(direction).normalize().multiplyScalar(config.speed);
    }
    this.lifetime = this.config.lifetime;
    this.collidables = collidables || [];

    this.raycaster = new THREE.Raycaster();

    const themeColors = getThemeColors(theme);
    this.light = new THREE.PointLight(themeColors.projectile.light, 1, 3);
    this.mesh = this.createMesh();

    // Only add to scene if fully initialized (not pooled creation)
    if (position && direction && config) {
      this.addToScene();
      this.initialized = true;
    }
  }

  /**
   * Reset projectile for reuse from pool
   */
  public reset(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    config: ProjectileConfig,
    collidables: THREE.Object3D[]
  ): void {
    this.position.copy(position);
    this.config = config;
    this.velocity.copy(direction).normalize().multiplyScalar(config.speed);
    this.lifetime = config.lifetime;
    this.collidables = collidables;
    this.isActive = true;

    // Update mesh position and orientation
    this.mesh.position.copy(position);
    if (this.velocity.lengthSq() > 0) {
      this.scratchLookAt.copy(position).add(this.velocity);
      this.mesh.lookAt(this.scratchLookAt);
    }
    this.mesh.visible = true;

    // Add to scene if not already added
    if (!this.initialized) {
      this.addToScene();
      this.initialized = true;
    }
  }

  /**
   * Deactivate projectile for return to pool
   */
  public deactivate(): void {
    this.isActive = false;
    this.mesh.visible = false;
    this.collidables = [];
  }

  protected createMesh(): THREE.Object3D {
    return this.theme === 'CHRISTMAS'
      ? this.createOrnamentMesh()
      : this.createRocketMesh();
  }

  private createRocketMesh(): THREE.Object3D {
    const group = new THREE.Group();

    // RPG warhead (olive green main body)
    const warheadGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 12);
    const warheadMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5a3a, // Olive drab
      metalness: 0.4,
      roughness: 0.6,
    });
    const warhead = new THREE.Mesh(warheadGeometry, warheadMaterial);
    warhead.rotation.x = Math.PI / 2;

    // Copper tip (shaped charge)
    const tipGeometry = new THREE.ConeGeometry(0.15, 0.25, 12);
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0xb87333, // Copper color
      metalness: 0.9,
      roughness: 0.3,
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.42;

    // Tail fins (4 fins)
    const finGeometry = new THREE.BoxGeometry(0.02, 0.2, 0.15);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      metalness: 0.6,
      roughness: 0.4,
    });

    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      fin.position.z = -0.35;
      fin.rotation.z = (i * Math.PI) / 2;
      fin.position.x = Math.cos((i * Math.PI) / 2) * 0.12;
      fin.position.y = Math.sin((i * Math.PI) / 2) * 0.12;
      group.add(fin);
    }

    // Rocket exhaust (glowing back)
    const exhaustGeometry = new THREE.CylinderGeometry(0.08, 0.05, 0.15, 8);
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
    });
    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.z = -0.38;

    // Flame trail
    const flameGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8,
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.rotation.x = -Math.PI / 2;
    flame.position.z = -0.6;

    // Inner flame (brighter)
    const innerFlameGeometry = new THREE.ConeGeometry(0.06, 0.25, 8);
    const innerFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);
    innerFlame.rotation.x = -Math.PI / 2;
    innerFlame.position.z = -0.5;

    // Trail light (brighter and larger)
    this.light.intensity = 2;
    this.light.distance = 5;
    this.light.position.z = -0.5;

    group.add(warhead, tip, exhaust, flame, innerFlame, this.light);
    group.position.copy(this.position);

    // Orient toward velocity
    if (this.velocity.lengthSq() > 0) {
      this.scratchLookAt.copy(this.position).add(this.velocity);
      group.lookAt(this.scratchLookAt);
    }

    return group;
  }

  private createOrnamentMesh(): THREE.Object3D {
    const group = new THREE.Group();

    // Choose random ornament color
    const ornamentColors = [0xcc0000, 0x00cc00, 0xffd700, 0xc0c0c0]; // Red, green, gold, silver
    const ornamentColor = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];

    // Main ornament sphere (shiny)
    const ornamentGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const ornamentMaterial = new THREE.MeshStandardMaterial({
      color: ornamentColor,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.5,
    });
    const ornament = new THREE.Mesh(ornamentGeometry, ornamentMaterial);
    group.add(ornament);

    // Gold cap/top where the hook would be
    const capGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 12);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold
      metalness: 0.9,
      roughness: 0.2,
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.22;
    group.add(cap);

    // Small fuse/wick on top (the explosive part)
    const fuseGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.1, 8);
    const fuseMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
    });
    const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
    fuse.position.y = 0.3;
    group.add(fuse);

    // Spark on the fuse
    const sparkGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.position.y = 0.36;
    group.add(spark);

    // Decorative band around the middle
    const bandGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 24);
    const bandMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.3,
    });
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.rotation.x = Math.PI / 2;
    group.add(band);

    // Sparkle trail particles
    const trailGeometry = new THREE.SphereGeometry(0.04, 6, 6);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff99,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 5; i++) {
      const trail = new THREE.Mesh(trailGeometry, trailMaterial.clone());
      trail.position.z = 0.3 + i * 0.15;
      trail.scale.setScalar(1 - i * 0.15);
      (trail.material as THREE.MeshBasicMaterial).opacity = 0.8 - i * 0.15;
      group.add(trail);
    }

    // Trail light (golden sparkle)
    this.light.color.setHex(0xffd700);
    this.light.intensity = 2;
    this.light.distance = 5;
    this.light.position.z = 0.3;

    group.add(this.light);
    group.position.copy(this.position);

    // Orient toward velocity
    if (this.velocity.lengthSq() > 0) {
      this.scratchLookAt.copy(this.position).add(this.velocity);
      group.lookAt(this.scratchLookAt);
    }

    return group;
  }

  public update(deltaTime: number): CollisionResult {
    if (!this.isActive) return { hit: false };

    // Update lifetime
    this.lifetime -= deltaTime;
    if (this.lifetime <= 0) {
      this.isActive = false;
      return { hit: true, point: this.position.clone() }; // Explode at current position
    }

    // Check for collision with raycast
    const collisionResult = this.checkCollision(deltaTime);

    if (collisionResult.hit) {
      this.isActive = false;
      return collisionResult;
    }

    // Move projectile
    this.scratchMovement.copy(this.velocity).multiplyScalar(deltaTime);
    this.position.add(this.scratchMovement);
    this.mesh.position.copy(this.position);

    return { hit: false };
  }

  private checkCollision(deltaTime: number): CollisionResult {
    const direction = this.scratchDirection.copy(this.velocity).normalize();
    const distance = this.velocity.length() * deltaTime + 0.5; // Small buffer

    this.raycaster.set(this.position, direction);
    this.raycaster.far = distance;

    const intersects = this.raycaster.intersectObjects(this.collidables, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      // Transform face normal from local to world space
      let worldNormal: THREE.Vector3 | undefined;
      if (hit.face?.normal) {
        worldNormal = hit.face.normal.clone();
        worldNormal.transformDirection(hit.object.matrixWorld);
      }
      return {
        hit: true,
        point: hit.point,
        normal: worldNormal,
        object: hit.object,
        distance: hit.distance,
      };
    }

    return { hit: false };
  }

  public setCollidables(collidables: THREE.Object3D[]): void {
    this.collidables = collidables;
  }

  public destroy(): void {
    this.light.dispose();
    super.destroy();
  }
}
