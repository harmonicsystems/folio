/**
 * Heuristic finite-clause counting.
 *
 * Clause definition follows Hunt (1965): a subject plus its finite verb;
 * coordinated predicates sharing a subject are the *same* clause ("took
 * a basket and her umbrella, and went through the wood" is one clause).
 * Subordination as a developmental index: Loban (1976). We report
 * clauses per *orthographic sentence*, not per T-unit, and the estimate
 * is an explicit **lower bound** — every guard below is precision-first,
 * so the bias direction is uniformly downward.
 *
 * `clauses(sentence) = 1 + Σ counted markers`, where markers are:
 * 1. Unguarded subordinators (because, although, if, when, where, …).
 *    Compound forms (as if, so that, even though, …) count once.
 * 2. Window-guarded subordinators (after, before, until, till, since,
 *    as) — count only with subject evidence in the next three tokens
 *    ("until it reached the brim" counts; "before the coming storm"
 *    does not).
 * 3. `while`, unless preceded by an article ("once in a while").
 * 4. Relative pronouns (who, whom, whose, which).
 * 5. Coordinators (and, but, or, nor, so, yet, for) followed by an
 *    overt subject — Hunt's criterion for a new clause ("but don't go",
 *    "and it seemed"); never in sentence-initial discourse position.
 * 6. Semicolons.
 *
 * Subject evidence = subject pronoun ∪ auxiliary/modal ∪ pronoun
 * contraction (i'll, there's, …).
 *
 * In `?`-final sentences the sentence-initial wh-word is the question
 * word, not an embedder, and is skipped ("Where is the cat?" = 1).
 *
 * Documented error modes (with bias direction):
 * - Zero-/that-complementation missed — `that` is excluded entirely
 *   because demonstrative `that` saturates children's text ("she knew
 *   that only the Great Oz could help her" reads as 1). Undercount.
 * - Full-NP subjects after coordinators missed ("and the knowing bird
 *   was enabled…"). Undercount.
 * - Clauses introduced by a colon missed. Undercount.
 * - Coordinated predicate headed by a bare auxiliary over-counts ("and
 *   were married next day"). Rare overcount.
 * - Nonfinite clauses ("to gather blackberries") are *correctly* not
 *   counted under Hunt's finite definition — a definition, not an error.
 *
 * See docs/linguistics/SOURCES.md (Syntax section).
 */

import { tokenize } from '../vocabulary/tokenize.js';
import { terminalRun } from './classify.js';
import {
  AUX_MODALS,
  COORDINATING_CONJUNCTIONS,
  RELATIVE_PRONOUNS,
  SUBJECT_PRONOUNS,
  SUBORDINATOR_COMPOUNDS,
  SUBORDINATORS_UNGUARDED,
  SUBORDINATORS_WINDOW_GUARDED,
} from '../data/syntax-words.js';

/** Pronoun-fused contractions count as subject evidence (i'll, there's). */
const SUBJECT_CONTRACTION = /^(?:i|you|he|she|it|we|they|there)['’]/;

function isSubjectEvidence(token: string): boolean {
  return (
    SUBJECT_PRONOUNS.includes(token) ||
    AUX_MODALS.includes(token) ||
    SUBJECT_CONTRACTION.test(token)
  );
}

/**
 * Estimate the finite-clause count of one segmented sentence.
 * Returns 0 for input with no word tokens, otherwise ≥ 1.
 */
export function countClauses(sentenceText: string): number {
  const tokens = tokenize(sentenceText).map((t) => t.text);
  if (tokens.length === 0) return 0;

  let count = 1;

  // Semicolons always join clauses in this register.
  for (const ch of sentenceText) {
    if (ch === ';') count++;
  }

  const isInterrogative = terminalRun(sentenceText).includes('?');
  const consumed = new Array<boolean>(tokens.length).fill(false);

  for (let i = 0; i < tokens.length; i++) {
    if (consumed[i]) continue;
    const tok = tokens[i] ?? '';
    const next = tokens[i + 1];

    // Compound subordinators first, so "so that" is neither a
    // coordinator nor bare "that".
    if (
      next !== undefined &&
      SUBORDINATOR_COMPOUNDS.some(([a, b]) => a === tok && b === next)
    ) {
      count++;
      consumed[i + 1] = true;
      continue;
    }

    // Sentence-initial wh-word in a question is the question word.
    if (
      i === 0 &&
      isInterrogative &&
      (SUBORDINATORS_UNGUARDED.includes(tok) || RELATIVE_PRONOUNS.includes(tok))
    ) {
      continue;
    }

    if (SUBORDINATORS_UNGUARDED.includes(tok)) {
      count++;
      continue;
    }

    // "while" subordinates unless inside "once in a while" / "all the while".
    if (tok === 'while') {
      const prev = i > 0 ? tokens[i - 1] : undefined;
      if (prev !== 'a' && prev !== 'the') count++;
      continue;
    }

    if (SUBORDINATORS_WINDOW_GUARDED.includes(tok)) {
      if (tokens.slice(i + 1, i + 4).some(isSubjectEvidence)) count++;
      continue;
    }

    if (RELATIVE_PRONOUNS.includes(tok)) {
      count++;
      continue;
    }

    if (i > 0 && COORDINATING_CONJUNCTIONS.includes(tok)) {
      if (next !== undefined && isSubjectEvidence(next)) count++;
      continue;
    }
  }

  return count;
}
