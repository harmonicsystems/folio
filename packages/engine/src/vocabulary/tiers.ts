/**
 * Tier-1 vocabulary classification.
 *
 * "Tier 1" (Beck, McKeown & Kucan 2013) is everyday, high-frequency
 * vocabulary a reader needs no instruction for. Beck/McKeown/Kucan never
 * published canonical tier word lists, so we operationalize Tier-1
 * membership as the union of the **Dale–Chall** familiar-word list (a
 * sourced child-normed proxy — see data/dale-chall.ts) and the
 * **Dolch/Fry** sight words. A word is Tier 1 if any of those lists it.
 *
 * Words OUTSIDE Tier 1 are "reach words". Beck's framework further
 * splits these into Tier 2 (high-utility literary/academic words —
 * "mischief", "reluctant") and Tier 3 (rare/specialized — "sirrah",
 * "trellis"). We do NOT yet distinguish the two: that needs a frequency
 * band wider than Dale–Chall, or a Tier-3 list we don't have. Until
 * then every reach word is reported as `tier-2` (the common case for
 * picture-book vocabulary) and `tier3Words` stays empty. This is a
 * documented limitation, not a claim — see SOURCES.md (Vocabulary) and
 * ARCHITECTURE.md (Milestone 1).
 *
 * Known undercount: inflected/derived forms with a familiar stem
 * ("bunnies"→"bunny", "squeezed"→"squeeze") aren't themselves listed,
 * so they read as reach words. Stem-aware classification (reason
 * `morphologically-complex`) is future work.
 *
 * @see Beck, McKeown, & Kucan (2013); Chall & Dale (1995)
 * @see docs/linguistics/SOURCES.md (Vocabulary)
 */

import { DALE_CHALL } from '../data/dale-chall.js';
import { isSightWord } from './sight-words.js';

const DALE_CHALL_SET: ReadonlySet<string> = new Set(DALE_CHALL);

/** True if the word is on the Dale–Chall familiar-word list. */
export function isDaleChall(word: string): boolean {
  return DALE_CHALL_SET.has(word.toLowerCase());
}

/**
 * True if the word is Tier 1 (familiar): on the Dale–Chall list or the
 * Dolch/Fry sight-word lists. Case-insensitive.
 */
export function isTier1(word: string): boolean {
  return isDaleChall(word) || isSightWord(word);
}

/** Share (0–1) of tokens that are Tier 1. 0 for empty input. */
export function tier1Coverage(tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) if (isTier1(t)) hits++;
  return hits / tokens.length;
}

/**
 * Unique reach words — tokens outside Tier 1 — in first-appearance
 * order. These populate `VocabularyProfile.tier2Words` (see the module
 * note on why tier-2 vs tier-3 is not yet distinguished).
 */
export function reachVocabulary(tokens: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (!isTier1(t)) out.push(t);
  }
  return out;
}
