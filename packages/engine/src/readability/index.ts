/**
 * Top-level orchestration. Takes a Manuscript and returns a
 * ReadabilityProfile by composing the vocabulary, phonology, syntax,
 * and prosody modules.
 *
 * Status: vocabulary is implemented (partial — see vocabulary/index.ts
 * scope note on tier classification). Phonology, syntax, and prosody
 * return empty profiles for now and will be implemented in Milestones
 * 2 and 4 respectively. See ARCHITECTURE.md.
 */

import type {
  AgeBand,
  Manuscript,
  PhonologyProfile,
  ProsodyProfile,
  ReadabilityProfile,
  SyntaxProfile,
  Warning,
} from '../types.js';
import { tokenizeWords } from '../vocabulary/tokenize.js';
import {
  analyzeVocabulary,
  identifyReachWordsBySpread,
} from '../vocabulary/index.js';

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
    phonology: emptyPhonologyProfile(),
    syntax: emptySyntaxProfile(),
    prosody: emptyProsodyProfile(),
    reachWords,
    warnings: buildWarnings(tokens.length, wordCountTarget, manuscript.ageBand),
  };
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

function emptyPhonologyProfile(): PhonologyProfile {
  return {
    phonemeInventory: [],
    syllableTypes: { CV: 0, VC: 0, CVC: 0, CCVC: 0, CVCC: 0, V: 0, other: 0 },
    averageSyllablesPerWord: 0,
    decodabilityScore: 0,
  };
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
