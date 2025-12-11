import * as THREE from 'three';
import { Entity } from './Entity';
import { IDamageable, EnemyConfig } from '../types/GameTypes';
import {
  LimbType,
  LimbState,
  LimbData,
  LimbDamageResult,
  EnemyCombatState,
  KnockbackState,
} from '../types/LimbTypes';
import {
  LIMB_DIMENSIONS,
  LIMB_ATTACHMENT_POINTS,
  LIMB_HEALTH,
  LIMB_DAMAGE_MULTIPLIERS,
  LIMB_COLORS,
  LIMB_SPEED_MODIFIERS,
  DISMEMBERMENT_CONFIG,
} from '@/config/limbConfig';
import { KNOCKBACK_CONFIG } from '@/config/knockbackConfig';
import { ThemeType, ChristmasEnemyType, CHRISTMAS_ENEMIES } from '@/config/themeConfig';
import { CollisionUtils } from '../utils/CollisionUtils';

export class HumanoidEnemy extends Entity implements IDamageable {
  public health: number;
  public maxHealth: number;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speed: number;
  public baseSpeed: number;

  private config: EnemyConfig;
  private targetPosition: THREE.Vector3 | null = null;
  private fireCooldown: number = 0;

  // Bounding box for collision
  public boundingBox: THREE.Box3;

  // Dirty flag for lazy bounding box updates
  private boundingBoxesDirty: boolean = true;

  // Limb system
  public limbs: Map<LimbType, LimbData> = new Map();
  private limbMeshes: THREE.Group;

  // State modifiers from dismemberment
  private speedMultiplier: number = 1.0;
  public canShoot: boolean = true;
  private accuracyPenalty: number = 0;
  private isCrawling: boolean = false;

  // Smooth movement interpolation
  private currentRotation: THREE.Quaternion = new THREE.Quaternion();
  private targetRotation: THREE.Quaternion = new THREE.Quaternion();
  private readonly ROTATION_LERP_SPEED = 8;

  // Walking animation
  private walkCycle: number = 0;
  private crawlCycle: number = 0;
  private readonly WALK_SPEED = 12;
  private readonly BOB_AMOUNT = 0.08;

  // Gun attachment
  private gun: THREE.Mesh | null = null;
  private gunAttachedTo: LimbType = LimbType.RIGHT_ARM;

  // Event callbacks for external systems
  public onLimbSevered:
    | ((
        limbType: LimbType,
        worldPos: THREE.Vector3,
        explosionCenter: THREE.Vector3,
        mesh: THREE.Mesh
      ) => void)
    | null = null;
  public onBloodSpray: ((position: THREE.Vector3, count: number) => void) | null =
    null;

  // Track death cause for gib explosion
  public wasKilledByExplosion: boolean = false;
  public lastExplosionCenter: THREE.Vector3 = new THREE.Vector3();

  // Knockback physics state
  private combatState: EnemyCombatState = EnemyCombatState.NORMAL;
  private knockbackState: KnockbackState = {
    velocity: new THREE.Vector3(),
    staggerTimeRemaining: 0,
    wobbleIntensity: 0,
    wobblePhase: 0,
    preKnockbackRotation: new THREE.Quaternion(),
    lastImpactDirection: new THREE.Vector3(),
  };
  private recoveryProgress: number = 0;
  private targetRecoveryRotation: THREE.Quaternion = new THREE.Quaternion();

  // Obstacle collision
  private collidables: THREE.Object3D[] = [];
  private readonly COLLISION_RADIUS = 0.5;

  // Theme and enemy type
  private theme: ThemeType = 'DEFAULT';
  private christmasEnemyType: ChristmasEnemyType | null = null;
  private enemyScale: number = 1.0;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    config: EnemyConfig,
    theme: ThemeType = 'DEFAULT',
    christmasEnemyType: ChristmasEnemyType | null = null
  ) {
    super(scene, position);
    this.config = config;
    this.theme = theme;
    this.christmasEnemyType = christmasEnemyType;

    // Set scale based on Christmas enemy type
    if (christmasEnemyType) {
      this.enemyScale = CHRISTMAS_ENEMIES[christmasEnemyType].scale;
    }

    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.baseSpeed = config.speed;
    this.limbMeshes = new THREE.Group();
    this.mesh = this.createMesh();
    this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    this.addToScene();
  }

  protected createMesh(): THREE.Object3D {
    const group = new THREE.Group();

    // Create each limb
    Object.values(LimbType).forEach((limbType) => {
      const limbData = this.createLimb(limbType as LimbType);
      this.limbs.set(limbType as LimbType, limbData);
      this.limbMeshes.add(limbData.mesh);
    });

    // Create gun and attach to right arm
    this.gun = this.createGun();
    const rightArm = this.limbs.get(LimbType.RIGHT_ARM);
    if (rightArm) {
      this.gun.position.set(0, -0.25, 0.2);
      rightArm.mesh.add(this.gun);
    }

    // Add eyes/face based on enemy type
    const head = this.limbs.get(LimbType.HEAD);
    if (head) {
      if (this.christmasEnemyType === 'GINGERBREAD') {
        this.createGingerbreadFace(head.mesh);
      } else if (this.christmasEnemyType === 'ELF') {
        this.createElfFace(head.mesh);
      } else if (this.christmasEnemyType === 'NUTCRACKER') {
        this.createNutcrackerFace(head.mesh);
      } else {
        this.createEyes(head.mesh);
      }
    }

    // Apply scale for Christmas enemy types
    if (this.enemyScale !== 1.0) {
      this.limbMeshes.scale.setScalar(this.enemyScale);
    }

    group.add(this.limbMeshes);
    group.position.copy(this.position);

    // Store entity reference
    group.userData.entityId = this.id;
    group.userData.type = 'enemy';
    group.userData.collidable = true;

    // Store initial rotation
    this.currentRotation.copy(group.quaternion);

    return group;
  }

  private createLimb(type: LimbType): LimbData {
    const dim = LIMB_DIMENSIONS[type];
    const geometry = new THREE.BoxGeometry(dim.width, dim.height, dim.depth);

    // Get color based on theme and enemy type
    const color = this.getLimbColor(type);

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(LIMB_ATTACHMENT_POINTS[type]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Store limb type in userData for hit detection
    mesh.userData.limbType = type;
    mesh.userData.entityId = this.id;

    // Add invisible hitbox for head (larger than visual mesh for better hit detection)
    if (type === LimbType.HEAD) {
      const hitboxSize = 0.55; // Slightly larger than visual head (0.4)
      const hitboxGeometry = new THREE.BoxGeometry(hitboxSize, hitboxSize, hitboxSize);
      const hitboxMaterial = new THREE.MeshBasicMaterial({
        visible: false,
      });
      const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      hitbox.userData.limbType = type;
      hitbox.userData.entityId = this.id;
      hitbox.userData.isHitbox = true;
      mesh.add(hitbox);
    }

    return {
      type,
      state: LimbState.ATTACHED,
      health: LIMB_HEALTH[type],
      maxHealth: LIMB_HEALTH[type],
      mesh,
      attachmentPoint: LIMB_ATTACHMENT_POINTS[type].clone(),
      boundingBox: new THREE.Box3().setFromObject(mesh),
      damageMultiplier: LIMB_DAMAGE_MULTIPLIERS[type],
    };
  }

  private createGun(): THREE.Mesh {
    const gunGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.5);
    const gunMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.3,
    });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.castShadow = true;
    return gun;
  }

  private createEyes(headMesh: THREE.Mesh): void {
    const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.05);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);

    headMesh.add(leftEye, rightEye);
  }

  private getLimbColor(type: LimbType): number {
    // Default colors
    if (!this.christmasEnemyType) {
      return type === LimbType.HEAD ? LIMB_COLORS.skin : LIMB_COLORS.body;
    }

    switch (this.christmasEnemyType) {
      case 'ELF': {
        const elfColors = CHRISTMAS_ENEMIES.ELF.colors;
        if (type === LimbType.HEAD) return elfColors.skin;
        if (type === LimbType.TORSO) return elfColors.outfit;
        return elfColors.outfit; // Arms and legs green
      }

      case 'GINGERBREAD': {
        const gbColors = CHRISTMAS_ENEMIES.GINGERBREAD.colors;
        return gbColors.body; // All brown cookie
      }

      case 'NUTCRACKER': {
        const ncColors = CHRISTMAS_ENEMIES.NUTCRACKER.colors;
        if (type === LimbType.HEAD) return ncColors.wood; // Wooden face
        if (type === LimbType.TORSO) return ncColors.body; // Red uniform
        if (type === LimbType.LEFT_LEG || type === LimbType.RIGHT_LEG) return ncColors.black; // Black pants
        return ncColors.body; // Red arms
      }

      default:
        return type === LimbType.HEAD ? LIMB_COLORS.skin : LIMB_COLORS.body;
    }
  }

  private createGingerbreadFace(headMesh: THREE.Mesh): void {
    const icingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // White icing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, icingMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);
    const rightEye = new THREE.Mesh(eyeGeometry, icingMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);

    // Black pupils
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const pupilGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.1, 0.05, 0.23);
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.1, 0.05, 0.23);

    // Icing smile
    const smileGeometry = new THREE.TorusGeometry(0.1, 0.02, 8, 12, Math.PI);
    const smile = new THREE.Mesh(smileGeometry, icingMaterial);
    smile.position.set(0, -0.08, 0.2);
    smile.rotation.x = Math.PI / 2;
    smile.rotation.z = Math.PI;

    headMesh.add(leftEye, rightEye, leftPupil, rightPupil, smile);
  }

  private createElfFace(headMesh: THREE.Mesh): void {
    // Regular eyes
    const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.05);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);

    // Pointy ears
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const earGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);

    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.25, 0.1, 0);
    leftEar.rotation.z = Math.PI / 3;

    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.25, 0.1, 0);
    rightEar.rotation.z = -Math.PI / 3;

    // Pointy hat
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const hatGeometry = new THREE.ConeGeometry(0.25, 0.4, 8);
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.set(0, 0.35, 0);

    // White pom-pom
    const pomMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pomGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const pom = new THREE.Mesh(pomGeometry, pomMaterial);
    pom.position.set(0, 0.55, 0);

    headMesh.add(leftEye, rightEye, leftEar, rightEar, hat, pom);
  }

  private createNutcrackerFace(headMesh: THREE.Mesh): void {
    // Large eyes
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.08, 0.2);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.08, 0.2);

    // Red circles on cheeks
    const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cheekGeometry = new THREE.CircleGeometry(0.06, 8);

    const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    leftCheek.position.set(-0.15, -0.02, 0.21);
    const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    rightCheek.position.set(0.15, -0.02, 0.21);

    // Mouth (rectangular, open)
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouthGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.02);
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.1, 0.2);

    // Tall black hat
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hatGeometry = new THREE.CylinderGeometry(0.22, 0.25, 0.35, 12);
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.set(0, 0.35, 0);

    // Gold band on hat
    const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const bandGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12);
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.set(0, 0.22, 0);

    headMesh.add(leftEye, rightEye, leftCheek, rightCheek, mouth, hat, band);
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Update knockback physics (runs regardless of combat state)
    this.updateKnockbackPhysics(deltaTime);

    // If staggered or recovering, skip normal AI behavior
    if (this.combatState !== EnemyCombatState.NORMAL) {
      // Still update bounding boxes
      this.updateBoundingBoxes();

      // Reduce fire cooldown (so they can shoot again after recovery)
      if (this.fireCooldown > 0) {
        this.fireCooldown -= deltaTime;
      }
      return; // Skip movement and targeting
    }

    // === NORMAL BEHAVIOR (only when not staggered) ===

    // Calculate effective speed based on limb state
    const effectiveSpeed = this.speed * this.speedMultiplier;

    let isMoving = false;

    if (this.targetPosition) {
      const distanceToTarget = this.position.distanceTo(this.targetPosition);

      // Move toward target if outside attack range
      if (distanceToTarget > this.config.attackRange) {
        isMoving = true;
        const direction = new THREE.Vector3()
          .subVectors(this.targetPosition, this.position)
          .setY(0)
          .normalize();

        this.velocity.copy(direction.multiplyScalar(effectiveSpeed));
        const moveVector = this.velocity.clone().multiplyScalar(deltaTime);

        // Check for obstacle collision
        if (this.collidables.length > 0) {
          const collision = CollisionUtils.checkMovementCollision(
            this.position.clone().setY(0.5), // Check at body height
            moveVector,
            this.collidables,
            this.COLLISION_RADIUS
          );
          this.position.add(collision.adjustedDirection);
        } else {
          this.position.add(moveVector);
        }
        this.mesh.position.copy(this.position);

        // Calculate target rotation
        this.updateTargetRotation();
      } else {
        this.velocity.set(0, 0, 0);
        this.updateTargetRotation();
      }
    }

    // Smoothly interpolate rotation
    this.currentRotation.slerp(
      this.targetRotation,
      Math.min(1, this.ROTATION_LERP_SPEED * deltaTime)
    );
    this.mesh.quaternion.copy(this.currentRotation);

    // Animation based on state
    if (this.isCrawling) {
      this.updateCrawlAnimation(deltaTime, isMoving);
    } else {
      this.updateWalkAnimation(deltaTime, isMoving);
    }

    // Update bounding boxes only if dirty (lazy update for performance)
    if (this.boundingBoxesDirty) {
      this.updateBoundingBoxes();
      this.boundingBoxesDirty = false;
    }

    // Update fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }
  }

  /**
   * Helper to update all bounding boxes
   */
  private updateBoundingBoxes(): void {
    // Update bounding boxes for remaining limbs
    this.limbs.forEach((limb) => {
      if (limb.state === LimbState.ATTACHED) {
        limb.boundingBox.setFromObject(limb.mesh);
      }
    });

    // Update main bounding box
    this.boundingBox.setFromObject(this.mesh);
  }

  /**
   * Force bounding box update on next frame (call before damage calculations)
   */
  public invalidateBoundingBoxes(): void {
    this.boundingBoxesDirty = true;
  }

  /**
   * Ensure bounding boxes are up to date (call before accessing them for damage calc)
   */
  public ensureBoundingBoxesUpdated(): void {
    if (this.boundingBoxesDirty) {
      this.updateBoundingBoxes();
      this.boundingBoxesDirty = false;
    }
  }

  private updateTargetRotation(): void {
    if (!this.targetPosition) return;

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

  private updateWalkAnimation(deltaTime: number, isMoving: boolean): void {
    if (!isMoving) {
      this.resetToIdlePose();
      return;
    }

    this.walkCycle += deltaTime * this.WALK_SPEED;

    // Animate legs (only if attached)
    const leftLeg = this.limbs.get(LimbType.LEFT_LEG);
    const rightLeg = this.limbs.get(LimbType.RIGHT_LEG);

    if (leftLeg?.state === LimbState.ATTACHED) {
      leftLeg.mesh.rotation.x = Math.sin(this.walkCycle) * 0.4;
    }
    if (rightLeg?.state === LimbState.ATTACHED) {
      rightLeg.mesh.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.4;
    }

    // Animate arms (opposite to legs for natural walk)
    const leftArm = this.limbs.get(LimbType.LEFT_ARM);
    const rightArm = this.limbs.get(LimbType.RIGHT_ARM);

    if (leftArm?.state === LimbState.ATTACHED) {
      leftArm.mesh.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.3;
    }
    if (rightArm?.state === LimbState.ATTACHED) {
      rightArm.mesh.rotation.x = Math.sin(this.walkCycle) * 0.3;
    }

    // Body bob
    const torso = this.limbs.get(LimbType.TORSO);
    if (torso?.state === LimbState.ATTACHED) {
      const bobOffset = Math.sin(this.walkCycle * 2) * this.BOB_AMOUNT;
      torso.mesh.position.y = LIMB_ATTACHMENT_POINTS[LimbType.TORSO].y + bobOffset;
    }

    // Head follows body bob slightly
    const head = this.limbs.get(LimbType.HEAD);
    if (head?.state === LimbState.ATTACHED) {
      const bobOffset = Math.sin(this.walkCycle * 2) * this.BOB_AMOUNT * 0.5;
      head.mesh.position.y = LIMB_ATTACHMENT_POINTS[LimbType.HEAD].y + bobOffset;
    }
  }

  private updateCrawlAnimation(deltaTime: number, isMoving: boolean): void {
    if (!isMoving) {
      return;
    }

    this.crawlCycle += deltaTime * 6; // Slower crawl cycle

    const torso = this.limbs.get(LimbType.TORSO);
    if (torso?.state === LimbState.ATTACHED) {
      // Lower to ground and lean forward
      torso.mesh.position.y = 0.35 + Math.sin(this.crawlCycle) * 0.05;
      torso.mesh.rotation.x = -Math.PI / 6;
    }

    // Animate remaining arms for crawling motion
    const arms = [LimbType.LEFT_ARM, LimbType.RIGHT_ARM];
    arms.forEach((armType, i) => {
      const arm = this.limbs.get(armType);
      if (arm?.state === LimbState.ATTACHED) {
        const offset = i * Math.PI;
        arm.mesh.rotation.x = Math.sin(this.crawlCycle + offset) * 0.5 - 0.3;
        // Move arms forward for crawling
        arm.mesh.position.z = 0.2 + Math.sin(this.crawlCycle + offset) * 0.15;
      }
    });

    // Head stays lower
    const head = this.limbs.get(LimbType.HEAD);
    if (head?.state === LimbState.ATTACHED) {
      head.mesh.position.y = 0.7 + Math.sin(this.crawlCycle) * 0.03;
    }
  }

  private resetToIdlePose(): void {
    // Reset all attached limbs to their default positions and rotations
    this.limbs.forEach((limb, limbType) => {
      if (limb.state === LimbState.ATTACHED) {
        limb.mesh.position.copy(LIMB_ATTACHMENT_POINTS[limbType]);
        limb.mesh.rotation.set(0, 0, 0);
      }
    });

    // If crawling, maintain low position
    if (this.isCrawling) {
      const torso = this.limbs.get(LimbType.TORSO);
      if (torso?.state === LimbState.ATTACHED) {
        torso.mesh.position.y = 0.35;
        torso.mesh.rotation.x = -Math.PI / 6;
      }
      const head = this.limbs.get(LimbType.HEAD);
      if (head?.state === LimbState.ATTACHED) {
        head.mesh.position.y = 0.7;
      }
    }
  }

  public takeLimbDamage(
    limbType: LimbType,
    baseDamage: number,
    explosionCenter: THREE.Vector3
  ): LimbDamageResult {
    const limb = this.limbs.get(limbType);

    // If limb is already severed, damage goes to torso at reduced rate
    if (!limb || limb.state === LimbState.SEVERED) {
      if (limbType !== LimbType.TORSO) {
        return this.takeLimbDamage(LimbType.TORSO, baseDamage * 0.5, explosionCenter);
      }
      // Torso is gone, enemy should be dead
      return { limb: limbType, damage: 0, severed: false, killed: true };
    }

    const actualDamage = Math.floor(baseDamage * limb.damageMultiplier);
    limb.health -= actualDamage;
    this.health -= actualDamage;

    // Track explosion for death gibs
    this.lastExplosionCenter.copy(explosionCenter);
    this.wasKilledByExplosion = true;

    // Check for severance conditions
    const shouldSever =
      actualDamage >= DISMEMBERMENT_CONFIG.severThreshold || limb.health <= 0;

    let severed = false;
    let killed = false;

    // Torso cannot be severed, only destroyed
    if (shouldSever && limbType !== LimbType.TORSO) {
      severed = this.severLimb(limbType, explosionCenter);
    }

    // Check death conditions
    if (limbType === LimbType.HEAD && severed) {
      killed = true;
      this.health = 0;
    } else if (limbType === LimbType.TORSO && limb.health <= 0) {
      killed = true;
      this.health = 0;
    } else if (this.health <= 0) {
      killed = true;
    }

    // Visual feedback - flash red
    this.flashLimbDamage(limb);

    return { limb: limbType, damage: actualDamage, severed, killed };
  }

  private severLimb(limbType: LimbType, explosionCenter: THREE.Vector3): boolean {
    const limb = this.limbs.get(limbType);
    if (!limb || limb.state === LimbState.SEVERED) return false;

    limb.state = LimbState.SEVERED;

    // Mark bounding boxes as needing update
    this.boundingBoxesDirty = true;

    // Get world position of the limb before removing
    const worldPos = new THREE.Vector3();
    limb.mesh.getWorldPosition(worldPos);

    // If gun is attached to this limb, handle it
    if (limbType === this.gunAttachedTo && this.gun) {
      limb.mesh.remove(this.gun);
    }

    // Remove mesh from body
    this.limbMeshes.remove(limb.mesh);

    // Emit gib event for GibSystem
    if (this.onLimbSevered) {
      this.onLimbSevered(limbType, worldPos, explosionCenter, limb.mesh);
    }

    // Emit blood spray
    if (this.onBloodSpray) {
      this.onBloodSpray(worldPos, DISMEMBERMENT_CONFIG.bloodParticleCount);
    }

    // Apply gameplay effects
    this.applyDismembermentEffects(limbType);

    // Create visual stump
    this.createStump(limbType);

    return true;
  }

  private applyDismembermentEffects(limbType: LimbType): void {
    switch (limbType) {
      case LimbType.LEFT_LEG:
      case LimbType.RIGHT_LEG:
        this.handleLegLoss();
        break;
      case LimbType.LEFT_ARM:
        this.handleArmLoss('left');
        break;
      case LimbType.RIGHT_ARM:
        this.handleArmLoss('right');
        break;
      case LimbType.HEAD:
        // Instant death handled in takeLimbDamage
        break;
    }
  }

  private handleLegLoss(): void {
    const leftLeg = this.limbs.get(LimbType.LEFT_LEG);
    const rightLeg = this.limbs.get(LimbType.RIGHT_LEG);

    const leftLost = leftLeg?.state === LimbState.SEVERED;
    const rightLost = rightLeg?.state === LimbState.SEVERED;

    if (leftLost && rightLost) {
      // Both legs gone - crawl at 15% speed
      this.isCrawling = true;
      this.speedMultiplier = LIMB_SPEED_MODIFIERS.bothLegsLost;
    } else if (leftLost || rightLost) {
      // One leg gone - hobble at 40% speed
      this.speedMultiplier = LIMB_SPEED_MODIFIERS.oneLegsLost;
    }
  }

  private handleArmLoss(side: 'left' | 'right'): void {
    const leftArm = this.limbs.get(LimbType.LEFT_ARM);
    const rightArm = this.limbs.get(LimbType.RIGHT_ARM);

    const leftLost = leftArm?.state === LimbState.SEVERED;
    const rightLost = rightArm?.state === LimbState.SEVERED;

    if (leftLost && rightLost) {
      // Both arms gone - can't shoot
      this.canShoot = false;
      this.detachGun();
    } else if (rightLost && this.gunAttachedTo === LimbType.RIGHT_ARM) {
      // Shooting arm lost - switch to left with penalty
      if (!leftLost) {
        this.moveGunToArm(LimbType.LEFT_ARM);
        this.accuracyPenalty = 0.3;
      } else {
        this.canShoot = false;
        this.detachGun();
      }
    } else if (leftLost && this.gunAttachedTo === LimbType.LEFT_ARM) {
      // Same for left arm
      if (!rightLost) {
        this.moveGunToArm(LimbType.RIGHT_ARM);
        this.accuracyPenalty = 0.3;
      } else {
        this.canShoot = false;
        this.detachGun();
      }
    }
  }

  private moveGunToArm(armType: LimbType): void {
    if (!this.gun) return;

    const arm = this.limbs.get(armType);
    if (arm && arm.state === LimbState.ATTACHED) {
      this.gun.position.set(0, -0.25, 0.2);
      arm.mesh.add(this.gun);
      this.gunAttachedTo = armType;
    }
  }

  private detachGun(): void {
    if (this.gun && this.gun.parent) {
      this.gun.parent.remove(this.gun);
    }
  }

  private createStump(limbType: LimbType): void {
    const attachPoint = LIMB_ATTACHMENT_POINTS[limbType];

    // Create a small dark red stump at the attachment point
    const stumpGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.1, 8);
    const stumpMaterial = new THREE.MeshStandardMaterial({
      color: LIMB_COLORS.stump,
      roughness: 0.9,
      metalness: 0.1,
    });

    const stump = new THREE.Mesh(stumpGeometry, stumpMaterial);

    // Position and orient stump based on limb type
    switch (limbType) {
      case LimbType.HEAD:
        stump.position.set(attachPoint.x, attachPoint.y - 0.15, attachPoint.z);
        break;
      case LimbType.LEFT_ARM:
      case LimbType.RIGHT_ARM:
        stump.position.copy(attachPoint);
        stump.rotation.z = limbType === LimbType.LEFT_ARM ? Math.PI / 2 : -Math.PI / 2;
        break;
      case LimbType.LEFT_LEG:
      case LimbType.RIGHT_LEG:
        stump.position.set(attachPoint.x, attachPoint.y + 0.35, attachPoint.z);
        break;
    }

    this.limbMeshes.add(stump);
  }

  private flashLimbDamage(limb: LimbData): void {
    if (limb.state === LimbState.SEVERED) return;

    const material = limb.mesh.material as THREE.MeshStandardMaterial;
    material.emissive.setHex(0xff0000);

    setTimeout(() => {
      if (material) {
        material.emissive.setHex(0x000000);
      }
    }, 100);
  }

  // Legacy damage method for compatibility
  public takeDamage(amount: number): void {
    // Distribute damage to torso by default
    this.takeLimbDamage(
      LimbType.TORSO,
      amount,
      this.position.clone().add(new THREE.Vector3(0, 0, 1))
    );
  }

  public applyKnockback(force: THREE.Vector3): void {
    // Calculate knockback resistance based on state
    let resistMultiplier = 1.0;
    if (this.isCrawling) {
      resistMultiplier *= KNOCKBACK_CONFIG.CRAWLING_KNOCKBACK_RESIST;
    }

    // Missing legs = more knockback (less stability)
    const leftLeg = this.limbs.get(LimbType.LEFT_LEG);
    const rightLeg = this.limbs.get(LimbType.RIGHT_LEG);
    if (
      leftLeg?.state === LimbState.SEVERED ||
      rightLeg?.state === LimbState.SEVERED
    ) {
      resistMultiplier *= KNOCKBACK_CONFIG.MISSING_LEG_KNOCKBACK_MULT;
    }

    // Calculate knockback velocity from force
    const knockbackVelocity = force
      .clone()
      .multiplyScalar(KNOCKBACK_CONFIG.FORCE_TO_VELOCITY * resistMultiplier);

    // If already staggered, stack with diminishing returns
    if (this.combatState === EnemyCombatState.STAGGERED) {
      knockbackVelocity.multiplyScalar(KNOCKBACK_CONFIG.STACKING_DIMINISH);
      this.knockbackState.velocity.add(knockbackVelocity);
    } else {
      // Fresh knockback - save pre-knockback rotation
      this.knockbackState.preKnockbackRotation.copy(this.currentRotation);
      this.knockbackState.velocity.copy(knockbackVelocity);
    }

    // Clamp max velocity
    if (
      this.knockbackState.velocity.length() >
      KNOCKBACK_CONFIG.MAX_KNOCKBACK_VELOCITY
    ) {
      this.knockbackState.velocity
        .normalize()
        .multiplyScalar(KNOCKBACK_CONFIG.MAX_KNOCKBACK_VELOCITY);
    }

    // Calculate stagger duration based on force magnitude
    const forceMagnitude = force.length();
    const staggerDuration = Math.min(
      KNOCKBACK_CONFIG.MAX_STAGGER_DURATION,
      Math.max(
        KNOCKBACK_CONFIG.MIN_STAGGER_DURATION,
        KNOCKBACK_CONFIG.MIN_STAGGER_DURATION +
          forceMagnitude * KNOCKBACK_CONFIG.STAGGER_DURATION_PER_FORCE
      )
    );

    // Extend stagger time if already staggered, or set new
    this.knockbackState.staggerTimeRemaining = Math.max(
      this.knockbackState.staggerTimeRemaining,
      staggerDuration
    );

    // Set wobble and impact direction for visuals
    this.knockbackState.wobbleIntensity = Math.min(1.0, forceMagnitude / 20);
    this.knockbackState.lastImpactDirection.copy(force).normalize();

    // Enter stagger state
    this.combatState = EnemyCombatState.STAGGERED;
  }

  /**
   * Update knockback physics - called from main update()
   */
  private updateKnockbackPhysics(deltaTime: number): void {
    if (this.combatState === EnemyCombatState.NORMAL) return;

    if (this.combatState === EnemyCombatState.STAGGERED) {
      this.updateStaggerState(deltaTime);
    } else if (this.combatState === EnemyCombatState.RECOVERING) {
      this.updateRecoveryState(deltaTime);
    }
  }

  /**
   * Handle stagger state - enemy is being pushed and can't act
   */
  private updateStaggerState(deltaTime: number): void {
    // Apply knockback velocity to position
    const displacement = this.knockbackState.velocity
      .clone()
      .multiplyScalar(deltaTime);
    this.position.add(displacement);
    this.mesh.position.copy(this.position);

    // Decay velocity (friction) - frame-rate independent
    this.knockbackState.velocity.multiplyScalar(
      Math.pow(KNOCKBACK_CONFIG.VELOCITY_DECAY, deltaTime * 60)
    );

    // Apply gravity to vertical component (if airborne from knockback)
    if (this.position.y > 0) {
      this.knockbackState.velocity.y -=
        9.8 * KNOCKBACK_CONFIG.GRAVITY_MULTIPLIER * deltaTime;
    }

    // Ground collision
    if (this.position.y < 0) {
      this.position.y = 0;
      this.knockbackState.velocity.y = 0;
      this.mesh.position.copy(this.position);
    }

    // Update visual wobble
    this.updateStaggerWobble(deltaTime);

    // Decay stagger timer
    this.knockbackState.staggerTimeRemaining -= deltaTime;

    // Check for stagger end
    const velocityMagnitude = this.knockbackState.velocity.length();
    if (
      this.knockbackState.staggerTimeRemaining <= 0 &&
      velocityMagnitude < KNOCKBACK_CONFIG.MIN_VELOCITY_THRESHOLD
    ) {
      this.beginRecovery();
    }
  }

  /**
   * Update visual wobble during stagger
   */
  private updateStaggerWobble(deltaTime: number): void {
    // Update wobble phase
    this.knockbackState.wobblePhase +=
      deltaTime * KNOCKBACK_CONFIG.WOBBLE_FREQUENCY;

    // Decay wobble intensity - frame-rate independent
    this.knockbackState.wobbleIntensity *= Math.pow(
      KNOCKBACK_CONFIG.WOBBLE_DECAY,
      deltaTime * 60
    );

    // Calculate wobble rotation
    const wobbleX =
      Math.sin(this.knockbackState.wobblePhase) *
      this.knockbackState.wobbleIntensity *
      KNOCKBACK_CONFIG.WOBBLE_INTENSITY;
    const wobbleZ =
      Math.cos(this.knockbackState.wobblePhase * 1.3) *
      this.knockbackState.wobbleIntensity *
      KNOCKBACK_CONFIG.WOBBLE_INTENSITY;

    // Add lean based on knockback direction
    const leanAngle = this.knockbackState.wobbleIntensity * 0.3;
    const leanX = -this.knockbackState.lastImpactDirection.z * leanAngle;
    const leanZ = this.knockbackState.lastImpactDirection.x * leanAngle;

    // Apply to torso for stumble effect
    const torso = this.limbs.get(LimbType.TORSO);
    if (torso?.state === LimbState.ATTACHED) {
      torso.mesh.rotation.x = wobbleX + leanX;
      torso.mesh.rotation.z = wobbleZ + leanZ;
    }

    // Head wobbles more
    const head = this.limbs.get(LimbType.HEAD);
    if (head?.state === LimbState.ATTACHED) {
      head.mesh.rotation.x = wobbleX * 1.5;
      head.mesh.rotation.z = wobbleZ * 1.5;
    }

    // Arms flail
    const leftArm = this.limbs.get(LimbType.LEFT_ARM);
    const rightArm = this.limbs.get(LimbType.RIGHT_ARM);
    if (leftArm?.state === LimbState.ATTACHED) {
      leftArm.mesh.rotation.x =
        Math.sin(this.knockbackState.wobblePhase * 2) *
        this.knockbackState.wobbleIntensity *
        0.5;
      leftArm.mesh.rotation.z = 0.3 + wobbleZ;
    }
    if (rightArm?.state === LimbState.ATTACHED) {
      rightArm.mesh.rotation.x =
        Math.sin(this.knockbackState.wobblePhase * 2 + 1) *
        this.knockbackState.wobbleIntensity *
        0.5;
      rightArm.mesh.rotation.z = -0.3 - wobbleZ;
    }
  }

  /**
   * Begin recovery phase - enemy reorients to face player
   */
  private beginRecovery(): void {
    this.combatState = EnemyCombatState.RECOVERING;
    this.recoveryProgress = 0;

    // Calculate target rotation (face toward player if we have a target)
    if (this.targetPosition) {
      const lookDir = new THREE.Vector3()
        .subVectors(this.targetPosition, this.position)
        .setY(0)
        .normalize();

      const tempObj = new THREE.Object3D();
      tempObj.position.copy(this.position);
      tempObj.lookAt(this.position.clone().add(lookDir));
      this.targetRecoveryRotation.copy(tempObj.quaternion);
    } else {
      // If no target, just stabilize to current facing
      this.targetRecoveryRotation.copy(this.currentRotation);
    }

    // Reset wobble
    this.knockbackState.wobbleIntensity = 0;
  }

  /**
   * Handle recovery state - enemy is reorienting
   */
  private updateRecoveryState(deltaTime: number): void {
    // Progress recovery
    this.recoveryProgress += deltaTime / KNOCKBACK_CONFIG.RECOVERY_DURATION;

    // Smooth interpolation using easeOutQuad for natural feel
    const easedProgress =
      1 - Math.pow(1 - Math.min(1, this.recoveryProgress), 2);

    // Interpolate body rotation toward target
    this.currentRotation.slerp(
      this.targetRecoveryRotation,
      easedProgress * KNOCKBACK_CONFIG.RECOVERY_ROTATION_SPEED * deltaTime
    );
    this.mesh.quaternion.copy(this.currentRotation);

    // Gradually reset limb poses
    this.resetLimbPosesSmooth(easedProgress);

    // Check for recovery complete
    if (this.recoveryProgress >= 1) {
      this.combatState = EnemyCombatState.NORMAL;
      this.knockbackState.velocity.set(0, 0, 0);
      this.resetToIdlePose();
    }
  }

  /**
   * Smoothly reset limb poses during recovery
   */
  private resetLimbPosesSmooth(progress: number): void {
    this.limbs.forEach((limb, limbType) => {
      if (limb.state !== LimbState.ATTACHED) return;

      // Lerp rotation toward zero
      limb.mesh.rotation.x = THREE.MathUtils.lerp(
        limb.mesh.rotation.x,
        0,
        progress
      );
      limb.mesh.rotation.z = THREE.MathUtils.lerp(
        limb.mesh.rotation.z,
        0,
        progress
      );

      // Lerp position toward attachment point (except for crawling)
      if (!this.isCrawling) {
        limb.mesh.position.lerp(LIMB_ATTACHMENT_POINTS[limbType], progress * 0.1);
      }
    });
  }

  /**
   * Check if enemy is currently staggered (for AI/combat checks)
   */
  public isStaggered(): boolean {
    return this.combatState === EnemyCombatState.STAGGERED;
  }

  /**
   * Check if enemy is recovering from knockback
   */
  public isRecovering(): boolean {
    return this.combatState === EnemyCombatState.RECOVERING;
  }

  /**
   * Check if enemy can perform actions (not staggered/recovering)
   */
  public canAct(): boolean {
    return this.combatState === EnemyCombatState.NORMAL;
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public setTarget(position: THREE.Vector3): void {
    this.targetPosition = position.clone();
  }

  public setCollidables(collidables: THREE.Object3D[]): void {
    this.collidables = collidables;
  }

  public canFire(): boolean {
    return this.canShoot && this.fireCooldown <= 0;
  }

  public fire(): void {
    this.fireCooldown = 1 / this.config.fireRate;
  }

  public isInAttackRange(position: THREE.Vector3): boolean {
    return this.position.distanceTo(position) <= this.config.attackRange;
  }

  public getFirePosition(): THREE.Vector3 {
    // Return position of the gun if we have one
    if (this.gun && this.canShoot) {
      const gunWorldPos = new THREE.Vector3();
      this.gun.getWorldPosition(gunWorldPos);
      return gunWorldPos;
    }
    return this.position.clone().add(new THREE.Vector3(0, 0.9, 0));
  }

  public getFireDirection(): THREE.Vector3 {
    if (!this.targetPosition) return new THREE.Vector3(0, 0, 1);

    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.getFirePosition())
      .normalize();

    // Apply accuracy penalty if using off-hand
    if (this.accuracyPenalty > 0) {
      direction.x += (Math.random() - 0.5) * this.accuracyPenalty;
      direction.y += (Math.random() - 0.5) * this.accuracyPenalty * 0.5;
      direction.z += (Math.random() - 0.5) * this.accuracyPenalty;
      direction.normalize();
    }

    return direction;
  }

  // Get all attached limbs for hit detection
  public getAttachedLimbs(): LimbData[] {
    const attached: LimbData[] = [];
    this.limbs.forEach((limb) => {
      if (limb.state === LimbState.ATTACHED) {
        attached.push(limb);
      }
    });
    return attached;
  }

  public destroy(): void {
    // Clean up all limb meshes
    this.limbs.forEach((limb) => {
      if (limb.mesh.geometry) {
        limb.mesh.geometry.dispose();
      }
      if (limb.mesh.material) {
        if (Array.isArray(limb.mesh.material)) {
          limb.mesh.material.forEach((m) => m.dispose());
        } else {
          limb.mesh.material.dispose();
        }
      }
    });

    // Clean up gun
    if (this.gun) {
      if (this.gun.geometry) this.gun.geometry.dispose();
      if (this.gun.material) {
        if (Array.isArray(this.gun.material)) {
          this.gun.material.forEach((m) => m.dispose());
        } else {
          this.gun.material.dispose();
        }
      }
    }

    super.destroy();
  }
}
