/**
 * Engine-free counting. Plain numbers only — the drafting surface reports
 * counts against the preset's published bands and never judges the writing.
 *
 * `countWords` is whitespace tokenization (`/\S+/g`): contractions,
 * hyphenated and em-dash-joined compounds count as one word each, and stray
 * punctuation tokens count. This deliberately diverges from the analysis
 * engine's linguistic tokenizer (which splits hyphens and drops numerals);
 * the two are never compared — nothing in src/drafting/ touches the engine.
 */

import type { BookFormat, WordBand } from './formats.js';
import { wordBandFor } from './formats.js';
import type { DraftBook, DraftPageContent } from './model.js';
import { isEmptyPage } from './model.js';
import type { PageMap, RenderUnit } from './pageMap.js';

export function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

export function pageWordCount(page: DraftPageContent | undefined): number {
  return page ? countWords(page.text) : 0;
}

/** Story pages only — front matter and chapter titles never count. */
export function bookWordCount(book: DraftBook): number {
  return book.storyPages.reduce((sum, p) => sum + countWords(p.text), 0);
}

export function unitWordCount(book: DraftBook, unit: RenderUnit): number {
  return unit.pages.reduce((sum, slot) => {
    if (slot.role !== 'story' || slot.storyOrdinal === undefined) return sum;
    return sum + pageWordCount(book.storyPages[slot.storyOrdinal]);
  }, 0);
}

export type BandStatus = 'below' | 'within' | 'above';

export function bandStatus(count: number, band: WordBand): BandStatus {
  if (count < band.min) return 'below';
  if (count > band.max) return 'above';
  return 'within';
}

export function bookWordBand(book: DraftBook, format: BookFormat): WordBand {
  return wordBandFor(format, book.readerLevel);
}

export interface BudgetUsage {
  /** Story pages carrying text or at least one placeholder. */
  used: number;
  /** The page map's story budget. */
  budget: number;
  /** Pages waiting in the overflow tray. */
  overflowCount: number;
}

export function budgetUsage(book: DraftBook, map: PageMap): BudgetUsage {
  return {
    used: book.storyPages.filter((p) => !isEmptyPage(p)).length,
    budget: map.storyBudget,
    // The queue keeps empty slots for positional fidelity; only pages with
    // actual writing count as "unplaced."
    overflowCount: book.overflow.filter((p) => !isEmptyPage(p)).length,
  };
}
