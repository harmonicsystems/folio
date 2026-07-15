/**
 * Versions — the book's snapshot history, docked in the right rail.
 * Restoring never destroys: the current state is checkpointed first, so
 * every restore is itself reversible. "New book from this" is a writer's
 * branch. Named versions are never pruned.
 */

import { useEffect, useRef, useState } from 'react';
import type { DraftBook } from '../../model.js';
import { newId } from '../../model.js';
import { navigate } from '../../router.js';
import {
  deleteVersion,
  listVersions,
  saveSnapshot,
  versionBook,
  type VersionRecord,
} from '../../versions.js';
import { useBookStore } from '../../hooks/useBookStore.js';

const REASON_LABEL: Record<string, string> = {
  manual: 'saved by you',
  'page-count change': 'before a page-count change',
  'construction change': 'before a construction change',
  'format change': 'before a format change',
  'before restore': 'before a restore',
  auto: 'automatic',
};

function relativeTime(ts: number, now = Date.now()): string {
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function VersionsPanel({
  book,
  open,
  onClose,
}: {
  book: DraftBook;
  open: boolean;
  onClose: () => void;
}) {
  const { store } = useBookStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  // listVersions reads storage; bump to re-read after mutations.
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  const versions = listVersions(book.id);

  const saveNamed = () => {
    saveSnapshot(book, 'manual', name);
    setName('');
    refresh();
  };

  const restore = (version: VersionRecord) => {
    const restored = versionBook(book.id, version.id);
    if (!restored) return;
    // Checkpoint the present before the past replaces it.
    saveSnapshot(book, 'before restore');
    store.updateBook((current) => ({
      ...restored,
      id: current.id,
      updatedAt: Date.now(),
    }));
    refresh();
  };

  const restoreAsNewBook = (version: VersionRecord) => {
    const restored = versionBook(book.id, version.id);
    if (!restored) return;
    const copy: DraftBook = {
      ...restored,
      id: newId(),
      title: `${restored.title} (restored)`,
      updatedAt: Date.now(),
    };
    if (store.adoptBook(copy)) {
      navigate({ kind: 'book', bookId: copy.id, view: 'editor' });
    }
  };

  return (
    <div
      className="specs-panel versions-panel"
      role="dialog"
      aria-label="Versions"
      ref={panelRef}
    >
      <div className="specs-panel-head">
        <span className="app-popover-label">Versions · {book.title}</span>
        <button type="button" className="app-iconbtn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="nb-field">
        <label htmlFor="version-name">Save a version</label>
        <div className="versions-save">
          <input
            id="version-name"
            type="text"
            placeholder="e.g. before rhyming rewrite"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNamed();
            }}
          />
          <button type="button" className="btn btn-quiet" onClick={saveNamed}>
            Save
          </button>
        </div>
        <span className="nb-chip-note">
          Versions are also saved automatically before page-count and
          construction changes. Restoring saves one first — it never destroys.
        </span>
      </div>

      {versions.length === 0 ? (
        <p className="ill-empty" style={{ margin: 0 }}>
          No versions yet.
        </p>
      ) : (
        <ol className="versions-list">
          {versions.map((version) => (
            <li key={version.id} className="versions-row">
              <div className="versions-row-head">
                <strong>{version.name ?? REASON_LABEL[version.reason]}</strong>
                <span className="counters-sub">
                  {relativeTime(version.savedAt)} · {version.wordCount}{' '}
                  {version.wordCount === 1 ? 'word' : 'words'}
                  {version.name ? '' : ' · auto'}
                </span>
              </div>
              <div className="versions-row-actions">
                <button
                  type="button"
                  className="app-iconbtn ed-break"
                  title="Replace the current book with this version (the current state is saved as a version first)"
                  onClick={() => restore(version)}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="app-iconbtn ed-break"
                  title="Open this version as a separate book"
                  onClick={() => restoreAsNewBook(version)}
                >
                  New book from this
                </button>
                <button
                  type="button"
                  className="app-iconbtn btn-danger-quiet"
                  aria-label="Delete this version"
                  onClick={() => {
                    deleteVersion(book.id, version.id);
                    refresh();
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
