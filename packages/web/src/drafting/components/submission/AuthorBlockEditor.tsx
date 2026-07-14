/**
 * The quiet author form for the submission head. Rendered once in a fixed
 * slot; `highlight` emphasizes it while the name is still missing rather than
 * relocating it (moving it mid-type would drop focus). Preview updates live.
 */

import { useBookStore } from '../../hooks/useBookStore.js';
import type { DraftBook } from '../../model.js';

export function AuthorBlockEditor({
  book,
  highlight = false,
}: {
  book: DraftBook;
  highlight?: boolean;
}) {
  const { store } = useBookStore();
  const setAuthor = (patch: Partial<NonNullable<DraftBook['author']>>) =>
    store.updateBook((b) => ({
      ...b,
      author: { name: '', ...b.author, ...patch },
      updatedAt: Date.now(),
    }));

  return (
    <div className="ms-author" data-highlight={highlight}>
      <span className="app-popover-label">
        Author block · top of page one
        {highlight && ' · add your name to complete the manuscript'}
      </span>
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
