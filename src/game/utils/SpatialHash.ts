import * as THREE from 'three';

/**
 * Grid-based spatial hash for efficient spatial queries.
 * Divides the game world into cells for O(1) average-case lookups.
 */
export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Set<THREE.Object3D>> = new Map();
  private objectCells: Map<THREE.Object3D, string[]> = new Map();

  // Scratch storage to reduce allocations in hot queries (not re-entrant)
  private nearbyScratchSet: Set<THREE.Object3D> = new Set();
  private cellKeysScratch: string[] = [];

  constructor(cellSize: number = 5) {
    this.cellSize = cellSize;
  }

  /**
   * Get the cell key for a position
   */
  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  /**
   * Get all cell keys that an object might occupy based on position and radius
   */
  private getCellsForObject(position: THREE.Vector3, radius: number = 0): string[] {
    const keys: string[] = [];
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        keys.push(`${x},${z}`);
      }
    }
    return keys;
  }

  private fillCellsForObject(
    position: THREE.Vector3,
    radius: number,
    out: string[]
  ): void {
    out.length = 0;

    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        out.push(`${x},${z}`);
      }
    }
  }

  /**
   * Insert an object into the spatial hash
   */
  public insert(obj: THREE.Object3D, radius: number = 0): void {
    const position = obj.position;
    const cellKeys = this.getCellsForObject(position, radius);

    for (const key of cellKeys) {
      if (!this.grid.has(key)) {
        this.grid.set(key, new Set());
      }
      this.grid.get(key)!.add(obj);
    }

    this.objectCells.set(obj, cellKeys);
  }

  /**
   * Remove an object from the spatial hash
   */
  public remove(obj: THREE.Object3D): void {
    const cellKeys = this.objectCells.get(obj);
    if (!cellKeys) return;

    for (const key of cellKeys) {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(obj);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
    }

    this.objectCells.delete(obj);
  }

  /**
   * Update an object's position in the spatial hash
   */
  public update(obj: THREE.Object3D, radius: number = 0): void {
    this.remove(obj);
    this.insert(obj, radius);
  }

  /**
   * Get all objects within a radius of a position
   */
  public getNearby(
    position: THREE.Vector3,
    radius: number,
    out?: THREE.Object3D[]
  ): THREE.Object3D[] {
    this.nearbyScratchSet.clear();
    this.fillCellsForObject(position, radius, this.cellKeysScratch);

    for (const key of this.cellKeysScratch) {
      const cell = this.grid.get(key);
      if (cell) {
        for (const obj of cell) {
          this.nearbyScratchSet.add(obj);
        }
      }
    }

    if (!out) {
      return Array.from(this.nearbyScratchSet);
    }

    out.length = 0;
    for (const obj of this.nearbyScratchSet) {
      out.push(obj);
    }
    return out;
  }

  /**
   * Get all objects in a specific cell
   */
  public getObjectsInCell(x: number, z: number): THREE.Object3D[] {
    const key = this.getCellKey(x, z);
    const cell = this.grid.get(key);
    return cell ? Array.from(cell) : [];
  }

  /**
   * Check if an object is in the hash
   */
  public has(obj: THREE.Object3D): boolean {
    return this.objectCells.has(obj);
  }

  /**
   * Clear all objects from the hash
   */
  public clear(): void {
    this.grid.clear();
    this.objectCells.clear();
  }

  /**
   * Get the total number of objects in the hash
   */
  public getObjectCount(): number {
    return this.objectCells.size;
  }

  /**
   * Get the number of cells in use
   */
  public getCellCount(): number {
    return this.grid.size;
  }
}
