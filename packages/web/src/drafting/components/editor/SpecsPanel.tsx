/**
 * The physical facts of THIS book, plus its structural controls: trim,
 * page count, construction, reading level. Structure changes go through the
 * model's pure ops — shrinking never deletes; displaced pages queue in the
 * visible overflow tray.
 */

import { useEffect, useRef } from 'react';
import { getFormat, sameTrim, trimLabel, type Trim } from '../../formats.js';
import type { DraftBook } from '../../model.js';
import { applyConstruction, applyLevel, applyPageCount } from '../../model.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { SpecSheet } from '../newbook/SpecSheet.js';

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
  const setPageCount = (n: number) =>
    store.updateBook((b) => applyPageCount(b, format, n));
  const setBinding = (binding: DraftBook['binding']) =>
    store.updateBook((b) => applyConstruction(b, format, binding));
  const setLevel = (level: 1 | 2 | 3) =>
    store.updateBook((b) => applyLevel(b, level));

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
              onClick={() => setPageCount(count)}
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
                onClick={() => setBinding(c.binding)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
