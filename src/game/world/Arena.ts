import * as THREE from 'three';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export class Arena {
  private scene: THREE.Scene;
  private readonly SIZE = GAME_CONFIG.ARENA.SIZE;
  private readonly WALL_HEIGHT = GAME_CONFIG.ARENA.WALL_HEIGHT;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build(): void {
    this.createFloor();
    this.createWalls();
    this.createObstacles();
  }

  private createFloor(): void {
    const { map, normalMap } = ProceduralTextures.createFloorTexture();

    const geometry = new THREE.PlaneGeometry(this.SIZE, this.SIZE);
    const material = new THREE.MeshStandardMaterial({
      map: map,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.8,
      metalness: 0.2,
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.type = 'floor';
    floor.userData.collidable = true; // Floor triggers explosions

    this.scene.add(floor);
  }

  private createWalls(): void {
    const { map, normalMap } = ProceduralTextures.createWallTexture();

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: map,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.7,
      metalness: 0.1,
    });

    const positions = [
      { x: 0, z: -this.SIZE / 2, rotY: 0 }, // North
      { x: 0, z: this.SIZE / 2, rotY: Math.PI }, // South
      { x: -this.SIZE / 2, z: 0, rotY: Math.PI / 2 }, // West
      { x: this.SIZE / 2, z: 0, rotY: -Math.PI / 2 }, // East
    ];

    positions.forEach((pos) => {
      const geometry = new THREE.BoxGeometry(this.SIZE, this.WALL_HEIGHT, 1);
      const wall = new THREE.Mesh(geometry, wallMaterial);

      wall.position.set(pos.x, this.WALL_HEIGHT / 2, pos.z);
      wall.rotation.y = pos.rotY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.type = 'wall';
      wall.userData.collidable = true;

      this.scene.add(wall);
    });
  }

  private createObstacles(): void {
    const { map, normalMap, emissiveMap } = ProceduralTextures.createMetalTexture();

    const obstacleMaterial = new THREE.MeshStandardMaterial({
      map: map,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1, 1),
      emissiveMap: emissiveMap,
      emissive: new THREE.Color(0xff4400),
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.6,
    });

    // Create some cover obstacles - blocky Krunker style
    const obstacleData = [
      { x: 10, z: 5, width: 4, height: 2, depth: 1 },
      { x: -8, z: -6, width: 3, height: 3, depth: 3 },
      { x: 5, z: -10, width: 2, height: 1.5, depth: 5 },
      { x: -12, z: 8, width: 5, height: 2, depth: 2 },
      { x: 0, z: 0, width: 2, height: 2, depth: 2 }, // Center pillar
      { x: -5, z: 12, width: 6, height: 1.5, depth: 1 },
      { x: 8, z: -5, width: 1, height: 3, depth: 4 },
      { x: -10, z: -10, width: 3, height: 2, depth: 3 },
      { x: 12, z: 12, width: 4, height: 2.5, depth: 2 },
    ];

    obstacleData.forEach((data) => {
      const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
      const obstacle = new THREE.Mesh(geometry, obstacleMaterial);

      obstacle.position.set(data.x, data.height / 2, data.z);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      obstacle.userData.type = 'obstacle';
      obstacle.userData.collidable = true;

      this.scene.add(obstacle);
    });
  }
}
