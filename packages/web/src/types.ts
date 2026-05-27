/**
 * Web-side wrapper types for the spread-first editor.
 *
 * The engine's `Manuscript`/`Spread` are pure text and developmental
 * metadata. Composition concerns — physical trim size, per-page text
 * placement, illustration briefs — live here in `packages/web/` and
 * never reach the engine. Use {@link toEngineManuscript} to flatten
 * the two-page-per-spread model into the engine's one-text-per-spread
 * contract before calling `analyze()`.
 *
 * @see docs/decisions/0003-spread-native-engine-api.md
 */

import type { Manuscript, Spread } from '@harmonic-systems/early-literacy';

/**
 * Composition of one page within a spread. Each page (left and right)
 * declares its own placement independently — picture book pages are
 * composed at the page level, not the spread level.
 */
export type PagePlacement =
  | 'text-only'
  | 'text-top'
  | 'text-bottom'
  | 'illustration-only';

/** Content of one page in a spread. */
export interface PageContent {
  text: string;
  placement: PagePlacement;
}

/**
 * Physical trim size of the book in inches. Picture-book industry
 * convention is portrait or landscape; squares (Carle / Boynton) are
 * portrait by convention.
 */
export interface TrimSize {
  widthIn: number;
  heightIn: number;
  orientation: 'portrait' | 'landscape';
}

/** Common picture-book trim sizes, as a starting palette for the UI. */
export const TRIM_SIZES: Record<string, TrimSize> = {
  STANDARD_PORTRAIT: { widthIn: 8, heightIn: 10, orientation: 'portrait' },
  STANDARD_LANDSCAPE: { widthIn: 10, heightIn: 8, orientation: 'landscape' },
  SQUARE: { widthIn: 9, heightIn: 9, orientation: 'portrait' },
};

/**
 * A spread as the web editor sees it: the engine's `Spread` (sans
 * `text`, which becomes a derived field built in `toEngineManuscript`
 * from the two page texts) plus two `PageContent` slots — left and
 * right facing pages — and an optional illustration brief.
 *
 * A spread with both pages set to `illustration-only` maps to the
 * engine's `wordless: true`.
 */
export interface WebSpread extends Omit<Spread, 'text'> {
  leftPage: PageContent;
  rightPage: PageContent;
  /** Optional brief for the illustrator. v1 is plain text. */
  illustrationBrief?: string;
}

/**
 * A manuscript as the web editor sees it: the engine's `Manuscript`
 * plus trim size and `WebSpread[]`.
 */
export interface WebManuscript extends Omit<Manuscript, 'spreads'> {
  trimSize: TrimSize;
  spreads: WebSpread[];
}

/**
 * Flatten the two-page model into the engine's one-text-per-spread
 * contract before calling `analyze()`. Page texts are concatenated
 * with a single space when both pages have content — the engine's
 * tokenizer and sentence splitter handle this transparently. A
 * spread with both pages `illustration-only` maps to `wordless: true`.
 *
 * @see docs/decisions/0003-spread-native-engine-api.md
 */
export function toEngineManuscript(web: WebManuscript): Manuscript {
  return {
    title: web.title,
    ageBand: web.ageBand,
    spreads: web.spreads.map((s) => {
      const left = s.leftPage.text.trim();
      const right = s.rightPage.text.trim();
      const text = left && right ? `${left} ${right}` : left || right;
      const wordless =
        s.leftPage.placement === 'illustration-only' &&
        s.rightPage.placement === 'illustration-only';
      const out: Spread = { index: s.index, text };
      if (wordless || s.wordless) out.wordless = true;
      if (s.notes !== undefined) out.notes = s.notes;
      return out;
    }),
  };
}

/**
 * Build a blank 16-spread `WebManuscript`. Each spread starts with
 * both pages set to `text-only` and empty text — the simplest blank
 * canvas for an author. The author then picks per-page placement as
 * the composition emerges.
 */
export function emptyWebManuscript(
  ageBand: WebManuscript['ageBand'],
  spreadCount = 16,
  trimSize: TrimSize = TRIM_SIZES.STANDARD_PORTRAIT,
): WebManuscript {
  return {
    ageBand,
    trimSize,
    spreads: Array.from({ length: spreadCount }, (_, i) => ({
      index: i + 1,
      leftPage: { text: '', placement: 'text-only' },
      rightPage: { text: '', placement: 'text-only' },
    })),
  };
}
