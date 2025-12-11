import * as THREE from 'three';

export class ProceduralTextures {
  /**
   * Generate concrete floor tile texture with grid lines, noise, and stains
   */
  static createFloorTexture(size: number = 512): {
    map: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base concrete color
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, size, size);

    // Add noise for concrete texture
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw tile grid lines
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 4;
    const tileSize = size / 4;
    for (let x = 0; x <= size; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Occasional stains/marks
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 40 + 15;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(60, 55, 50, 0.4)');
      gradient.addColorStop(1, 'rgba(60, 55, 50, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Add some cracks
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 4);

    const normalMap = this.generateNormalMap(canvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(4, 4);

    return { map, normalMap };
  }

  /**
   * Generate industrial wall texture with block pattern and weathering
   */
  static createWallTexture(size: number = 512): {
    map: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base gray
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, size, size);

    // Concrete block pattern
    const blockWidth = size / 4;
    const blockHeight = size / 8;

    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * (blockWidth / 2);
      for (let col = -1; col < 5; col++) {
        const x = col * blockWidth + offset;
        const y = row * blockHeight;

        // Block fill with variation
        const shade = 75 + Math.random() * 35;
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(x + 2, y + 2, blockWidth - 4, blockHeight - 4);

        // Block outline (mortar)
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, blockWidth, blockHeight);
      }
    }

    // Add grime and weathering
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
      gradient.addColorStop(0, 'rgba(45, 40, 35, 0.25)');
      gradient.addColorStop(1, 'rgba(45, 40, 35, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 50, y - 50, 100, 100);
    }

    // Vertical water stains
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * size;
      ctx.strokeStyle = 'rgba(35, 35, 40, 0.2)';
      ctx.lineWidth = Math.random() * 12 + 5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(
        x + Math.random() * 25 - 12,
        size * 0.3,
        x + Math.random() * 25 - 12,
        size * 0.7,
        x + Math.random() * 15 - 7,
        size
      );
      ctx.stroke();
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = this.generateNormalMap(canvas, 1.5);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;

    return { map, normalMap };
  }

  /**
   * Generate metal crate/obstacle texture with rivets and scratches
   */
  static createMetalTexture(size: number = 256): {
    map: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    emissiveMap: THREE.CanvasTexture;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base metal color with slight gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#4a4a4a');
    gradient.addColorStop(0.5, '#555555');
    gradient.addColorStop(1, '#484848');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Metal panel border
    const padding = size * 0.08;
    ctx.fillStyle = '#505050';
    ctx.fillRect(padding, padding, size - padding * 2, size - padding * 2);

    // Inner recessed panel
    const innerPadding = padding * 2;
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(
      innerPadding,
      innerPadding,
      size - innerPadding * 2,
      size - innerPadding * 2
    );

    // Highlight edge
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      innerPadding,
      innerPadding,
      size - innerPadding * 2,
      size - innerPadding * 2
    );

    // Rivets at corners
    const rivetPositions = [
      [padding * 1.5, padding * 1.5],
      [size - padding * 1.5, padding * 1.5],
      [padding * 1.5, size - padding * 1.5],
      [size - padding * 1.5, size - padding * 1.5],
    ];

    rivetPositions.forEach(([x, y]) => {
      // Rivet shadow
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(x + 1, y + 1, 7, 0, Math.PI * 2);
      ctx.fill();
      // Rivet body
      ctx.fillStyle = '#5a5a5a';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      // Rivet highlight
      ctx.fillStyle = '#757575';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Scratches
    for (let i = 0; i < 20; i++) {
      const brightness = Math.random() > 0.5 ? 65 : 45;
      ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.6)`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      const startX = Math.random() * size;
      const startY = Math.random() * size;
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + (Math.random() - 0.5) * 60,
        startY + (Math.random() - 0.5) * 60
      );
      ctx.stroke();
    }

    // Warning stripe (optional, adds visual interest)
    ctx.fillStyle = '#cc8800';
    ctx.fillRect(size * 0.1, size * 0.85, size * 0.3, size * 0.05);
    ctx.fillStyle = '#222222';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(size * 0.1 + i * size * 0.08, size * 0.85, size * 0.04, size * 0.05);
    }

    const map = new THREE.CanvasTexture(canvas);
    const normalMap = this.generateNormalMap(canvas, 2);
    const emissiveMap = this.createEmissiveMap(size);

    return { map, normalMap, emissiveMap };
  }

  /**
   * Create emissive detail map (glowing indicator lights)
   */
  private static createEmissiveMap(size: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Black background (no emission by default)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Small indicator light
    const lightX = size * 0.85;
    const lightY = size * 0.12;
    const gradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 10);
    gradient.addColorStop(0, '#ff4400');
    gradient.addColorStop(0.4, '#ff2200');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(lightX, lightY, 10, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generate normal map from luminance using Sobel filter
   */
  private static generateNormalMap(
    sourceCanvas: HTMLCanvasElement,
    strength: number = 2
  ): THREE.CanvasTexture {
    const size = sourceCanvas.width;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const sourceCtx = sourceCanvas.getContext('2d')!;
    const sourceData = sourceCtx.getImageData(0, 0, size, size);
    const normalData = ctx.createImageData(size, size);

    const getHeight = (x: number, y: number): number => {
      const clampX = Math.max(0, Math.min(size - 1, x));
      const clampY = Math.max(0, Math.min(size - 1, y));
      const idx = (clampY * size + clampX) * 4;
      return (
        (sourceData.data[idx] +
          sourceData.data[idx + 1] +
          sourceData.data[idx + 2]) /
        3 /
        255
      );
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Sobel filter for normal calculation
        const left = getHeight(x - 1, y);
        const right = getHeight(x + 1, y);
        const up = getHeight(x, y - 1);
        const down = getHeight(x, y + 1);

        const dx = (right - left) * strength;
        const dy = (down - up) * strength;

        // Convert to normal (tangent space)
        const len = Math.sqrt(dx * dx + dy * dy + 1);
        normalData.data[idx] = ((dx / len) * 0.5 + 0.5) * 255; // R (X)
        normalData.data[idx + 1] = ((-dy / len) * 0.5 + 0.5) * 255; // G (Y) - inverted for OpenGL
        normalData.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255; // B (Z)
        normalData.data[idx + 3] = 255; // A
      }
    }

    ctx.putImageData(normalData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Create a procedural scorch mark texture for explosion decals
   */
  static createScorchTexture(size: number = 128): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    // Radial gradient from black center to transparent edge
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(15, 10, 5, 0.9)');
    gradient.addColorStop(0.3, 'rgba(30, 20, 15, 0.7)');
    gradient.addColorStop(0.6, 'rgba(50, 35, 25, 0.4)');
    gradient.addColorStop(1, 'rgba(70, 50, 35, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Add noise for texture
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) {
        // Only modify visible pixels
        const noise = (Math.random() - 0.5) * 20;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(
          0,
          Math.min(255, imageData.data[i + 1] + noise)
        );
        imageData.data[i + 2] = Math.max(
          0,
          Math.min(255, imageData.data[i + 2] + noise)
        );
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Add some radial streaks
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.3)';
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const innerR = size * 0.1 + Math.random() * size * 0.1;
      const outerR = size * 0.35 + Math.random() * size * 0.15;
      ctx.lineWidth = 2 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(
        size / 2 + Math.cos(angle) * innerR,
        size / 2 + Math.sin(angle) * innerR
      );
      ctx.lineTo(
        size / 2 + Math.cos(angle) * outerR,
        size / 2 + Math.sin(angle) * outerR
      );
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create a smoke puff texture for particle sprites
   */
  static createSmokeTexture(size: number = 64): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(120, 115, 110, 1)');
    gradient.addColorStop(0.4, 'rgba(100, 95, 90, 0.6)');
    gradient.addColorStop(0.7, 'rgba(80, 75, 70, 0.3)');
    gradient.addColorStop(1, 'rgba(60, 55, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create a spark/ember texture for particle sprites
   */
  static createSparkTexture(size: number = 32): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 100, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create a dust puff texture
   */
  static createDustTexture(size: number = 64): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(160, 140, 120, 0.8)');
    gradient.addColorStop(0.5, 'rgba(140, 120, 100, 0.4)');
    gradient.addColorStop(1, 'rgba(120, 100, 80, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }
}
