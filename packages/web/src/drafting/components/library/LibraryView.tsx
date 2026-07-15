/** The shelf: every book, newest first, plus the door to a new one — and the
 *  backup/import pair that keeps a local-first library from being a single
 *  copy of anyone's writing. */

import { useRef, useState } from 'react';
import {
  backupFileName,
  buildBookBackup,
  buildLibraryBackup,
  downloadJson,
  importBackup,
} from '../../backup.js';
import { navigate } from '../../router.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { BookCard } from './BookCard.js';
import { EmptyLibrary } from './EmptyLibrary.js';

export function LibraryView() {
  const { store, state } = useBookStore();
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const books = state.library.books;

  const handleImportFile = async (file: File) => {
    try {
      const summary = importBackup(JSON.parse(await file.text()));
      store.refreshLibrary();
      const parts = [
        `${summary.imported.length} ${summary.imported.length === 1 ? 'book' : 'books'} imported`,
      ];
      if (summary.renamed.length > 0) {
        parts.push(`${summary.renamed.length} imported as a copy (already on the shelf)`);
      }
      if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
      setImportNote(parts.join(' · '));
    } catch {
      setImportNote('That file isn’t a Folio backup.');
    }
  };

  return (
    <div className="lib-root">
      <div className="lib-head">
        <h1>Your books</h1>
        <div className="app-topbar-spacer" />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => fileRef.current?.click()}
        >
          Import backup
        </button>
        {books.length > 0 && (
          <button
            type="button"
            className="btn btn-quiet"
            title="Everything — books, layouts, art notes, version history — as one file"
            onClick={() => downloadJson(backupFileName('library'), buildLibraryBackup())}
          >
            Back up all
          </button>
        )}
        {books.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate({ kind: 'new' })}
          >
            New book
          </button>
        )}
      </div>
      {importNote && (
        <p className="lib-import-note" role="status">
          {importNote}
        </p>
      )}
      {books.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="lib-grid">
          {books.map((entry) =>
            confirmingDelete === entry.id ? (
              <div className="lib-card" key={entry.id}>
                <p style={{ margin: 0 }}>
                  Delete “{entry.title}”? It moves to the trash for 7 days —
                  you can undo from the banner.
                </p>
                <div className="lib-card-row">
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => {
                      const backup = buildBookBackup(entry.id);
                      if (backup) {
                        downloadJson(
                          backupFileName(backup.record.book),
                          backup,
                        );
                      }
                    }}
                  >
                    Download first
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => setConfirmingDelete(null)}
                  >
                    Keep it
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-quiet"
                    onClick={() => {
                      store.deleteBook(entry.id);
                      setConfirmingDelete(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <BookCard
                key={entry.id}
                entry={entry}
                onOpen={() =>
                  navigate({ kind: 'book', bookId: entry.id, view: 'editor' })
                }
                onDelete={() => setConfirmingDelete(entry.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
