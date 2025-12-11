// Theme configuration for the game
// Supports DEFAULT and CHRISTMAS themes

export type ThemeType = 'DEFAULT' | 'CHRISTMAS';

export type ChristmasEnemyType = 'ELF' | 'GINGERBREAD' | 'NUTCRACKER';

// Color palettes for each theme
export interface ThemeColors {
  // Projectile colors
  projectile: {
    primary: number;
    secondary: number;
    trail: number;
    light: number;
  };
  // Explosion colors
  explosion: {
    flash: number;
    fireball: number[];
    shockwave: number;
    debris: number[];
  };
  // Weapon viewmodel colors
  weapon: {
    primary: number;
    secondary: number;
    accent: number;
  };
  // Arena colors
  arena: {
    floor: string;
    walls: string;
    obstacle: number;
    sky: number;
  };
  // Particle colors
  particles: {
    spark: number;
    smoke: number;
    debris: number[];
  };
}

// Default theme (current game appearance)
export const DEFAULT_THEME: ThemeColors = {
  projectile: {
    primary: 0x4a5a3a,    // Olive drab warhead
    secondary: 0xb87333,  // Copper tip
    trail: 0xff4400,      // Orange flame
    light: 0xff4400,      // Orange light
  },
  explosion: {
    flash: 0xffffff,
    fireball: [0xffff44, 0xffaa00, 0xff6600, 0xff3300],
    shockwave: 0xffaa44,
    debris: [0x444444, 0x666666, 0x888888],
  },
  weapon: {
    primary: 0x2a2a2a,    // Dark metal
    secondary: 0x1a1a1a,  // Darker metal
    accent: 0x8b4513,     // Brown grip
  },
  arena: {
    floor: '#555555',
    walls: '#666666',
    obstacle: 0xff4400,
    sky: 0x87ceeb,        // Light blue sky
  },
  particles: {
    spark: 0xffaa00,
    smoke: 0x444444,
    debris: [0x666666, 0x888888, 0xaaaaaa],
  },
};

// Christmas theme
export const CHRISTMAS_THEME: ThemeColors = {
  projectile: {
    primary: 0xcc0000,    // Red ornament
    secondary: 0xffd700,  // Gold cap/fuse
    trail: 0xffff99,      // Sparkle trail
    light: 0xff6666,      // Red-ish glow
  },
  explosion: {
    flash: 0xffffff,
    fireball: [0xff0000, 0x00ff00, 0xffffff, 0xff6666], // Red, green, white
    shockwave: 0xff0000,
    debris: [0xff0000, 0x00ff00, 0xffd700, 0xc0c0c0], // Red, green, gold, silver shards
  },
  weapon: {
    primary: 0xff0000,    // Red stripes
    secondary: 0xffffff,  // White stripes
    accent: 0x00ff00,     // Green accent
  },
  arena: {
    floor: '#e8e8f0',     // Snow white with blue tint
    walls: '#666666',     // Keep walls similar
    obstacle: 0x8b4513,   // Brown wooden crates
    sky: 0x0a1628,        // Dark night sky
  },
  particles: {
    spark: 0xffd700,      // Gold sparkles
    smoke: 0xffffff,      // White snow/frost
    debris: [0xff0000, 0x00ff00, 0xffd700], // Festive colors
  },
};

// Christmas enemy configurations
export const CHRISTMAS_ENEMIES = {
  ELF: {
    scale: 0.7,
    speedMultiplier: 1.3,
    healthMultiplier: 0.6,
    colors: {
      skin: 0xffcc99,     // Pale skin
      outfit: 0x228b22,   // Forest green
      accent: 0xff0000,   // Red trim
      hat: 0xff0000,      // Red pointed hat
      shoes: 0x228b22,    // Green curly shoes
    },
    spawnWeight: 50,
  },
  GINGERBREAD: {
    scale: 1.0,
    speedMultiplier: 0.9,
    healthMultiplier: 1.0,
    colors: {
      body: 0xcd853f,     // Tan/brown cookie
      icing: 0xffffff,    // White icing details
      buttons: 0xff0000,  // Red candy buttons
      eyes: 0x000000,     // Black eyes
    },
    spawnWeight: 35,
  },
  NUTCRACKER: {
    scale: 1.4,
    speedMultiplier: 0.6,
    healthMultiplier: 2.0,
    colors: {
      body: 0x8b0000,     // Dark red uniform
      wood: 0xdeb887,     // Burlywood face
      gold: 0xffd700,     // Gold trim
      black: 0x000000,    // Black hat/boots
      white: 0xffffff,    // White accents
    },
    spawnWeight: 15,
  },
};

// Get theme colors by type
export function getThemeColors(theme: ThemeType): ThemeColors {
  return theme === 'CHRISTMAS' ? CHRISTMAS_THEME : DEFAULT_THEME;
}

// Get random Christmas enemy type based on spawn weights
export function getRandomChristmasEnemyType(): ChristmasEnemyType {
  const roll = Math.random() * 100;
  if (roll < CHRISTMAS_ENEMIES.ELF.spawnWeight) {
    return 'ELF';
  } else if (roll < CHRISTMAS_ENEMIES.ELF.spawnWeight + CHRISTMAS_ENEMIES.GINGERBREAD.spawnWeight) {
    return 'GINGERBREAD';
  } else {
    return 'NUTCRACKER';
  }
}
