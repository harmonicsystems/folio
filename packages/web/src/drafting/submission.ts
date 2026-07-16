/**
 * The submission manuscript (ADR 0016 §5): the same words, re-rendered as
 * the plain standard-format document editors expect. Conformity, not polish
 * — formatting is a hygiene gate, and this document's job is to be invisible
 * (cf. William Shunn, "Proper Manuscript Format").
 *
 * Pure: DraftBook → SubmissionDoc. The manuscript is the story text — front
 * matter page content and chapter markers stay behind; illustration notes
 * are quarantined into a separate do-not-submit artifact, never inlined.
 */

import { findConstruction, getFormat } from './formats.js';
import type { DraftBook } from './model.js';
import { buildPageMap, type RenderUnit } from './pageMap.js';
import { bookWordCount } from './counts.js';

export interface SubmissionBlock {
  kind: 'text' | 'marker';
  text: string;
}

export interface ArtNote {
  /** Editorial label, e.g. "page 5" or "pages 6–7". */
  label: string;
  kind: string;
  note: string;
}

export interface SubmissionDoc {
  title: string;
  authorName: string;
  /** Freeform contact block, one line per entry. */
  contactLines: string[];
  byline: string;
  /** Rounded per trade convention: nearest 10 under 1,000, nearest 100 above. */
  roundedWordCount: number;
  /** "LASTNAME / TITLE" — the sheet appends " / page#". */
  runningHeader: string;
  blocks: SubmissionBlock[];
  artNotes: ArtNote[];
}

export function roundWordCount(n: number): number {
  if (n === 0) return 0;
  const step = n < 1000 ? 10 : 100;
  return Math.max(step, Math.round(n / step) * step);
}

export function lastNameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] ?? '').toUpperCase();
}

const ART_KIND_LABEL: Record<string, string> = {
  'spread-bleed': 'full-bleed spread',
  'full-page': 'full page',
  'half-page-top': 'half page, top',
  'half-page-bottom': 'half page, bottom',
  spot: 'spot',
};

export function buildSubmission(
  book: DraftBook,
  opts: { includePageMarkers?: boolean } = {},
): SubmissionDoc {
  const includeMarkers =
    opts.includePageMarkers ?? book.submission?.includePageMarkers ?? false;
  const format = getFormat(book.formatId);
  const map = buildPageMap(book.pageCount, findConstruction(format, book.binding));

  const blocks: SubmissionBlock[] = [];
  const artNotes: ArtNote[] = [];

  const unitMarker = (unit: RenderUnit): string => {
    const storyPages = unit.pages.filter((p) => p.role === 'story');
    const noun = storyPages.length > 1 || unit.kind === 'spread' ? 'PAGES' : 'PAGE';
    return `${noun} ${unit.label}:`;
  };

  for (const unit of map.units) {
    let unitHasMarker = false;
    for (const slot of unit.pages) {
      if (slot.role !== 'story' || slot.storyOrdinal === undefined) continue;
      const page = book.storyPages[slot.storyOrdinal];
      if (!page) continue;

      for (const ph of page.placeholders) {
        artNotes.push({
          label:
            ph.kind === 'spread-bleed'
              ? `pages ${unit.label}`
              : `page ${slot.pageNumber}`,
          kind: ART_KIND_LABEL[ph.kind] ?? ph.kind,
          note: ph.note,
        });
      }

      const lines = page.text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;
      if (includeMarkers && !unitHasMarker) {
        blocks.push({ kind: 'marker', text: unitMarker(unit) });
        unitHasMarker = true;
      }
      for (const line of lines) blocks.push({ kind: 'text', text: line });
    }
  }

  const authorName = book.author?.name?.trim() ?? '';
  const title = book.title.trim() || 'Untitled';
  return {
    title,
    authorName,
    contactLines: (book.author?.contact ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    byline: authorName ? `by ${authorName}` : '',
    roundedWordCount: roundWordCount(bookWordCount(book)),
    runningHeader: `${lastNameOf(authorName) || 'AUTHOR'} / ${title.toUpperCase()}`,
    blocks,
    artNotes,
  };
}

/** The quarantine artifact: labeled so it cannot be mistaken for the manuscript. */
export function artNotesFileText(doc: SubmissionDoc): string {
  const rows = doc.artNotes
    .map((n) => `${n.label} · ${n.kind}${n.note ? ` · “${n.note}”` : ''}`)
    .join('\n');
  return (
    `Art notes — for your reference, do not submit\n` +
    `${doc.title}${doc.authorName ? ` · ${doc.authorName}` : ''}\n\n` +
    `Traditional editors pair the manuscript with their own illustrator and\n` +
    `read the visual space themselves — art notes in a submission read as\n` +
    `not knowing the industry. Keep this list for your own records.\n\n` +
    `${rows}\n`
  );
}
