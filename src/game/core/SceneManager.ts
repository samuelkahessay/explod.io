import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Post-processing
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private usePostProcessing: boolean = true;

  // Bloom configuration
  private baseBloomStrength: number = 0.3;
  private currentBloomStrength: number = 0.3;
  private targetBloomStrength: number = 0.3;

  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 1.8, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    container.appendChild(this.renderer.domElement);

    // Setup post-processing
    this.composer = new EffectComposer(this.renderer);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      this.baseBloomStrength, // strength
      0.4, // radius
      0.85 // threshold
    );

    this.setupPostProcessing();

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  private setupPostProcessing(): void {
    // Render pass - renders the scene
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass - adds glow to bright objects
    this.composer.addPass(this.bloomPass);
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  public render(): void {
    // Smoothly interpolate bloom strength
    if (this.currentBloomStrength !== this.targetBloomStrength) {
      const diff = this.targetBloomStrength - this.currentBloomStrength;
      if (Math.abs(diff) < 0.01) {
        this.currentBloomStrength = this.targetBloomStrength;
      } else {
        this.currentBloomStrength += diff * 0.1;
      }
      this.bloomPass.strength = this.currentBloomStrength;
    }

    if (this.usePostProcessing) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Set bloom intensity (0-2 recommended range)
   */
  public setBloomIntensity(intensity: number): void {
    this.targetBloomStrength = intensity;
  }

  /**
   * Trigger a bloom spike for explosions
   */
  public triggerExplosionBloom(): void {
    this.currentBloomStrength = 1.2; // Immediate spike
    this.targetBloomStrength = this.baseBloomStrength; // Decay back to base
    this.bloomPass.strength = this.currentBloomStrength;
  }

  /**
   * Toggle post-processing on/off
   */
  public setPostProcessing(enabled: boolean): void {
    this.usePostProcessing = enabled;
  }

  /**
   * Get current bloom strength
   */
  public getBloomStrength(): number {
    return this.currentBloomStrength;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.composer.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  public getCollidableObjects(): THREE.Object3D[] {
    const collidables: THREE.Object3D[] = [];

    this.scene.traverse((object) => {
      if (object.userData.collidable) {
        collidables.push(object);
      }
    });

    return collidables;
  }
}
