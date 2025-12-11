import * as THREE from 'three';
import { ProceduralTextures } from '../utils/ProceduralTextures';

interface SmokeParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startSize: number;
  targetSize: number;
  rotationSpeed: number;
}

export class SmokeSystem {
  private scene: THREE.Scene;
  private particles: SmokeParticle[] = [];
  private maxParticles: number;
  private smokeTexture: THREE.Texture;

  // Base material to clone from (avoids recreating material properties each time)
  private baseMaterial: THREE.SpriteMaterial;

  constructor(scene: THREE.Scene, maxParticles: number = 200) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.smokeTexture = ProceduralTextures.createSmokeTexture();

    // Create base material with common settings
    this.baseMaterial = new THREE.SpriteMaterial({
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.NormalBlending,
      color: new THREE.Color(0.4, 0.4, 0.4),
    });
  }

  public emit(
    position: THREE.Vector3,
    count: number = 1,
    options: {
      velocity?: THREE.Vector3;
      size?: number;
      life?: number;
      color?: THREE.Color;
    } = {}
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) return;

      // Clone from base material (faster than creating new)
      const material = this.baseMaterial.clone();
      if (options.color) {
        material.color = options.color;
      }

      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);

      // Add slight random offset
      sprite.position.x += (Math.random() - 0.5) * 0.5;
      sprite.position.z += (Math.random() - 0.5) * 0.5;

      const startSize = (options.size || 0.5) * (0.8 + Math.random() * 0.4);
      sprite.scale.setScalar(startSize);

      const baseVelocity = options.velocity || new THREE.Vector3(0, 2, 0);
      const velocity = new THREE.Vector3(
        baseVelocity.x + (Math.random() - 0.5) * 1,
        baseVelocity.y + Math.random() * 1.5,
        baseVelocity.z + (Math.random() - 0.5) * 1
      );

      const maxLife = (options.life || 2) * (0.8 + Math.random() * 0.4);

      this.particles.push({
        sprite,
        velocity,
        life: maxLife,
        maxLife,
        startSize,
        targetSize: startSize * 3,
        rotationSpeed: (Math.random() - 0.5) * 2,
      });

      this.scene.add(sprite);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position with deceleration
      p.sprite.position.add(p.velocity.clone().multiplyScalar(deltaTime));

      // Slow down horizontal movement, maintain vertical rise
      p.velocity.x *= 0.98;
      p.velocity.z *= 0.98;
      p.velocity.y *= 0.99;

      // Update life
      p.life -= deltaTime;

      const progress = 1 - p.life / p.maxLife;

      // Expand over time
      const currentSize = p.startSize + (p.targetSize - p.startSize) * progress;
      p.sprite.scale.setScalar(currentSize);

      // Fade out
      const material = p.sprite.material as THREE.SpriteMaterial;
      material.opacity = 0.5 * (1 - progress * progress); // Quadratic fade

      // Rotate
      material.rotation += p.rotationSpeed * deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.sprite);
      (p.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.particles = [];
  }

  public dispose(): void {
    this.clear();
    this.baseMaterial.dispose();
    this.smokeTexture.dispose();
  }
}
