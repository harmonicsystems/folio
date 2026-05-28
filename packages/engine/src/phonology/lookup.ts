/**
 * Word → phoneme array. CMU Pronouncing Dictionary lookup with a
 * grapheme-based fallback for out-of-vocabulary words.
 *
 * The output is always an ARPABET phoneme array with stress digits on
 * vowels. Callers downstream (syllabifier, analyzer) treat dict hits and
 * heuristic estimates identically.
 *
 * @see docs/linguistics/SOURCES.md (CMU dict, public domain).
 */

import { CMU_DICT } from '../data/cmu-dict.js';

/**
 * Look up the ARPABET pronunciation of a word.
 *
 * Returns the CMU dict entry if available; otherwise produces a
 * grapheme-based estimate. Always returns *some* pronunciation for any
 * non-empty input — there is no failure mode where a word produces no
 * phonemes. Apostrophes in the input are stripped before fallback.
 */
export function getPronunciation(word: string): readonly string[] {
  const key = word.toLowerCase();
  const fromDict = CMU_DICT.get(key);
  if (fromDict) return fromDict;
  return estimatePronunciation(key);
}

/**
 * True when the word has a CMU dict entry. False when getPronunciation
 * would fall through to the grapheme-based heuristic.
 *
 * Useful for surfacing "this word's phonology is a best-effort guess"
 * to authors and clinicians — important integrity signal for any
 * decodability or phoneme-acquisition claim downstream.
 *
 * Lookup is case-insensitive and matches the same lowercasing rule
 * getPronunciation uses internally.
 */
export function isInCmuDict(word: string): boolean {
  return CMU_DICT.has(word.toLowerCase());
}

/**
 * Grapheme-based phoneme estimator. Left-to-right matching with two-char
 * digraphs preferred over single chars. Handles common consonant digraphs
 * (sh, th, ch, ph, wh, ng, ck, qu, gh), r-controlled vowels (ar, or, er,
 * ir, ur), common vowel digraphs (ee, ea, oo, ai, ay, oa, ow, oi, oy, ou,
 * au, aw), and the magic-e rule (CVCe → long vowel).
 *
 * English orthography is irregular, so this will be wrong for many words.
 * It exists so the engine produces *some* phoneme sequence for any OOV
 * word. For accuracy on a specific word, add it to {@link CMU_DICT}.
 */
export function estimatePronunciation(word: string): string[] {
  const lc = word.toLowerCase().replace(/['’]/g, '');
  if (lc.length === 0) return [];

  const silentE = isSilentE(lc);
  const stopAt = silentE ? lc.length - 1 : lc.length;
  const magicVowelPos = silentE ? lc.length - 3 : -1;

  const phonemes: string[] = [];
  let i = 0;
  while (i < stopAt) {
    const two = lc.slice(i, i + 2);
    if (i + 2 <= stopAt && DIGRAPHS.has(two)) {
      const di = DIGRAPHS.get(two)!;
      for (const p of di) phonemes.push(p);
      i += 2;
      continue;
    }

    const c = lc[i]!;
    if (i === magicVowelPos && LONG_VOWEL.has(c)) {
      phonemes.push(LONG_VOWEL.get(c)!);
    } else if (c === 'y') {
      phonemes.push(estimateY(lc, i, phonemes));
    } else {
      const m = SINGLES.get(c);
      if (m !== undefined) {
        if (typeof m === 'string') phonemes.push(m);
        else for (const p of m) phonemes.push(p);
      }
    }
    i += 1;
  }

  return markStress(collapseRepeatedConsonants(phonemes));
}

const VOWEL_LETTERS: ReadonlySet<string> = new Set(['a', 'e', 'i', 'o', 'u']);

const VOWEL_ARPABETS_NO_STRESS: ReadonlySet<string> = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER',
  'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW',
]);

const DIGRAPHS: ReadonlyMap<string, readonly string[]> = new Map([
  ['sh', ['SH']],
  ['th', ['TH']],
  ['ch', ['CH']],
  ['ph', ['F']],
  ['wh', ['W']],
  ['ng', ['NG']],
  ['ck', ['K']],
  ['qu', ['K', 'W']],
  // 'gh' is silent in many positions (night, right, dough). It will
  // sometimes be wrong (e.g., "ghost") but those words are in the dict.
  ['gh', []],
  ['ee', ['IY']],
  ['ea', ['IY']],
  ['oo', ['UW']],
  ['ai', ['EY']],
  ['ay', ['EY']],
  ['oa', ['OW']],
  ['ow', ['OW']],
  ['oi', ['OY']],
  ['oy', ['OY']],
  ['ou', ['AW']],
  ['au', ['AO']],
  ['aw', ['AO']],
  ['ar', ['AA', 'R']],
  ['or', ['AO', 'R']],
  ['er', ['ER']],
  ['ir', ['ER']],
  ['ur', ['ER']],
]);

const SINGLES: ReadonlyMap<string, string | readonly string[]> = new Map<
  string,
  string | readonly string[]
>([
  ['b', 'B'],
  ['c', 'K'],
  ['d', 'D'],
  ['f', 'F'],
  ['g', 'G'],
  ['h', 'HH'],
  ['j', 'JH'],
  ['k', 'K'],
  ['l', 'L'],
  ['m', 'M'],
  ['n', 'N'],
  ['p', 'P'],
  ['q', 'K'],
  ['r', 'R'],
  ['s', 'S'],
  ['t', 'T'],
  ['v', 'V'],
  ['w', 'W'],
  ['x', ['K', 'S']],
  ['z', 'Z'],
  ['a', 'AE'],
  ['e', 'EH'],
  ['i', 'IH'],
  ['o', 'AA'],
  ['u', 'AH'],
]);

const LONG_VOWEL: ReadonlyMap<string, string> = new Map([
  ['a', 'EY'],
  ['e', 'IY'],
  ['i', 'AY'],
  ['o', 'OW'],
  ['u', 'UW'],
]);

function isSilentE(lc: string): boolean {
  if (lc.length < 3) return false;
  if (lc[lc.length - 1] !== 'e') return false;
  const c2 = lc[lc.length - 2]!;
  const c3 = lc[lc.length - 3]!;
  return !VOWEL_LETTERS.has(c2) && VOWEL_LETTERS.has(c3);
}

function estimateY(lc: string, i: number, phonemesSoFar: readonly string[]): string {
  if (i === 0) return 'Y';
  const hasVowelSoFar = phonemesSoFar.some((p) => VOWEL_ARPABETS_NO_STRESS.has(p));
  if (i === lc.length - 1) {
    return hasVowelSoFar ? 'IY' : 'AY';
  }
  return hasVowelSoFar ? 'IH' : 'AY';
}

function collapseRepeatedConsonants(phonemes: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of phonemes) {
    const prev = out[out.length - 1];
    if (prev === p && !VOWEL_ARPABETS_NO_STRESS.has(p)) continue;
    out.push(p);
  }
  return out;
}

function markStress(phonemes: readonly string[]): string[] {
  let firstVowelFound = false;
  const out: string[] = [];
  for (const p of phonemes) {
    if (VOWEL_ARPABETS_NO_STRESS.has(p)) {
      if (!firstVowelFound) {
        firstVowelFound = true;
        out.push(p + '1');
      } else {
        out.push(p + '0');
      }
    } else {
      out.push(p);
    }
  }
  return out;
}
