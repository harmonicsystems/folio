/**
 * Fry Instant Word List.
 *
 * Fry (1980) published 1000 high-frequency words organized into ten
 * groups of 100 by descending frequency in printed English. The first
 * 100 alone covers approximately 50% of typical text; the first 300
 * covers ~65%.
 *
 * Source: Fry, E. B. (1980). "The new instant word list."
 *   The Reading Teacher, 34(3), 284–289.
 * Status: word lists are factual data, not copyrightable. Citation
 *   recorded in docs/linguistics/SOURCES.md.
 *
 * Scope: this file includes Fry's first 100. Groups 2–10 (words
 * 101–1000) are TODO — they require careful transcription from the
 * primary source. The first 100 is sufficient for sight-word coverage
 * to be a useful signal on board books and very-early-reader text.
 *
 * See packages/engine/data/README.md for verification notes.
 */

/** Fry's first 100 most-frequent words (group 1). */
export const FRY_FIRST_100: readonly string[] = [
  'the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it',
  'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i',
  'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'words',
  'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said',
  'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if',
  'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so',
  'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look',
  'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people',
  'my', 'than', 'first', 'water', 'been', 'called', 'who', 'oil', 'sit', 'now',
  'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part',
];

/** All Fry words currently included. O(1) membership via Set. */
export const FRY_ALL: ReadonlySet<string> = new Set(FRY_FIRST_100);

/** Which Fry group a word belongs to (currently only group 1 is loaded). */
export function fryGroup(word: string): 1 | null {
  if (FRY_FIRST_100.includes(word.toLowerCase())) return 1;
  return null;
}
