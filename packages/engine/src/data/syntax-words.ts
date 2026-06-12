/**
 * Closed-class word lists for syntax analysis.
 *
 * Class memberships (which words are subordinating conjunctions,
 * coordinating conjunctions, relative pronouns, auxiliaries/modals,
 * personal pronouns) follow Quirk, Greenbaum, Leech & Svartvik (1985),
 * *A Comprehensive Grammar of the English Language*. The *partitioning*
 * of subordinators into unguarded vs. window-guarded sets, the guard
 * windows themselves, and the discourse-opener set are engine choices —
 * precision-first heuristics documented in `syntax/clauses.ts` and
 * `syntax/classify.ts`, not linguistic claims.
 *
 * The imperative-verb candidate pool is drawn from the Dolch service
 * lists (Dolch 1948 — already cited in SOURCES.md) filtered for
 * imperative plausibility in children's text, plus an enumerated
 * supplement of common caregiver/command verbs. The source pool is
 * cited; the filter and supplement are engine choices.
 *
 * Notable exclusions, by design:
 * - `that` is not counted as a subordinator or relative — demonstrative
 *   `that` saturates children's text, and the precision loss outweighs
 *   the recall gain. Zero-/that-complement clauses are a documented
 *   undercount of the clause estimator.
 * - Possessive determiners (my, your, their, …) are not subject
 *   evidence — "took a basket and her umbrella" must not read as a new
 *   clause.
 *
 * See docs/linguistics/SOURCES.md (Syntax section) for citations.
 */

/**
 * Subordinating conjunctions counted unconditionally as clause
 * introducers (high precision in children's text).
 */
export const SUBORDINATORS_UNGUARDED: readonly string[] = [
  'because', 'although', 'though', 'unless', 'if',
  'when', 'whenever', 'wherever', 'where',
];

/**
 * Two-token compound subordinators, counted once per match (and the
 * component tokens are then skipped — "so that" is neither a
 * coordinator nor bare "that").
 */
export const SUBORDINATOR_COMPOUNDS: ReadonlyArray<readonly [string, string]> = [
  ['as', 'if'],
  ['as', 'though'],
  ['even', 'if'],
  ['even', 'though'],
  ['so', 'that'],
  ['now', 'that'],
];

/**
 * Preposition-ambiguous subordinators — counted only when subject
 * evidence appears within the next three tokens ("until it reached the
 * brim" counts; "before the coming storm" does not).
 */
export const SUBORDINATORS_WINDOW_GUARDED: readonly string[] = [
  'after', 'before', 'until', 'till', 'since', 'as',
];

/** Relative pronouns counted as clause introducers. `that` excluded (see header). */
export const RELATIVE_PRONOUNS: readonly string[] = [
  'who', 'whom', 'whose', 'which',
];

/**
 * Coordinating conjunctions. A coordinator joins clauses (for the
 * estimator's purposes) only when followed by an overt subject — Hunt's
 * criterion — and never in sentence-initial discourse position.
 */
export const COORDINATING_CONJUNCTIONS: readonly string[] = [
  'and', 'but', 'or', 'nor', 'so', 'yet', 'for',
];

/** Subject personal pronouns plus existential `there`. */
export const SUBJECT_PRONOUNS: readonly string[] = [
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'there',
];

/**
 * Auxiliaries and modals, including negative contractions. Used as
 * subject evidence after coordinators ("but don't go", "and were
 * married") and as the not-a-command guard in classification
 * ("Help is coming." is declarative).
 */
export const AUX_MODALS: readonly string[] = [
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did',
  'have', 'has', 'had',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'ought',
  "don't", "doesn't", "didn't",
  "won't", "wouldn't", "shan't", "shouldn't",
  "can't", 'cannot', "couldn't", "mustn't",
  "isn't", "aren't", "wasn't", "weren't",
  "hasn't", "haven't", "hadn't", "ain't",
];

/**
 * Tokens skipped before the imperative-verb check ("Now run along…",
 * "Please sit."). Engine choice.
 */
export const DISCOURSE_OPENERS: readonly string[] = [
  'now', 'then', 'oh', 'o', 'well', 'please', 'just', 'first',
];

/**
 * Imperative-verb candidates drawn from the Dolch service lists
 * (Dolch 1948), filtered for verbs that plausibly head a command in
 * children's text. Base forms only — inflected narrative inversion
 * ("Said the Piggy…") cannot match.
 */
const IMPERATIVE_VERBS_DOLCH: readonly string[] = [
  'be', 'bring', 'buy', 'call', 'carry', 'clean', 'come', 'cut',
  'do', "don't", 'draw', 'drink', 'eat', 'find', 'fly', 'get',
  'give', 'go', 'grow', 'help', 'hold', 'jump', 'keep', 'let',
  'look', 'make', 'never', 'open', 'pick', 'play', 'pull', 'put',
  'read', 'ride', 'run', 'say', 'see', 'show', 'sing', 'sit',
  'sleep', 'start', 'stop', 'take', 'tell', 'try', 'use',
  'walk', 'wash', 'write',
];

/**
 * Supplement: common command verbs in picture-book registers that are
 * not on the Dolch service lists. Enumerated engine choice.
 */
const IMPERATIVE_VERBS_SUPPLEMENT: readonly string[] = [
  'catch', 'climb', 'hop', 'hug', 'hurry', 'kiss', "let's",
  'listen', 'push', 'smell', 'stand', 'stay', 'touch', 'turn',
  'wait', 'wake', 'watch', 'wave',
];

/** Full imperative-opener verb list (Dolch pool + supplement). */
export const IMPERATIVE_VERBS: readonly string[] = [
  ...IMPERATIVE_VERBS_DOLCH,
  ...IMPERATIVE_VERBS_SUPPLEMENT,
];
