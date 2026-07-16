/**
 * The shape of the writing, ambiently visible: plain counts against the
 * preset's published numbers. No judgments — the numbers speak quietly.
 */

import type { BookFormat } from '../../formats.js';
import type { DraftBook } from '../../model.js';
import type { PageMap } from '../../pageMap.js';
import { bookWordBand, bookWordCount, budgetUsage } from '../../counts.js';

export function CountersBar({
  book,
  map,
  format,
}: {
  book: DraftBook;
  map: PageMap;
  format: BookFormat;
}) {
  const total = bookWordCount(book);
  const band = bookWordBand(book, format);
  const usage = budgetUsage(book, map);

  // F3: two whole-book facts only. The per-spread "here" count duplicated
  // what the page captions already sum to, tipping the bar toward a readout.
  return (
    <div className="counters" role="status" aria-label="Manuscript counts">
      <span className="counters-item">
        <strong>{total}</strong> {total === 1 ? 'word' : 'words'}
        <span className="counters-sub">
          {' '}
          · target {band.min}–{band.max}, around {band.target}
        </span>
      </span>
      <span className="counters-item">
        <strong>{usage.used}</strong> of {usage.budget} story pages
        {usage.overflowCount > 0 && (
          <span className="counters-sub"> · {usage.overflowCount} unplaced</span>
        )}
      </span>
    </div>
  );
}
