import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ThemeType } from '@/config/themeConfig';

// Layer constants for rendering order
export const LAYER_DEFAULT = 0;
export const LAYER_WEAPON = 1;

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

  // Collidable object caching
  private cachedCollidables: THREE.Object3D[] = [];
  private collidablesDirty: boolean = true;

  private container: HTMLElement;
  private theme: ThemeType;

  constructor(container: HTMLElement, theme: ThemeType = 'DEFAULT') {
    this.container = container;
    this.theme = theme;

    const isChristmas = theme === 'CHRISTMAS';

    // Scene
    this.scene = new THREE.Scene();

    // Set sky/background based on theme
    if (isChristmas) {
      // Dark night sky for Christmas
      this.scene.background = new THREE.Color(0x0a1628);
      this.scene.fog = new THREE.Fog(0x0a1628, 30, 120);
    } else {
      // Light blue sky for default
      this.scene.background = new THREE.Color(0x87ceeb);
      this.scene.fog = new THREE.Fog(0x87ceeb, 20, 100);
    }

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
      // Two-pass rendering: world first, then weapon on top
      // Pass 1: Render world (layer 0 only)
      this.camera.layers.set(LAYER_DEFAULT);
      this.composer.render();

      // Pass 2: Render weapon layer on top (clear depth only)
      this.camera.layers.set(LAYER_WEAPON);
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = true;

      // Reset camera to see all layers
      this.camera.layers.enableAll();
    } else {
      // Two-pass rendering without post-processing
      // Pass 1: Render world
      this.camera.layers.set(LAYER_DEFAULT);
      this.renderer.render(this.scene, this.camera);

      // Pass 2: Render weapon layer on top
      this.camera.layers.set(LAYER_WEAPON);
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = true;

      // Reset camera to see all layers
      this.camera.layers.enableAll();
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
    if (this.collidablesDirty) {
      this.cachedCollidables = [];
      this.scene.traverse((object) => {
        if (object.userData.collidable) {
          this.cachedCollidables.push(object);
        }
      });
      this.collidablesDirty = false;
    }
    return this.cachedCollidables;
  }

  /**
   * Mark collidables cache as dirty - call when adding/removing collidable objects
   */
  public invalidateCollidables(): void {
    this.collidablesDirty = true;
  }
}
