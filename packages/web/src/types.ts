/**
 * Web-side wrapper types for the spread-first editor.
 *
 * The engine's `Manuscript`/`Spread` are pure text and developmental
 * metadata. Composition concerns — physical trim size, per-spread
 * placement, illustration briefs — live here in `packages/web/` and
 * never reach the engine. Use {@link toEngineManuscript} to strip
 * wrapper fields before calling `analyze()`.
 *
 * @see docs/decisions/0003-spread-native-engine-api.md
 */

import type { Manuscript, Spread } from '@harmonic-systems/early-literacy';

/**
 * Placement of text relative to the illustration on a spread. Used by
 * the editor to render layout zones; not interpreted by the engine.
 */
export type SpreadPlacement =
  | 'text-left'
  | 'text-right'
  | 'text-top'
  | 'text-bottom'
  | 'wordless';

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
 * A spread as the web editor sees it: the engine's `Spread` plus
 * composition fields. `placement` defaults to `text-left`; `wordless`
 * spreads (engine field) and the `wordless` placement value mean the
 * same thing — the placement is the canonical source for the UI.
 */
export interface WebSpread extends Spread {
  placement: SpreadPlacement;
  /** Optional brief for the illustrator. v1 is plain text. */
  illustrationBrief?: string;
}

/**
 * A manuscript as the web editor sees it: the engine's `Manuscript`
 * plus trim size and `WebSpread[]`.
 */
export interface WebManuscript extends Manuscript {
  trimSize: TrimSize;
  spreads: WebSpread[];
}

/**
 * Strip composition fields before calling the engine's `analyze()`.
 * Per ADR 0003, the engine never sees `trimSize`, `placement`, or
 * `illustrationBrief`. A `wordless` placement on a `WebSpread` maps to
 * the engine's `wordless: true` so per-spread heuristics behave
 * consistently.
 */
export function toEngineManuscript(web: WebManuscript): Manuscript {
  return {
    title: web.title,
    ageBand: web.ageBand,
    spreads: web.spreads.map((s) => {
      const out: Spread = {
        index: s.index,
        text: s.text,
      };
      // Placement of 'wordless' is canonical for the UI; mirror it to
      // the engine's wordless flag so SpreadProfile sees it correctly.
      if (s.placement === 'wordless' || s.wordless) {
        out.wordless = true;
      }
      if (s.notes !== undefined) {
        out.notes = s.notes;
      }
      return out;
    }),
  };
}

/**
 * Build a blank 16-spread `WebManuscript` for a given age band. Use
 * this as the starting state when a new draft is created.
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
      text: '',
      placement: i % 2 === 0 ? 'text-left' : 'text-right',
    })),
  };
}
