/**
 * The shape of the writing, ambiently visible: plain counts against the
 * preset's published numbers. No judgments — the numbers speak quietly.
 */

import type { BookFormat } from '../../formats.js';
import type { DraftBook } from '../../model.js';
import type { PageMap, RenderUnit } from '../../pageMap.js';
import {
  bookWordBand,
  bookWordCount,
  budgetUsage,
  unitWordCount,
} from '../../counts.js';

export function CountersBar({
  book,
  map,
  format,
  unit,
}: {
  book: DraftBook;
  map: PageMap;
  format: BookFormat;
  /** Current unit, when a spread is open in the editor. */
  unit?: RenderUnit;
}) {
  const total = bookWordCount(book);
  const band = bookWordBand(book, format);
  const usage = budgetUsage(book, map);
  const here = unit ? unitWordCount(book, unit) : null;

  return (
    <div className="counters" role="status" aria-label="Manuscript counts">
      <span className="counters-item">
        <strong>{total}</strong> {total === 1 ? 'word' : 'words'}
        <span className="counters-sub">
          {' '}
          · target {band.min}–{band.max}, around {band.target}
        </span>
      </span>
      {here !== null && unit && (
        <span className="counters-item">
          <strong>{here}</strong> on{' '}
          {unit.kind === 'single' ? 'page' : 'pages'} {unit.label}
        </span>
      )}
      <span className="counters-item">
        <strong>{usage.used}</strong> of {usage.budget} story pages
        {usage.overflowCount > 0 && (
          <span className="counters-sub"> · {usage.overflowCount} unplaced</span>
        )}
      </span>
    </div>
  );
}
