import * as THREE from 'three';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export class ScorchMark {
  private mesh: THREE.Mesh;
  private scene: THREE.Scene;
  private lifetime: number;
  private fadeTime: number = 5;
  private age: number = 0;
  public isActive: boolean = true;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    radius: number,
    lifetime: number = 30,
    normal?: THREE.Vector3
  ) {
    this.scene = scene;
    this.lifetime = lifetime;

    // Create circular decal geometry
    const geometry = new THREE.CircleGeometry(radius * 0.9, 24);

    // Create scorch texture
    const texture = ProceduralTextures.createScorchTexture();

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);

    // Orient based on surface normal
    if (normal) {
      // Offset slightly from surface to prevent z-fighting
      const offset = normal.clone().multiplyScalar(0.02);
      this.mesh.position.add(offset);

      // CircleGeometry faces +Z by default
      // Rotate from default (0,0,1) to the surface normal
      const defaultNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(defaultNormal, normal);
      this.mesh.quaternion.copy(quaternion);
    } else {
      // Default: lay flat on ground (legacy behavior)
      this.mesh.position.y = 0.02;
      this.mesh.rotation.x = -Math.PI / 2;
    }

    // Random rotation around the normal axis for variety
    this.mesh.rotateZ(Math.random() * Math.PI * 2);

    this.scene.add(this.mesh);
  }

  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;

    this.age += deltaTime;

    // Start fading after lifetime
    if (this.age > this.lifetime) {
      const fadeProgress = (this.age - this.lifetime) / this.fadeTime;
      const material = this.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.8 * (1 - fadeProgress);

      if (fadeProgress >= 1) {
        this.dispose();
        return false;
      }
    }

    return true;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    (this.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
    (this.mesh.material as THREE.MeshBasicMaterial).dispose();
    this.mesh.geometry.dispose();
    this.isActive = false;
  }
}
