/**
 * Syllabification from an ARPABET phoneme array.
 *
 * Vowels are syllable nuclei; consonants are distributed via the maximum-
 * onset principle, subject to legal English onset clusters. The output is
 * a list of syllable shapes (CV, CVC, CCVC, etc.) matching the keys of
 * {@link SyllableTypeBreakdown}.
 *
 * Note: ARPABET treats digraph-style phonemes (TH, SH, CH, NG, etc.) as a
 * single phoneme each. So "thread" → ['TH', 'R', 'EH', 'D'] has a 2-phoneme
 * onset (TH + R) that we recognize as the legal cluster /θr/.
 *
 * @see Liang, F. M. (1983) — referenced for fallback hyphenation; the
 *      primary algorithm here is vowel-counting with max-onset.
 */

import { VOWEL_ARPABETS, stripStress } from '../data/cmu-phonemes.js';

export type SyllableShape = 'V' | 'CV' | 'VC' | 'CVC' | 'CCVC' | 'CVCC' | 'other';

/** ARPABET 2-phoneme onsets we accept as a single onset cluster. */
const LEGAL_ONSETS: ReadonlySet<string> = new Set([
  'S|P', 'S|T', 'S|K', 'S|M', 'S|N', 'S|L', 'S|W', 'S|F',
  'P|L', 'B|L', 'K|L', 'G|L', 'F|L',
  'P|R', 'B|R', 'T|R', 'D|R', 'K|R', 'G|R', 'F|R',
  'TH|R', 'SH|R',
  'T|W', 'K|W', 'D|W', 'G|W',
  'P|Y', 'B|Y', 'K|Y', 'M|Y', 'F|Y', 'V|Y', 'HH|Y',
]);

function isLegalOnsetCluster(a: string, b: string): boolean {
  return LEGAL_ONSETS.has(`${stripStress(a)}|${stripStress(b)}`);
}

/**
 * Split a phoneme array into syllable shape strings.
 *
 * Empty input or input with no vowels returns []. Each emitted shape is
 * one of {@link SyllableShape}; complex shapes (CCC onsets, triple codas,
 * etc.) collapse to 'other'.
 */
export function syllabify(phonemes: readonly string[]): SyllableShape[] {
  if (phonemes.length === 0) return [];

  const vowelIndices: number[] = [];
  phonemes.forEach((p, idx) => {
    if (VOWEL_ARPABETS.has(stripStress(p))) vowelIndices.push(idx);
  });
  if (vowelIndices.length === 0) return [];

  // Compute the onset start for each syllable. The previous syllable's
  // coda runs from (its vowel + 1) up to (this onset start).
  const onsetStarts: number[] = [];
  for (let s = 0; s < vowelIndices.length; s++) {
    const vIdx = vowelIndices[s]!;
    if (s === 0) {
      onsetStarts.push(0);
      continue;
    }
    const prevV = vowelIndices[s - 1]!;
    const between = vIdx - prevV - 1;
    if (between === 0) {
      onsetStarts.push(vIdx);
    } else if (between === 1) {
      onsetStarts.push(vIdx - 1);
    } else {
      const a = phonemes[vIdx - 2]!;
      const b = phonemes[vIdx - 1]!;
      if (isLegalOnsetCluster(a, b)) {
        onsetStarts.push(vIdx - 2);
      } else {
        onsetStarts.push(vIdx - 1);
      }
    }
  }

  const shapes: SyllableShape[] = [];
  for (let s = 0; s < vowelIndices.length; s++) {
    const vIdx = vowelIndices[s]!;
    const onsetStart = onsetStarts[s]!;
    const codaEnd =
      s + 1 < vowelIndices.length ? onsetStarts[s + 1]! : phonemes.length;
    const onsetCount = vIdx - onsetStart;
    const codaCount = codaEnd - vIdx - 1;
    shapes.push(classify(onsetCount, codaCount));
  }
  return shapes;
}

function classify(onset: number, coda: number): SyllableShape {
  if (onset === 0 && coda === 0) return 'V';
  if (onset === 1 && coda === 0) return 'CV';
  if (onset === 0 && coda === 1) return 'VC';
  if (onset === 1 && coda === 1) return 'CVC';
  if (onset === 2 && coda === 1) return 'CCVC';
  if (onset === 1 && coda === 2) return 'CVCC';
  return 'other';
}

/** Convenience: number of syllables = number of vowel nuclei. */
export function syllableCount(phonemes: readonly string[]): number {
  let count = 0;
  for (const p of phonemes) {
    if (VOWEL_ARPABETS.has(stripStress(p))) count++;
  }
  return count;
}
