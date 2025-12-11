import * as THREE from 'three';
import { IEntity } from '../types/GameTypes';

let entityIdCounter = 0;

export abstract class Entity implements IEntity {
  public id: string;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public mesh: THREE.Object3D;
  public isActive: boolean = true;

  protected scene: THREE.Scene;

  constructor(scene: THREE.Scene, position?: THREE.Vector3) {
    this.id = `entity_${entityIdCounter++}`;
    this.scene = scene;
    this.position = position?.clone() ?? new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.mesh = new THREE.Object3D();
  }

  abstract update(deltaTime: number): void;

  protected abstract createMesh(): THREE.Object3D;

  public addToScene(): void {
    this.scene.add(this.mesh);
  }

  public removeFromScene(): void {
    this.scene.remove(this.mesh);
  }

  public destroy(): void {
    this.isActive = false;
    this.removeFromScene();

    // Dispose of geometry and materials recursively
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.mesh.getWorldPosition(new THREE.Vector3());
  }
}
