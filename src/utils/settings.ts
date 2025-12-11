// Settings persistence utility using localStorage
import { ThemeType } from '@/config/themeConfig';

const STORAGE_KEY = 'explodio-theme';

/**
 * Get the current theme from localStorage
 * Returns 'CHRISTMAS' if no theme is stored or if localStorage is unavailable
 */
export function getTheme(): ThemeType {
  if (typeof window === 'undefined') {
    return 'CHRISTMAS';
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'CHRISTMAS' || stored === 'DEFAULT') {
      return stored;
    }
    return 'CHRISTMAS';
  } catch {
    return 'CHRISTMAS';
  }
}

/**
 * Save the theme preference to localStorage
 */
export function setTheme(theme: ThemeType): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable in some contexts
    console.warn('Unable to save theme preference to localStorage');
  }
}

/**
 * Check if Christmas mode is enabled
 */
export function isChristmasMode(): boolean {
  return getTheme() === 'CHRISTMAS';
}

/**
 * Toggle between DEFAULT and CHRISTMAS themes
 * Returns the new theme
 */
export function toggleTheme(): ThemeType {
  const current = getTheme();
  const newTheme: ThemeType = current === 'CHRISTMAS' ? 'DEFAULT' : 'CHRISTMAS';
  setTheme(newTheme);
  return newTheme;
}
