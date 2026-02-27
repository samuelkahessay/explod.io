import * as THREE from 'three';
import { Entity } from './Entity';
import { CollisionResult } from '../types/GameTypes';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ThemeType } from '@/config/themeConfig';

export class EnemyProjectile extends Entity {
  public velocity: THREE.Vector3;
  public damage: number;
  public lifetime: number;

  private raycaster: THREE.Raycaster;
  private collidables: THREE.Object3D[] = [];
  private playerPosition: THREE.Vector3;
  private theme: ThemeType;

  // Scratch vectors to reduce per-frame allocations (not re-entrant)
  private readonly scratchDirection = new THREE.Vector3();
  private readonly scratchMovement = new THREE.Vector3();
  private readonly scratchLookAt = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    collidables: THREE.Object3D[],
    playerPosition: THREE.Vector3,
    theme: ThemeType = 'DEFAULT'
  ) {
    super(scene, position);
    this.theme = theme;
    this.velocity = new THREE.Vector3()
      .copy(direction)
      .normalize()
      .multiplyScalar(GAME_CONFIG.ENEMY.PROJECTILE_SPEED);
    this.damage = GAME_CONFIG.ENEMY.DAMAGE;
    this.lifetime = 3; // 3 second lifetime
    this.collidables = collidables;
    this.playerPosition = playerPosition;

    this.raycaster = new THREE.Raycaster();
    this.mesh = this.createMesh();
    this.addToScene();
  }

  protected createMesh(): THREE.Object3D {
    if (this.theme === 'CHRISTMAS') {
      return this.createChristmasMesh();
    }
    return this.createDefaultMesh();
  }

  private createDefaultMesh(): THREE.Object3D {
    const group = new THREE.Group();

    // Energy plasma bolt (cyan/blue)
    const coreGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.2,
      metalness: 0.5,
      roughness: 0.2,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // Outer glow sphere
    const glowGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.4,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Energy trail
    const trailGeometry = new THREE.CylinderGeometry(0.04, 0.08, 0.35, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x0099ff,
      transparent: true,
      opacity: 0.5,
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -0.22;
    group.add(trail);

    // Electric arcs (small rotating rings)
    const arcGeometry = new THREE.TorusGeometry(0.1, 0.015, 6, 8);
    const arcMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.7,
    });
    const arc1 = new THREE.Mesh(arcGeometry, arcMaterial);
    arc1.rotation.x = Math.PI / 2;
    arc1.rotation.z = Math.random() * Math.PI;
    group.add(arc1);

    const arc2 = new THREE.Mesh(arcGeometry, arcMaterial);
    arc2.rotation.x = Math.PI / 2;
    arc2.rotation.z = Math.random() * Math.PI;
    arc2.scale.setScalar(0.7);
    arc2.position.z = -0.1;
    group.add(arc2);

    // Bright cyan point light
    const light = new THREE.PointLight(0x00ffff, 0.8, 3);
    group.add(light);

    group.position.copy(this.position);

    // Orient toward velocity
    if (this.velocity.lengthSq() > 0) {
      this.scratchLookAt.copy(this.position).add(this.velocity);
      group.lookAt(this.scratchLookAt);
    }

    return group;
  }

  private createChristmasMesh(): THREE.Object3D {
    const group = new THREE.Group();

    // Snowball projectile
    const snowballGeometry = new THREE.SphereGeometry(0.12, 12, 12);
    const snowballMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.0,
      emissive: 0xaaddff,
      emissiveIntensity: 0.3,
    });
    const snowball = new THREE.Mesh(snowballGeometry, snowballMaterial);
    group.add(snowball);

    // Add ice crystal spikes around the snowball
    const spikeGeometry = new THREE.ConeGeometry(0.03, 0.1, 4);
    const iceMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
      metalness: 0.5,
    });

    // Add 6 spikes in different directions
    const spikeDirections = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];

    spikeDirections.forEach((dir) => {
      const spike = new THREE.Mesh(spikeGeometry, iceMaterial);
      spike.position.copy(dir.clone().multiplyScalar(0.1));
      // Orient spike outward
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      group.add(spike);
    });

    // Sparkle trail particles (small spheres trailing behind)
    const sparkleGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    const sparkleMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < 3; i++) {
      const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
      sparkle.position.z = 0.15 + i * 0.1;
      sparkle.position.x = (Math.random() - 0.5) * 0.1;
      sparkle.position.y = (Math.random() - 0.5) * 0.1;
      sparkle.scale.setScalar(1 - i * 0.2);
      group.add(sparkle);
    }

    // Cold blue light
    const light = new THREE.PointLight(0x88ccff, 0.8, 3);
    group.add(light);

    group.position.copy(this.position);

    // Orient toward velocity
    if (this.velocity.lengthSq() > 0) {
      this.scratchLookAt.copy(this.position).add(this.velocity);
      group.lookAt(this.scratchLookAt);
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
    this.scratchMovement.copy(this.velocity).multiplyScalar(deltaTime);
    this.position.add(this.scratchMovement);
    this.mesh.position.copy(this.position);

    return { hit: false, hitPlayer: false };
  }

  private checkWallCollision(deltaTime: number): CollisionResult {
    const direction = this.scratchDirection.copy(this.velocity).normalize();
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
        point: wallHits[0].point,
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
