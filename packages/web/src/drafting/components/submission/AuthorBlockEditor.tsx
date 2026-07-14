/**
 * The quiet author form — surfaces inline when the submission head is
 * missing its name. Never a modal; the manuscript preview updates live.
 */

import { useBookStore } from '../../hooks/useBookStore.js';
import type { DraftBook } from '../../model.js';

export function AuthorBlockEditor({ book }: { book: DraftBook }) {
  const { store } = useBookStore();
  const setAuthor = (patch: Partial<NonNullable<DraftBook['author']>>) =>
    store.updateBook((b) => ({
      ...b,
      author: { name: '', ...b.author, ...patch },
      updatedAt: Date.now(),
    }));

  return (
    <div className="ms-author">
      <span className="app-popover-label">Author block · top of page one</span>
      <input
        type="text"
        placeholder="Your name (as it should appear)"
        aria-label="Author name"
        value={book.author?.name ?? ''}
        onChange={(e) => setAuthor({ name: e.target.value })}
      />
      <textarea
        rows={3}
        placeholder={'Street address\nEmail\nPhone'}
        aria-label="Contact block"
        value={book.author?.contact ?? ''}
        onChange={(e) => setAuthor({ contact: e.target.value })}
      />
    </div>
  );
}
