/**
 * Tokenization for children's literature.
 *
 * Conventions (chosen for early-literacy analysis, not generic NLP):
 *
 * - Contractions stay whole: "don't" → ["don't"]. Dolch lists treat
 *   contractions as single sight words.
 * - Possessives stay attached: "cat's" → ["cat's"]. The 's is a single
 *   morphological event for the reader.
 * - Hyphenated compounds split: "tip-toe" → ["tip", "toe"]. Each part
 *   is its own decoding event.
 * - Em-dashes / en-dashes are sentence-internal punctuation and split:
 *   "fast—slow" → ["fast", "slow"].
 * - All output is lowercased. Sight-word matching is case-insensitive.
 * - Standalone numeric tokens ("3", "42") are dropped — they aren't
 *   lexical for vocabulary purposes.
 * - Punctuation at the boundary of a token is stripped: "Hop!" → ["hop"].
 *
 * These conventions are pragmatic, not citationally grounded — they're
 * the engine's choice, not a linguistic claim. Documented here rather
 * than in SOURCES.md.
 */

/**
 * A word token plus light metadata. Numeric tokens and pure-punctuation
 * tokens are excluded from the output of {@link tokenize}.
 */
export interface Token {
  /** Lowercased surface form, with hyphens already split. */
  text: string;
  /** Zero-indexed character offset of the token's start in the source. */
  offset: number;
}

/**
 * Split a manuscript string into word tokens.
 *
 * Empty input returns []. Whitespace-only input returns [].
 */
export function tokenize(text: string): Token[] {
  if (!text) return [];

  const tokens: Token[] = [];
  // Match runs of letters, apostrophes (curly or straight), and internal
  // hyphens. We capture greedily then split hyphens in a second pass so
  // each sub-token gets its own offset.
  //
  // Apostrophe forms covered: U+0027 ' (straight), U+2019 ’ (curly).
  // Hyphens covered: U+002D - (ASCII), U+2010 ‐ (Unicode hyphen).
  //
  // Numbers are matched in a separate alternation and dropped from
  // word output (they're not lexical for our purposes here).
  const wordPattern =
    /[\p{L}](?:[\p{L}'’\-‐]*[\p{L}])?|\d[\d.,]*/gu;

  let match: RegExpExecArray | null;
  while ((match = wordPattern.exec(text)) !== null) {
    const raw = match[0];
    const startOffset = match.index;

    // Skip numeric tokens for now.
    if (/^\d/.test(raw)) continue;

    // Split on hyphens; emit each piece with its own offset.
    const pieces = raw.split(/[-‐]/);
    let cursor = 0;
    for (const piece of pieces) {
      if (piece.length > 0) {
        tokens.push({
          text: piece.toLowerCase(),
          offset: startOffset + cursor,
        });
      }
      // +1 for the hyphen we split on.
      cursor += piece.length + 1;
    }
  }

  return tokens;
}

/**
 * Convenience: just the surface forms, no offsets. Useful for set
 * operations and quick coverage checks.
 */
export function tokenizeWords(text: string): string[] {
  return tokenize(text).map((t) => t.text);
}
