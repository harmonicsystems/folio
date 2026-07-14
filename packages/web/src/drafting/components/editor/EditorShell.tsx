/**
 * The editing surface for one book. Milestone 2 placeholder: shows the
 * book's physical facts; the spread canvas arrives in milestone 3.
 */

import { getFormat } from '../../formats.js';
import type { DraftBook } from '../../model.js';
import { SpecSheet } from '../newbook/SpecSheet.js';

export function EditorShell({ book }: { book: DraftBook }) {
  const format = getFormat(book.formatId);
  return (
    <div className="nb-root">
      <h1>{book.title}</h1>
      <section className="nb-options">
        <div className="nb-field">
          <label>The physical facts</label>
          <SpecSheet
            format={format}
            trim={book.trim}
            pageCount={book.pageCount}
            binding={book.binding}
            level={book.readerLevel}
          />
        </div>
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          The spread editor arrives in milestone 3.
        </p>
      </section>
    </div>
  );
}
