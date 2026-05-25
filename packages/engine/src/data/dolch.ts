/**
 * Dolch Sight Word Lists.
 *
 * 220 service words organized across five grade-level groups, plus 95
 * picture nouns. Reading levels are Dolch's original groupings.
 *
 * Source: Dolch, E. W. (1948). Problems in Reading. Garrard Press.
 * Status: public domain (publication > 95 years old; word lists are
 * factual data with no copyrightable creative authorship).
 *
 * See docs/linguistics/SOURCES.md for the canonical citation entry
 * and packages/engine/data/README.md for verification notes.
 */

export const DOLCH_PRE_PRIMER: readonly string[] = [
  'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
  'funny', 'go', 'help', 'here', 'i', 'in', 'is', 'it', 'jump', 'little',
  'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
  'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
];

export const DOLCH_PRIMER: readonly string[] = [
  'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
  'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
  'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
  'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
  'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will',
  'with', 'yes',
];

export const DOLCH_FIRST: readonly string[] = [
  'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
  'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
  'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
  'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
  'were', 'when',
];

export const DOLCH_SECOND: readonly string[] = [
  'always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy',
  'call', 'cold', 'does', 'don\'t', 'fast', 'first', 'five', 'found', 'gave',
  'goes', 'green', 'its', 'made', 'many', 'off', 'or', 'pull', 'read', 'right',
  'sing', 'sit', 'sleep', 'tell', 'their', 'these', 'those', 'upon', 'us',
  'use', 'very', 'wash', 'which', 'why', 'wish', 'work', 'would', 'write',
  'your',
];

export const DOLCH_THIRD: readonly string[] = [
  'about', 'better', 'bring', 'carry', 'clean', 'cut', 'done', 'draw', 'drink',
  'eight', 'fall', 'far', 'full', 'got', 'grow', 'hold', 'hot', 'hurt', 'if',
  'keep', 'kind', 'laugh', 'light', 'long', 'much', 'myself', 'never', 'only',
  'own', 'pick', 'seven', 'shall', 'show', 'six', 'small', 'start', 'ten',
  'today', 'together', 'try', 'warm',
];

/** All 220 Dolch service words. */
export const DOLCH_SERVICE: readonly string[] = [
  ...DOLCH_PRE_PRIMER,
  ...DOLCH_PRIMER,
  ...DOLCH_FIRST,
  ...DOLCH_SECOND,
  ...DOLCH_THIRD,
];

/** The 95 Dolch picture nouns — concrete, illustratable concepts. */
export const DOLCH_NOUNS: readonly string[] = [
  'apple', 'baby', 'back', 'ball', 'bear', 'bed', 'bell', 'bird', 'birthday',
  'boat', 'box', 'boy', 'bread', 'brother', 'cake', 'car', 'cat', 'chair',
  'chicken', 'children', 'christmas', 'coat', 'corn', 'cow', 'day', 'dog',
  'doll', 'door', 'duck', 'egg', 'eye', 'farm', 'farmer', 'father', 'feet',
  'fire', 'fish', 'floor', 'flower', 'game', 'garden', 'girl', 'good-bye',
  'grass', 'ground', 'hand', 'head', 'hill', 'home', 'horse', 'house', 'kitty',
  'leg', 'letter', 'man', 'men', 'milk', 'money', 'morning', 'mother', 'name',
  'nest', 'night', 'paper', 'party', 'picture', 'pig', 'rabbit', 'rain',
  'ring', 'robin', 'santa', 'school', 'seed', 'sheep', 'shoe', 'sister',
  'snow', 'song', 'squirrel', 'stick', 'street', 'sun', 'table', 'thing',
  'time', 'top', 'toy', 'tree', 'watch', 'water', 'way', 'wind', 'window',
  'wood',
];

/** Union of all Dolch words. O(1) membership via Set. */
export const DOLCH_ALL: ReadonlySet<string> = new Set([
  ...DOLCH_SERVICE,
  ...DOLCH_NOUNS,
]);

export type DolchLevel =
  | 'pre-primer'
  | 'primer'
  | 'first'
  | 'second'
  | 'third'
  | 'noun';

/** Return the Dolch group a word belongs to, or `null` if not in any list. */
export function dolchLevel(word: string): DolchLevel | null {
  const w = word.toLowerCase();
  if (DOLCH_PRE_PRIMER.includes(w)) return 'pre-primer';
  if (DOLCH_PRIMER.includes(w)) return 'primer';
  if (DOLCH_FIRST.includes(w)) return 'first';
  if (DOLCH_SECOND.includes(w)) return 'second';
  if (DOLCH_THIRD.includes(w)) return 'third';
  if (DOLCH_NOUNS.includes(w)) return 'noun';
  return null;
}
