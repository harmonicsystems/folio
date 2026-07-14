/** Three-way segmented control: Studio / Evening / Paper. */

import { THEMES, useTheme } from '../../hooks/useTheme.js';

export function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          onClick={() => setTheme(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
