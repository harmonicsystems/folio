/**
 * Root of the drafting island: store + theme providers are module-level
 * singletons, so this component is just the route switch and the shell.
 */

import { useEffect } from 'react';
import './styles/tokens.css';
import './styles/page.css';
import './styles/submission.css';
import './styles/app.css';
import { useRoute } from './hooks/useRoute.js';
import { useBookStore } from './hooks/useBookStore.js';
import { lastUnitFor } from './persistence.js';
import { navigate } from './router.js';
import { TopBar } from './components/shell/TopBar.js';
import { LibraryView } from './components/library/LibraryView.js';
import { NewBookFlow } from './components/newbook/NewBookFlow.js';
import { EditorShell } from './components/editor/EditorShell.js';
import { StoryboardView } from './components/storyboard/StoryboardView.js';
import { IllustrationList } from './components/storyboard/IllustrationList.js';
import { SubmissionView } from './components/submission/SubmissionView.js';

export default function DraftApp() {
  const route = useRoute();
  const { store, state } = useBookStore();

  // Keep the active book in sync with the route.
  const routeBookId = route.kind === 'book' ? route.bookId : null;
  useEffect(() => {
    // A cross-tab conflict rebound our edits to a new book id — follow it
    // (re-opening the old id here would discard the preserved copy).
    if (
      state.conflict &&
      state.activeBook?.id === state.conflict.redirectToId
    ) {
      if (routeBookId && routeBookId !== state.conflict.redirectToId) {
        navigate({
          kind: 'book',
          bookId: state.conflict.redirectToId,
          view: route.kind === 'book' ? route.view : 'editor',
        });
      }
      return;
    }
    if (routeBookId && state.activeBook?.id !== routeBookId) {
      const opened = store.openBook(routeBookId);
      if (!opened) navigate({ kind: 'library' });
    }
    if (!routeBookId && state.activeBook) {
      store.closeBook();
    }
  }, [routeBookId, state.activeBook, state.conflict, store, route]);

  const book = route.kind === 'book' ? state.activeBook : null;

  return (
    <div className="app-root">
      <TopBar
        book={book}
        onRename={(title) =>
          store.updateBook((b) => ({ ...b, title, updatedAt: Date.now() }))
        }
        saveState={state.saveState}
        lastSavedAt={state.lastSavedAt}
      >
        {route.kind === 'book' && book && (
          <div
            className="theme-switch app-viewswitch"
            role="group"
            aria-label="View"
          >
            <button
              type="button"
              aria-pressed={route.view === 'editor'}
              title="Write on the book's pages"
              onClick={() =>
                navigate({
                  kind: 'book',
                  bookId: book.id,
                  view: 'editor',
                  unit: lastUnitFor(book.id),
                })
              }
            >
              Write
            </button>
            <button
              type="button"
              aria-pressed={route.view === 'storyboard'}
              title="See the whole book at a glance"
              onClick={() =>
                navigate({ kind: 'book', bookId: book.id, view: 'storyboard' })
              }
            >
              Storyboard
            </button>
            <button
              type="button"
              aria-pressed={route.view === 'submission'}
              title="Plain manuscript to send a publisher"
              onClick={() =>
                navigate({ kind: 'book', bookId: book.id, view: 'submission' })
              }
            >
              Submission
            </button>
          </div>
        )}
      </TopBar>
      {state.conflict && (
        <div className="app-banner" role="alert">
          “{state.conflict.title}” was saved in another tab while you had
          unsaved edits here. Nothing was lost — your edits continue as
          “{state.conflict.title} (conflicted copy)”; the other tab's version
          is in your library.
          <button type="button" onClick={() => store.dismissConflict()}>
            Got it
          </button>
        </div>
      )}
      {(state.saveState === 'error' || state.saveState === 'unavailable') && (
        <div className="app-banner" role="alert">
          <strong>Your writing is not being saved</strong>
          {state.saveState === 'unavailable'
            ? ' — this browser is blocking storage (private window?). Copy your text somewhere safe before closing this tab.'
            : ' — the browser’s storage is full or failing. Keep this tab open and download a backup from the library.'}
        </div>
      )}
      {state.lastDeleted && (
        <div className="app-banner" role="status">
          Deleted “{state.lastDeleted.title}”. It stays in the trash for 7
          days.
          <button
            type="button"
            onClick={() => store.undoDelete(state.lastDeleted!.id)}
          >
            Undo
          </button>
          <button type="button" onClick={() => store.dismissLastDeleted()}>
            Dismiss
          </button>
        </div>
      )}
      {state.externalChange && !state.conflict && (
        <div className="app-banner" role="status">
          This book changed in another tab — this tab refreshed to the newest
          version.
          <button type="button" onClick={() => store.dismissExternalChange()}>
            Got it
          </button>
        </div>
      )}
      <main className="app-main">
        {route.kind === 'library' && <LibraryView />}
        {route.kind === 'new' && <NewBookFlow />}
        {route.kind === 'book' &&
          (book && book.id === route.bookId ? (
            route.view === 'storyboard' ? (
              <StoryboardView book={book} />
            ) : route.view === 'illustrations' ? (
              <IllustrationList book={book} />
            ) : route.view === 'submission' ? (
              <SubmissionView book={book} />
            ) : (
              <EditorShell
                book={book}
                unitIndex={route.view === 'editor' ? route.unit : undefined}
              />
            )
          ) : null)}
      </main>
    </div>
  );
}
