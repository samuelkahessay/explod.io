import * as THREE from 'three';
import { Entity } from './Entity';
import { IDamageable, EnemyConfig } from '../types/GameTypes';
import { GAME_CONFIG } from '@/config/gameConfig';

export class Enemy extends Entity implements IDamageable {
  public health: number;
  public maxHealth: number;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speed: number;

  private config: EnemyConfig;
  private targetPosition: THREE.Vector3 | null = null;
  private fireCooldown: number = 0;

  // Bounding box for collision
  public boundingBox: THREE.Box3;

  // Smooth movement interpolation
  private currentRotation: THREE.Quaternion = new THREE.Quaternion();
  private targetRotation: THREE.Quaternion = new THREE.Quaternion();
  private readonly ROTATION_LERP_SPEED = 8;

  // Walking animation
  private walkCycle: number = 0;
  private readonly WALK_SPEED = 12;
  private readonly BOB_AMOUNT = 0.08;
  private readonly SWAY_AMOUNT = 0.03;
  private body: THREE.Mesh | null = null;
  private head: THREE.Mesh | null = null;
  private gun: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, config: EnemyConfig) {
    super(scene, position);
    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.mesh = this.createMesh();
    this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    this.addToScene();
  }

  protected createMesh(): THREE.Object3D {
    // Blocky Krunker-style enemy - capsule shape
    const group = new THREE.Group();

    // Body (box)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.4, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc3333,
      roughness: 0.7,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.7;
    body.castShadow = true;
    body.receiveShadow = true;
    this.body = body;

    // Head (smaller box)
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.8,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.65;
    head.castShadow = true;
    this.head = head;

    // Eyes
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 1.7, 0.26);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 1.7, 0.26);

    // Gun
    const gunGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.6);
    const gunMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.3,
    });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.set(0.5, 0.9, 0.3);
    gun.castShadow = true;
    this.gun = gun;

    group.add(body, head, leftEye, rightEye, gun);
    group.position.copy(this.position);

    // Store entity reference
    group.userData.entityId = this.id;
    group.userData.type = 'enemy';
    group.userData.collidable = true;

    // Store initial rotation
    this.currentRotation.copy(group.quaternion);

    return group;
  }

  public update(deltaTime: number): void {
    if (!this.isActive || !this.targetPosition) return;

    const distanceToTarget = this.position.distanceTo(this.targetPosition);
    let isMoving = false;

    // Move toward target if outside attack range
    if (distanceToTarget > this.config.attackRange) {
      isMoving = true;
      const direction = new THREE.Vector3()
        .subVectors(this.targetPosition, this.position)
        .setY(0)
        .normalize();

      this.velocity.copy(direction.multiplyScalar(this.speed));
      this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
      this.mesh.position.copy(this.position);

      // Calculate target rotation (smooth turning)
      const lookAtPos = new THREE.Vector3(
        this.targetPosition.x,
        this.mesh.position.y,
        this.targetPosition.z
      );

      // Create a temporary object to get the target quaternion
      const tempObj = new THREE.Object3D();
      tempObj.position.copy(this.mesh.position);
      tempObj.lookAt(lookAtPos);
      this.targetRotation.copy(tempObj.quaternion);
    } else {
      // Stop and face target when in range
      this.velocity.set(0, 0, 0);

      // Calculate target rotation
      const lookAtPos = new THREE.Vector3(
        this.targetPosition.x,
        this.mesh.position.y,
        this.targetPosition.z
      );

      const tempObj = new THREE.Object3D();
      tempObj.position.copy(this.mesh.position);
      tempObj.lookAt(lookAtPos);
      this.targetRotation.copy(tempObj.quaternion);
    }

    // Smoothly interpolate rotation
    this.currentRotation.slerp(this.targetRotation, Math.min(1, this.ROTATION_LERP_SPEED * deltaTime));
    this.mesh.quaternion.copy(this.currentRotation);

    // Walking animation
    if (isMoving) {
      this.walkCycle += deltaTime * this.WALK_SPEED;

      // Bob up and down
      const bobOffset = Math.sin(this.walkCycle) * this.BOB_AMOUNT;

      // Body sway
      const swayOffset = Math.sin(this.walkCycle * 0.5) * this.SWAY_AMOUNT;

      if (this.body) {
        this.body.position.y = 0.7 + bobOffset;
        this.body.rotation.z = swayOffset;
      }

      if (this.head) {
        this.head.position.y = 1.65 + bobOffset * 0.5;
      }

      if (this.gun) {
        this.gun.position.y = 0.9 + bobOffset * 0.3;
        this.gun.rotation.x = Math.sin(this.walkCycle) * 0.05;
      }
    } else {
      // Reset to idle pose when not moving
      if (this.body) {
        this.body.position.y = 0.7;
        this.body.rotation.z = 0;
      }
      if (this.head) {
        this.head.position.y = 1.65;
      }
      if (this.gun) {
        this.gun.position.y = 0.9;
        this.gun.rotation.x = 0;
      }
    }

    // Update bounding box
    this.boundingBox.setFromObject(this.mesh);

    // Update fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }
  }

  public setTarget(position: THREE.Vector3): void {
    this.targetPosition = position.clone();
  }

  public canFire(): boolean {
    return this.fireCooldown <= 0;
  }

  public fire(): void {
    this.fireCooldown = 1 / this.config.fireRate;
  }

  public isInAttackRange(position: THREE.Vector3): boolean {
    return this.position.distanceTo(position) <= this.config.attackRange;
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);

    // Flash red on damage
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(0xff0000);
        setTimeout(() => {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0x000000);
          }
        }, 100);
      }
    });
  }

  public applyKnockback(force: THREE.Vector3): void {
    // Apply horizontal knockback (push away from explosion)
    const horizontalForce = force.clone().setY(0);
    this.position.add(horizontalForce.multiplyScalar(0.15));
    this.mesh.position.copy(this.position);

    // Temporary stagger - slow down the enemy
    const originalSpeed = this.speed;
    this.speed *= 0.3;

    // Restore speed after stagger duration
    setTimeout(() => {
      this.speed = originalSpeed;
    }, 400);
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public getFirePosition(): THREE.Vector3 {
    // Return position of the gun
    return this.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  }

  public getFireDirection(): THREE.Vector3 {
    if (!this.targetPosition) return new THREE.Vector3(0, 0, 1);

    return new THREE.Vector3()
      .subVectors(this.targetPosition, this.getFirePosition())
      .normalize();
  }
}
