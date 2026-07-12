#!/usr/bin/env node
/**
 * Regenerate src/data/cmu-dict.ts from the vendored CMU dict.
 *
 * Zero dependencies. Word-list extraction uses the ENGINE'S OWN
 * tokenizer (imported from dist), so dict keys can never diverge from
 * the tokenizer convention — contractions whole, hyphens split,
 * lowercase, straight apostrophes (see src/vocabulary/tokenize.ts and
 * the dictKey note in src/phonology/lookup.ts).
 *
 * Word list = corpus vocabulary (corpora/*.txt) ∪ current CMU_DICT keys.
 * Scope deliberately follows docs/BACKLOG.md ("CMU dict expansion"):
 * cover the regression corpus honestly; widen later by feeding the
 * generator a bigger list.
 *
 * Usage:  pnpm --filter @harmonic-systems/early-literacy build \
 *           && node packages/engine/scripts/generate-cmu-dict.mjs
 *
 * Policy: upstream first-pronunciation wins on conflicts with curated
 * entries (differences are printed for eyeballing); curated entries
 * absent from upstream are carried forward verbatim.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const engineRoot = join(here, '..');
const repoRoot = join(engineRoot, '..', '..');

const { tokenizeWords } = await import(
  join(engineRoot, 'dist', 'vocabulary', 'tokenize.js')
);
const { CMU_DICT } = await import(
  join(engineRoot, 'dist', 'data', 'cmu-dict.js')
);

// ---- 1. word list: corpus vocabulary ∪ current entries ----
const corporaDir = join(repoRoot, 'corpora');
const corpusFiles = readdirSync(corporaDir).filter((f) => f.endsWith('.txt'));
const words = new Set();
for (const f of corpusFiles) {
  const text = readFileSync(join(corporaDir, f), 'utf8');
  for (const w of tokenizeWords(text)) {
    // Normalize to the dict key form (tokens may carry curly quotes).
    words.add(w.replace(/’/g, "'"));
  }
}
const corpusWordCount = words.size;
for (const k of CMU_DICT.keys()) words.add(k);

// ---- 2. parse the vendored upstream dict (first pronunciations) ----
const upstreamPath = join(engineRoot, 'data-src', 'cmudict-0.7b');
const upstream = new Map();
for (const line of readFileSync(upstreamPath, 'latin1').split('\n')) {
  if (line.startsWith(';;;') || line.trim() === '') continue;
  const sep = line.indexOf('  ');
  if (sep === -1) continue;
  const rawWord = line.slice(0, sep);
  if (rawWord.includes('(')) continue; // alternate pronunciation — first only
  const key = rawWord.toLowerCase();
  // Tokenizer output is letters+apostrophes only (hyphens split, digits
  // dropped) — skip upstream keys that can never be looked up.
  if (!/^[a-z']+$/.test(key)) continue;
  const phonemes = line.slice(sep + 2).trim().split(/\s+/);
  if (!upstream.has(key)) upstream.set(key, phonemes);
}

// ---- 3. resolve the word list ----
// Heteronym overrides: upstream's FIRST variant sometimes picks the
// reading that's rare in children's text. These keep the curated
// choice. Pragmatic engineering choices, not linguistic claims —
// documented here per the tokenizer-conventions precedent.
const OVERRIDES = new Map([
  ['and', ['AE1', 'N', 'D']], // citation form (upstream first = reduced AH0 N D)
  ['read', ['R', 'IY1', 'D']], // present tense ("I can read"), not past R EH1 D
  ['live', ['L', 'IH1', 'V']], // verb ("where you live"), not adjective L AY1 V
  ['wind', ['W', 'IH1', 'N', 'D']], // noun (the wind), not verb W AY1 N D
  ['use', ['Y', 'UW1', 'Z']], // verb ("use your words"), not noun Y UW1 S
]);
const entries = new Map();
const missing = [];
const conflicts = [];
const carried = [];
for (const w of [...words].sort()) {
  const override = OVERRIDES.get(w);
  const up = upstream.get(w);
  const cur = CMU_DICT.get(w);
  if (override) {
    entries.set(w, override);
  } else if (up) {
    if (cur && JSON.stringify(cur) !== JSON.stringify(up)) {
      conflicts.push(`${w}: curated [${cur.join(' ')}] -> upstream [${up.join(' ')}]`);
    }
    entries.set(w, up);
  } else if (cur) {
    carried.push(w);
    entries.set(w, cur);
  } else {
    missing.push(w);
  }
}

// ---- 4. emit src/data/cmu-dict.ts ----
const genDate = process.env.GEN_DATE ?? new Date().toISOString().slice(0, 10);
const header = `/**
 * Subset of the CMU Pronouncing Dictionary (release 0.7b).
 *
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   pnpm --filter @harmonic-systems/early-literacy build
 *   node packages/engine/scripts/generate-cmu-dict.mjs
 *
 * Format: lowercased orthographic word → ARPABET phoneme array. Stress
 * digits (0/1/2) are preserved on vowels — they're load-bearing for
 * syllabification and prosody. Keys follow the tokenizer convention
 * (src/vocabulary/tokenize.ts): contractions whole with straight
 * apostrophes, hyphenated compounds split (each part its own key).
 *
 * Scope: the regression-corpus vocabulary (corpora/*.txt) ∪ the prior
 * curated set (Dolch service words + picture nouns + extras). First
 * upstream pronunciation only. Out-of-vocabulary words still fall
 * through to the grapheme heuristic in phonology/lookup.ts.
 *
 * Source: cmudict-0.7b, vendored at packages/engine/data-src/ with
 * SHA-256 provenance (see data-src/README.md). Permissive license.
 * Generated ${genDate}: ${entries.size} entries.
 * @see docs/linguistics/SOURCES.md
 * @see http://www.speech.cs.cmu.edu/cgi-bin/cmudict
 */

export const CMU_DICT: ReadonlyMap<string, readonly string[]> = new Map([
`;
let body = '';
for (const [w, ph] of entries) {
  // Double-quote keys containing apostrophes ("don't"); single-quote the rest.
  body += `  [${w.includes("'") ? JSON.stringify(w) : `'${w}'`}, [${ph
    .map((p) => `'${p}'`)
    .join(', ')}]],\n`;
}
const footer = `]);

/**
 * True if {@link CMU_DICT} has an entry for \`word\`. Lookup is
 * case-insensitive; curly apostrophes (U+2019) normalize to straight
 * (keys use the upstream straight form).
 */
export function hasPronunciation(word: string): boolean {
  return CMU_DICT.has(word.toLowerCase().replace(/’/g, "'"));
}

/**
 * Look up an ARPABET pronunciation. Returns the phoneme array (including
 * stress digits on vowels) or undefined if the word is not in the subset.
 */
export function lookupPronunciation(
  word: string,
): readonly string[] | undefined {
  return CMU_DICT.get(word.toLowerCase().replace(/’/g, "'"));
}
`;
writeFileSync(join(engineRoot, 'src', 'data', 'cmu-dict.ts'), header + body + footer);

// ---- 5. report ----
console.log(`corpus vocabulary:        ${corpusWordCount} unique words`);
console.log(`word list (∪ curated):    ${words.size}`);
console.log(`emitted entries:          ${entries.size}`);
console.log(`carried (curated-only):   ${carried.length}${carried.length ? ' — ' + carried.join(', ') : ''}`);
console.log(`still OOV (heuristic):    ${missing.length}`);
if (missing.length) console.log(`  ${missing.join(', ')}`);
if (conflicts.length) {
  console.log(`curated→upstream changes: ${conflicts.length}`);
  for (const c of conflicts) console.log(`  ${c}`);
}
