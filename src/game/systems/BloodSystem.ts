import * as THREE from 'three';
import { LIMB_COLORS, LIMB_PERFORMANCE_LIMITS } from '@/config/limbConfig';

interface BloodParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

interface BloodDecal {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class BloodSystem {
  private scene: THREE.Scene;

  // Particle system
  private particles: BloodParticle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleMesh: THREE.Points;
  private positionAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  private readonly maxParticles: number;

  // Decal system (blood splats on ground)
  private decals: BloodDecal[] = [];
  private readonly maxDecals: number;
  private decalGeometry: THREE.CircleGeometry;

  // Physics
  private readonly GRAVITY = 25;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.maxParticles = LIMB_PERFORMANCE_LIMITS.maxBloodParticles;
    this.maxDecals = LIMB_PERFORMANCE_LIMITS.maxBloodDecals;

    // Initialize particle system
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);

    this.particleGeometry.setAttribute('position', this.positionAttribute);
    this.particleGeometry.setAttribute('size', this.sizeAttribute);

    this.particleMaterial = new THREE.PointsMaterial({
      color: LIMB_COLORS.blood,
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    // Shared decal geometry
    this.decalGeometry = new THREE.CircleGeometry(1, 12);
  }

  public emitSpray(origin: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        // Remove oldest particle
        this.particles.shift();
      }

      // Random spherical direction with upward bias
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6; // More horizontal spread
      const speed = 8 + Math.random() * 15;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.8 + 5, // Upward bias
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.particles.push({
        position: origin.clone(),
        velocity,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.5 + Math.random() * 0.4,
        size: 0.06 + Math.random() * 0.08,
      });
    }
  }

  public emitDroplet(position: THREE.Vector3): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    this.particles.push({
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        -2 - Math.random() * 3,
        (Math.random() - 0.5) * 3
      ),
      life: 0.6,
      maxLife: 0.6,
      size: 0.04 + Math.random() * 0.04,
    });
  }

  public emitSplat(position: THREE.Vector3): void {
    // Remove oldest decal if at capacity
    if (this.decals.length >= this.maxDecals) {
      const oldest = this.decals.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    // Random size for variety
    const size = 0.2 + Math.random() * 0.4;

    const material = new THREE.MeshBasicMaterial({
      color: LIMB_COLORS.blood,
      transparent: true,
      opacity: 0.7 + Math.random() * 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const splat = new THREE.Mesh(this.decalGeometry.clone(), material);
    splat.scale.set(size, size, 1);
    splat.rotation.x = -Math.PI / 2;

    // Slight random rotation for variety
    splat.rotation.z = Math.random() * Math.PI * 2;

    splat.position.copy(position);
    splat.position.y = 0.02; // Just above ground

    const decal: BloodDecal = {
      mesh: splat,
      life: 30, // 30 seconds
      maxLife: 30,
    };

    this.decals.push(decal);
    this.scene.add(splat);
  }

  public update(deltaTime: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Apply gravity
      particle.velocity.y -= this.GRAVITY * deltaTime;

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Ground collision - create splat
      if (particle.position.y < 0.02 && particle.velocity.y < 0) {
        // Chance to create a small splat
        if (Math.random() < 0.3) {
          this.emitSplat(particle.position.clone());
        }
        // Remove particle
        this.particles.splice(i, 1);
        continue;
      }

      // Update life
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update particle geometry
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const particle = this.particles[i];
        const i3 = i * 3;

        this.positionAttribute.array[i3] = particle.position.x;
        this.positionAttribute.array[i3 + 1] = particle.position.y;
        this.positionAttribute.array[i3 + 2] = particle.position.z;

        // Fade size with life
        const lifeRatio = particle.life / particle.maxLife;
        (this.sizeAttribute.array as Float32Array)[i] = particle.size * lifeRatio;
      } else {
        // Hide unused particles
        const i3 = i * 3;
        this.positionAttribute.array[i3] = 0;
        this.positionAttribute.array[i3 + 1] = -1000;
        this.positionAttribute.array[i3 + 2] = 0;
        (this.sizeAttribute.array as Float32Array)[i] = 0;
      }
    }

    this.positionAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;

    // Update decals (fade over time)
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const decal = this.decals[i];
      decal.life -= deltaTime;

      // Start fading in last 5 seconds
      if (decal.life < 5) {
        const opacity = (decal.life / 5) * 0.7;
        (decal.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
      }

      if (decal.life <= 0) {
        this.scene.remove(decal.mesh);
        decal.mesh.geometry.dispose();
        (decal.mesh.material as THREE.Material).dispose();
        this.decals.splice(i, 1);
      }
    }
  }

  public getActiveParticleCount(): number {
    return this.particles.length;
  }

  public getActiveDecalCount(): number {
    return this.decals.length;
  }

  public destroy(): void {
    // Clean up particles
    this.scene.remove(this.particleMesh);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();

    // Clean up decals
    for (const decal of this.decals) {
      this.scene.remove(decal.mesh);
      decal.mesh.geometry.dispose();
      (decal.mesh.material as THREE.Material).dispose();
    }
    this.decals = [];

    this.decalGeometry.dispose();
  }
}
