/**
 * The shape of the book at a glance: every render unit as a true-layout
 * thumbnail, labeled the way editors label spreads ("4–5 … 30–31, 32"),
 * with front-matter chips and illustration-note excerpts. Click (or Enter)
 * zooms into that spread in the editor; Esc from the editor lands here.
 */

import { useCallback, useState } from 'react';
import { findConstruction, getFormat } from '../../formats.js';
import type { DraftBook } from '../../model.js';
import { isEmptyPage, placeOverflowPage } from '../../model.js';
import { countWords } from '../../counts.js';
import { buildPageMap } from '../../pageMap.js';
import { lastUnitFor, loadPrefs, savePrefs } from '../../persistence.js';
import { navigate } from '../../router.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { useKeyboardNav } from '../../hooks/useKeyboardNav.js';
import { CountersBar } from '../editor/CountersBar.js';
import { SpreadThumbnail } from './SpreadThumbnail.js';

/** Zoom stops for the storyboard grid (thumbnail width in px). */
const ZOOM_STOPS = [140, 176, 208, 256, 320, 400];
const DEFAULT_ZOOM = 208;

function nearestStop(width: number): number {
  return ZOOM_STOPS.reduce((best, stop) =>
    Math.abs(stop - width) < Math.abs(best - width) ? stop : best,
  );
}

export function StoryboardView({
  book,
  currentUnit,
}: {
  book: DraftBook;
  currentUnit?: number;
}) {
  const format = getFormat(book.formatId);
  const map = buildPageMap(book.pageCount, findConstruction(format, book.binding));

  // Highlight (and Esc-return to) the spread the writer was last editing.
  const activeUnit = currentUnit ?? lastUnitFor(book.id);

  const [zoom, setZoom] = useState(() =>
    nearestStop(loadPrefs().storyboardZoom ?? DEFAULT_ZOOM),
  );
  const zoomBy = useCallback((direction: 1 | -1) => {
    setZoom((current) => {
      const at = ZOOM_STOPS.indexOf(nearestStop(current));
      const next =
        ZOOM_STOPS[Math.max(0, Math.min(at + direction, ZOOM_STOPS.length - 1))];
      const prefs = loadPrefs();
      savePrefs({ ...prefs, storyboardZoom: next });
      return next;
    });
  }, []);

  const open = useCallback(
    (index: number) =>
      navigate({ kind: 'book', bookId: book.id, view: 'editor', unit: index }),
    [book.id],
  );

  useKeyboardNav({
    onPrev: () => {},
    onNext: () => {},
    onToggleGuides: () => {},
    onEscape: () => open(activeUnit ?? 0),
  });

  return (
    <div className="sb-root">
      <div
        className="sb-grid"
        style={{ gridTemplateColumns: `repeat(auto-fill, ${zoom + 16}px)` }}
      >
        {map.units.map((unit) => (
          <SpreadThumbnail
            key={unit.index}
            book={book}
            format={format}
            trim={book.trim}
            unit={unit}
            width={zoom}
            selected={unit.index === activeUnit}
            onOpen={() => open(unit.index)}
          />
        ))}
      </div>
      <OverflowTray book={book} />
      <StrandedFrontMatterNote book={book} />
      <div className="ed-statusrow">
        <CountersBar book={book} map={map} format={format} />
        <div className="app-topbar-spacer" />
        <div className="sb-zoom" role="group" aria-label="Thumbnail size">
          <button
            type="button"
            className="app-iconbtn"
            onClick={() => zoomBy(-1)}
            disabled={zoom === ZOOM_STOPS[0]}
            aria-label="Smaller thumbnails"
          >
            −
          </button>
          <button
            type="button"
            className="app-iconbtn"
            onClick={() => zoomBy(1)}
            disabled={zoom === ZOOM_STOPS[ZOOM_STOPS.length - 1]}
            aria-label="Larger thumbnails"
          >
            +
          </button>
        </div>
        <span className="ed-tools-divider" aria-hidden="true" />
        <button
          type="button"
          className="app-iconbtn ed-break"
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

/**
 * The unplaced-pages tray: full text on demand, copyable, and restorable
 * into the first empty page — recovery is an action, not a hope.
 */
function OverflowTray({ book }: { book: DraftBook }) {
  const { store } = useBookStore();
  const format = getFormat(book.formatId);
  const entries = book.overflow
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => !isEmptyPage(page));
  if (entries.length === 0) return null;

  const hasEmptySlot = book.storyPages.some((p) => isEmptyPage(p));
  const atMaxPages =
    book.pageCount === format.pageCounts[format.pageCounts.length - 1];
  const canGrowViaConstruction =
    format.constructionOptions.length > 1 &&
    book.binding === 'hardcover-selfEnded';
  const hint =
    !atMaxPages || canGrowViaConstruction
      ? 'They return in order when the page budget grows — or place one into an empty page now.'
      : 'The page budget is at this format’s maximum — place pages into empty slots, or copy their text.';

  return (
    <div className="sb-overflow-tray" role="note">
      <strong>
        {entries.length} unplaced {entries.length === 1 ? 'page' : 'pages'}
      </strong>{' '}
      — written but outside the current page budget. Nothing is deleted.{' '}
      {hint}
      <div className="sb-overflow-items">
        {entries.map(({ page, index }) => {
          const words = countWords(page.text);
          const notes = page.placeholders
            .map((ph) => ph.note)
            .filter(Boolean);
          return (
            <details key={index} className="sb-overflow-detail">
              <summary>
                “{page.text.slice(0, 60)}
                {page.text.length > 60 ? '…' : ''}”
                <span className="counters-sub">
                  {' '}
                  · {words} {words === 1 ? 'word' : 'words'}
                  {notes.length > 0 && ` · ${notes.length} art note`}
                </span>
              </summary>
              {page.text && <p className="sb-overflow-full">{page.text}</p>}
              {notes.map((note, i) => (
                <p key={i} className="sb-overflow-full">
                  <em>art note: “{note}”</em>
                </p>
              ))}
              <div className="nb-actions">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    void navigator.clipboard?.writeText(page.text);
                  }}
                >
                  Copy text
                </button>
                <button
                  type="button"
                  className="btn btn-quiet"
                  disabled={!hasEmptySlot}
                  title={
                    hasEmptySlot
                      ? 'Move this page into the first empty story page'
                      : 'No empty story pages — grow the budget or clear a page first'
                  }
                  onClick={() =>
                    store.updateBook((b) => placeOverflowPage(b, index))
                  }
                >
                  Place in book
                </button>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Front-matter text retained by a construction that has no page for it
 * (a half title after switching to self-ended) — kept, and now visible.
 */
function StrandedFrontMatterNote({ book }: { book: DraftBook }) {
  const format = getFormat(book.formatId);
  const construction = findConstruction(format, book.binding);
  const stranded = (['half-title', 'title', 'copyright'] as const).filter(
    (role) =>
      !construction.frontMatterOrder.includes(role) &&
      (book.frontMatter[role]?.text ?? '').trim().length > 0,
  );
  if (stranded.length === 0) return null;
  return (
    <div className="sb-overflow-tray" role="note">
      {stranded.map((role) => (
        <p key={role} className="sb-overflow-full" style={{ margin: 0 }}>
          <strong>{role === 'half-title' ? 'Half title' : role}</strong> text is
          kept but this construction has no {role.replace('-', ' ')} page:{' '}
          <em>“{book.frontMatter[role]?.text}”</em>
        </p>
      ))}
    </div>
  );
}
