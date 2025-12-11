/**
 * Generic object pool for reusing objects instead of creating/destroying them.
 * Reduces garbage collection pressure and allocation overhead.
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 0,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.resetFn = reset;
    this.maxSize = maxSize;

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * Get an object from the pool, creating a new one if necessary
   */
  public acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      obj = this.factory();
    }

    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool for reuse
   */
  public release(obj: T): void {
    if (!this.active.has(obj)) {
      return; // Object not from this pool or already released
    }

    this.active.delete(obj);
    this.resetFn(obj);

    // Only keep up to maxSize objects in the pool
    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  /**
   * Release all active objects back to the pool
   */
  public releaseAll(): void {
    this.active.forEach((obj) => {
      this.resetFn(obj);
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    });
    this.active.clear();
  }

  /**
   * Get count of currently active (in-use) objects
   */
  public getActiveCount(): number {
    return this.active.size;
  }

  /**
   * Get count of available (pooled) objects
   */
  public getAvailableCount(): number {
    return this.available.length;
  }

  /**
   * Get all currently active objects
   */
  public getActiveObjects(): T[] {
    return Array.from(this.active);
  }

  /**
   * Clear the pool entirely
   */
  public clear(): void {
    this.available = [];
    this.active.clear();
  }
}
