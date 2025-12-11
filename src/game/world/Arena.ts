import * as THREE from 'three';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ThemeType } from '@/config/themeConfig';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export class Arena {
  private scene: THREE.Scene;
  private theme: ThemeType;
  private readonly SIZE = GAME_CONFIG.ARENA.SIZE;
  private readonly WALL_HEIGHT = GAME_CONFIG.ARENA.WALL_HEIGHT;

  constructor(scene: THREE.Scene, theme: ThemeType = 'DEFAULT') {
    this.scene = scene;
    this.theme = theme;
  }

  public build(): void {
    this.createFloor();
    this.createWalls();
    this.createObstacles();

    // Add Christmas decorations for the Christmas theme
    if (this.theme === 'CHRISTMAS') {
      this.createChristmasDecorations();
    }
  }

  private createFloor(): void {
    const isChristmas = this.theme === 'CHRISTMAS';

    const { map, normalMap } = isChristmas
      ? ProceduralTextures.createSnowTexture()
      : ProceduralTextures.createFloorTexture();

    const geometry = new THREE.PlaneGeometry(this.SIZE, this.SIZE);
    const material = new THREE.MeshStandardMaterial({
      map: map,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(isChristmas ? 0.3 : 0.5, isChristmas ? 0.3 : 0.5),
      roughness: isChristmas ? 0.9 : 0.8,
      metalness: isChristmas ? 0.0 : 0.2,
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
    const isChristmas = this.theme === 'CHRISTMAS';

    let obstacleMaterial: THREE.MeshStandardMaterial;

    if (isChristmas) {
      // Wooden crates for Christmas theme
      const { map, normalMap } = ProceduralTextures.createWoodCrateTexture();
      obstacleMaterial = new THREE.MeshStandardMaterial({
        map: map,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(1, 1),
        roughness: 0.8,
        metalness: 0.0,
      });
    } else {
      // Metal crates for default theme
      const { map, normalMap, emissiveMap } = ProceduralTextures.createMetalTexture();
      obstacleMaterial = new THREE.MeshStandardMaterial({
        map: map,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(1, 1),
        emissiveMap: emissiveMap,
        emissive: new THREE.Color(0xff4400),
        emissiveIntensity: 0.5,
        roughness: 0.4,
        metalness: 0.6,
      });
    }

    // Two obstacle types:
    // - Cover walls: 1 wide x 3.5 tall x 4 deep (hide behind)
    // - Jump platforms: 4 wide x 0.8 tall x 4 deep (jump on top)
    // Note: Player jump height is ~1.07 units (v²/2g = 8²/60), so 0.8 allows comfortable landing
    const obstacleData = [
      // Cover walls (tall, thin)
      { x: 10, z: 5, width: 1, height: 3.5, depth: 4 },
      { x: -8, z: -6, width: 1, height: 3.5, depth: 4 },
      { x: -3, z: 0, width: 1, height: 3.5, depth: 4 },
      { x: -12, z: 8, width: 1, height: 3.5, depth: 4 },
      { x: 8, z: -10, width: 4, height: 3.5, depth: 1 }, // Rotated cover
      // Jump platforms (low, wide)
      { x: 3, z: 0, width: 4, height: 0.8, depth: 4 },
      { x: -5, z: 12, width: 4, height: 0.8, depth: 4 },
      { x: 8, z: -5, width: 4, height: 0.8, depth: 4 },
      { x: -10, z: -10, width: 4, height: 0.8, depth: 4 },
      { x: 12, z: 12, width: 4, height: 0.8, depth: 4 },
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

  private createChristmasDecorations(): void {
    // Create a large Christmas tree in the center
    this.createChristmasTree(0, 0);

    // Add smaller trees around the arena
    this.createChristmasTree(-15, 15, 0.6);
    this.createChristmasTree(15, -15, 0.6);
    this.createChristmasTree(-15, -15, 0.5);
    this.createChristmasTree(15, 15, 0.5);

    // Add presents scattered around
    this.createPresents();

    // Add candy canes around the perimeter
    this.createCandyCanes();

    // Add string lights along the walls
    this.createStringLights();
  }

  private createChristmasTree(x: number, z: number, scale: number = 1): void {
    const treeGroup = new THREE.Group();

    // Invisible collision box for spawn prevention (base of tree)
    const collisionGeometry = new THREE.BoxGeometry(3 * scale, 4 * scale, 3 * scale);
    const collisionMaterial = new THREE.MeshBasicMaterial({
      visible: false,
    });
    const collisionBox = new THREE.Mesh(collisionGeometry, collisionMaterial);
    collisionBox.position.set(x, 2 * scale, z);
    collisionBox.userData.type = 'obstacle';
    collisionBox.userData.collidable = true;
    this.scene.add(collisionBox);

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 1 * scale, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
      metalness: 0.0,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.5 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Tree layers (cones)
    const treeColors = [0x1a5a1a, 0x2d6b2d, 0x228b22];
    const layerData = [
      { radius: 2.5, height: 3, y: 2.5 },
      { radius: 2.0, height: 2.5, y: 4.5 },
      { radius: 1.5, height: 2, y: 6 },
      { radius: 0.8, height: 1.5, y: 7.2 },
    ];

    layerData.forEach((layer, i) => {
      const coneGeometry = new THREE.ConeGeometry(
        layer.radius * scale,
        layer.height * scale,
        12
      );
      const coneMaterial = new THREE.MeshStandardMaterial({
        color: treeColors[i % treeColors.length],
        roughness: 0.8,
        metalness: 0.0,
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.y = layer.y * scale;
      cone.castShadow = true;
      cone.receiveShadow = true;
      treeGroup.add(cone);
    });

    // Star on top
    const starGeometry = new THREE.OctahedronGeometry(0.4 * scale, 0);
    const starMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.y = 8.2 * scale;
    star.rotation.y = Math.PI / 4;
    treeGroup.add(star);

    // Add ornaments (colored spheres)
    const ornamentColors = [0xff0000, 0x0000ff, 0xffd700, 0xc0c0c0, 0x00ff00];
    const ornamentCount = Math.floor(20 * scale);

    for (let i = 0; i < ornamentCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const layerIndex = Math.floor(Math.random() * layerData.length);
      const layer = layerData[layerIndex];
      const radiusAtHeight = layer.radius * 0.7 * scale;

      const ornamentGeometry = new THREE.SphereGeometry(0.15 * scale, 8, 8);
      const ornamentMaterial = new THREE.MeshStandardMaterial({
        color: ornamentColors[i % ornamentColors.length],
        emissive: ornamentColors[i % ornamentColors.length],
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.6,
      });
      const ornament = new THREE.Mesh(ornamentGeometry, ornamentMaterial);

      ornament.position.set(
        Math.cos(angle) * radiusAtHeight,
        layer.y * scale - (Math.random() * layer.height * 0.3 * scale),
        Math.sin(angle) * radiusAtHeight
      );
      treeGroup.add(ornament);
    }

    // Add point light at the top for glow effect
    const treeLight = new THREE.PointLight(0xffd700, 2 * scale, 10 * scale);
    treeLight.position.y = 8 * scale;
    treeGroup.add(treeLight);

    treeGroup.position.set(x, 0, z);
    this.scene.add(treeGroup);
  }

  private createPresents(): void {
    const presentColors = [
      { box: 0xff0000, ribbon: 0xffd700 }, // Red with gold
      { box: 0x00aa00, ribbon: 0xff0000 }, // Green with red
      { box: 0x0066cc, ribbon: 0xc0c0c0 }, // Blue with silver
      { box: 0xffd700, ribbon: 0xff0000 }, // Gold with red
      { box: 0x8b008b, ribbon: 0xffd700 }, // Purple with gold
    ];

    // Cluster presents around the center tree
    const presentPositions = [
      { x: 2, z: 1, size: 0.8 },
      { x: -1.5, z: 2, size: 0.6 },
      { x: 1, z: -2, size: 0.7 },
      { x: -2, z: -1, size: 0.5 },
      { x: 2.5, z: -0.5, size: 0.9 },
      { x: -1, z: 1.5, size: 0.5 },
    ];

    presentPositions.forEach((pos, i) => {
      const colors = presentColors[i % presentColors.length];
      this.createPresent(pos.x, pos.z, pos.size, colors.box, colors.ribbon);
    });
  }

  private createPresent(
    x: number,
    z: number,
    size: number,
    boxColor: number,
    ribbonColor: number
  ): void {
    const presentGroup = new THREE.Group();

    // Box
    const boxGeometry = new THREE.BoxGeometry(size, size * 0.8, size);
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: boxColor,
      roughness: 0.5,
      metalness: 0.1,
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = size * 0.4;
    box.castShadow = true;
    box.receiveShadow = true;
    presentGroup.add(box);

    // Ribbon (horizontal)
    const ribbonHGeometry = new THREE.BoxGeometry(size * 1.02, size * 0.15, size * 0.15);
    const ribbonMaterial = new THREE.MeshStandardMaterial({
      color: ribbonColor,
      roughness: 0.4,
      metalness: 0.3,
    });
    const ribbonH = new THREE.Mesh(ribbonHGeometry, ribbonMaterial);
    ribbonH.position.y = size * 0.4;
    presentGroup.add(ribbonH);

    // Ribbon (vertical)
    const ribbonVGeometry = new THREE.BoxGeometry(size * 0.15, size * 0.82, size * 1.02);
    const ribbonV = new THREE.Mesh(ribbonVGeometry, ribbonMaterial);
    ribbonV.position.y = size * 0.4;
    presentGroup.add(ribbonV);

    // Bow on top
    const bowGeometry = new THREE.TorusGeometry(size * 0.15, size * 0.05, 8, 12);
    const bow1 = new THREE.Mesh(bowGeometry, ribbonMaterial);
    bow1.position.set(size * 0.1, size * 0.85, 0);
    bow1.rotation.y = Math.PI / 4;
    presentGroup.add(bow1);

    const bow2 = new THREE.Mesh(bowGeometry, ribbonMaterial);
    bow2.position.set(-size * 0.1, size * 0.85, 0);
    bow2.rotation.y = -Math.PI / 4;
    presentGroup.add(bow2);

    // Random rotation for variety
    presentGroup.rotation.y = Math.random() * Math.PI * 2;
    presentGroup.position.set(x, 0, z);
    this.scene.add(presentGroup);
  }

  private createCandyCanes(): void {
    // Place candy canes around the arena perimeter
    const positions = [
      { x: 18, z: 0, rotY: Math.PI / 2 },
      { x: -18, z: 0, rotY: -Math.PI / 2 },
      { x: 0, z: 18, rotY: Math.PI },
      { x: 0, z: -18, rotY: 0 },
      { x: 14, z: 14, rotY: (Math.PI * 3) / 4 },
      { x: -14, z: 14, rotY: (-Math.PI * 3) / 4 },
      { x: 14, z: -14, rotY: Math.PI / 4 },
      { x: -14, z: -14, rotY: -Math.PI / 4 },
    ];

    positions.forEach((pos) => {
      this.createCandyCane(pos.x, pos.z, pos.rotY);
    });
  }

  private createCandyCane(x: number, z: number, rotY: number): void {
    const candyCaneGroup = new THREE.Group();

    const redMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc0000,
      roughness: 0.4,
      metalness: 0.1,
    });

    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });

    // Straight part (alternating stripes)
    const stripeCount = 8;
    const stripeHeight = 0.3;
    for (let i = 0; i < stripeCount; i++) {
      const stripeGeometry = new THREE.CylinderGeometry(0.12, 0.12, stripeHeight, 8);
      const stripe = new THREE.Mesh(
        stripeGeometry,
        i % 2 === 0 ? redMaterial : whiteMaterial
      );
      stripe.position.y = i * stripeHeight + stripeHeight / 2;
      stripe.castShadow = true;
      stripe.receiveShadow = true;
      candyCaneGroup.add(stripe);
    }

    // Curved hook at the top (torus segment)
    const hookSegments = 6;
    const hookRadius = 0.4;
    for (let i = 0; i < hookSegments; i++) {
      const angle = (i / hookSegments) * Math.PI;
      const hookGeometry = new THREE.SphereGeometry(0.12, 8, 8);
      const hook = new THREE.Mesh(
        hookGeometry,
        i % 2 === 0 ? redMaterial : whiteMaterial
      );
      hook.position.set(
        Math.sin(angle) * hookRadius,
        stripeCount * stripeHeight + Math.cos(angle) * hookRadius,
        0
      );
      hook.castShadow = true;
      hook.receiveShadow = true;
      candyCaneGroup.add(hook);
    }

    candyCaneGroup.rotation.y = rotY;
    candyCaneGroup.position.set(x, 0, z);
    this.scene.add(candyCaneGroup);
  }

  private createStringLights(): void {
    // Create string lights along the top of walls
    const lightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    const lightSpacing = 3;
    const lightHeight = this.WALL_HEIGHT - 0.3;
    const halfSize = this.SIZE / 2 - 1;

    // Create lights along all four walls
    const wallConfigs = [
      { start: { x: -halfSize, z: -halfSize }, dir: { x: 1, z: 0 }, length: this.SIZE - 2 },
      { start: { x: halfSize, z: -halfSize }, dir: { x: 0, z: 1 }, length: this.SIZE - 2 },
      { start: { x: halfSize, z: halfSize }, dir: { x: -1, z: 0 }, length: this.SIZE - 2 },
      { start: { x: -halfSize, z: halfSize }, dir: { x: 0, z: -1 }, length: this.SIZE - 2 },
    ];

    let colorIndex = 0;
    wallConfigs.forEach((config) => {
      const numLights = Math.floor(config.length / lightSpacing);

      for (let i = 0; i <= numLights; i++) {
        const progress = i / numLights;
        const x = config.start.x + config.dir.x * config.length * progress;
        const z = config.start.z + config.dir.z * config.length * progress;

        // Light bulb (small sphere)
        const bulbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bulbMaterial = new THREE.MeshStandardMaterial({
          color: lightColors[colorIndex % lightColors.length],
          emissive: lightColors[colorIndex % lightColors.length],
          emissiveIntensity: 1.0,
          roughness: 0.3,
          metalness: 0.0,
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.set(x, lightHeight, z);
        this.scene.add(bulb);

        // Wire between lights (thin cylinder)
        if (i < numLights) {
          const nextX = config.start.x + config.dir.x * config.length * ((i + 1) / numLights);
          const nextZ = config.start.z + config.dir.z * config.length * ((i + 1) / numLights);

          const wireGeometry = new THREE.CylinderGeometry(0.02, 0.02, lightSpacing, 4);
          const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
          });
          const wire = new THREE.Mesh(wireGeometry, wireMaterial);

          // Position wire between bulbs
          wire.position.set((x + nextX) / 2, lightHeight, (z + nextZ) / 2);

          // Rotate wire to align with direction
          if (Math.abs(config.dir.x) > 0) {
            wire.rotation.z = Math.PI / 2;
          } else {
            wire.rotation.x = Math.PI / 2;
          }

          this.scene.add(wire);
        }

        colorIndex++;
      }
    });
  }
}
