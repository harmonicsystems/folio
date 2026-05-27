import { describe, it, expect } from 'vitest';
import {
  analyzePhonology,
  analyzePhonologyBySpread,
  estimatePronunciation,
  getPronunciation,
  getWordPhonemes,
  syllabify,
  syllableCount,
} from '../src/phonology/index.js';

describe('getPronunciation', () => {
  it('returns the CMU dict entry for in-vocab words', () => {
    expect(getPronunciation('cat')).toEqual(['K', 'AE1', 'T']);
    expect(getPronunciation('apple')).toEqual(['AE1', 'P', 'AH0', 'L']);
  });

  it('falls through to the heuristic for OOV words', () => {
    const result = getPronunciation('splat');
    // Heuristic: s p l a t → S P L AE T → with stress: S P L AE1 T.
    expect(result).toEqual(['S', 'P', 'L', 'AE1', 'T']);
  });

  it('returns SOMETHING (not empty) for arbitrary OOV input', () => {
    // The function is total — any non-empty input yields phonemes.
    const result = getPronunciation('blorf');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getWordPhonemes', () => {
  it('returns IPA phonemes for an in-vocab word', () => {
    // "cat" → K AE1 T → IPA k æ t. Engine maps ARPABET stripped of
    // stress markers to IPA via ARPABET_TO_PHONEME.
    const phonemes = getWordPhonemes('cat');
    expect(phonemes).toEqual(expect.arrayContaining(['k', 'æ', 't']));
    expect(phonemes).toHaveLength(3);
  });

  it('deduplicates within a single word', () => {
    // "papa" has /p/ twice — should appear once in the set.
    const phonemes = getWordPhonemes('papa');
    const pCount = phonemes.filter((p) => p === 'p').length;
    expect(pCount).toBe(1);
  });

  it('preserves first-occurrence order', () => {
    // "stop" → S T AA1 P → /s/ /t/ /ɑ/ /p/, order preserved.
    const phonemes = getWordPhonemes('stop');
    expect(phonemes.indexOf('s')).toBeLessThan(phonemes.indexOf('t'));
    expect(phonemes.indexOf('t')).toBeLessThan(phonemes.indexOf('p'));
  });

  it('returns empty for empty input', () => {
    expect(getWordPhonemes('')).toEqual([]);
  });

  it('handles OOV words via the grapheme heuristic', () => {
    // Doesn't matter what comes back; just that something does and
    // every element is a known IPA string (non-empty).
    const phonemes = getWordPhonemes('blorf');
    expect(phonemes.length).toBeGreaterThan(0);
    for (const p of phonemes) expect(p).toMatch(/.+/);
  });
});

describe('estimatePronunciation', () => {
  it('handles the magic-e rule', () => {
    // CVCe → long vowel, silent e.
    expect(estimatePronunciation('bake')).toEqual(['B', 'EY1', 'K']);
    expect(estimatePronunciation('bike')).toEqual(['B', 'AY1', 'K']);
    expect(estimatePronunciation('hope')).toEqual(['HH', 'OW1', 'P']);
  });

  it('collapses doubled consonants', () => {
    // Heuristic should treat "pp" as one /p/.
    const result = estimatePronunciation('zappy');
    const ps = result.filter((p) => p === 'P');
    expect(ps).toHaveLength(1);
  });

  it('handles common consonant digraphs', () => {
    expect(estimatePronunciation('shop')).toEqual(['SH', 'AA1', 'P']);
    expect(estimatePronunciation('thin')).toEqual(['TH', 'IH1', 'N']);
    expect(estimatePronunciation('chip')).toEqual(['CH', 'IH1', 'P']);
    expect(estimatePronunciation('king')).toEqual(['K', 'IH1', 'NG']);
  });

  it('handles common vowel digraphs', () => {
    expect(estimatePronunciation('feet')).toEqual(['F', 'IY1', 'T']);
    expect(estimatePronunciation('boat')).toEqual(['B', 'OW1', 'T']);
    expect(estimatePronunciation('out')).toEqual(['AW1', 'T']);
  });

  it('handles r-controlled vowels', () => {
    expect(estimatePronunciation('barn')).toEqual(['B', 'AA1', 'R', 'N']);
    expect(estimatePronunciation('horn')).toEqual(['HH', 'AO1', 'R', 'N']);
  });

  it('strips apostrophes before processing', () => {
    // "cat's" — the apostrophe and trailing s map naively but apostrophe is dropped first.
    const result = estimatePronunciation("cat's");
    expect(result).toEqual(['K', 'AE1', 'T', 'S']);
  });

  it('returns [] for empty input', () => {
    expect(estimatePronunciation('')).toEqual([]);
  });
});

describe('syllabify', () => {
  it('returns CVC for "cat"', () => {
    expect(syllabify(['K', 'AE1', 'T'])).toEqual(['CVC']);
  });

  it('returns CV for "go"', () => {
    expect(syllabify(['G', 'OW1'])).toEqual(['CV']);
  });

  it('returns VC for "at"', () => {
    expect(syllabify(['AE1', 'T'])).toEqual(['VC']);
  });

  it('returns V for a single vowel', () => {
    expect(syllabify(['AY1'])).toEqual(['V']);
  });

  it('returns CCVC for "stop"', () => {
    expect(syllabify(['S', 'T', 'AA1', 'P'])).toEqual(['CCVC']);
  });

  it('returns CVCC for "lost"', () => {
    expect(syllabify(['L', 'AO1', 'S', 'T'])).toEqual(['CVCC']);
  });

  it('handles two-syllable words with max-onset', () => {
    // "apple" → AE1 P AH0 L: V·CVC split (single consonant joins next onset).
    expect(syllabify(['AE1', 'P', 'AH0', 'L'])).toEqual(['V', 'CVC']);
  });

  it('counts syllables by vowel nuclei', () => {
    expect(syllableCount(['T', 'AY1', 'M'])).toBe(1);
    expect(syllableCount(['T', 'AH0', 'G', 'EH1', 'DH', 'ER0'])).toBe(3);
    expect(syllableCount([])).toBe(0);
  });

  it('returns [] for input with no vowels', () => {
    expect(syllabify(['S', 'T'])).toEqual([]);
  });
});

describe('analyzePhonology', () => {
  it('returns an empty profile for empty text', () => {
    const result = analyzePhonology('');
    expect(result.phonemeInventory).toEqual([]);
    expect(result.averageSyllablesPerWord).toBe(0);
    expect(result.decodabilityScore).toBe(0);
  });

  it('produces a phoneme inventory from a single word', () => {
    const result = analyzePhonology('cat');
    const ipas = result.phonemeInventory.map((p) => p.phoneme).sort();
    expect(ipas).toEqual(['k', 't', 'æ'].sort());
  });

  it('aggregates counts across repeated phonemes', () => {
    // "cat cat" — every phoneme appears twice.
    const result = analyzePhonology('cat cat');
    for (const p of result.phonemeInventory) {
      expect(p.count).toBe(2);
    }
  });

  it('classifies "cat" syllable shape as CVC', () => {
    const result = analyzePhonology('cat');
    expect(result.syllableTypes.CVC).toBe(1);
    expect(result.averageSyllablesPerWord).toBe(1);
  });

  it('produces a high decodability score for simple early-acquired text', () => {
    // The synthetic board book is all Dolch words with early-acquired phonemes.
    const corpus =
      'Where is the cat? The cat is up. The cat is down. ' +
      'Good night, cat.';
    const result = analyzePhonology(corpus);
    // Heuristic: should clear 0.7 comfortably with early phonemes + simple syllables.
    expect(result.decodabilityScore).toBeGreaterThan(0.7);
    expect(result.decodabilityScore).toBeLessThanOrEqual(1);
  });

  it('attributes phoneme first-spread by source spread', () => {
    const result = analyzePhonologyBySpread([
      { index: 1, text: 'cat' },
      { index: 2, text: 'sun' },
    ]);
    const t = result.phonemeInventory.find((p) => p.phoneme === 't');
    const s = result.phonemeInventory.find((p) => p.phoneme === 's');
    expect(t?.firstSpread).toBe(1);
    expect(s?.firstSpread).toBe(2);
  });

  it('does not double-count a phoneme appearing on multiple spreads', () => {
    // /k/ appears in "cat" (spread 1) and "kite" (spread 2 — OOV, heuristic).
    const result = analyzePhonologyBySpread([
      { index: 1, text: 'cat' },
      { index: 2, text: 'kite' },
    ]);
    const k = result.phonemeInventory.find((p) => p.phoneme === 'k');
    expect(k?.firstSpread).toBe(1);
    expect(k?.count).toBe(2);
  });

  it('decodability stays in [0, 1]', () => {
    const result = analyzePhonology(
      'The thrush thrashed through the thistles.',
    );
    expect(result.decodabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.decodabilityScore).toBeLessThanOrEqual(1);
  });

  it('exposes articulation features for each phoneme', () => {
    const result = analyzePhonology('cat');
    const k = result.phonemeInventory.find((p) => p.phoneme === 'k');
    expect(k?.place).toBe('velar');
    expect(k?.manner).toBe('stop');
    expect(k?.voicing).toBe('voiceless');
    expect(k?.acquisitionAge).toBeGreaterThan(0);
  });
});
