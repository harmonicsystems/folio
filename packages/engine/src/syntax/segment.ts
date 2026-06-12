/**
 * Sentence segmentation for children's literature.
 *
 * The unit is the *orthographic text-sentence* (Nunberg 1990): a maximal
 * span closed by terminal punctuation as the author typeset it — not the
 * T-unit, not the spoken utterance. A quotation plus its attribution tag
 * is one sentence; the orthography itself encodes this (a lowercase tag
 * after `!`/`?` continues the sentence — Chicago Manual of Style ch. 13).
 *
 * Rule cascade (engine convention except where cited):
 * 1. A single newline is whitespace — verse and hard-wrapped prose
 *    accumulate until a real terminator.
 * 2. A blank line (paragraph break) flushes any open sentence,
 *    terminator or not. Sentences never span spreads.
 * 3. A bare `.` is guarded against abbreviations/honorifics (closed
 *    list below), single-letter initials ("L. Frank Baum"), and
 *    digit-internal periods ("3.5"). The period–abbreviation ambiguity
 *    is the classic tokenisation problem (Grefenstette & Tapanainen
 *    1994); the list contents are engine data.
 * 4. Otherwise a bare `.` always terminates — even before a lowercase
 *    letter, so lowercase-stylized picture books stay segmentable.
 * 5. `!`, `?`, `…` (and multi-char runs like `?!`) terminate only when
 *    followed — after attached closing quotes/brackets — by a capital,
 *    a digit, an opening quote/bracket, a paragraph break, or end of
 *    text. A lowercase continuation is a dialogue tag or mid-sentence
 *    interjection ("Stop!" cried Mr. McGregor / "Wolf! wolf!" and …).
 * 6. `:`, `;`, `,`, and dashes never terminate.
 * 7. Spans containing no word tokens are dropped.
 *
 * Known error modes (documented, biased directions):
 * - Ellipsis before a proper noun ("waiting for… Peter") over-segments.
 * - Headings without terminators merge into the following sentence.
 * - A sentence genuinely ending in a listed abbreviation merges forward.
 * - All-lowercase-styled text loses `!`/`?` boundaries (kept: `.` and
 *   paragraph flushes).
 *
 * See docs/linguistics/SOURCES.md (Syntax section).
 */

import { tokenize } from '../vocabulary/tokenize.js';

/** A segmented sentence with its span in the source text. */
export interface Sentence {
  /** Surface text, trimmed at both ends; internal whitespace (including newlines) preserved. */
  text: string;
  /** Zero-indexed char offset of the first character of `text` in the source. */
  start: number;
  /** Exclusive end offset: `source.slice(start, end) === text`. */
  end: number;
}

const TERMINALS = '.!?…';
/** Closing marks that attach to the sentence they follow. */
const CLOSERS = '"”’\')]'; // " ” ’ ' ) ]
/**
 * Opening marks that signal a new sentence after a `!`/`?`/`…` run.
 * ASCII `'` is deliberately absent — ambiguous with contractions ('twas).
 */
const OPENERS = '"“‘(['; // " “ ‘ ( [

/**
 * Abbreviations whose trailing period is not a boundary. Deliberately
 * minimal; extend only with fixture evidence of a real failure.
 */
const ABBREVIATIONS: ReadonlySet<string> = new Set([
  'mr', 'mrs', 'ms', 'dr', 'st', 'prof', 'jr', 'sr', 'mt', 'vs',
]);

function isWhitespace(ch: string): boolean {
  return /\s/u.test(ch);
}

function isLetter(ch: string): boolean {
  return /\p{L}/u.test(ch);
}

function isUpperLetter(ch: string): boolean {
  return /\p{Lu}/u.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/**
 * Split text into orthographic sentences with source offsets.
 *
 * Empty input returns []. Whitespace-only input returns []. Spans with
 * no word tokens (e.g., bare list numbers) are dropped.
 */
export function segmentSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  const n = text.length;
  let sentStart = -1;
  let i = 0;

  const flush = (endExclusive: number): void => {
    if (sentStart === -1) return;
    let end = endExclusive;
    while (end > sentStart && isWhitespace(text.charAt(end - 1))) end--;
    if (end > sentStart) {
      const slice = text.slice(sentStart, end);
      if (tokenize(slice).length > 0) {
        sentences.push({ text: slice, start: sentStart, end });
      }
    }
    sentStart = -1;
  };

  while (i < n) {
    const ch = text.charAt(i);

    if (sentStart === -1) {
      if (isWhitespace(ch)) {
        i++;
        continue;
      }
      sentStart = i;
    }

    if (ch === '\n') {
      // Blank line (newline, optional spaces, newline) = paragraph break.
      let j = i + 1;
      while (j < n && (text.charAt(j) === ' ' || text.charAt(j) === '\t' || text.charAt(j) === '\r')) {
        j++;
      }
      if (j < n && text.charAt(j) === '\n') {
        flush(i);
        i = j + 1;
        continue;
      }
      i++;
      continue;
    }

    if (TERMINALS.includes(ch)) {
      // Consume the whole terminal run (handles "?!", "!!!", "...", "…").
      let runEnd = i;
      while (runEnd < n && TERMINALS.includes(text.charAt(runEnd))) runEnd++;
      const isBarePeriod = ch === '.' && runEnd === i + 1;

      if (isBarePeriod) {
        const prev = i > 0 ? text.charAt(i - 1) : '';
        const next = runEnd < n ? text.charAt(runEnd) : '';
        if (isDigit(prev) && isDigit(next)) {
          i = runEnd; // digit-internal: "3.5"
          continue;
        }
        let wordStart = i;
        while (wordStart > 0 && isLetter(text.charAt(wordStart - 1))) wordStart--;
        const word = text.slice(wordStart, i);
        if (
          (word.length === 1 && isUpperLetter(word)) ||
          ABBREVIATIONS.has(word.toLowerCase())
        ) {
          i = runEnd; // initial ("L.") or honorific ("Mrs.")
          continue;
        }
      }

      // Closing quotes/brackets attach to the current sentence.
      let end = runEnd;
      while (end < n && CLOSERS.includes(text.charAt(end))) end++;

      // Look ahead to the next non-whitespace character.
      let k = end;
      let newlines = 0;
      while (k < n && isWhitespace(text.charAt(k))) {
        if (text.charAt(k) === '\n') newlines++;
        k++;
      }

      let boundary: boolean;
      if (k >= n || newlines >= 2 || isBarePeriod) {
        boundary = true;
      } else {
        const next = text.charAt(k);
        boundary =
          isUpperLetter(next) || isDigit(next) || OPENERS.includes(next);
      }

      if (boundary) {
        flush(end);
        i = k;
      } else {
        i = end;
      }
      continue;
    }

    i++;
  }

  flush(n);
  return sentences;
}
