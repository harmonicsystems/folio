/**
 * The app's one chrome bar. On the library it is just the wordmark; inside a
 * book it adds back-navigation, an inline-renamable title, view switches, and
 * the save whisper. Hairline-bottom, quiet type — chrome recedes.
 */

import type { ReactNode } from 'react';
import type { DraftBook } from '../../model.js';
import { navigate } from '../../router.js';
import type { SaveState } from '../../persistence.js';
import { SaveStatus } from './SaveStatus.js';
import { SettingsPopover } from './SettingsPopover.js';

export function TopBar({
  book,
  onRename,
  saveState,
  lastSavedAt,
  children,
  settingsExtra,
}: {
  book?: DraftBook | null;
  onRename?: (title: string) => void;
  saveState: SaveState;
  lastSavedAt: number | null;
  /** View controls, rendered between the title and the save status. */
  children?: ReactNode;
  settingsExtra?: ReactNode;
}) {
  return (
    <header className="app-topbar">
      {book ? (
        <button
          type="button"
          className="app-back"
          onClick={() => navigate({ kind: 'library' })}
        >
          ← Library
        </button>
      ) : (
        <a className="app-wordmark" href="#/">
          Folio<small>drafting</small>
        </a>
      )}
      {book && onRename && (
        <input
          className="app-booktitle"
          aria-label="Book title"
          value={book.title}
          onChange={(e) => onRename(e.target.value)}
        />
      )}
      <div className="app-topbar-spacer" />
      {children}
      {book && <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />}
      <SettingsPopover>{settingsExtra}</SettingsPopover>
    </header>
  );
}
