/** The shelf: every book, newest first, plus the door to a new one. */

import { useState } from 'react';
import { navigate } from '../../router.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { BookCard } from './BookCard.js';
import { EmptyLibrary } from './EmptyLibrary.js';

export function LibraryView() {
  const { store, state } = useBookStore();
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const books = state.library.books;

  return (
    <div className="lib-root">
      <div className="lib-head">
        <h1>Your books</h1>
        <div className="app-topbar-spacer" />
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
      {books.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="lib-grid">
          {books.map((entry) =>
            confirmingDelete === entry.id ? (
              <div className="lib-card" key={entry.id}>
                <p style={{ margin: 0 }}>
                  Delete “{entry.title}”? This can’t be undone.
                </p>
                <div className="lib-card-row">
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
