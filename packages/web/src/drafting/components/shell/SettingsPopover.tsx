/**
 * The one settings control: theme, plus room for the safe-area guide toggle
 * once the editor exists. Deliberately small — chrome recedes.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher.js';

export function SettingsPopover({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="app-settings-wrap" ref={wrapRef}>
      <button
        type="button"
        className="app-iconbtn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        Settings
      </button>
      {open && (
        <div className="app-popover" role="dialog" aria-label="Settings">
          <span className="app-popover-label">Theme</span>
          <ThemeSwitcher />
          {children}
        </div>
      )}
    </div>
  );
}
