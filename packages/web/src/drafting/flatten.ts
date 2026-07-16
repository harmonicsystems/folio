/**
 * Flatten a DraftBook into the main branch's SavedDraft-v2 spread shape
 * (ADR 0016 §4/§5). This is an EXPORT path only — it is never auto-written
 * to main's keys (mirroring was rejected: main's 16-spread restore loop
 * would truncate and autosave the truncation back).
 *
 * Pairing follows main's reading order: physical pages (2k−1, 2k) form
 * spread k. Lossy by design: roles, chapters, placeholder kinds and notes,
 * layout beyond the derived placement, overflow, and trim/format metadata
 * stay behind; page text and v2-meaningful placements survive.
 */

import { findConstruction, getFormat } from './formats.js';
import type { DraftBook, DraftPageContent } from './model.js';
import { derivePlacement, getFrontMatterPage, getStoryPage } from './model.js';
import type { FrontMatterRole } from './formats.js';
import { buildPageMap, type PageMap } from './pageMap.js';

export interface SavedDraftPage {
  text: string;
  placement: string;
}

export interface SavedDraftSpread {
  leftPage: SavedDraftPage;
  rightPage: SavedDraftPage;
}

function pageFor(book: DraftBook, map: PageMap, pageNumber: number): SavedDraftPage {
  const slot = map.pages[pageNumber - 1];
  if (!slot || slot.role === 'self-end') {
    return { text: '', placement: 'illustration-only' };
  }
  const content: DraftPageContent =
    slot.role === 'story'
      ? getStoryPage(book, slot.storyOrdinal ?? 0)
      : getFrontMatterPage(book, slot.role as FrontMatterRole);
  return { text: content.text, placement: derivePlacement(content) };
}

export function toSavedDraftSpreads(book: DraftBook): SavedDraftSpread[] {
  const format = getFormat(book.formatId);
  const map = buildPageMap(book.pageCount, findConstruction(format, book.binding));
  const spreads: SavedDraftSpread[] = [];
  for (let k = 1; k * 2 <= book.pageCount; k++) {
    spreads.push({
      leftPage: pageFor(book, map, 2 * k - 1),
      rightPage: pageFor(book, map, 2 * k),
    });
  }
  return spreads;
}
