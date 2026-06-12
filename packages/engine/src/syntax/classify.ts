/**
 * Sentence-type classification: declarative / interrogative /
 * exclamatory / imperative.
 *
 * The taxonomy is the four clause types of Quirk et al. (1985), which
 * is also the K–2 pedagogical convention (CCSS L.1.1.j — "telling /
 * asking / exclaiming / commanding sentences"). Classification is
 * punctuation-first with one conservative form check, in precedence
 * order:
 *
 * 1. Terminal run contains `?` → interrogative.
 * 2. Imperative form test passes → imperative. The test walks leading
 *    tokens: discourse openers (now, oh, please, …) are skipped; the
 *    first other token must be on the imperative-verb list and must not
 *    be followed by an auxiliary ("Help is coming." stays declarative).
 *    Base forms only, so narrative inversion ("Said the Piggy…") cannot
 *    match. Undercount mode: commands headed by off-list verbs ("Fetch
 *    the ball.") classify declarative — biased toward the unmarked
 *    class, never inventing commands.
 * 3. Terminal run contains `!` → exclamatory (includes wh-exclamatives:
 *    "What a beautiful Pussy you are!").
 * 4. Otherwise declarative — the unmarked default (Quirk et al. 1985),
 *    which is also the disposal for verse fragments and verbless
 *    sentences ("Good night, cat.").
 *
 * Tagged quotations classify as part of their carrier sentence, by the
 * carrier's terminator — «"Won't you go with me?" pleaded the girl.» is
 * declarative (a declarative matrix with an embedded interrogative).
 * Consequence: interrogative counts under-represent *spoken* questions
 * in tag-heavy prose; untagged questions — the dominant pattern in
 * board/picture books — classify correctly. A future quote-aware
 * utterance scan for dialogic prompts (PEER/CROWD) is separate work and
 * would need new contract fields.
 *
 * See docs/linguistics/SOURCES.md (Syntax section).
 */

import { tokenize } from '../vocabulary/tokenize.js';
import type { SentenceTypeBreakdown } from '../types.js';
import {
  AUX_MODALS,
  DISCOURSE_OPENERS,
  IMPERATIVE_VERBS,
} from '../data/syntax-words.js';

export type SentenceType = keyof SentenceTypeBreakdown;

const TERMINALS = '.!?…';
const CLOSERS = '"”’\')]';

/**
 * The sentence's terminal punctuation run, ignoring trailing closing
 * quotes/brackets and whitespace. `'Your ring?"'` → `'?'`;
 * `'No way!!!'` → `'!!!'`; an unterminated span → `''`.
 */
export function terminalRun(sentenceText: string): string {
  let end = sentenceText.length;
  while (end > 0) {
    const ch = sentenceText.charAt(end - 1);
    if (CLOSERS.includes(ch) || /\s/u.test(ch)) {
      end--;
      continue;
    }
    break;
  }
  let runStart = end;
  while (runStart > 0 && TERMINALS.includes(sentenceText.charAt(runStart - 1))) {
    runStart--;
  }
  return sentenceText.slice(runStart, end);
}

/**
 * Conservative imperative form test. Checks each leading token:
 * imperative-verb hit wins (subject to the not-followed-by-auxiliary
 * guard), discourse openers are skipped, anything else fails. Verb
 * membership is checked before the skip so "Come here." matches even
 * though interjective "come" exists.
 */
function isImperativeForm(tokens: readonly string[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] ?? '';
    if (IMPERATIVE_VERBS.includes(tok)) {
      const next = tokens[i + 1];
      return next === undefined || !AUX_MODALS.includes(next);
    }
    if (DISCOURSE_OPENERS.includes(tok)) continue;
    return false;
  }
  return false;
}

/** Classify one segmented sentence into the four-type breakdown. */
export function classifySentence(sentenceText: string): SentenceType {
  const run = terminalRun(sentenceText);
  if (run.includes('?')) return 'interrogative';
  const tokens = tokenize(sentenceText).map((t) => t.text);
  if (isImperativeForm(tokens)) return 'imperative';
  if (run.includes('!')) return 'exclamatory';
  return 'declarative';
}
