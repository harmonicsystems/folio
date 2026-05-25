/**
 * Sight-word lookup across the Dolch and Fry lists.
 *
 * @see Dolch (1948) and Fry (1980) — docs/linguistics/SOURCES.md
 */

import { DOLCH_ALL } from '../data/dolch.js';
import { FRY_ALL } from '../data/fry.js';

/** Union of Dolch (220 service + 95 nouns) and Fry (first 100). */
const SIGHT_WORDS: ReadonlySet<string> = new Set([
  ...DOLCH_ALL,
  ...FRY_ALL,
]);

/** True if the word appears in any tracked sight-word list. */
export function isSightWord(word: string): boolean {
  return SIGHT_WORDS.has(word.toLowerCase());
}

/** Coverage = (sight-word tokens) / (total tokens). 0 for empty input. */
export function sightWordCoverage(tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (SIGHT_WORDS.has(t)) hits++;
  }
  return hits / tokens.length;
}
