import * as THREE from 'three';

interface DebrisData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  bounces: number;
}

export class DebrisSystem {
  private scene: THREE.Scene;
  private debris: DebrisData[] = [];
  private maxDebris: number;
  private readonly GRAVITY = 25;
  private readonly BOUNCE_DAMPING = 0.4;
  private readonly MAX_BOUNCES = 3;
  private readonly GROUND_Y = 0.05;

  // Shared geometries for performance
  private geometries: THREE.BufferGeometry[];
  private material: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, maxDebris: number = 100) {
    this.scene = scene;
    this.maxDebris = maxDebris;

    // Pre-create shared geometries
    this.geometries = [
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.BoxGeometry(0.18, 0.06, 0.12),
      new THREE.BoxGeometry(0.08, 0.15, 0.08),
      new THREE.TetrahedronGeometry(0.1),
    ];

    this.material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });
  }

  public emitDebris(
    origin: THREE.Vector3,
    speed: number,
    count: number = 1
  ): void {
    for (let j = 0; j < count; j++) {
      if (this.debris.length >= this.maxDebris) return;

      // Random debris shape
      const geometry =
        this.geometries[Math.floor(Math.random() * this.geometries.length)];

      // Slight color variation
      const shade = 0.2 + Math.random() * 0.2;
      const material = this.material.clone();
      material.color.setRGB(shade, shade * 0.95, shade * 0.9);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(origin);
      mesh.castShadow = true;

      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      // Random outward direction with upward bias
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.4 + 0.1; // Mostly upward

      const adjustedSpeed = speed * (0.7 + Math.random() * 0.6);

      this.debris.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.sin(elevation) * Math.cos(angle) * adjustedSpeed,
          Math.cos(elevation) * adjustedSpeed + Math.random() * 5,
          Math.sin(elevation) * Math.sin(angle) * adjustedSpeed
        ),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
        life: 4 + Math.random() * 3,
        bounces: 0,
      });

      this.scene.add(mesh);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];

      // Apply gravity
      d.velocity.y -= this.GRAVITY * deltaTime;

      // Update position
      d.mesh.position.add(d.velocity.clone().multiplyScalar(deltaTime));

      // Update rotation
      d.mesh.rotation.x += d.angularVelocity.x * deltaTime;
      d.mesh.rotation.y += d.angularVelocity.y * deltaTime;
      d.mesh.rotation.z += d.angularVelocity.z * deltaTime;

      // Ground collision (bounce)
      if (d.mesh.position.y < this.GROUND_Y && d.velocity.y < 0) {
        if (d.bounces < this.MAX_BOUNCES) {
          d.mesh.position.y = this.GROUND_Y;
          d.velocity.y = -d.velocity.y * this.BOUNCE_DAMPING;
          d.velocity.x *= this.BOUNCE_DAMPING;
          d.velocity.z *= this.BOUNCE_DAMPING;
          d.angularVelocity.multiplyScalar(0.6);
          d.bounces++;
        } else {
          // Settle on ground
          d.velocity.set(0, 0, 0);
          d.angularVelocity.set(0, 0, 0);
          d.mesh.position.y = this.GROUND_Y;
        }
      }

      // Life decay and fade out
      d.life -= deltaTime;

      if (d.life < 1) {
        // Fade out in last second
        const opacity = d.life;
        (d.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
        (d.mesh.material as THREE.MeshStandardMaterial).transparent = true;
      }

      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        (d.mesh.material as THREE.Material).dispose();
        this.debris.splice(i, 1);
      }
    }
  }

  public getDebrisCount(): number {
    return this.debris.length;
  }

  public clear(): void {
    this.debris.forEach((d) => {
      this.scene.remove(d.mesh);
      (d.mesh.material as THREE.Material).dispose();
    });
    this.debris = [];
  }

  public dispose(): void {
    this.clear();
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
  }
}
