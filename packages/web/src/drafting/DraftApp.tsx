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
    if (routeBookId && state.activeBook?.id !== routeBookId) {
      const opened = store.openBook(routeBookId);
      if (!opened) navigate({ kind: 'library' });
    }
    if (!routeBookId && state.activeBook) {
      store.closeBook();
    }
  }, [routeBookId, state.activeBook, store]);

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
          <div className="theme-switch" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={route.view === 'editor'}
              onClick={() =>
                navigate({ kind: 'book', bookId: book.id, view: 'editor' })
              }
            >
              Write
            </button>
            <button
              type="button"
              aria-pressed={route.view === 'storyboard'}
              onClick={() =>
                navigate({ kind: 'book', bookId: book.id, view: 'storyboard' })
              }
            >
              Storyboard
            </button>
            <button
              type="button"
              aria-pressed={route.view === 'submission'}
              onClick={() =>
                navigate({ kind: 'book', bookId: book.id, view: 'submission' })
              }
            >
              Submission
            </button>
          </div>
        )}
      </TopBar>
      {state.externalChange && (
        <div className="app-banner" role="status">
          This library changed in another tab — newest write wins.
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
