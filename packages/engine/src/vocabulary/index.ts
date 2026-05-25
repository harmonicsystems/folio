/**
 * Vocabulary analysis: tokenization, sight-word coverage (Dolch + Fry),
 * type-token ratio, and reach-word detection.
 *
 * Scope note: tier classification (Beck/McKeown/Kucan Tier 1/2/3) is
 * NOT yet implemented. Tier 1 lacks a canonical published word list;
 * the sourcing decision is tracked in ARCHITECTURE.md open questions.
 * For now `tier2Words` and `tier3Words` are returned as empty arrays
 * and `tier1Coverage` is 0. Reach-word detection uses a structural
 * definition (see {@link identifyReachWords}) instead of tier membership.
 *
 * @see Beck, McKeown, & Kucan (2013), Bringing Words to Life
 * @see Dolch (1948), Fry (1980)
 * @see docs/linguistics/SOURCES.md
 */

import type { ReachWord, Spread, VocabularyProfile } from '../types.js';
import { tokenizeWords } from './tokenize.js';
import { isSightWord, sightWordCoverage } from './sight-words.js';

export { tokenize, tokenizeWords } from './tokenize.js';
export { isSightWord, sightWordCoverage } from './sight-words.js';

/**
 * Analyze a single text blob. For spread-aware reach-word attribution,
 * the orchestrator in `readability/` composes this with
 * {@link identifyReachWordsBySpread}.
 */
export function analyzeVocabulary(text: string): VocabularyProfile {
  const tokens = tokenizeWords(text);
  return {
    tier1Coverage: 0,
    tier2Words: [],
    tier3Words: [],
    sightWordCoverage: sightWordCoverage(tokens),
    uniqueWords: new Set(tokens).size,
    typeTokenRatio: typeTokenRatio(tokens),
  };
}

/**
 * Reach words: tokens not present in any tracked sight-word list.
 *
 * Structural definition, not a tier claim — a word being outside
 * Dolch + Fry first 100 doesn't make it Tier 2. But it does mean an
 * emerging reader can't decode it as a whole-word unit. Useful signal
 * on its own.
 *
 * Each reach word is reported once at the spread it first appears on.
 */
export function identifyReachWords(
  tokens: readonly string[],
  spread = 1,
): ReachWord[] {
  const seen = new Set<string>();
  const out: ReachWord[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (!isSightWord(token)) {
      out.push({ word: token, spread, reason: 'low-frequency' });
    }
  }
  return out;
}

/**
 * Spread-aware reach-word attribution. Each reach word is attributed
 * to the index of the first spread it appears on.
 */
export function identifyReachWordsBySpread(
  spreads: readonly Spread[],
): ReachWord[] {
  const seen = new Set<string>();
  const out: ReachWord[] = [];
  for (const spread of spreads) {
    const tokens = tokenizeWords(spread.text);
    for (const token of tokens) {
      if (seen.has(token)) continue;
      seen.add(token);
      if (!isSightWord(token)) {
        out.push({ word: token, spread: spread.index, reason: 'low-frequency' });
      }
    }
  }
  return out;
}

/**
 * Type-token ratio: |unique tokens| / |total tokens|. 0 for empty input.
 * Higher TTR = more lexical diversity; lower TTR = more repetition
 * (which is developmentally appropriate for board books and early
 * picture books).
 */
export function typeTokenRatio(tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}
