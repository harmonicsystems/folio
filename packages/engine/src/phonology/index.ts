/**
 * Phonological analysis: phoneme inventory, syllable structure breakdown,
 * average syllables per word, and a first-cut decodability score.
 *
 * Uses the curated CMU Pronouncing Dictionary subset for phonetic
 * transcription (with a grapheme-based fallback for out-of-vocabulary
 * words) and Crowe & McLeod (2020) for consonant acquisition norms.
 *
 * The decodability formula and the syllable-ease weights below are
 * documented engine choices, not published norms. See
 * {@link analyzePhonologyBySpread} for the formula.
 *
 * @see Crowe & McLeod (2020), AJSLP 29(4)
 * @see CMU Pronouncing Dictionary
 * @see docs/linguistics/SOURCES.md
 */

import type {
  PhonemeOccurrence,
  PhonologyProfile,
  Spread,
  SyllableTypeBreakdown,
} from '../types.js';
import { ARPABET_TO_PHONEME, stripStress } from '../data/cmu-phonemes.js';
import { tokenizeWords } from '../vocabulary/tokenize.js';
import { getPronunciation, isInCmuDict } from './lookup.js';
import { syllabify } from './syllabify.js';

export { getPronunciation, estimatePronunciation, isInCmuDict } from './lookup.js';
export { syllabify, syllableCount } from './syllabify.js';

/**
 * Words in the text whose pronunciation came from the grapheme-based
 * heuristic, not the CMU dict. Deduplicated, lowercased, sorted.
 *
 * Returns an empty array when every token has a CMU entry. The list
 * is the integrity signal for downstream decodability /
 * phoneme-acquisition claims — if a word here is contributing to
 * those numbers, the contribution is a best-effort estimate.
 */
export function getGuessedWords(text: string): string[] {
  const seen = new Set<string>();
  for (const token of tokenizeWords(text)) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    if (!isInCmuDict(key)) seen.add(key);
  }
  return [...seen].sort();
}

/**
 * The IPA phoneme set used by a single word, deduplicated and in
 * order of first occurrence within the word. Useful for "does this
 * word contain phoneme X?" queries (e.g., SLP-style sound-targeting
 * UIs) without exposing the ARPABET internals.
 *
 * Returns an empty array for words whose pronunciation contains no
 * known phonemes (e.g., empty input).
 */
export function getWordPhonemes(word: string): string[] {
  const arpas = getPronunciation(word);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const arpa of arpas) {
    const info = ARPABET_TO_PHONEME.get(stripStress(arpa));
    if (!info) continue;
    if (seen.has(info.ipa)) continue;
    seen.add(info.ipa);
    out.push(info.ipa);
  }
  return out;
}

/**
 * Analyze a single text blob. All phonemes are attributed to spread 1.
 * For spread-aware first-occurrence tracking, use
 * {@link analyzePhonologyBySpread}.
 */
export function analyzePhonology(text: string): PhonologyProfile {
  return analyzePhonologyBySpread([{ index: 1, text }]);
}

/**
 * Spread-aware phonology analysis. Each phoneme is attributed to the
 * index of the spread on which it first appears.
 *
 * Decodability formula (engine choice, documented here so callers can
 * reason about score movement):
 *
 *   phoneme_ease(p) = clamp(1 - (acquisitionAge(p) - 3.0) / 5.0, 0, 1)
 *   — Phonemes acquired at age 3.0 or earlier score 1.0; those acquired
 *     at age 8.0 or later score 0.0. Linear interpolation between.
 *
 *   syllable_ease(s) = lookup in SYLLABLE_EASE (V, CV, VC → 1.0;
 *                                                CVC → 0.9;
 *                                                CCVC, CVCC → 0.75;
 *                                                other → 0.5)
 *
 *   decodability = 0.7 * mean(phoneme_ease across phoneme occurrences)
 *                + 0.3 * mean(syllable_ease across syllables)
 *
 * The 70/30 split favors phoneme-level signal because that's where the
 * acquisition-norm evidence is strongest. The syllable weights are an
 * engine choice based on the standard decoding-difficulty progression
 * taught in structured-literacy curricula (CV/VC simplest, clusters
 * harder).
 */
export function analyzePhonologyBySpread(
  spreads: readonly Spread[],
): PhonologyProfile {
  const phonemeData = new Map<
    string,
    { count: number; firstSpread: number }
  >();
  const syllableTypes: SyllableTypeBreakdown = {
    V: 0,
    CV: 0,
    VC: 0,
    CVC: 0,
    CCVC: 0,
    CVCC: 0,
    other: 0,
  };
  let totalSyllables = 0;
  let totalWords = 0;
  let phonemeEaseSum = 0;
  let phonemeEaseCount = 0;

  for (const spread of spreads) {
    const tokens = tokenizeWords(spread.text);
    for (const token of tokens) {
      totalWords += 1;
      const phonemes = getPronunciation(token);

      for (const arpa of phonemes) {
        const stripped = stripStress(arpa);
        const info = ARPABET_TO_PHONEME.get(stripped);
        if (!info) continue;
        const existing = phonemeData.get(stripped);
        if (existing) {
          existing.count += 1;
        } else {
          phonemeData.set(stripped, { count: 1, firstSpread: spread.index });
        }
        phonemeEaseSum += clamp(1 - (info.acquisitionAge - 3) / 5, 0, 1);
        phonemeEaseCount += 1;
      }

      const shapes = syllabify(phonemes);
      totalSyllables += shapes.length;
      for (const shape of shapes) {
        syllableTypes[shape] += 1;
      }
    }
  }

  const phonemeInventory = buildInventory(phonemeData);
  const phonemeEase = phonemeEaseCount > 0 ? phonemeEaseSum / phonemeEaseCount : 0;
  const syllableEase = computeSyllableEase(syllableTypes);
  const decodabilityScore = clamp(
    0.7 * phonemeEase + 0.3 * syllableEase,
    0,
    1,
  );

  return {
    phonemeInventory,
    syllableTypes,
    averageSyllablesPerWord:
      totalWords > 0 ? totalSyllables / totalWords : 0,
    decodabilityScore,
  };
}

const SYLLABLE_EASE: Record<keyof SyllableTypeBreakdown, number> = {
  V: 1.0,
  CV: 1.0,
  VC: 1.0,
  CVC: 0.9,
  CCVC: 0.75,
  CVCC: 0.75,
  other: 0.5,
};

function computeSyllableEase(types: SyllableTypeBreakdown): number {
  let weighted = 0;
  let total = 0;
  for (const key of Object.keys(types) as (keyof SyllableTypeBreakdown)[]) {
    const n = types[key];
    weighted += SYLLABLE_EASE[key] * n;
    total += n;
  }
  return total > 0 ? weighted / total : 0;
}

function buildInventory(
  data: ReadonlyMap<string, { count: number; firstSpread: number }>,
): PhonemeOccurrence[] {
  const out: PhonemeOccurrence[] = [];
  const sortedArpas = [...data.keys()].sort();
  for (const arpa of sortedArpas) {
    const info = ARPABET_TO_PHONEME.get(arpa);
    if (!info) continue;
    const d = data.get(arpa)!;
    out.push({
      phoneme: info.ipa,
      count: d.count,
      firstSpread: d.firstSpread,
      place: info.place,
      manner: info.manner,
      voicing: info.voicing,
      acquisitionAge: info.acquisitionAge,
    });
  }
  return out;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
