import * as THREE from 'three';
import { ThemeType } from '@/config/themeConfig';
import { LAYER_WEAPON } from '../core/SceneManager';

/**
 * First-person weapon view model that renders the bazooka/rocket launcher
 * in front of the camera.
 */
export class WeaponViewModel {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private weaponGroup: THREE.Group;
  private theme: ThemeType;

  // Animation state
  private bobTime: number = 0;
  private recoilAmount: number = 0;
  private recoilRecoverySpeed: number = 8;

  // Bob settings
  private bobSpeed: number = 8;
  private bobAmountX: number = 0.02;
  private bobAmountY: number = 0.015;

  // Position offsets
  private baseOffset: THREE.Vector3 = new THREE.Vector3(0.35, -0.35, -0.8);

  // Muzzle offset relative to weapon group (where the barrel ends)
  private muzzleLocalOffset: THREE.Vector3 = new THREE.Vector3(0, 0, -0.66);

  constructor(scene: THREE.Scene, camera: THREE.Camera, theme: ThemeType = 'DEFAULT') {
    this.scene = scene;
    this.camera = camera;
    this.theme = theme;

    this.weaponGroup = theme === 'CHRISTMAS'
      ? this.createCandyCaneWeapon()
      : this.createDefaultWeapon();

    // Add to scene
    this.scene.add(this.weaponGroup);
  }

  private createDefaultWeapon(): THREE.Group {
    const group = new THREE.Group();

    // Materials
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.3,
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      metalness: 0.2,
      roughness: 0.8,
    });

    const warningMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.3,
      roughness: 0.5,
    });

    // Main tube (barrel)
    const tubeGeometry = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 16);
    const tube = new THREE.Mesh(tubeGeometry, metalMaterial);
    tube.rotation.x = Math.PI / 2;
    tube.position.z = -0.1;
    group.add(tube);

    // Front flare/muzzle
    const muzzleGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.12, 16);
    const muzzle = new THREE.Mesh(muzzleGeometry, darkMetalMaterial);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.z = -0.6;
    group.add(muzzle);

    // Back end cap
    const backCapGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.1, 16);
    const backCap = new THREE.Mesh(backCapGeometry, darkMetalMaterial);
    backCap.rotation.x = Math.PI / 2;
    backCap.position.z = 0.4;
    group.add(backCap);

    // Sight rail on top
    const railGeometry = new THREE.BoxGeometry(0.02, 0.025, 0.4);
    const rail = new THREE.Mesh(railGeometry, darkMetalMaterial);
    rail.position.set(0, 0.08, -0.1);
    group.add(rail);

    // Front sight
    const frontSightGeometry = new THREE.BoxGeometry(0.015, 0.04, 0.015);
    const frontSight = new THREE.Mesh(frontSightGeometry, warningMaterial);
    frontSight.position.set(0, 0.1, -0.35);
    group.add(frontSight);

    // Rear sight
    const rearSightGeometry = new THREE.BoxGeometry(0.03, 0.035, 0.015);
    const rearSight = new THREE.Mesh(rearSightGeometry, darkMetalMaterial);
    rearSight.position.set(0, 0.1, 0.05);
    group.add(rearSight);

    // Rear sight notch (two prongs)
    const prongGeometry = new THREE.BoxGeometry(0.008, 0.02, 0.008);
    const leftProng = new THREE.Mesh(prongGeometry, darkMetalMaterial);
    leftProng.position.set(-0.012, 0.12, 0.05);
    group.add(leftProng);

    const rightProng = new THREE.Mesh(prongGeometry, darkMetalMaterial);
    rightProng.position.set(0.012, 0.12, 0.05);
    group.add(rightProng);

    // Handle/grip
    const gripGeometry = new THREE.BoxGeometry(0.035, 0.12, 0.06);
    const grip = new THREE.Mesh(gripGeometry, accentMaterial);
    grip.position.set(0, -0.1, 0.15);
    grip.rotation.x = -0.2;
    group.add(grip);

    // Trigger guard
    const guardGeometry = new THREE.TorusGeometry(0.025, 0.006, 8, 12, Math.PI);
    const guard = new THREE.Mesh(guardGeometry, metalMaterial);
    guard.position.set(0, -0.05, 0.1);
    guard.rotation.x = Math.PI / 2;
    guard.rotation.z = Math.PI;
    group.add(guard);

    // Trigger
    const triggerGeometry = new THREE.BoxGeometry(0.008, 0.025, 0.015);
    const trigger = new THREE.Mesh(triggerGeometry, metalMaterial);
    trigger.position.set(0, -0.055, 0.1);
    trigger.rotation.x = 0.3;
    group.add(trigger);

    // Shoulder rest/stock
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.15);
    const stock = new THREE.Mesh(stockGeometry, accentMaterial);
    stock.position.set(0, -0.02, 0.5);
    group.add(stock);

    // Decorative bands on tube
    const bandGeometry = new THREE.TorusGeometry(0.072, 0.008, 8, 16);
    const bandPositions = [-0.3, 0, 0.2];
    bandPositions.forEach(z => {
      const band = new THREE.Mesh(bandGeometry, darkMetalMaterial);
      band.position.z = z;
      group.add(band);
    });

    // Warning stripes near muzzle
    const stripeGeometry = new THREE.CylinderGeometry(0.071, 0.071, 0.03, 16);
    const stripe = new THREE.Mesh(stripeGeometry, warningMaterial);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.z = -0.45;
    group.add(stripe);

    this.applyWeaponRendering(group);

    return group;
  }

  private createCandyCaneWeapon(): THREE.Group {
    const group = new THREE.Group();

    // Christmas candy cane materials
    const redMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc0000,
      metalness: 0.3,
      roughness: 0.5,
    });

    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.4,
    });

    const greenMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      metalness: 0.2,
      roughness: 0.6,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Main candy cane tube (barrel) - red base
    const tubeGeometry = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 16);
    const tube = new THREE.Mesh(tubeGeometry, redMaterial);
    tube.rotation.x = Math.PI / 2;
    tube.position.z = -0.1;
    group.add(tube);

    // White stripes on the candy cane tube
    const stripeCount = 8;
    for (let i = 0; i < stripeCount; i++) {
      const stripeGeometry = new THREE.CylinderGeometry(0.065, 0.075, 0.08, 16);
      const stripe = new THREE.Mesh(stripeGeometry, whiteMaterial);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.z = -0.4 + i * 0.1;
      group.add(stripe);
    }

    // Front flare/muzzle - gold
    const muzzleGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.12, 16);
    const muzzle = new THREE.Mesh(muzzleGeometry, goldMaterial);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.z = -0.6;
    group.add(muzzle);

    // Back end cap - gold
    const backCapGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.1, 16);
    const backCap = new THREE.Mesh(backCapGeometry, goldMaterial);
    backCap.rotation.x = Math.PI / 2;
    backCap.position.z = 0.4;
    group.add(backCap);

    // Sight rail on top - green
    const railGeometry = new THREE.BoxGeometry(0.02, 0.025, 0.4);
    const rail = new THREE.Mesh(railGeometry, greenMaterial);
    rail.position.set(0, 0.08, -0.1);
    group.add(rail);

    // Front sight - gold star shape (simplified as diamond)
    const frontSightGeometry = new THREE.BoxGeometry(0.02, 0.04, 0.02);
    const frontSight = new THREE.Mesh(frontSightGeometry, goldMaterial);
    frontSight.position.set(0, 0.1, -0.35);
    frontSight.rotation.y = Math.PI / 4;
    group.add(frontSight);

    // Rear sight - green
    const rearSightGeometry = new THREE.BoxGeometry(0.03, 0.035, 0.015);
    const rearSight = new THREE.Mesh(rearSightGeometry, greenMaterial);
    rearSight.position.set(0, 0.1, 0.05);
    group.add(rearSight);

    // Handle/grip - green (like a Christmas tree)
    const gripGeometry = new THREE.BoxGeometry(0.035, 0.12, 0.06);
    const grip = new THREE.Mesh(gripGeometry, greenMaterial);
    grip.position.set(0, -0.1, 0.15);
    grip.rotation.x = -0.2;
    group.add(grip);

    // Trigger guard - gold
    const guardGeometry = new THREE.TorusGeometry(0.025, 0.006, 8, 12, Math.PI);
    const guard = new THREE.Mesh(guardGeometry, goldMaterial);
    guard.position.set(0, -0.05, 0.1);
    guard.rotation.x = Math.PI / 2;
    guard.rotation.z = Math.PI;
    group.add(guard);

    // Trigger - gold
    const triggerGeometry = new THREE.BoxGeometry(0.008, 0.025, 0.015);
    const trigger = new THREE.Mesh(triggerGeometry, goldMaterial);
    trigger.position.set(0, -0.055, 0.1);
    trigger.rotation.x = 0.3;
    group.add(trigger);

    // Shoulder rest/stock - green with red trim
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.15);
    const stock = new THREE.Mesh(stockGeometry, greenMaterial);
    stock.position.set(0, -0.02, 0.5);
    group.add(stock);

    // Red trim on stock
    const stockTrimGeometry = new THREE.BoxGeometry(0.085, 0.02, 0.16);
    const stockTrim = new THREE.Mesh(stockTrimGeometry, redMaterial);
    stockTrim.position.set(0, 0.04, 0.5);
    group.add(stockTrim);

    // Gold decorative bands
    const bandGeometry = new THREE.TorusGeometry(0.072, 0.008, 8, 16);
    const bandPositions = [-0.48, 0.35];
    bandPositions.forEach(z => {
      const band = new THREE.Mesh(bandGeometry, goldMaterial);
      band.position.z = z;
      group.add(band);
    });

    // Small holly decoration near muzzle
    // Holly leaves (green cones)
    const hollyLeafGeometry = new THREE.ConeGeometry(0.015, 0.04, 4);
    const hollyLeaf1 = new THREE.Mesh(hollyLeafGeometry, greenMaterial);
    hollyLeaf1.position.set(0.06, 0.04, -0.45);
    hollyLeaf1.rotation.z = Math.PI / 6;
    group.add(hollyLeaf1);

    const hollyLeaf2 = new THREE.Mesh(hollyLeafGeometry, greenMaterial);
    hollyLeaf2.position.set(0.07, 0.02, -0.45);
    hollyLeaf2.rotation.z = -Math.PI / 6;
    group.add(hollyLeaf2);

    // Holly berries (red spheres)
    const berryGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    const berryPositions = [
      [0.055, 0.03, -0.45],
      [0.065, 0.025, -0.46],
      [0.06, 0.02, -0.44],
    ];
    berryPositions.forEach(([x, y, z]) => {
      const berry = new THREE.Mesh(berryGeometry, redMaterial);
      berry.position.set(x, y, z);
      group.add(berry);
    });

    this.applyWeaponRendering(group);

    return group;
  }

  private applyWeaponRendering(group: THREE.Group): void {
    // Put weapon on separate render layer so it renders after world
    // This ensures weapon always appears on top without depth test hacks
    group.traverse((child) => {
      child.layers.set(LAYER_WEAPON);
    });
  }

  public update(deltaTime: number, isMoving: boolean, velocity: THREE.Vector3): void {
    // Update weapon bob based on movement
    if (isMoving && velocity.lengthSq() > 0.01) {
      this.bobTime += deltaTime * this.bobSpeed;
    } else {
      // Slowly return to center when not moving
      this.bobTime = THREE.MathUtils.lerp(this.bobTime, 0, deltaTime * 3);
    }

    // Calculate bob offset
    const bobX = Math.sin(this.bobTime) * this.bobAmountX;
    const bobY = Math.abs(Math.sin(this.bobTime * 2)) * this.bobAmountY;

    // Recover from recoil
    if (this.recoilAmount > 0) {
      this.recoilAmount = Math.max(0, this.recoilAmount - deltaTime * this.recoilRecoverySpeed);
    }

    // Position weapon relative to camera
    const cameraMatrix = new THREE.Matrix4();
    cameraMatrix.copy(this.camera.matrixWorld);

    // Calculate final position with bob and recoil
    const offset = this.baseOffset.clone();
    offset.x += bobX;
    offset.y += bobY;
    offset.z += this.recoilAmount * 0.15; // Recoil pushes weapon back

    // Apply offset in camera space
    const worldOffset = offset.clone().applyMatrix4(
      new THREE.Matrix4().extractRotation(cameraMatrix)
    );

    this.weaponGroup.position.copy(this.camera.position).add(worldOffset);

    // Match camera rotation with slight recoil rotation
    this.weaponGroup.quaternion.copy(this.camera.quaternion);

    // Add recoil rotation (pitch up)
    const recoilRotation = new THREE.Quaternion();
    recoilRotation.setFromEuler(new THREE.Euler(-this.recoilAmount * 0.3, 0, 0));
    this.weaponGroup.quaternion.multiply(recoilRotation);
  }

  public triggerRecoil(): void {
    this.recoilAmount = 1;
  }

  /**
   * Get the world position of the muzzle (where projectiles should spawn)
   */
  public getMuzzlePosition(): THREE.Vector3 {
    const muzzleWorld = this.muzzleLocalOffset.clone();
    this.weaponGroup.localToWorld(muzzleWorld);
    return muzzleWorld;
  }

  /**
   * Get the forward direction the weapon is pointing
   */
  public getMuzzleDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.weaponGroup.quaternion);
    return direction.normalize();
  }

  public dispose(): void {
    this.weaponGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.weaponGroup);
  }
}
