export type UpdateCallback = (deltaTime: number) => void;

export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private updateCallbacks: UpdateCallback[] = [];
  private renderCallback: (() => void) | null = null;

  // Performance tracking
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 1000;
  private lastFpsUpdate: number = 0;
  public currentFps: number = 0;

  // Delta time clamping
  private readonly MAX_DELTA = 1 / 30;

  // Time scale for bullet time effect
  public timeScale: number = 1.0;

  // Frame timings
  public lastDeltaMs: number = 0;
  public lastScaledDeltaMs: number = 0;

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public addUpdateCallback(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  public removeUpdateCallback(callback: UpdateCallback): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  public setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp delta to prevent huge jumps
    deltaTime = Math.min(deltaTime, this.MAX_DELTA);

    // Apply time scale for bullet time effect
    const scaledDeltaTime = deltaTime * this.timeScale;

    this.lastDeltaMs = deltaTime * 1000;
    this.lastScaledDeltaMs = scaledDeltaTime * 1000;

    // FPS calculation
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Update all systems with scaled delta time
    for (const callback of this.updateCallbacks) {
      callback(scaledDeltaTime);
    }

    // Render
    if (this.renderCallback) {
      this.renderCallback();
    }
  };
}
