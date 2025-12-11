import * as THREE from 'three';

interface Snowflake {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

export class SnowSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private snowflakes: Snowflake[] = [];

  private readonly MAX_PARTICLES = 500;
  private readonly SPAWN_AREA = 60; // Width/depth of spawn area
  private readonly SPAWN_HEIGHT = 30; // Height at which snow spawns
  private readonly GROUND_LEVEL = 0;

  // Reusable vectors for performance
  private tempVec = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create geometry with pre-allocated buffers
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.MAX_PARTICLES * 3);
    const sizes = new Float32Array(this.MAX_PARTICLES);
    const colors = new Float32Array(this.MAX_PARTICLES * 3);

    // Initialize all positions off-screen
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100; // Below ground
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
      // White color with slight blue tint
      colors[i * 3] = 0.95;
      colors[i * 3 + 1] = 0.97;
      colors[i * 3 + 2] = 1.0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create material with custom vertex sizing
    const material = new THREE.PointsMaterial({
      size: 0.15,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.geometry, material);
    this.scene.add(this.particles);

    // Initialize snowflakes
    this.initializeSnowflakes();
  }

  private initializeSnowflakes(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.snowflakes.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * this.SPAWN_AREA,
          Math.random() * this.SPAWN_HEIGHT,
          (Math.random() - 0.5) * this.SPAWN_AREA
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5, // Slight horizontal drift
          -1.5 - Math.random() * 1.0, // Fall speed (1.5-2.5 units/sec)
          (Math.random() - 0.5) * 0.5
        ),
        size: 0.08 + Math.random() * 0.12, // 0.08 to 0.2
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
      });
    }

    this.updateBuffers();
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.snowflakes.length; i++) {
      const flake = this.snowflakes[i];

      // Update wobble phase
      flake.wobblePhase += flake.wobbleSpeed * deltaTime;

      // Add gentle wobble to horizontal movement
      const wobbleX = Math.sin(flake.wobblePhase) * 0.3;
      const wobbleZ = Math.cos(flake.wobblePhase * 0.7) * 0.3;

      // Update position
      flake.position.x += (flake.velocity.x + wobbleX) * deltaTime;
      flake.position.y += flake.velocity.y * deltaTime;
      flake.position.z += (flake.velocity.z + wobbleZ) * deltaTime;

      // Respawn if below ground or too far from player
      const distFromPlayer = this.tempVec
        .set(flake.position.x - playerPosition.x, 0, flake.position.z - playerPosition.z)
        .length();

      if (flake.position.y < this.GROUND_LEVEL || distFromPlayer > this.SPAWN_AREA) {
        // Respawn above and around player
        flake.position.set(
          playerPosition.x + (Math.random() - 0.5) * this.SPAWN_AREA,
          this.SPAWN_HEIGHT + Math.random() * 5,
          playerPosition.z + (Math.random() - 0.5) * this.SPAWN_AREA
        );

        // Randomize velocity slightly
        flake.velocity.x = (Math.random() - 0.5) * 0.5;
        flake.velocity.z = (Math.random() - 0.5) * 0.5;
      }

      // Update buffer
      positions[i * 3] = flake.position.x;
      positions[i * 3 + 1] = flake.position.y;
      positions[i * 3 + 2] = flake.position.z;
      sizes[i] = flake.size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  private updateBuffers(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.snowflakes.length; i++) {
      const flake = this.snowflakes[i];
      positions[i * 3] = flake.position.x;
      positions[i * 3 + 1] = flake.position.y;
      positions[i * 3 + 2] = flake.position.z;
      sizes[i] = flake.size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.particles);
    this.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
