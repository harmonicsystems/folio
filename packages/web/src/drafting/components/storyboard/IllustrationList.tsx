/**
 * The illustration list — a real artifact authors hand to illustrators:
 * every placeholder in book order with its editorial page label, kind, and
 * note. Copy as plain text, or print (chrome hides via @media print).
 */

import { useMemo, useState } from 'react';
import { findConstruction, getFormat, trimLabel } from '../../formats.js';
import type { DraftBook, DraftPageContent } from '../../model.js';
import { getFrontMatterPage, getStoryPage } from '../../model.js';
import type { FrontMatterRole } from '../../formats.js';
import { buildPageMap } from '../../pageMap.js';

const KIND_LABEL: Record<string, string> = {
  'spread-bleed': 'full-bleed spread',
  'full-page': 'full page',
  'half-page-top': 'half page, top',
  'half-page-bottom': 'half page, bottom',
  spot: 'spot',
};

interface Row {
  label: string;
  kind: string;
  note: string;
}

export function collectIllustrations(book: DraftBook): Row[] {
  const format = getFormat(book.formatId);
  const map = buildPageMap(book.pageCount, findConstruction(format, book.binding));
  const rows: Row[] = [];
  for (const unit of map.units) {
    for (const slot of unit.pages) {
      if (!slot.editable) continue;
      const content: DraftPageContent =
        slot.role === 'story'
          ? getStoryPage(book, slot.storyOrdinal ?? 0)
          : getFrontMatterPage(book, slot.role as FrontMatterRole);
      for (const ph of content.placeholders) {
        const label =
          ph.kind === 'spread-bleed'
            ? `pages ${unit.label}`
            : `page ${slot.pageNumber}`;
        rows.push({ label, kind: KIND_LABEL[ph.kind] ?? ph.kind, note: ph.note });
      }
    }
  }
  return rows;
}

export function illustrationListText(book: DraftBook, rows: Row[]): string {
  const format = getFormat(book.formatId);
  const head = `${book.title} — illustration list\n${format.name}, ${trimLabel(book.trim)}, ${book.pageCount} pages\n`;
  const body = rows
    .map((r) => `${r.label} · ${r.kind}${r.note ? ` · “${r.note}”` : ''}`)
    .join('\n');
  return `${head}\n${body}\n`;
}

export function IllustrationList({ book }: { book: DraftBook }) {
  const rows = useMemo(() => collectIllustrations(book), [book]);
  const format = getFormat(book.formatId);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(illustrationListText(book, rows));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the print path still works */
    }
  };

  return (
    <div className="ill-root">
      <header className="ill-head">
        <h1>{book.title}</h1>
        <p className="ill-sub">
          Illustration list · {format.name}, {trimLabel(book.trim)},{' '}
          {book.pageCount} pages
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="ill-empty">
          No illustration spaces yet. Mark them from a page's Layout control —
          full-bleed spread, full page, half page, or spot — and they gather
          here as the list you hand to an illustrator.
        </p>
      ) : (
        <ol className="ill-list">
          {rows.map((row, i) => (
            <li key={i}>
              <span className="ill-label">{row.label}</span>
              <span className="ill-kind">{row.kind}</span>
              {row.note && <span className="ill-note">“{row.note}”</span>}
            </li>
          ))}
        </ol>
      )}
      {rows.length > 0 && (
        <div className="ill-actions">
          <button type="button" className="btn btn-quiet" onClick={copy}>
            {copied ? 'Copied' : 'Copy as text'}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      )}
    </div>
  );
}
