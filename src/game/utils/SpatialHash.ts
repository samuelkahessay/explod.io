import * as THREE from 'three';

/**
 * Grid-based spatial hash for efficient spatial queries.
 * Divides the game world into cells for O(1) average-case lookups.
 */
export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Set<THREE.Object3D>> = new Map();
  private objectCells: Map<THREE.Object3D, string[]> = new Map();

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
  public getNearby(position: THREE.Vector3, radius: number): THREE.Object3D[] {
    const result = new Set<THREE.Object3D>();
    const cellKeys = this.getCellsForObject(position, radius);

    for (const key of cellKeys) {
      const cell = this.grid.get(key);
      if (cell) {
        for (const obj of cell) {
          result.add(obj);
        }
      }
    }

    return Array.from(result);
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
