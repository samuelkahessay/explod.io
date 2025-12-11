import * as THREE from 'three';
import { ProceduralTextures } from '../utils/ProceduralTextures';

interface DustSprite {
  sprite: THREE.Sprite;
  direction: THREE.Vector2;
  speed: number;
}

export class DustPuff {
  private scene: THREE.Scene;
  private sprites: DustSprite[] = [];
  private elapsed: number = 0;
  private duration: number = 1.2;
  public isActive: boolean = true;
  private position: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    radius: number = 2,
    count: number = 8
  ) {
    this.scene = scene;
    this.position = position.clone();

    const texture = ProceduralTextures.createDustTexture();

    // Create dust sprites expanding outward in a ring
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.position.y = 0.1; // Just above ground

      const startSize = 0.3 + Math.random() * 0.2;
      sprite.scale.setScalar(startSize);

      this.sprites.push({
        sprite,
        direction: new THREE.Vector2(Math.cos(angle), Math.sin(angle)),
        speed: radius * (1.5 + Math.random() * 0.5),
      });

      this.scene.add(sprite);
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.elapsed += deltaTime;
    const progress = this.elapsed / this.duration;

    if (progress >= 1) {
      this.dispose();
      this.isActive = false;
      return;
    }

    // Ease out - fast start, slow end
    const easedProgress = 1 - Math.pow(1 - progress, 2);

    this.sprites.forEach((s) => {
      const { sprite, direction, speed } = s;

      // Expand outward (decelerating)
      const moveSpeed = speed * (1 - easedProgress) * deltaTime;
      sprite.position.x += direction.x * moveSpeed;
      sprite.position.z += direction.y * moveSpeed;

      // Rise slightly
      sprite.position.y += 0.3 * deltaTime * (1 - progress);

      // Scale up
      const scale = 0.3 + easedProgress * 1.5;
      sprite.scale.setScalar(scale);

      // Fade out
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = 0.6 * (1 - easedProgress);
    });
  }

  public dispose(): void {
    this.sprites.forEach((s) => {
      this.scene.remove(s.sprite);
      (s.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (s.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.sprites = [];
    this.isActive = false;
  }
}
