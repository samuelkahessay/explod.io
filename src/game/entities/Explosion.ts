import * as THREE from 'three';
import { Entity } from './Entity';
import { ParticleSystem } from '../particles/ParticleSystem';
import { DebrisSystem } from '../particles/DebrisSystem';
import { SmokeSystem } from '../particles/SmokeSystem';
import { ThemeType, getThemeColors } from '@/config/themeConfig';

export class Explosion extends Entity {
  private theme: ThemeType = 'DEFAULT';
  public radius: number = 0;
  public maxRadius: number;
  public duration: number;
  public elapsed: number = 0;

  // Visual components
  private flash: THREE.Mesh | null = null;
  private fireball: THREE.Group | null = null;
  private shockwave: THREE.Mesh | null = null;
  private light: THREE.PointLight;
  private flickerLight: THREE.PointLight | null = null;

  // Particle systems (shared, passed in)
  private sparkParticles: ParticleSystem | null = null;
  private debrisSystem: DebrisSystem | null = null;
  private smokeSystem: SmokeSystem | null = null;

  // Stage tracking
  private flashDone: boolean = false;
  private fireballDone: boolean = false;
  private shockwaveDone: boolean = false;
  private sparksEmitted: boolean = false;
  private debrisEmitted: boolean = false;
  private smokeEmitting: boolean = false;

  // Pool tracking
  private initialized: boolean = false;

  constructor(
    scene: THREE.Scene,
    theme: ThemeType = 'DEFAULT',
    position?: THREE.Vector3,
    maxRadius?: number,
    duration: number = 2,
    particleSystems?: {
      sparks?: ParticleSystem;
      debris?: DebrisSystem;
      smoke?: SmokeSystem;
    }
  ) {
    super(scene, position || new THREE.Vector3());
    this.theme = theme;
    this.maxRadius = maxRadius || 5;
    this.duration = duration;

    // Store particle system references
    if (particleSystems) {
      this.sparkParticles = particleSystems.sparks || null;
      this.debrisSystem = particleSystems.debris || null;
      this.smokeSystem = particleSystems.smoke || null;
    }

    this.light = new THREE.PointLight();
    this.mesh = this.createMesh();

    // Only add to scene and emit if fully initialized (not pooled creation)
    if (position && maxRadius) {
      this.addToScene();
      this.initialized = true;
      this.emitSparks();
      this.emitDebris();
    }
  }

  /**
   * Reset explosion for reuse from pool
   */
  public reset(
    position: THREE.Vector3,
    maxRadius: number,
    duration: number,
    particleSystems: {
      sparks?: ParticleSystem;
      debris?: DebrisSystem;
      smoke?: SmokeSystem;
    }
  ): void {
    this.position.copy(position);
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.elapsed = 0;
    this.radius = 0;
    this.isActive = true;

    // Reset particle systems
    this.sparkParticles = particleSystems.sparks || null;
    this.debrisSystem = particleSystems.debris || null;
    this.smokeSystem = particleSystems.smoke || null;

    // Reset stage tracking
    this.flashDone = false;
    this.fireballDone = false;
    this.shockwaveDone = false;
    this.sparksEmitted = false;
    this.debrisEmitted = false;
    this.smokeEmitting = false;

    // Reset visual components
    this.mesh.position.copy(position);
    this.mesh.visible = true;

    if (this.flash) {
      this.flash.visible = true;
      this.flash.scale.setScalar(this.maxRadius * 0.3);
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 1;
    }

    if (this.fireball) {
      this.fireball.visible = true;
      this.fireball.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        mesh.scale.setScalar(0.8 - i * 0.15);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 - i * 0.15;
      });
    }

    if (this.shockwave) {
      this.shockwave.visible = true;
      this.shockwave.scale.setScalar(1);
      this.shockwave.position.y = -position.y + 0.1;
      (this.shockwave.material as THREE.MeshBasicMaterial).opacity = 0.7;
    }

    // Reset lights
    this.light.intensity = 8;
    this.light.color.setHex(0xffaa44);
    if (this.flickerLight) {
      this.flickerLight.intensity = 4;
    }

    // Add to scene if not already
    if (!this.initialized) {
      this.addToScene();
      this.initialized = true;
    }

    // Emit initial effects
    this.emitSparks();
    this.emitDebris();
  }

  /**
   * Deactivate explosion for return to pool
   */
  public deactivate(): void {
    this.isActive = false;
    this.mesh.visible = false;
  }

  protected createMesh(): THREE.Object3D {
    const group = new THREE.Group();
    group.position.copy(this.position);

    const themeColors = getThemeColors(this.theme);
    const isChristmas = this.theme === 'CHRISTMAS';

    // === FLASH (bright white sphere, very brief) ===
    const flashGeometry = new THREE.SphereGeometry(1, 12, 12);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: themeColors.explosion.flash,
      transparent: true,
      opacity: 1,
    });
    this.flash = new THREE.Mesh(flashGeometry, flashMaterial);
    this.flash.scale.setScalar(this.maxRadius * 0.3);
    group.add(this.flash);

    // === FIREBALL (multi-layer expanding spheres) ===
    this.fireball = new THREE.Group();
    const fireballColors = themeColors.explosion.fireball;
    fireballColors.forEach((color, i) => {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9 - i * 0.15,
        side: THREE.DoubleSide,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.scale.setScalar(0.8 - i * 0.15);
      this.fireball!.add(sphere);
    });
    group.add(this.fireball);

    // === SHOCKWAVE (expanding ring on ground) ===
    const shockwaveGeometry = new THREE.RingGeometry(0.5, 1, 48);
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: themeColors.explosion.shockwave,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    this.shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    this.shockwave.rotation.x = -Math.PI / 2;
    this.shockwave.position.y = -this.position.y + 0.1; // On ground
    group.add(this.shockwave);

    // === MAIN LIGHT ===
    const lightColor = isChristmas ? 0xff6666 : 0xffaa44;
    this.light = new THREE.PointLight(lightColor, 8, this.maxRadius * 6);
    group.add(this.light);

    // === FLICKER LIGHT (secondary, for fire effect) ===
    const flickerColor = isChristmas ? 0x00ff00 : 0xff6600;
    this.flickerLight = new THREE.PointLight(flickerColor, 4, this.maxRadius * 3);
    this.flickerLight.position.y = 0.5;
    group.add(this.flickerLight);

    return group;
  }

  private emitSparks(): void {
    if (this.sparksEmitted || !this.sparkParticles) return;
    this.sparksEmitted = true;

    const isChristmas = this.theme === 'CHRISTMAS';
    const themeColors = getThemeColors(this.theme);

    // Emit fast-moving bright sparks
    const sparkCount = 40 + Math.floor(Math.random() * 20);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.7;
      const speed = 12 + Math.random() * 18;

      // Pick random color from debris colors for Christmas (red, green, gold, silver shards)
      let sparkColor: THREE.Color;
      if (isChristmas) {
        const debrisColors = themeColors.explosion.debris;
        const colorHex = debrisColors[Math.floor(Math.random() * debrisColors.length)];
        sparkColor = new THREE.Color(colorHex);
      } else {
        sparkColor = new THREE.Color(1, 0.8, 0.3);
      }

      this.sparkParticles.emit(this.position.clone(), 1, {
        velocity: new THREE.Vector3(
          Math.sin(elevation) * Math.cos(angle) * speed,
          Math.cos(elevation) * speed * 0.8 + 5,
          Math.sin(elevation) * Math.sin(angle) * speed
        ),
        acceleration: new THREE.Vector3(0, -15, 0),
        color: sparkColor,
        size: 0.15 + Math.random() * 0.15,
        maxLife: 0.3 + Math.random() * 0.4,
      });
    }
  }

  private emitDebris(): void {
    if (this.debrisEmitted || !this.debrisSystem) return;
    this.debrisEmitted = true;

    // Emit debris chunks
    const debrisCount = 8 + Math.floor(Math.random() * 8);
    this.debrisSystem.emitDebris(
      this.position.clone(),
      10 + Math.random() * 8,
      debrisCount
    );
  }

  private emitSmoke(): void {
    if (!this.smokeSystem) return;

    // Emit smoke from explosion center with some randomness
    const smokePos = this.position.clone();
    smokePos.x += (Math.random() - 0.5) * this.maxRadius * 0.5;
    smokePos.z += (Math.random() - 0.5) * this.maxRadius * 0.5;
    smokePos.y += Math.random() * this.maxRadius * 0.3;

    this.smokeSystem.emit(smokePos, 1, {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        2 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      size: 0.8 + Math.random() * 0.6,
      life: 1.5 + Math.random() * 1,
    });
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.elapsed += deltaTime;
    const progress = this.elapsed / this.duration;

    if (progress >= 1) {
      this.isActive = false;
      this.destroy();
      return;
    }

    // === PHASE 1: FLASH (0 - 0.05s) ===
    if (this.elapsed < 0.05 && this.flash) {
      const flashProgress = this.elapsed / 0.05;
      this.flash.scale.setScalar(this.maxRadius * (0.3 + flashProgress * 0.5));
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 1 - flashProgress;
    } else if (!this.flashDone && this.flash) {
      this.flashDone = true;
      this.flash.visible = false;
    }

    // === PHASE 2: FIREBALL (0 - 0.5s) ===
    if (this.elapsed < 0.5 && this.fireball) {
      const fireProgress = this.elapsed / 0.5;
      // Ease out expansion
      const easedProgress = 1 - Math.pow(1 - fireProgress, 3);
      const scale = this.maxRadius * easedProgress;

      this.fireball.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        mesh.scale.setScalar(scale * (0.8 - i * 0.12));
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = (0.9 - i * 0.15) * (1 - fireProgress);
      });

      this.radius = scale;
    } else if (!this.fireballDone && this.fireball) {
      this.fireballDone = true;
      this.fireball.visible = false;
    }

    // === PHASE 3: SHOCKWAVE (0 - 0.35s) ===
    if (this.elapsed < 0.35 && this.shockwave) {
      const shockProgress = this.elapsed / 0.35;
      const easedProgress = 1 - Math.pow(1 - shockProgress, 2);
      const scale = this.maxRadius * 2.5 * easedProgress;
      this.shockwave.scale.setScalar(scale);
      (this.shockwave.material as THREE.MeshBasicMaterial).opacity =
        0.7 * (1 - shockProgress);
    } else if (!this.shockwaveDone && this.shockwave) {
      this.shockwaveDone = true;
      this.shockwave.visible = false;
    }

    // === PHASE 4: CONTINUOUS SMOKE EMISSION (0.1s - 1.2s) ===
    if (this.elapsed > 0.1 && this.elapsed < 1.2) {
      this.smokeEmitting = true;
      // Emit smoke periodically
      if (Math.random() < 0.4) {
        this.emitSmoke();
      }
    }

    // === LIGHT EFFECTS ===
    // Main light fades and changes color (white -> yellow -> orange -> red)
    const lightProgress = Math.min(this.elapsed / 1.5, 1);
    this.light.intensity = 8 * (1 - lightProgress * lightProgress);

    // Color transition
    const hue = 0.12 - lightProgress * 0.1; // Yellow (0.12) to red (0.02)
    const lightColor = new THREE.Color().setHSL(hue, 1, 0.5);
    this.light.color.copy(lightColor);

    // Flicker light
    if (this.flickerLight && this.elapsed < 0.8) {
      const flicker = 0.5 + Math.random() * 0.5;
      this.flickerLight.intensity = 4 * flicker * (1 - this.elapsed / 0.8);
    } else if (this.flickerLight) {
      this.flickerLight.intensity = 0;
    }
  }

  public destroy(): void {
    // Clean up lights
    this.light.dispose();
    if (this.flickerLight) {
      this.flickerLight.dispose();
    }

    // Clean up flash
    if (this.flash) {
      this.flash.geometry.dispose();
      (this.flash.material as THREE.Material).dispose();
    }

    // Clean up fireball
    if (this.fireball) {
      this.fireball.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    }

    // Clean up shockwave
    if (this.shockwave) {
      this.shockwave.geometry.dispose();
      (this.shockwave.material as THREE.Material).dispose();
    }

    super.destroy();
  }
}
