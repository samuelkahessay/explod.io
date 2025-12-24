import * as THREE from 'three';
import { CollisionResult } from '../types/GameTypes';

export class CollisionUtils {
  private static raycaster = new THREE.Raycaster();
  private static directionScratch = new THREE.Vector3();

  /**
   * Cast a ray and return first intersection
   */
  static raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    objects: THREE.Object3D[],
    maxDistance: number = Infinity
  ): CollisionResult {
    this.directionScratch.copy(direction).normalize();
    this.raycaster.set(origin, this.directionScratch);
    this.raycaster.far = maxDistance;

    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let worldNormal: THREE.Vector3 | undefined;
      if (hit.face?.normal) {
        worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      }
      return {
        hit: true,
        point: hit.point.clone(),
        normal: worldNormal,
        object: hit.object,
        distance: hit.distance,
      };
    }

    return { hit: false };
  }

  /**
   * Check collision in multiple directions for player movement
   */
  static checkMovementCollision(
    position: THREE.Vector3,
    moveDirection: THREE.Vector3,
    objects: THREE.Object3D[],
    radius: number = 0.5
  ): { canMove: boolean; adjustedDirection: THREE.Vector3 } {
    if (moveDirection.lengthSq() === 0) {
      return { canMove: true, adjustedDirection: moveDirection.clone() };
    }

    const direction = moveDirection.clone().normalize();
    const adjustedDirection = moveDirection.clone();

    // Check forward direction
    const forwardResult = this.raycast(
      position.clone().setY(1), // At body height
      direction,
      objects,
      radius + 0.1
    );

    if (forwardResult.hit && forwardResult.distance! < radius) {
      // Wall sliding - remove component in wall normal direction
      if (forwardResult.normal) {
        const wallNormal = forwardResult.normal.clone().setY(0).normalize();
        const dot = adjustedDirection.dot(wallNormal);
        if (dot < 0) {
          adjustedDirection.sub(wallNormal.multiplyScalar(dot));
        }
      }
      return { canMove: true, adjustedDirection };
    }

    return { canMove: true, adjustedDirection };
  }

  /**
   * Point in sphere check (for blast radius)
   */
  static pointInSphere(
    point: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number
  ): boolean {
    return point.distanceTo(sphereCenter) <= sphereRadius;
  }

  /**
   * Check if there's clear line of sight between two points
   */
  static hasLineOfSight(
    from: THREE.Vector3,
    to: THREE.Vector3,
    obstacles: THREE.Object3D[]
  ): boolean {
    const direction = new THREE.Vector3().subVectors(to, from);
    const distance = direction.length();
    direction.normalize();

    const result = this.raycast(from, direction, obstacles, distance);

    if (!result.hit) return true;

    // Check if hit object is a wall or obstacle
    const hitType = result.object?.userData?.type;
    return hitType !== 'wall' && hitType !== 'obstacle';
  }
}
