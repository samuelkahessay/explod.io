import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Entity } from './Entity';
import { IDamageable, InputState } from '../types/GameTypes';
import { RocketLauncher } from '../weapons/RocketLauncher';
import { WeaponViewModel } from '../weapons/WeaponViewModel';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ThemeType } from '@/config/themeConfig';
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
  private isAiming: boolean = false;
  private baseSpeed: number = GAME_CONFIG.PLAYER.SPEED;

  // Weapon
  public weapon: RocketLauncher;
  private weaponViewModel: WeaponViewModel;

  // Collidables for movement
  private collidables: THREE.Object3D[] = [];

  // Physics constants
  private readonly GRAVITY: number = GAME_CONFIG.PHYSICS.GRAVITY;
  private readonly PLAYER_HEIGHT: number = GAME_CONFIG.PLAYER.HEIGHT;
  private readonly JUMP_SPEED: number = GAME_CONFIG.PLAYER.JUMP_SPEED;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    theme: ThemeType = 'DEFAULT'
  ) {
    super(scene, new THREE.Vector3(0, GAME_CONFIG.PLAYER.HEIGHT, 0));
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.mesh = this.createMesh();
    this.weapon = new RocketLauncher(scene, camera);
    this.weaponViewModel = new WeaponViewModel(scene, camera, theme);

    // Connect weapon to get muzzle position from view model
    this.weapon.getMuzzlePosition = () => this.weaponViewModel.getMuzzlePosition();
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

    // Check for landing on obstacles (when falling)
    if (this.velocity.y < 0) {
      const feetPosition = this.camera.position.y - this.PLAYER_HEIGHT;
      const landingHeight = this.checkObstacleLanding(feetPosition);
      if (landingHeight !== null) {
        this.velocity.y = 0;
        this.camera.position.y = landingHeight + this.PLAYER_HEIGHT;
        this.canJump = true;
      }
    }

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

    // Update weapon view model
    const isMoving = this.moveDirection.lengthSq() > 0;
    this.weaponViewModel.update(deltaTime, isMoving, this.velocity);

    // Sync position
    this.position.copy(this.camera.position);
  }

  public processInput(input: InputState): void {
    this.moveDirection.set(0, 0, 0);

    if (input.forward) this.moveDirection.z = 1;
    if (input.backward) this.moveDirection.z = -1;
    if (input.left) this.moveDirection.x = -1;
    if (input.right) this.moveDirection.x = 1;

    // Handle ADS state
    this.isAiming = input.aim;
    this.weaponViewModel.setAiming(this.isAiming);

    // Adjust speed based on ADS (slower movement while aiming)
    this.speed = this.isAiming
      ? this.baseSpeed * GAME_CONFIG.PLAYER.ADS_SPEED_MULTIPLIER
      : this.baseSpeed;

    if (input.jump && this.canJump) {
      this.velocity.y = this.JUMP_SPEED;
      this.canJump = false;
    }

    if (input.fire) {
      const projectile = this.weapon.fire();
      if (projectile) {
        this.weaponViewModel.triggerRecoil();
      }
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

  public getIsAiming(): boolean {
    return this.isAiming;
  }

  public getAdsProgress(): number {
    return this.weaponViewModel.getAdsProgress();
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

  /**
   * Check if player can land on an obstacle
   * Returns the obstacle top height if landing, null otherwise
   */
  private checkObstacleLanding(feetY: number): number | null {
    const playerX = this.camera.position.x;
    const playerZ = this.camera.position.z;
    const radius = GAME_CONFIG.PLAYER.RADIUS;

    for (const obj of this.collidables) {
      if (obj.userData?.type !== 'obstacle') continue;

      // Get obstacle bounds
      const box = new THREE.Box3().setFromObject(obj);
      const topY = box.max.y;

      // Check if player is within horizontal bounds of obstacle (with some tolerance)
      const withinX = playerX >= box.min.x - radius && playerX <= box.max.x + radius;
      const withinZ = playerZ >= box.min.z - radius && playerZ <= box.max.z + radius;

      // Check if feet are at or slightly below the top surface (landing threshold)
      const landingThreshold = 0.3; // Allow landing if feet are within this distance above the top
      const atTopSurface = feetY <= topY + landingThreshold && feetY >= topY - 0.1;

      if (withinX && withinZ && atTopSurface) {
        return topY;
      }
    }

    return null;
  }

  public reset(): void {
    this.health = this.maxHealth;
    this.camera.position.set(0, this.PLAYER_HEIGHT, 0);
    this.velocity.set(0, 0, 0);
    this.canJump = true;
  }

  public dispose(): void {
    this.weaponViewModel.dispose();
  }
}
