import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Entity } from './Entity';
import { IDamageable, InputState } from '../types/GameTypes';
import { RocketLauncher } from '../weapons/RocketLauncher';
import { GAME_CONFIG } from '@/config/gameConfig';
import { CollisionUtils } from '../utils/CollisionUtils';

export class Player extends Entity implements IDamageable {
  // Health
  public health: number = GAME_CONFIG.PLAYER.HEALTH;
  public maxHealth: number = GAME_CONFIG.PLAYER.HEALTH;

  // Movement
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speed: number = GAME_CONFIG.PLAYER.SPEED;

  // Controls
  public controls: PointerLockControls;
  public camera: THREE.PerspectiveCamera;

  // State
  private canJump: boolean = true;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();

  // Weapon
  public weapon: RocketLauncher;

  // Collidables for movement
  private collidables: THREE.Object3D[] = [];

  // Physics constants
  private readonly GRAVITY: number = GAME_CONFIG.PHYSICS.GRAVITY;
  private readonly PLAYER_HEIGHT: number = GAME_CONFIG.PLAYER.HEIGHT;
  private readonly JUMP_SPEED: number = GAME_CONFIG.PLAYER.JUMP_SPEED;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    super(scene, new THREE.Vector3(0, GAME_CONFIG.PLAYER.HEIGHT, 0));
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.mesh = this.createMesh();
    this.weapon = new RocketLauncher(scene, camera);
  }

  protected createMesh(): THREE.Object3D {
    // Player doesn't need visible mesh in first-person
    const group = new THREE.Group();
    group.position.copy(this.position);
    return group;
  }

  public setCollidables(collidables: THREE.Object3D[]): void {
    this.collidables = collidables;
    this.weapon.setCollidables(collidables);
  }

  public update(deltaTime: number): void {
    // Apply gravity
    this.velocity.y -= this.GRAVITY * deltaTime;

    // Get camera forward and right vectors (horizontal only)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Calculate horizontal movement
    const horizontalMove = new THREE.Vector3();
    horizontalMove.addScaledVector(forward, this.moveDirection.z);
    horizontalMove.addScaledVector(right, this.moveDirection.x);

    if (horizontalMove.lengthSq() > 0) {
      horizontalMove.normalize().multiplyScalar(this.speed * deltaTime);

      // Check collision
      const collision = CollisionUtils.checkMovementCollision(
        this.camera.position,
        horizontalMove,
        this.collidables,
        GAME_CONFIG.PLAYER.RADIUS
      );

      // Apply movement
      this.camera.position.add(collision.adjustedDirection);
    }

    // Apply vertical movement
    this.camera.position.y += this.velocity.y * deltaTime;

    // Ground collision
    if (this.camera.position.y < this.PLAYER_HEIGHT) {
      this.velocity.y = 0;
      this.camera.position.y = this.PLAYER_HEIGHT;
      this.canJump = true;
    }

    // Keep within arena bounds
    const bounds = GAME_CONFIG.ARENA.SIZE / 2 - 1;
    this.camera.position.x = Math.max(-bounds, Math.min(bounds, this.camera.position.x));
    this.camera.position.z = Math.max(-bounds, Math.min(bounds, this.camera.position.z));

    // Update weapon
    this.weapon.update(deltaTime);

    // Sync position
    this.position.copy(this.camera.position);
  }

  public processInput(input: InputState): void {
    this.moveDirection.set(0, 0, 0);

    if (input.forward) this.moveDirection.z = 1;
    if (input.backward) this.moveDirection.z = -1;
    if (input.left) this.moveDirection.x = -1;
    if (input.right) this.moveDirection.x = 1;

    if (input.jump && this.canJump) {
      this.velocity.y = this.JUMP_SPEED;
      this.canJump = false;
    }

    if (input.fire) {
      this.weapon.fire();
    }
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  public applyKnockback(force: THREE.Vector3): void {
    // Add knockback to velocity
    this.velocity.add(force);

    // If significant upward force and on ground, allow air control
    if (force.y > 5) {
      this.canJump = false; // In the air from knockback
    }
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public lock(): void {
    this.controls.lock();
  }

  public unlock(): void {
    this.controls.unlock();
  }

  public isLocked(): boolean {
    return this.controls.isLocked;
  }

  public reset(): void {
    this.health = this.maxHealth;
    this.camera.position.set(0, this.PLAYER_HEIGHT, 0);
    this.velocity.set(0, 0, 0);
    this.canJump = true;
  }
}
