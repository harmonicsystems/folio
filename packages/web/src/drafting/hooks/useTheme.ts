/**
 * Theme state: data-theme on <html> + the folio.drafting.theme key. The
 * pre-hydration script in draft.astro applies the stored theme before React
 * mounts, so there is no flash of the wrong background.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { THEME_KEY } from '../persistence.js';

export type ThemeId = 'studio' | 'evening' | 'paper';

export const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: 'studio', label: 'Studio' },
  { id: 'evening', label: 'Evening' },
  { id: 'paper', label: 'Paper' },
];

const listeners = new Set<() => void>();

function readTheme(): ThemeId {
  const t = document.documentElement.dataset.theme;
  return t === 'evening' || t === 'paper' ? t : 'studio';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme);
  const setTheme = useCallback((next: ThemeId) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* theme is droppable */
    }
    for (const l of listeners) l();
  }, []);
  return [theme, setTheme];
}
