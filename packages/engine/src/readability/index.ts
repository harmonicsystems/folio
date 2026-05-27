/**
 * Top-level orchestration. Takes a Manuscript and returns a
 * ReadabilityProfile by composing the vocabulary, phonology, syntax,
 * and prosody modules.
 *
 * Status: vocabulary (partial — see vocabulary/index.ts scope note on
 * tier classification) and phonology are implemented. Syntax and prosody
 * return empty profiles and will be implemented later. See ARCHITECTURE.md.
 */

import type {
  AgeBand,
  Manuscript,
  ProsodyProfile,
  ReachWord,
  ReadabilityProfile,
  SpreadProfile,
  SyntaxProfile,
  Warning,
} from '../types.js';
import { tokenizeWords } from '../vocabulary/tokenize.js';
import {
  analyzeVocabulary,
  identifyReachWordsBySpread,
} from '../vocabulary/index.js';
import { sightWordCoverage } from '../vocabulary/sight-words.js';
import { analyzePhonologyBySpread } from '../phonology/index.js';

/** Word-count targets per age band, from SCBWI / Mary Kole guidance. */
const WORD_COUNT_TARGETS: Record<AgeBand, { min: number; max: number }> = {
  'board': { min: 0, max: 100 },
  'early-picture': { min: 0, max: 400 },
  'picture': { min: 0, max: 600 },
  'early-reader': { min: 1000, max: 2500 },
  'chapter': { min: 5000, max: 10000 },
};

export function analyze(manuscript: Manuscript): ReadabilityProfile {
  const fullText = manuscript.spreads.map((s) => s.text).join('\n\n');
  const tokens = tokenizeWords(fullText);
  const sentences = splitSentences(fullText);

  const vocabulary = analyzeVocabulary(fullText);
  const phonology = analyzePhonologyBySpread(manuscript.spreads);
  const reachWords = identifyReachWordsBySpread(manuscript.spreads);
  const wordCountTarget = WORD_COUNT_TARGETS[manuscript.ageBand];

  return {
    ageBand: manuscript.ageBand,
    wordCount: tokens.length,
    wordCountTarget,
    sentenceCount: sentences.length,
    averageSentenceLength:
      sentences.length === 0 ? 0 : tokens.length / sentences.length,
    vocabulary,
    phonology,
    syntax: emptySyntaxProfile(),
    prosody: emptyProsodyProfile(),
    reachWords,
    warnings: buildWarnings(tokens.length, wordCountTarget, manuscript.ageBand),
    perSpread: buildPerSpread(manuscript, reachWords, wordCountTarget),
  };
}

/**
 * Build per-spread profiles. The `wordCountCeiling` heuristic is
 * `ceil(target.max / nonWordlessSpreadCount * 1.5)` — see ADR 0003.
 * Wordless spreads carry ceiling `0` and never fire
 * `SPREAD_WORD_COUNT_HIGH` (any text on a wordless spread is a data-
 * quality concern handled at a different layer).
 */
function buildPerSpread(
  manuscript: Manuscript,
  reachWords: readonly ReachWord[],
  wordCountTarget: { min: number; max: number },
): SpreadProfile[] {
  const nonWordlessCount = manuscript.spreads.filter((s) => !s.wordless).length;
  const baseCeiling =
    nonWordlessCount === 0
      ? wordCountTarget.max
      : Math.ceil((wordCountTarget.max / nonWordlessCount) * 1.5);

  return manuscript.spreads.map((spread) => {
    const tokens = tokenizeWords(spread.text);
    const wordCount = tokens.length;
    const ceiling = spread.wordless ? 0 : baseCeiling;
    const spreadReach = reachWords.filter((r) => r.spread === spread.index);
    const warnings: Warning[] = [];
    if (!spread.wordless && wordCount > ceiling) {
      warnings.push({
        severity: 'info',
        code: 'SPREAD_WORD_COUNT_HIGH',
        message: `Spread ${spread.index} word count ${wordCount} exceeds the heuristic ceiling (${ceiling}) for this age band.`,
        spread: spread.index,
      });
    }
    return {
      index: spread.index,
      wordCount,
      wordCountCeiling: ceiling,
      sightWordCoverage: sightWordCoverage(tokens),
      reachWords: spreadReach,
      warnings,
    };
  });
}

/** Naive sentence segmenter — split on `.`, `!`, `?` followed by whitespace
 *  or end of string. Real segmentation is a Milestone-3 / `syntax/` concern. */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildWarnings(
  wordCount: number,
  target: { min: number; max: number },
  ageBand: AgeBand,
): Warning[] {
  const warnings: Warning[] = [];
  if (wordCount > target.max) {
    warnings.push({
      severity: 'warning',
      code: 'WORD_COUNT_OVER',
      message: `Word count ${wordCount} exceeds typical maximum (${target.max}) for ${ageBand}.`,
    });
  }
  if (target.min > 0 && wordCount < target.min) {
    warnings.push({
      severity: 'info',
      code: 'WORD_COUNT_UNDER',
      message: `Word count ${wordCount} is below typical minimum (${target.min}) for ${ageBand}.`,
    });
  }
  return warnings;
}

function emptySyntaxProfile(): SyntaxProfile {
  return {
    meanClausesPerSentence: 0,
    sentenceLengthStdev: 0,
    sentenceTypes: { declarative: 0, interrogative: 0, exclamatory: 0, imperative: 0 },
  };
}

function emptyProsodyProfile(): ProsodyProfile {
  return { meterConsistency: 0 };
}
