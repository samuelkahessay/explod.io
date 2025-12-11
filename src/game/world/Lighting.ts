import * as THREE from 'three';

export class Lighting {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setup();
  }

  private setup(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Directional light (sun)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;

    // Shadow settings
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -25;
    directional.shadow.camera.right = 25;
    directional.shadow.camera.top = 25;
    directional.shadow.camera.bottom = -25;

    this.scene.add(directional);

    // Hemisphere light for better ambient
    const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.3);
    this.scene.add(hemisphere);
  }
}
