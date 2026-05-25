/**
 * English phoneme inventory with articulation features and acquisition ages.
 *
 * Two pieces of vendored linguistic data, joined here because they key on
 * the same set of 39 phonemes:
 *
 * 1. The ARPABET symbol set used by the CMU Pronouncing Dictionary, with
 *    IPA equivalents. ARPABET is the lookup key throughout the phonology
 *    module; IPA is the public-facing representation in {@link PhonemeOccurrence}.
 *
 * 2. Articulation features (place, manner, voicing) and age of acquisition
 *    for each phoneme.
 *
 * Consonant acquisition ages are drawn from Crowe & McLeod (2020), the
 * current consensus systematic review for US English. Values represent the
 * approximate age (in years) by which the 90% production criterion is met.
 * Exact values per phoneme should be cross-checked against the paper's
 * summary table before any clinical use.
 *
 * Vowel acquisition ages are NOT from Crowe & McLeod (that paper covers
 * consonants only). English vowels are typically acquired before most
 * consonants — most by age 2;6–3;0. We use 3.0 as an engine-internal
 * default for all vowels, pending a sourced vowel norm. This is an engine
 * convention, not a published norm.
 *
 * Place of articulation is awkward for vowels (the relevant dimensions are
 * front/back, high/low — not the consonant places in our type). We map
 * front vowels to `palatal` and back vowels to `velar` as a rough proxy;
 * this is an engine convention, not a phonetic claim.
 *
 * @see Crowe, K., & McLeod, S. (2020). AJSLP 29(4), 2155–2169.
 * @see CMU Pronouncing Dictionary (public domain). docs/linguistics/SOURCES.md
 */

import type {
  ArticulationManner,
  ArticulationPlace,
} from '../types.js';

/** Stress marker on an ARPABET vowel symbol: 0 = unstressed, 1 = primary, 2 = secondary. */
export type StressLevel = 0 | 1 | 2;

export interface PhonemeInfo {
  /** ARPABET symbol, without stress digit (e.g., "AE", "K"). */
  arpabet: string;
  /** IPA representation. */
  ipa: string;
  place: ArticulationPlace;
  manner: ArticulationManner;
  voicing: 'voiced' | 'voiceless';
  /** Approximate age in years for 90% acquisition (consonants: Crowe & McLeod 2020). */
  acquisitionAge: number;
}

/**
 * The 39 English phonemes (24 consonants + 15 vowels) as used by the CMU
 * Pronouncing Dictionary. Order is conventional ARPABET ordering.
 */
export const PHONEMES: readonly PhonemeInfo[] = [
  // Vowels — monophthongs and diphthongs.
  { arpabet: 'AA', ipa: 'ɑ',  place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'AE', ipa: 'æ',  place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'AH', ipa: 'ʌ',  place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'AO', ipa: 'ɔ',  place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'AW', ipa: 'aʊ', place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'AY', ipa: 'aɪ', place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'EH', ipa: 'ɛ',  place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'ER', ipa: 'ɝ',  place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'EY', ipa: 'eɪ', place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'IH', ipa: 'ɪ',  place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'IY', ipa: 'i',  place: 'palatal', manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'OW', ipa: 'oʊ', place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'OY', ipa: 'ɔɪ', place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'UH', ipa: 'ʊ',  place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },
  { arpabet: 'UW', ipa: 'u',  place: 'velar',   manner: 'vowel', voicing: 'voiced', acquisitionAge: 3.0 },

  // Stops.
  { arpabet: 'P',  ipa: 'p',  place: 'bilabial',    manner: 'stop',      voicing: 'voiceless', acquisitionAge: 3.0 },
  { arpabet: 'B',  ipa: 'b',  place: 'bilabial',    manner: 'stop',      voicing: 'voiced',    acquisitionAge: 3.0 },
  { arpabet: 'T',  ipa: 't',  place: 'alveolar',    manner: 'stop',      voicing: 'voiceless', acquisitionAge: 4.0 },
  { arpabet: 'D',  ipa: 'd',  place: 'alveolar',    manner: 'stop',      voicing: 'voiced',    acquisitionAge: 3.0 },
  { arpabet: 'K',  ipa: 'k',  place: 'velar',       manner: 'stop',      voicing: 'voiceless', acquisitionAge: 3.5 },
  { arpabet: 'G',  ipa: 'ɡ',  place: 'velar',       manner: 'stop',      voicing: 'voiced',    acquisitionAge: 3.5 },

  // Affricates.
  { arpabet: 'CH', ipa: 'tʃ', place: 'postalveolar', manner: 'affricate', voicing: 'voiceless', acquisitionAge: 5.0 },
  { arpabet: 'JH', ipa: 'dʒ', place: 'postalveolar', manner: 'affricate', voicing: 'voiced',    acquisitionAge: 5.0 },

  // Fricatives.
  { arpabet: 'F',  ipa: 'f',  place: 'labiodental',  manner: 'fricative', voicing: 'voiceless', acquisitionAge: 4.0 },
  { arpabet: 'V',  ipa: 'v',  place: 'labiodental',  manner: 'fricative', voicing: 'voiced',    acquisitionAge: 5.5 },
  { arpabet: 'TH', ipa: 'θ',  place: 'dental',       manner: 'fricative', voicing: 'voiceless', acquisitionAge: 6.5 },
  { arpabet: 'DH', ipa: 'ð',  place: 'dental',       manner: 'fricative', voicing: 'voiced',    acquisitionAge: 6.5 },
  { arpabet: 'S',  ipa: 's',  place: 'alveolar',     manner: 'fricative', voicing: 'voiceless', acquisitionAge: 5.5 },
  { arpabet: 'Z',  ipa: 'z',  place: 'alveolar',     manner: 'fricative', voicing: 'voiced',    acquisitionAge: 5.5 },
  { arpabet: 'SH', ipa: 'ʃ',  place: 'postalveolar', manner: 'fricative', voicing: 'voiceless', acquisitionAge: 5.0 },
  { arpabet: 'ZH', ipa: 'ʒ',  place: 'postalveolar', manner: 'fricative', voicing: 'voiced',    acquisitionAge: 6.5 },
  { arpabet: 'HH', ipa: 'h',  place: 'glottal',      manner: 'fricative', voicing: 'voiceless', acquisitionAge: 3.0 },

  // Nasals.
  { arpabet: 'M',  ipa: 'm',  place: 'bilabial',    manner: 'nasal',     voicing: 'voiced',    acquisitionAge: 3.0 },
  { arpabet: 'N',  ipa: 'n',  place: 'alveolar',    manner: 'nasal',     voicing: 'voiced',    acquisitionAge: 3.0 },
  { arpabet: 'NG', ipa: 'ŋ',  place: 'velar',       manner: 'nasal',     voicing: 'voiced',    acquisitionAge: 4.0 },

  // Liquids.
  { arpabet: 'L',  ipa: 'l',  place: 'alveolar',    manner: 'liquid',    voicing: 'voiced',    acquisitionAge: 5.5 },
  { arpabet: 'R',  ipa: 'ɹ',  place: 'postalveolar', manner: 'liquid',   voicing: 'voiced',    acquisitionAge: 6.5 },

  // Glides.
  { arpabet: 'W',  ipa: 'w',  place: 'bilabial',    manner: 'glide',     voicing: 'voiced',    acquisitionAge: 3.0 },
  { arpabet: 'Y',  ipa: 'j',  place: 'palatal',     manner: 'glide',     voicing: 'voiced',    acquisitionAge: 4.0 },
];

/** ARPABET symbols that represent vowels (the set of syllable nuclei). */
export const VOWEL_ARPABETS: ReadonlySet<string> = new Set(
  PHONEMES.filter((p) => p.manner === 'vowel').map((p) => p.arpabet),
);

/** Fast lookup: ARPABET symbol (no stress digit) → PhonemeInfo. */
export const ARPABET_TO_PHONEME: ReadonlyMap<string, PhonemeInfo> = new Map(
  PHONEMES.map((p) => [p.arpabet, p] as const),
);

/**
 * Strip the stress digit (0/1/2) from an ARPABET vowel symbol. Returns
 * consonant symbols unchanged.
 */
export function stripStress(arpabet: string): string {
  const last = arpabet[arpabet.length - 1];
  if (last === '0' || last === '1' || last === '2') {
    return arpabet.slice(0, -1);
  }
  return arpabet;
}

/**
 * Read the stress digit from an ARPABET vowel symbol. Returns null for
 * consonants (which carry no stress marker).
 */
export function stressOf(arpabet: string): StressLevel | null {
  const last = arpabet[arpabet.length - 1];
  if (last === '0') return 0;
  if (last === '1') return 1;
  if (last === '2') return 2;
  return null;
}
