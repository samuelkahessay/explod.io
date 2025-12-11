import * as THREE from 'three';
import { Entity } from './Entity';
import { CollisionResult } from '../types/GameTypes';
import { GAME_CONFIG } from '@/config/gameConfig';

export class EnemyProjectile extends Entity {
  public velocity: THREE.Vector3;
  public damage: number;
  public lifetime: number;

  private raycaster: THREE.Raycaster;
  private collidables: THREE.Object3D[] = [];
  private playerPosition: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    collidables: THREE.Object3D[],
    playerPosition: THREE.Vector3
  ) {
    super(scene, position);
    this.velocity = direction.clone().normalize().multiplyScalar(GAME_CONFIG.ENEMY.PROJECTILE_SPEED);
    this.damage = GAME_CONFIG.ENEMY.DAMAGE;
    this.lifetime = 3; // 3 second lifetime
    this.collidables = collidables;
    this.playerPosition = playerPosition;

    this.raycaster = new THREE.Raycaster();
    this.mesh = this.createMesh();
    this.addToScene();
  }

  protected createMesh(): THREE.Object3D {
    const group = new THREE.Group();

    // Simple glowing bullet
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Trail
    const trailGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.3, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6,
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -0.2;

    // Light
    const light = new THREE.PointLight(0xff0000, 0.5, 2);

    group.add(bullet, trail, light);
    group.position.copy(this.position);

    // Orient toward velocity
    if (this.velocity.lengthSq() > 0) {
      group.lookAt(this.position.clone().add(this.velocity));
    }

    return group;
  }

  public update(deltaTime: number): { hit: boolean; hitPlayer: boolean } {
    if (!this.isActive) return { hit: false, hitPlayer: false };

    // Update lifetime
    this.lifetime -= deltaTime;
    if (this.lifetime <= 0) {
      this.isActive = false;
      return { hit: false, hitPlayer: false };
    }

    // Check for collision with walls/obstacles
    const wallCollision = this.checkWallCollision(deltaTime);
    if (wallCollision.hit) {
      this.isActive = false;
      return { hit: true, hitPlayer: false };
    }

    // Check for collision with player
    const playerHit = this.checkPlayerCollision(deltaTime);
    if (playerHit) {
      this.isActive = false;
      return { hit: true, hitPlayer: true };
    }

    // Move projectile
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    this.position.add(movement);
    this.mesh.position.copy(this.position);

    return { hit: false, hitPlayer: false };
  }

  private checkWallCollision(deltaTime: number): CollisionResult {
    const direction = this.velocity.clone().normalize();
    const distance = this.velocity.length() * deltaTime + 0.2;

    this.raycaster.set(this.position, direction);
    this.raycaster.far = distance;

    const intersects = this.raycaster.intersectObjects(this.collidables, true);

    // Filter for walls/obstacles only
    const wallHits = intersects.filter(
      (hit) =>
        hit.object.userData.type === 'wall' ||
        hit.object.userData.type === 'obstacle'
    );

    if (wallHits.length > 0) {
      return {
        hit: true,
        point: wallHits[0].point.clone(),
        distance: wallHits[0].distance,
      };
    }

    return { hit: false };
  }

  private checkPlayerCollision(deltaTime: number): boolean {
    // Simple sphere collision with player
    const playerRadius = GAME_CONFIG.PLAYER.RADIUS;
    const projectileRadius = 0.1;
    const distance = this.position.distanceTo(this.playerPosition);

    return distance < playerRadius + projectileRadius;
  }

  public setPlayerPosition(position: THREE.Vector3): void {
    this.playerPosition = position;
  }
}
