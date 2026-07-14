/**
 * The page map: the single pure function that turns (pageCount, construction)
 * into physical pages with roles, and the render units the editor and
 * storyboard draw (ADR 0016 §1).
 *
 * Convention: page 1 is a recto; odd pages are recto, even verso. All legal
 * page counts are multiples of 4, so every book renders as
 * `[1] single-recto, [2–3], …, [N−2, N−1], [N] single-verso`.
 *
 * Self-ended hardcovers consume their first and last leaves (pages 1–2 and
 * N−1–N) as pastedown + flyleaf; "plus endpapers" binds separate stock and
 * keeps every printed page usable.
 */

import type { BookFormat, Construction, PageRole } from './formats.js';

export interface PageSlot {
  /** Physical page number, 1..N. */
  pageNumber: number;
  /** Odd pages are recto (right), even verso (left). */
  side: 'recto' | 'verso';
  role: PageRole;
  /** False only for self-end pages, which carry no content. */
  editable: boolean;
  /** 0-based index into `DraftBook.storyPages`, present when role is 'story'. */
  storyOrdinal?: number;
}

export interface RenderUnit {
  kind: 'single' | 'spread';
  /** [recto] for page 1, [verso, recto] for spreads, [verso] for page N. */
  pages: PageSlot[];
  /** Editorial label: "1", "2–3", … "32" (en dash, no "page" prefix). */
  label: string;
  /** "story spread 3 of 13" when the unit holds ≥1 story page. */
  storyLabel?: string;
  /** 0-based position among all units. */
  index: number;
}

export interface PageMap {
  pageCount: number;
  construction: Construction;
  pages: PageSlot[];
  units: RenderUnit[];
  /** Ordered physical page numbers with role 'story' — the ordinal↔page bridge. */
  storyPageNumbers: number[];
  /** storyPageNumbers.length — the story page budget. */
  storyBudget: number;
}

export function isLegalPageCount(format: BookFormat, n: number): boolean {
  return format.pageCounts.includes(n);
}

export function nearestLegalPageCount(format: BookFormat, n: number): number {
  let best = format.defaultPageCount;
  let bestDist = Infinity;
  for (const legal of format.pageCounts) {
    const dist = Math.abs(legal - n);
    if (dist < bestDist) {
      best = legal;
      bestDist = dist;
    }
  }
  return best;
}

export function buildPageMap(
  pageCount: number,
  construction: Construction,
): PageMap {
  const pages: PageSlot[] = [];
  for (let n = 1; n <= pageCount; n++) {
    pages.push({
      pageNumber: n,
      side: n % 2 === 1 ? 'recto' : 'verso',
      role: 'story',
      editable: true,
    });
  }

  if (construction.binding === 'hardcover-selfEnded') {
    for (const n of [1, 2, pageCount - 1, pageCount]) {
      const slot = pages[n - 1];
      slot.role = 'self-end';
      slot.editable = false;
    }
  }

  // Front matter takes the first editable pages, in construction order.
  let fmIndex = 0;
  for (const slot of pages) {
    if (fmIndex >= construction.frontMatterOrder.length) break;
    if (!slot.editable) continue;
    slot.role = construction.frontMatterOrder[fmIndex];
    fmIndex += 1;
  }

  const storyPageNumbers: number[] = [];
  for (const slot of pages) {
    if (slot.role === 'story') {
      slot.storyOrdinal = storyPageNumbers.length;
      storyPageNumbers.push(slot.pageNumber);
    }
  }

  // Units: [1], [2–3], …, [N−2, N−1], [N].
  const units: RenderUnit[] = [];
  units.push({
    kind: 'single',
    pages: [pages[0]],
    label: '1',
    index: 0,
  });
  for (let left = 2; left <= pageCount - 2; left += 2) {
    units.push({
      kind: 'spread',
      pages: [pages[left - 1], pages[left]],
      label: `${left}–${left + 1}`,
      index: units.length,
    });
  }
  units.push({
    kind: 'single',
    pages: [pages[pageCount - 1]],
    label: `${pageCount}`,
    index: units.length,
  });

  const storyUnits = units.filter((u) =>
    u.pages.some((p) => p.role === 'story'),
  );
  storyUnits.forEach((unit, i) => {
    unit.storyLabel = `story spread ${i + 1} of ${storyUnits.length}`;
  });

  return {
    pageCount,
    construction,
    pages,
    units,
    storyPageNumbers,
    storyBudget: storyPageNumbers.length,
  };
}

/** The unit containing a given physical page. */
export function unitForPage(map: PageMap, pageNumber: number): RenderUnit {
  if (pageNumber <= 1) return map.units[0];
  if (pageNumber >= map.pageCount) return map.units[map.units.length - 1];
  return map.units[Math.floor(pageNumber / 2)];
}

/** The unit containing a given story ordinal, or the first story unit. */
export function unitForOrdinal(map: PageMap, ordinal: number): RenderUnit {
  const page = map.storyPageNumbers[ordinal];
  if (page !== undefined) return unitForPage(map, page);
  const first = map.units.find((u) => u.pages.some((p) => p.role === 'story'));
  return first ?? map.units[0];
}
