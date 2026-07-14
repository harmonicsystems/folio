/** Warm empty state: one sentence, one primary action. */

import { navigate } from '../../router.js';

export function EmptyLibrary() {
  return (
    <div className="lib-empty">
      <p>A quiet shelf, waiting for a book.</p>
      <small>
        Pick a format — board book, picture book, or early reader — and start
        writing on real pages.
      </small>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => navigate({ kind: 'new' })}
      >
        New book
      </button>
    </div>
  );
}
