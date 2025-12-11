import * as THREE from 'three';

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export interface ParticleEmitConfig {
  velocity?: THREE.Vector3;
  acceleration?: THREE.Vector3;
  color?: THREE.Color;
  size?: number;
  maxLife?: number;
}

export class ParticleSystem {
  protected particles: ParticleData[] = [];
  protected geometry: THREE.BufferGeometry;
  protected material: THREE.PointsMaterial;
  protected points: THREE.Points;
  protected scene: THREE.Scene;
  protected maxParticles: number;

  // Reusable Vector3 instances to avoid allocations
  private tempVec1: THREE.Vector3 = new THREE.Vector3();
  private tempVec2: THREE.Vector3 = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    maxParticles: number = 1000,
    options: {
      size?: number;
      color?: THREE.Color;
      texture?: THREE.Texture;
      blending?: THREE.Blending;
      transparent?: boolean;
      depthWrite?: boolean;
    } = {}
  ) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.geometry = new THREE.BufferGeometry();

    // Initialize buffers
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: options.size ?? 0.2,
      vertexColors: true,
      transparent: options.transparent ?? true,
      blending: options.blending ?? THREE.AdditiveBlending,
      depthWrite: options.depthWrite ?? false,
      map: options.texture,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public emit(origin: THREE.Vector3, count: number, config: ParticleEmitConfig): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const particle: ParticleData = {
        position: origin.clone(),
        velocity: config.velocity?.clone() || new THREE.Vector3(),
        acceleration: config.acceleration?.clone() || new THREE.Vector3(0, -9.8, 0),
        color: config.color?.clone() || new THREE.Color(1, 1, 1),
        size: config.size || 0.2,
        life: config.maxLife || 1,
        maxLife: config.maxLife || 1,
      };

      this.particles.push(particle);
    }
  }

  public emitWithRandomness(
    origin: THREE.Vector3,
    count: number,
    config: ParticleEmitConfig,
    randomness: {
      velocitySpread?: THREE.Vector3;
      sizeVariation?: number;
      lifeVariation?: number;
    } = {}
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const baseVelocity = config.velocity?.clone() || new THREE.Vector3();
      const spread = randomness.velocitySpread || new THREE.Vector3();

      const velocity = new THREE.Vector3(
        baseVelocity.x + (Math.random() - 0.5) * spread.x * 2,
        baseVelocity.y + (Math.random() - 0.5) * spread.y * 2,
        baseVelocity.z + (Math.random() - 0.5) * spread.z * 2
      );

      const sizeVar = randomness.sizeVariation || 0;
      const size = (config.size || 0.2) * (1 + (Math.random() - 0.5) * sizeVar * 2);

      const lifeVar = randomness.lifeVariation || 0;
      const maxLife = (config.maxLife || 1) * (1 + (Math.random() - 0.5) * lifeVar * 2);

      const particle: ParticleData = {
        position: origin.clone(),
        velocity,
        acceleration: config.acceleration?.clone() || new THREE.Vector3(0, -9.8, 0),
        color: config.color?.clone() || new THREE.Color(1, 1, 1),
        size,
        life: maxLife,
        maxLife,
      };

      this.particles.push(particle);
    }
  }

  public update(deltaTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    // Process particles and compact the array
    let writeIndex = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update physics using reusable vectors to avoid allocations
      this.tempVec1.copy(p.acceleration).multiplyScalar(deltaTime);
      p.velocity.add(this.tempVec1);
      this.tempVec2.copy(p.velocity).multiplyScalar(deltaTime);
      p.position.add(this.tempVec2);
      p.life -= deltaTime;

      if (p.life <= 0) {
        continue; // Skip dead particles
      }

      // Keep this particle - move to write position if needed
      if (writeIndex !== i) {
        this.particles[writeIndex] = p;
      }

      // Update buffers at the compacted position
      const lifeRatio = p.life / p.maxLife;
      positions[writeIndex * 3] = p.position.x;
      positions[writeIndex * 3 + 1] = p.position.y;
      positions[writeIndex * 3 + 2] = p.position.z;
      colors[writeIndex * 3] = p.color.r * lifeRatio;
      colors[writeIndex * 3 + 1] = p.color.g * lifeRatio;
      colors[writeIndex * 3 + 2] = p.color.b * lifeRatio;
      sizes[writeIndex] = p.size * lifeRatio;

      writeIndex++;
    }

    // Trim the array to only keep live particles
    this.particles.length = writeIndex;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, this.particles.length);
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
