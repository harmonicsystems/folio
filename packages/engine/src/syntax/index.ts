/**
 * Syntax analysis: sentence segmentation, clause counting, sentence-type
 * classification, length variance.
 *
 * Structural metrics only at this layer — developmental norms and
 * thresholds are applied in `readability/` when composing the full
 * profile, and must cite their source per docs/linguistics/SOURCES.md.
 * (As of Milestone 5 no syntax thresholds are applied anywhere: the
 * candidate numeric anchors — Hunt 1965, Loban 1976 — are *production*
 * norms for child writing/speech, and importing them as input-text
 * comprehension thresholds would be a category error.)
 *
 * Sentence-type classification supports downstream dialogic-reading
 * affordances (PEER / CROWD; Whitehurst & Lonigan 1998).
 *
 * Engine choices in this module (vs. citations — see each submodule):
 * - Segmentation cascade and its guard lists: `segment.ts`.
 * - Lower-bound clause estimator and marker guards: `clauses.ts`.
 * - Punctuation-first type precedence and imperative form test:
 *   `classify.ts`.
 * - Sentence length is counted in word tokens via the shared tokenizer,
 *   the conventional length unit for written-text difficulty (Flesch
 *   1948). `sentenceLengthStdev` is the *population* standard deviation
 *   (the manuscript is the entire population of interest, not a
 *   sample); 0 or 1 sentences → 0 by definition. No published
 *   convention exists for sentence-length dispersion in readability
 *   work — the population choice is an engine decision.
 */

import type { SyntaxProfile } from '../types.js';
import { tokenizeWords } from '../vocabulary/tokenize.js';
import { segmentSentences } from './segment.js';
import type { Sentence } from './segment.js';
import { countClauses } from './clauses.js';
import { classifySentence } from './classify.js';

export { segmentSentences } from './segment.js';
export type { Sentence } from './segment.js';
export { countClauses } from './clauses.js';
export { classifySentence, terminalRun } from './classify.js';
export type { SentenceType } from './classify.js';

/** Analyze raw text: segment, then profile the segmented sentences. */
export function analyzeSyntax(text: string): SyntaxProfile {
  return analyzeSyntaxFromSentences(segmentSentences(text));
}

/**
 * Profile pre-segmented sentences. The `readability/` orchestrator uses
 * this so segmentation runs once and `sentenceCount`,
 * `averageSentenceLength`, and `syntax.*` all come from the same
 * sentence spans.
 */
export function analyzeSyntaxFromSentences(
  sentences: readonly Sentence[],
): SyntaxProfile {
  const sentenceTypes = {
    declarative: 0,
    interrogative: 0,
    exclamatory: 0,
    imperative: 0,
  };

  const n = sentences.length;
  if (n === 0) {
    return {
      meanClausesPerSentence: 0,
      sentenceLengthStdev: 0,
      sentenceTypes,
    };
  }

  let clauseSum = 0;
  const lengths: number[] = [];
  for (const sentence of sentences) {
    clauseSum += countClauses(sentence.text);
    lengths.push(tokenizeWords(sentence.text).length);
    sentenceTypes[classifySentence(sentence.text)]++;
  }

  const mean = lengths.reduce((a, b) => a + b, 0) / n;
  const variance =
    lengths.reduce((acc, len) => acc + (len - mean) ** 2, 0) / n;

  return {
    meanClausesPerSentence: clauseSum / n,
    sentenceLengthStdev: Math.sqrt(variance),
    sentenceTypes,
  };
}
