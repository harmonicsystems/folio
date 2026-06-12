/**
 * Prosody analysis: stress sequence, dominant meter, rhyme scheme.
 *
 * Uses the CMU dict's per-vowel stress markers (AE1 primary, AE2
 * secondary, AE0 unstressed) to build a binary stress sequence
 * across the text, then matches that sequence against the four
 * canonical metrical foot templates.
 *
 * Engine choices documented here so callers can reason about
 * results (and so the open questions in ARCHITECTURE.md have an
 * answer):
 *
 * - **Binary stress.** Secondary (2) and primary (1) stress both
 *   collapse to "stressed"; only 0 is "unstressed". Picture-book
 *   meter detection doesn't usually benefit from the secondary /
 *   primary distinction at this scale.
 * - **Per-line matching.** The verse line is the metrical unit
 *   (Attridge 1982): each newline-separated line restarts the
 *   template at its first syllable, so odd-length lines don't
 *   phase-flip the rest of the text. Prose (no newlines) is one
 *   line — whole-stream behavior. Scores are syllable-weighted
 *   across lines: total matches / total syllables.
 * - **Anacrusis.** One unstressed line-initial syllable may be
 *   skipped as an extrametrical pickup (Attridge 1982). The skipped
 *   syllable still counts in the denominator, so the skip carries an
 *   automatic one-syllable penalty per line and the offset-0 reading
 *   wins ties — pure iambic text can never be mis-read as
 *   trochaic-with-anacrusis. At most one syllable, only when
 *   unstressed; a stressed opening is an inverted foot, not
 *   anacrusis, and is out of scope.
 * - **Thresholds.** consistency >= 0.6 surfaces as a named meter;
 *   0.4–0.6 surfaces as 'mixed' (some structure but no winner);
 *   below 0.4 leaves dominantMeter undefined — prose.
 * - **Rhyme scheme.** Line-broken text only. Each newline-separated
 *   non-empty line contributes a "rhyme phoneme" = last stressed
 *   vowel + everything after, ARPABET, joined with `|`. Lines with
 *   identical rhyme phonemes get the same letter (A, B, C …).
 *   Only surfaced when at least one letter repeats — all-unique
 *   line endings = prose, not poetry, so we don't pretend.
 *
 * @see Crowe & McLeod (2020), AJSLP — phoneme acquisition norms
 * @see Hayes (1995), Metrical Stress Theory — foot templates
 * @see Attridge (1982), The Rhythms of English Poetry — verse line
 *      as metrical unit; anacrusis as initial extrametrical offbeat
 * @see docs/linguistics/SOURCES.md
 */

import type { ProsodyProfile } from '../types.js';
import { tokenizeWords } from '../vocabulary/tokenize.js';
import { getPronunciation } from '../phonology/lookup.js';

type NamedMeter = Exclude<NonNullable<ProsodyProfile['dominantMeter']>, 'mixed'>;

interface MeterTemplate {
  name: NamedMeter;
  template: readonly number[];
}

const METER_TEMPLATES: readonly MeterTemplate[] = [
  { name: 'iambic', template: [0, 1] },
  { name: 'trochaic', template: [1, 0] },
  { name: 'anapestic', template: [0, 0, 1] },
  { name: 'dactylic', template: [1, 0, 0] },
];

const NAMED_METER_THRESHOLD = 0.6;
const MIXED_METER_THRESHOLD = 0.4;
const MIN_SYLLABLES_FOR_METER = 4;

/** ARPABET vowel test — only vowel phonemes carry stress digits. */
function isVowelArpa(phoneme: string): boolean {
  return /[012]$/.test(phoneme);
}

/** Returns 1 (any stress) or 0 (unstressed) for a vowel; -1 for non-vowels. */
function stressOf(phoneme: string): number {
  if (!isVowelArpa(phoneme)) return -1;
  return phoneme[phoneme.length - 1] === '0' ? 0 : 1;
}

function buildStressSequence(text: string): number[] {
  const out: number[] = [];
  for (const word of tokenizeWords(text)) {
    for (const p of getPronunciation(word)) {
      const s = stressOf(p);
      if (s !== -1) out.push(s);
    }
  }
  return out;
}

interface MeterResult {
  meter: ProsodyProfile['dominantMeter'];
  consistency: number;
}

/** Template matches in one line, with the template starting at `start`. */
function lineMatchesFrom(
  line: readonly number[],
  template: readonly number[],
  start: number,
): number {
  let matches = 0;
  for (let i = start; i < line.length; i++) {
    const s = line[i];
    const t = template[(i - start) % template.length];
    if (s !== undefined && s === t) matches++;
  }
  return matches;
}

/**
 * Best template match for one line: the offset-0 reading, or — when
 * the line opens with an unstressed syllable — the anacrusis reading
 * that treats that pickup as extrametrical. The skipped syllable can
 * never match, so the anacrusis reading caps at (n-1)/n and offset-0
 * wins ties; only the first beat's *position* moves, the template
 * itself never rotates, so iambic/trochaic (and anapestic/dactylic)
 * stay distinguishable.
 */
function bestLineMatches(
  line: readonly number[],
  template: readonly number[],
): number {
  const base = lineMatchesFrom(line, template, 0);
  if (line.length >= 2 && line[0] === 0) {
    return Math.max(base, lineMatchesFrom(line, template, 1));
  }
  return base;
}

function detectMeter(lines: readonly (readonly number[])[]): MeterResult {
  const totalSyllables = lines.reduce((sum, l) => sum + l.length, 0);
  if (totalSyllables < MIN_SYLLABLES_FOR_METER) {
    return { meter: undefined, consistency: 0 };
  }

  let bestName: NamedMeter | undefined;
  let bestScore = 0;

  // The template restarts at offset 0 on every line — the first beat
  // IS the distinguishing feature between iambic and trochaic (and
  // between anapestic and dactylic). Allowing arbitrary offsets would
  // collapse each meter into its sibling; the one sanctioned
  // exception is the single-syllable anacrusis skip in
  // bestLineMatches, whose built-in penalty preserves determinism.
  for (const c of METER_TEMPLATES) {
    let matches = 0;
    for (const line of lines) {
      matches += bestLineMatches(line, c.template);
    }
    const score = matches / totalSyllables;
    if (score > bestScore) {
      bestScore = score;
      bestName = c.name;
    }
  }

  if (bestScore >= NAMED_METER_THRESHOLD) {
    return { meter: bestName, consistency: bestScore };
  }
  if (bestScore >= MIXED_METER_THRESHOLD) {
    return { meter: 'mixed', consistency: bestScore };
  }
  return { meter: undefined, consistency: bestScore };
}

// Vowel normalization for rhyme. CMU marks the cot-caught merger
// distinctly (AA vs AO) but they're rhymed freely in modern
// American English and — more importantly — in picture-book writing.
// "dog" / "log" rhyme to any reader. Map both to a single bucket
// for rhyme comparison only; meter detection and inventory still
// keep them distinct.
const RHYME_VOWEL_EQUIVALENTS: Readonly<Record<string, string>> = {
  AA: 'AAH',
  AO: 'AAH',
};

function normalizeVowelForRhyme(arpa: string): string {
  return RHYME_VOWEL_EQUIVALENTS[arpa] ?? arpa;
}

/**
 * Spreadsheet-style rhyme label: 0→A, 25→Z, 26→AA, 27→AB, 51→AZ,
 * 52→BA. Lets prose-y text with many distinct rhymes produce a
 * readable scheme string instead of overflowing past Z into the
 * ASCII punctuation range (which the previous incremental
 * String.fromCharCode approach did).
 */
function rhymeLabelAt(n: number): string {
  let result = '';
  let i = n;
  do {
    result = String.fromCharCode(65 + (i % 26)) + result;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return result;
}

/**
 * Last-stressed-vowel rhyme of a word: returns the suffix starting
 * at the last stressed vowel, joined with `|` so phoneme boundaries
 * are unambiguous in equality checks. Stress digits are stripped
 * from the comparison string (so /AE1 T/ and /AE2 T/ rhyme).
 *
 * Falls back to last vowel for words with no marked stress.
 * Returns null for words with no vowels at all.
 */
function getRhymePhoneme(word: string): string | null {
  const phonemes = getPronunciation(word);
  let idx = -1;
  for (let i = phonemes.length - 1; i >= 0; i--) {
    const p = phonemes[i];
    if (p && isVowelArpa(p) && p[p.length - 1] !== '0') {
      idx = i;
      break;
    }
  }
  if (idx === -1) {
    for (let i = phonemes.length - 1; i >= 0; i--) {
      const p = phonemes[i];
      if (p && isVowelArpa(p)) {
        idx = i;
        break;
      }
    }
  }
  if (idx === -1) return null;
  return phonemes
    .slice(idx)
    .map((p) => normalizeVowelForRhyme(p.replace(/\d$/, '')))
    .join('|');
}

function detectRhymeScheme(text: string): string | undefined {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return undefined;

  const rhymes: (string | null)[] = lines.map((line) => {
    const words = tokenizeWords(line);
    const last = words[words.length - 1];
    if (!last) return null;
    return getRhymePhoneme(last);
  });

  const seen = new Map<string, string>();
  const letters: string[] = [];
  let nextIndex = 0;
  for (const r of rhymes) {
    if (r === null) {
      letters.push('-');
      continue;
    }
    let letter = seen.get(r);
    if (!letter) {
      letter = rhymeLabelAt(nextIndex++);
      seen.set(r, letter);
    }
    letters.push(letter);
  }

  // Only surface a scheme if at least one rhyme repeats; all-unique
  // line endings = prose, and labeling it "ABCD" is misleading.
  const realLetters = letters.filter((l) => l !== '-');
  if (new Set(realLetters).size === realLetters.length) return undefined;

  return letters.join('');
}

export function analyzeProsody(text: string): ProsodyProfile {
  const stressByLine = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => buildStressSequence(l));
  const { meter, consistency } = detectMeter(stressByLine);
  const rhymeScheme = detectRhymeScheme(text);

  const profile: ProsodyProfile = { meterConsistency: consistency };
  if (meter !== undefined) profile.dominantMeter = meter;
  if (rhymeScheme !== undefined) profile.rhymeScheme = rhymeScheme;
  return profile;
}
