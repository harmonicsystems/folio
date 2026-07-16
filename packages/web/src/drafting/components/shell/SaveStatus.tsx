/**
 * Whisper-quiet save indicator. The failure states are the loud ones —
 * a stale "saved" must never imply an unsaved draft is safe.
 */

import { useEffect, useState } from 'react';
import type { SaveState } from '../../persistence.js';

function label(state: SaveState, lastSavedAt: number | null, now: number): string {
  switch (state) {
    case 'unavailable':
    case 'error':
      return 'not saved — browser storage unavailable';
    case 'saving':
      return 'Saving…';
    case 'saved': {
      if (!lastSavedAt) return 'Saved';
      const mins = Math.floor((now - lastSavedAt) / 60000);
      if (mins < 1) return 'Saved';
      if (mins < 60) return `Saved ${mins}m ago`;
      return `Saved ${Math.floor(mins / 60)}h ago`;
    }
    default:
      return '';
  }
}

export function SaveStatus({
  state,
  lastSavedAt,
}: {
  state: SaveState;
  lastSavedAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="app-save-status" data-state={state} role="status">
      {label(state, lastSavedAt, now)}
    </span>
  );
}
