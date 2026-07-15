/**
 * The physical facts of THIS book, plus its structural controls: trim,
 * page count, construction, reading level. Structure changes go through the
 * model's pure ops — shrinking never deletes; displaced pages queue in the
 * visible overflow tray.
 */

import { useEffect, useRef, useState } from 'react';
import {
  findConstruction,
  getFormat,
  sameTrim,
  trimLabel,
  type Trim,
} from '../../formats.js';
import { PAGE_FONTS, getPageFont } from '../../fonts.js';
import type { DraftBook } from '../../model.js';
import {
  applyConstruction,
  applyLevel,
  applyPageCount,
  isEmptyPage,
} from '../../model.js';
import { buildPageMap } from '../../pageMap.js';
import { saveSnapshot } from '../../versions.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { SpecSheet } from '../newbook/SpecSheet.js';

type PendingChange =
  | { kind: 'pages'; value: number; displaced: number }
  | { kind: 'binding'; value: DraftBook['binding']; displaced: number };

/** How many written pages the change would move to the overflow tray. */
function displacedBy(
  book: DraftBook,
  format: ReturnType<typeof getFormat>,
  next: { pageCount?: number; binding?: DraftBook['binding'] },
): number {
  const map = buildPageMap(
    next.pageCount ?? book.pageCount,
    findConstruction(format, next.binding ?? book.binding),
  );
  return book.storyPages
    .slice(map.storyBudget)
    .filter((p) => !isEmptyPage(p)).length;
}

export function SpecsPanel({
  book,
  open,
  onClose,
}: {
  book: DraftBook;
  open: boolean;
  onClose: () => void;
}) {
  const { store } = useBookStore();
  const format = getFormat(book.formatId);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const setTrim = (trim: Trim) =>
    store.updateBook((b) => ({ ...b, trim, updatedAt: Date.now() }));
  const setLevel = (level: 1 | 2 | 3) =>
    store.updateBook((b) => applyLevel(b, level));

  /** Structural changes checkpoint a version first; a change that would
   *  displace written pages asks before it moves anything. */
  const applyStructural = (change: PendingChange) => {
    saveSnapshot(
      book,
      change.kind === 'pages' ? 'page-count change' : 'construction change',
    );
    if (change.kind === 'pages') {
      store.updateBook((b) => applyPageCount(b, format, change.value));
    } else {
      store.updateBook((b) => applyConstruction(b, format, change.value));
    }
    setPending(null);
  };

  const requestPageCount = (n: number) => {
    if (n === book.pageCount) return;
    const displaced = displacedBy(book, format, { pageCount: n });
    const change: PendingChange = { kind: 'pages', value: n, displaced };
    displaced > 0 ? setPending(change) : applyStructural(change);
  };

  const requestBinding = (binding: DraftBook['binding']) => {
    if (binding === book.binding) return;
    const displaced = displacedBy(book, format, { binding });
    const change: PendingChange = { kind: 'binding', value: binding, displaced };
    displaced > 0 ? setPending(change) : applyStructural(change);
  };

  return (
    <div className="specs-panel" role="dialog" aria-label="Book specs" ref={panelRef}>
      <div className="specs-panel-head">
        <span className="app-popover-label">
          {format.name} · the physical facts
        </span>
        <button type="button" className="app-iconbtn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="nb-field">
        <label>Trim</label>
        <div className="nb-chips" role="group" aria-label="Trim size">
          {format.trimOptions.map((trim) => (
            <button
              key={trimLabel(trim)}
              type="button"
              aria-pressed={sameTrim(book.trim, trim)}
              onClick={() => setTrim(trim)}
            >
              {trimLabel(trim)}
              <span className="nb-chip-note">{trim.orientation}</span>
            </button>
          ))}
          {!format.trimOptions.some((t) => sameTrim(t, book.trim)) && (
            <button type="button" aria-pressed="true">
              {trimLabel(book.trim)}
              <span className="nb-chip-note">legacy trim</span>
            </button>
          )}
        </div>
      </div>

      <div className="nb-field">
        <label>Pages</label>
        <div className="nb-chips" role="group" aria-label="Page count">
          {format.pageCounts.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={book.pageCount === count}
              onClick={() => requestPageCount(count)}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {format.constructionOptions.length > 1 && (
        <div className="nb-field">
          <label>Construction</label>
          <div className="nb-chips" role="group" aria-label="Construction">
            {format.constructionOptions.map((c) => (
              <button
                key={c.binding}
                type="button"
                aria-pressed={book.binding === c.binding}
                onClick={() => requestBinding(c.binding)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {pending && (
        <div className="specs-confirm" role="alertdialog" aria-label="Confirm change">
          <p>
            This will unplace <strong>{pending.displaced}</strong> written{' '}
            {pending.displaced === 1 ? 'page' : 'pages'}. Nothing is deleted —
            they keep their text in the storyboard's unplaced tray, and a
            version of the book as it is now is saved first.
          </p>
          <div className="nb-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => applyStructural(pending)}
            >
              {pending.kind === 'pages'
                ? `Change to ${pending.value} pages`
                : 'Change construction'}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="nb-field">
        <label>Page font</label>
        <div className="nb-chips" role="group" aria-label="Page font">
          {PAGE_FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              aria-pressed={getPageFont(book.pageFont).id === font.id}
              style={{ fontFamily: font.stack, fontWeight: font.weight ?? 400 }}
              onClick={() =>
                store.updateBook((b) => ({
                  ...b,
                  pageFont: font.id,
                  updatedAt: Date.now(),
                }))
              }
            >
              {font.label}
              <span className="nb-chip-note">{font.note}</span>
            </button>
          ))}
        </div>
        <span className="nb-chip-note">
          Drafting only — the submission manuscript always exports in 12pt
          Times New Roman.
        </span>
      </div>

      {format.levels && (
        <div className="nb-field">
          <label>Reading level</label>
          <div className="nb-chips" role="group" aria-label="Reading level">
            {format.levels.map((l) => (
              <button
                key={l.level}
                type="button"
                aria-pressed={book.readerLevel === l.level}
                onClick={() => setLevel(l.level)}
              >
                {l.label}
                <span className="nb-chip-note">
                  {l.words.min}–{l.words.max}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <SpecSheet
        format={format}
        trim={book.trim}
        pageCount={book.pageCount}
        binding={book.binding}
        level={book.readerLevel}
      />
    </div>
  );
}
