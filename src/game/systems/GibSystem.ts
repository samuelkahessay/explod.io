import * as THREE from 'three';
import { LimbType, GibData } from '../types/LimbTypes';
import {
  LIMB_COLORS,
  DISMEMBERMENT_CONFIG,
  LIMB_PERFORMANCE_LIMITS,
} from '@/config/limbConfig';
import { BloodSystem } from './BloodSystem';

export class GibSystem {
  private scene: THREE.Scene;
  private gibs: GibData[] = [];
  private readonly maxGibs: number;

  // Arcade physics settings
  private readonly GRAVITY: number;
  private readonly BOUNCE_DAMPING: number;
  private readonly MAX_BOUNCES: number;
  private readonly GROUND_Y = 0.05;

  // Blood trail system reference
  private bloodSystem: BloodSystem | null = null;

  // Shared geometries for meat chunks (performance optimization)
  private chunkGeometries: THREE.BufferGeometry[] = [];

  // Shared materials for meat chunks (reduces material instances)
  private chunkMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, bloodSystem?: BloodSystem) {
    this.scene = scene;
    this.maxGibs = LIMB_PERFORMANCE_LIMITS.maxGibs;
    this.bloodSystem = bloodSystem || null;

    // Arcade-style floaty physics
    this.GRAVITY = 15 * DISMEMBERMENT_CONFIG.gibGravityMultiplier;
    this.BOUNCE_DAMPING = DISMEMBERMENT_CONFIG.gibBounceDamping;
    this.MAX_BOUNCES = DISMEMBERMENT_CONFIG.gibBounces;

    // Create shared chunk geometries
    this.chunkGeometries = [
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.TetrahedronGeometry(0.1),
      new THREE.BoxGeometry(0.08, 0.15, 0.08),
      new THREE.SphereGeometry(0.08, 4, 4),
    ];

    // Create shared materials with color variations (pre-allocated for performance)
    const bodyColor = new THREE.Color(LIMB_COLORS.body);
    const bloodColor = new THREE.Color(LIMB_COLORS.blood);
    for (let i = 0; i < 8; i++) {
      const lerp = i / 7; // 0 to 1 in 8 steps
      const color = bodyColor.clone().lerp(bloodColor, lerp);
      this.chunkMaterials.push(
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.9,
          metalness: 0.1,
        })
      );
    }
  }

  public setBloodSystem(bloodSystem: BloodSystem): void {
    this.bloodSystem = bloodSystem;
  }

  public emitLimbGib(
    limbMesh: THREE.Mesh,
    worldPosition: THREE.Vector3,
    explosionCenter: THREE.Vector3,
    limbType: LimbType
  ): void {
    // Remove oldest gib if at capacity
    if (this.gibs.length >= this.maxGibs) {
      this.removeGib(0);
    }

    // Clone the mesh for the gib
    const gibMesh = limbMesh.clone();
    gibMesh.position.copy(worldPosition);

    // Make sure material is cloned too
    if (gibMesh.material) {
      gibMesh.material = (gibMesh.material as THREE.Material).clone();
    }

    // Add blood stump cap to the severed end
    this.addStumpCap(gibMesh, limbType);

    // Calculate explosive velocity - arcade style!
    const direction = new THREE.Vector3()
      .subVectors(worldPosition, explosionCenter)
      .normalize();

    const baseForce = DISMEMBERMENT_CONFIG.gibExplosionForce;
    const randomness = 0.5 + Math.random() * 0.5;

    // Strong upward bias for dramatic effect
    const velocity = new THREE.Vector3(
      direction.x * baseForce * randomness,
      Math.abs(direction.y) * baseForce * 0.6 + baseForce * 0.8,
      direction.z * baseForce * randomness
    );

    // Add randomization for variety
    velocity.x += (Math.random() - 0.5) * 10;
    velocity.z += (Math.random() - 0.5) * 10;

    // Wild spinning
    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );

    const gib: GibData = {
      mesh: gibMesh,
      velocity,
      angularVelocity,
      life: DISMEMBERMENT_CONFIG.gibLifetime,
      bounces: 0,
      isLimb: true,
      limbType,
      trailParticles: true,
    };

    this.gibs.push(gib);
    this.scene.add(gibMesh);
  }

  private addStumpCap(gibMesh: THREE.Mesh, limbType: LimbType): void {
    // Add a dark red cap to show where the limb was severed
    const capGeometry = new THREE.CircleGeometry(0.12, 8);
    const capMaterial = new THREE.MeshBasicMaterial({
      color: LIMB_COLORS.stump,
      side: THREE.DoubleSide,
    });

    const cap = new THREE.Mesh(capGeometry, capMaterial);

    // Position cap at the "severed" end based on limb type
    switch (limbType) {
      case LimbType.HEAD:
        cap.position.set(0, -0.2, 0);
        cap.rotation.x = Math.PI / 2;
        break;
      case LimbType.LEFT_ARM:
      case LimbType.RIGHT_ARM:
        cap.position.set(0, 0.35, 0);
        cap.rotation.x = Math.PI / 2;
        break;
      case LimbType.LEFT_LEG:
      case LimbType.RIGHT_LEG:
        cap.position.set(0, 0.4, 0);
        cap.rotation.x = Math.PI / 2;
        break;
      default:
        cap.position.set(0, 0, 0);
    }

    gibMesh.add(cap);
  }

  public emitDeathGibs(
    limbs: Map<LimbType, { mesh: THREE.Mesh; state: string }>,
    enemyPosition: THREE.Vector3,
    explosionCenter: THREE.Vector3
  ): void {
    // Explode ALL remaining attached limbs
    limbs.forEach((limb, limbType) => {
      if (limb.state === 'attached') {
        const worldPos = new THREE.Vector3();
        limb.mesh.getWorldPosition(worldPos);

        this.emitLimbGib(limb.mesh, worldPos, explosionCenter, limbType);
      }
    });

    // Add extra meat chunks for gore
    const chunkCount = 10 + Math.floor(Math.random() * 8);
    this.emitMeatChunks(enemyPosition, explosionCenter, chunkCount);
  }

  private emitMeatChunks(
    origin: THREE.Vector3,
    explosionCenter: THREE.Vector3,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.gibs.length >= this.maxGibs) break;

      const geometryIndex = Math.floor(Math.random() * this.chunkGeometries.length);
      const geometry = this.chunkGeometries[geometryIndex];

      // Use pre-allocated shared material (randomly selected)
      const materialIndex = Math.floor(Math.random() * this.chunkMaterials.length);
      const material = this.chunkMaterials[materialIndex];

      const chunk = new THREE.Mesh(geometry.clone(), material);

      // Scatter origin positions slightly
      chunk.position.copy(origin);
      chunk.position.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          Math.random() * 0.8,
          (Math.random() - 0.5) * 0.6
        )
      );

      const direction = new THREE.Vector3()
        .subVectors(chunk.position, explosionCenter)
        .normalize();

      const force = DISMEMBERMENT_CONFIG.gibExplosionForce * 0.7;

      // Meat chunks fly with wild trajectories
      const velocity = new THREE.Vector3(
        direction.x * force + (Math.random() - 0.5) * 15,
        force * 0.9 + Math.random() * 12,
        direction.z * force + (Math.random() - 0.5) * 15
      );

      const angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25
      );

      const gib: GibData = {
        mesh: chunk,
        velocity,
        angularVelocity,
        life: DISMEMBERMENT_CONFIG.gibLifetime * 0.6,
        bounces: 0,
        isLimb: false,
        trailParticles: Math.random() > 0.3,
      };

      this.gibs.push(gib);
      this.scene.add(chunk);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const gib = this.gibs[i];

      // Apply floaty gravity
      gib.velocity.y -= this.GRAVITY * deltaTime;

      // Apply air resistance for arcade feel
      gib.velocity.x *= 0.995;
      gib.velocity.z *= 0.995;

      // Update position
      gib.mesh.position.add(gib.velocity.clone().multiplyScalar(deltaTime));

      // Update rotation (wild spinning)
      gib.mesh.rotation.x += gib.angularVelocity.x * deltaTime;
      gib.mesh.rotation.y += gib.angularVelocity.y * deltaTime;
      gib.mesh.rotation.z += gib.angularVelocity.z * deltaTime;

      // Blood trail while moving fast
      if (gib.trailParticles && this.bloodSystem) {
        const speed = gib.velocity.length();
        if (speed > 8 && Math.random() < 0.4) {
          this.bloodSystem.emitDroplet(gib.mesh.position.clone());
        }
      }

      // Ground bounce
      if (gib.mesh.position.y < this.GROUND_Y && gib.velocity.y < 0) {
        if (gib.bounces < this.MAX_BOUNCES) {
          gib.mesh.position.y = this.GROUND_Y;
          gib.velocity.y = -gib.velocity.y * this.BOUNCE_DAMPING;
          gib.velocity.x *= this.BOUNCE_DAMPING;
          gib.velocity.z *= this.BOUNCE_DAMPING;
          gib.angularVelocity.multiplyScalar(0.6);
          gib.bounces++;

          // Blood splat on bounce
          if (this.bloodSystem) {
            this.bloodSystem.emitSplat(gib.mesh.position.clone());
          }
        } else {
          // Settle on ground
          gib.velocity.set(0, 0, 0);
          gib.angularVelocity.multiplyScalar(0.1);
          gib.mesh.position.y = this.GROUND_Y;
        }
      }

      // Keep gibs in bounds (arena walls)
      const ARENA_LIMIT = 19;
      if (Math.abs(gib.mesh.position.x) > ARENA_LIMIT) {
        gib.mesh.position.x = Math.sign(gib.mesh.position.x) * ARENA_LIMIT;
        gib.velocity.x *= -this.BOUNCE_DAMPING;
      }
      if (Math.abs(gib.mesh.position.z) > ARENA_LIMIT) {
        gib.mesh.position.z = Math.sign(gib.mesh.position.z) * ARENA_LIMIT;
        gib.velocity.z *= -this.BOUNCE_DAMPING;
      }

      // Life decay
      gib.life -= deltaTime;

      // Fade out in last second
      if (gib.life < 1) {
        const opacity = Math.max(0, gib.life);

        if (gib.isLimb) {
          // Limbs use their own cloned materials, so can fade opacity
          const material = gib.mesh.material as THREE.MeshStandardMaterial;
          if (material) {
            material.opacity = opacity;
            material.transparent = true;
          }

          // Also fade any children (stump caps)
          gib.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child !== gib.mesh) {
              const childMat = child.material as THREE.MeshBasicMaterial;
              if (childMat) {
                childMat.opacity = opacity;
                childMat.transparent = true;
              }
            }
          });
        } else {
          // Meat chunks use shared materials - scale down instead of fading
          const scale = opacity;
          gib.mesh.scale.setScalar(scale);
        }
      }

      if (gib.life <= 0) {
        this.removeGib(i);
      }
    }
  }

  private removeGib(index: number): void {
    const gib = this.gibs[index];

    // Dispose of resources - but not shared materials for meat chunks
    gib.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        // Only dispose materials for limbs (their own cloned materials)
        // Meat chunks use shared materials that shouldn't be disposed
        if (gib.isLimb && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    this.scene.remove(gib.mesh);
    this.gibs.splice(index, 1);
  }

  public getActiveGibCount(): number {
    return this.gibs.length;
  }

  public destroy(): void {
    // Clean up all gibs
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      this.removeGib(i);
    }

    // Dispose shared geometries
    this.chunkGeometries.forEach((geo) => geo.dispose());

    // Dispose shared materials
    this.chunkMaterials.forEach((mat) => mat.dispose());
  }
}
