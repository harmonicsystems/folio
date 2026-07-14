/**
 * The shape of the book at a glance: every render unit as a true-layout
 * thumbnail, labeled the way editors label spreads ("4–5 … 30–31, 32"),
 * with front-matter chips and illustration-note excerpts. Click (or Enter)
 * zooms into that spread in the editor; Esc from the editor lands here.
 */

import { useCallback } from 'react';
import { findConstruction, getFormat } from '../../formats.js';
import type { DraftBook } from '../../model.js';
import { buildPageMap } from '../../pageMap.js';
import { navigate } from '../../router.js';
import { useKeyboardNav } from '../../hooks/useKeyboardNav.js';
import { CountersBar } from '../editor/CountersBar.js';
import { SpreadThumbnail } from './SpreadThumbnail.js';

const THUMB_WIDTH = 208;

export function StoryboardView({
  book,
  currentUnit,
}: {
  book: DraftBook;
  currentUnit?: number;
}) {
  const format = getFormat(book.formatId);
  const map = buildPageMap(book.pageCount, findConstruction(format, book.binding));

  const open = useCallback(
    (index: number) =>
      navigate({ kind: 'book', bookId: book.id, view: 'editor', unit: index }),
    [book.id],
  );

  useKeyboardNav({
    onPrev: () => {},
    onNext: () => {},
    onToggleGuides: () => {},
    onEscape: () => open(currentUnit ?? 0),
  });

  return (
    <div className="sb-root">
      <div className="sb-grid">
        {map.units.map((unit) => (
          <SpreadThumbnail
            key={unit.index}
            book={book}
            format={format}
            trim={book.trim}
            unit={unit}
            width={THUMB_WIDTH}
            selected={unit.index === currentUnit}
            onOpen={() => open(unit.index)}
          />
        ))}
      </div>
      {book.overflow.length > 0 && (
        <div className="sb-overflow-tray" role="note">
          <strong>
            {book.overflow.length} unplaced{' '}
            {book.overflow.length === 1 ? 'page' : 'pages'}
          </strong>{' '}
          — written but outside the current page budget. They return in order
          when the budget grows.
          <div className="sb-overflow-items">
            {book.overflow.map((page, i) => (
              <span key={i} className="sb-overflow-item">
                “{page.text.slice(0, 60)}{page.text.length > 60 ? '…' : ''}”
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="ed-statusrow">
        <CountersBar book={book} map={map} format={format} />
        <div className="app-topbar-spacer" />
        <button
          type="button"
          className="app-iconbtn"
          onClick={() =>
            navigate({ kind: 'book', bookId: book.id, view: 'illustrations' })
          }
        >
          Illustration list
        </button>
      </div>
    </div>
  );
}
