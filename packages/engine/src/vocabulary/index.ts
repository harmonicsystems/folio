/**
 * Vocabulary analysis: tokenization, sight-word coverage (Dolch + Fry),
 * type-token ratio, Tier-1 classification, and reach-word detection.
 *
 * Tier 1 is operationalized as the Dale–Chall familiar-word list ∪ the
 * Dolch/Fry sight words (see {@link ./tiers}). `tier1Coverage` is the
 * share of familiar tokens; `tier2Words` holds the reach words (tokens
 * outside Tier 1). `tier3Words` stays empty — tier-2 vs tier-3 isn't yet
 * distinguished (documented in tiers.ts and SOURCES.md).
 *
 * @see Beck, McKeown, & Kucan (2013), Bringing Words to Life
 * @see Dolch (1948), Fry (1980), Chall & Dale (1995)
 * @see docs/linguistics/SOURCES.md
 */

import type { ReachWord, Spread, VocabularyProfile } from '../types.js';
import { tokenizeWords } from './tokenize.js';
import { isSightWord, sightWordCoverage } from './sight-words.js';
import { isTier1, tier1Coverage, reachVocabulary } from './tiers.js';

export { tokenize, tokenizeWords } from './tokenize.js';
export { isSightWord, sightWordCoverage } from './sight-words.js';
export { isDaleChall, isTier1, tier1Coverage, reachVocabulary } from './tiers.js';

/**
 * Analyze a single text blob. For spread-aware reach-word attribution,
 * the orchestrator in `readability/` composes this with
 * {@link identifyReachWordsBySpread}.
 */
export function analyzeVocabulary(text: string): VocabularyProfile {
  const tokens = tokenizeWords(text);
  return {
    tier1Coverage: tier1Coverage(tokens),
    tier2Words: reachVocabulary(tokens),
    tier3Words: [],
    sightWordCoverage: sightWordCoverage(tokens),
    uniqueWords: new Set(tokens).size,
    typeTokenRatio: typeTokenRatio(tokens),
  };
}

/**
 * Reach words: tokens outside Tier 1 (Dale–Chall familiar list ∪
 * Dolch/Fry sight words). A reach word sits at or beyond the reader's
 * expected mastery — the productive ZPD zone a good picture book
 * intentionally visits.
 *
 * Reported once at the spread each word first appears on, with reason
 * `tier-2` (see tiers.ts on why tier-2 vs tier-3 isn't yet split).
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
    if (!isTier1(token)) {
      out.push({ word: token, spread, reason: 'tier-2' });
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
      if (!isTier1(token)) {
        out.push({ word: token, spread: spread.index, reason: 'tier-2' });
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
