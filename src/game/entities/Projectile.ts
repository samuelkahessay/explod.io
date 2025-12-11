import * as THREE from 'three';
import { Entity } from './Entity';
import { ProjectileConfig, CollisionResult } from '../types/GameTypes';

export class Projectile extends Entity {
  public velocity: THREE.Vector3;
  public config: ProjectileConfig;
  public lifetime: number;

  private raycaster: THREE.Raycaster;
  private collidables: THREE.Object3D[] = [];
  private light: THREE.PointLight;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    config: ProjectileConfig,
    collidables: THREE.Object3D[]
  ) {
    super(scene, position);
    this.config = config;
    this.velocity = direction.clone().normalize().multiplyScalar(config.speed);
    this.lifetime = config.lifetime;
    this.collidables = collidables;

    this.raycaster = new THREE.Raycaster();
    this.light = new THREE.PointLight(0xff4400, 1, 3);
    this.mesh = this.createMesh();
    this.addToScene();
  }

  protected createMesh(): THREE.Object3D {
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
      group.lookAt(this.position.clone().add(this.velocity));
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
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    this.position.add(movement);
    this.mesh.position.copy(this.position);

    return { hit: false };
  }

  private checkCollision(deltaTime: number): CollisionResult {
    const direction = this.velocity.clone().normalize();
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
        point: hit.point.clone(),
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
