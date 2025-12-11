import * as THREE from 'three';

export class ScreenShakeSystem {
  private camera: THREE.Camera;
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeElapsed: number = 0;
  private originalOffset: THREE.Vector3 = new THREE.Vector3();
  private currentOffset: THREE.Vector3 = new THREE.Vector3();
  private isShaking: boolean = false;

  // Configuration
  private readonly DECAY_RATE = 4; // How fast shake decays
  private readonly MAX_INTENSITY = 1.5; // Maximum shake intensity
  private readonly FREQUENCY = 25; // Oscillation frequency

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  /**
   * Trigger a screen shake
   * @param intensity - How strong the shake is (0-1 range recommended)
   * @param duration - How long the shake lasts in seconds
   */
  public shake(intensity: number, duration: number): void {
    // Stack with existing shake (don't replace if current is stronger)
    this.shakeIntensity = Math.min(
      Math.max(this.shakeIntensity, intensity),
      this.MAX_INTENSITY
    );
    this.shakeDuration = Math.max(this.shakeDuration, duration);

    if (!this.isShaking) {
      this.shakeElapsed = 0;
      this.isShaking = true;
    }
  }

  /**
   * Calculate shake based on distance from explosion
   * @param explosionPos - Position of the explosion
   * @param playerPos - Position of the player
   * @param blastRadius - Radius of the explosion
   */
  public shakeFromExplosion(
    explosionPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    blastRadius: number
  ): void {
    const distance = explosionPos.distanceTo(playerPos);
    const maxRange = blastRadius * 4; // Shake felt up to 4x blast radius

    if (distance < maxRange) {
      // Intensity falls off with distance
      const normalizedDist = distance / maxRange;
      const intensity = (1 - normalizedDist * normalizedDist) * 0.8;
      const duration = 0.2 + (1 - normalizedDist) * 0.3;

      this.shake(intensity, duration);
    }
  }

  /**
   * Update the screen shake effect
   * Call this every frame
   */
  public update(deltaTime: number): void {
    if (!this.isShaking) return;

    this.shakeElapsed += deltaTime;

    // Check if shake should end
    if (this.shakeElapsed >= this.shakeDuration) {
      this.stopShake();
      return;
    }

    // Calculate decay (exponential falloff)
    const progress = this.shakeElapsed / this.shakeDuration;
    const decayMultiplier = Math.pow(1 - progress, this.DECAY_RATE);
    const currentIntensity = this.shakeIntensity * decayMultiplier;

    // Calculate random offset using Perlin-noise-like smooth randomness
    const time = this.shakeElapsed * this.FREQUENCY;

    // Use sine waves at different frequencies for smoother random motion
    const offsetX =
      (Math.sin(time * 1.1) * 0.5 +
        Math.sin(time * 2.3) * 0.3 +
        Math.sin(time * 4.7) * 0.2) *
      currentIntensity;

    const offsetY =
      (Math.sin(time * 1.3 + 1) * 0.5 +
        Math.sin(time * 2.7 + 2) * 0.3 +
        Math.sin(time * 5.1 + 3) * 0.2) *
      currentIntensity;

    // Apply slight rotation shake as well
    const rotationX = Math.sin(time * 1.7) * currentIntensity * 0.01;
    const rotationZ = Math.sin(time * 2.1 + 1.5) * currentIntensity * 0.01;

    // Store current offset for removal
    this.currentOffset.set(offsetX, offsetY, 0);

    // Apply to camera (we add offset rather than set position to preserve movement)
    this.camera.position.x += offsetX * deltaTime * 10;
    this.camera.position.y += offsetY * deltaTime * 10;

    // Apply subtle rotation
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.rotation.x += rotationX * deltaTime;
      this.camera.rotation.z += rotationZ * deltaTime;
    }
  }

  /**
   * Stop the shake immediately
   */
  public stopShake(): void {
    this.isShaking = false;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
    this.currentOffset.set(0, 0, 0);
  }

  /**
   * Check if currently shaking
   */
  public isCurrentlyShaking(): boolean {
    return this.isShaking;
  }

  /**
   * Get current shake intensity (0-1)
   */
  public getCurrentIntensity(): number {
    if (!this.isShaking) return 0;
    const progress = this.shakeElapsed / this.shakeDuration;
    return this.shakeIntensity * Math.pow(1 - progress, this.DECAY_RATE);
  }
}
