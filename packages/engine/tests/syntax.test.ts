/**
 * Syntax module tests. Covers sentence segmentation (the orthographic
 * text-sentence: terminal punctuation runs, abbreviation/decimal/initial
 * guards, dialogue-tag continuation, verse spanning newlines, paragraph
 * flushes), the Hunt-1965 lower-bound clause estimator, four-way
 * sentence-type classification, and profile assembly.
 *
 * Expectations are hand-derived by applying the documented conventions
 * to the inputs — several are verbatim corpus-fixture sentences
 * (Peter Rabbit, Owl & Pussy-Cat, Aesop, Oz). Written before the
 * implementation per the project's tests-first rule.
 *
 * @see packages/engine/src/syntax/index.ts
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeSyntax,
  analyzeSyntaxFromSentences,
  classifySentence,
  countClauses,
  segmentSentences,
} from '../src/syntax/index.js';

/** Verbatim spread 3 of corpora/peter-rabbit.txt. */
const PETER_SPREAD_3 =
  '"Now my dears," said old Mrs. Rabbit one morning, "you may go into the fields or down the lane, but don\'t go into Mr. McGregor\'s garden: your Father had an accident there; he was put in a pie by Mrs. McGregor."';

/** Verbatim corpora/synthetic-board-book.txt. */
const BOARD_BOOK = [
  'Where is the cat?',
  '',
  'The cat is up. The cat is down.',
  '',
  'The cat is in. The cat is out.',
  '',
  'The cat is here. The cat is there.',
  '',
  'The cat is big. The cat is small.',
  '',
  'Where is the cat now?',
  '',
  'Good night, cat.',
].join('\n');

describe('segmentSentences — basics', () => {
  it('returns [] for empty input', () => {
    expect(segmentSentences('')).toEqual([]);
  });

  it('returns [] for whitespace-only input', () => {
    expect(segmentSentences('   \n\t  ')).toEqual([]);
  });

  it('drops spans with no word tokens (numbers are not lexical)', () => {
    expect(segmentSentences('123.')).toEqual([]);
  });

  it('segments a single terminated sentence', () => {
    const s = segmentSentences('The cat sat on the mat.');
    expect(s).toHaveLength(1);
    expect(s[0]?.text).toBe('The cat sat on the mat.');
  });

  it('flushes a final unterminated sentence at end of text', () => {
    const s = segmentSentences('The cat sat');
    expect(s).toHaveLength(1);
    expect(s[0]?.text).toBe('The cat sat');
  });

  it('segments two simple sentences', () => {
    const s = segmentSentences('The cat sat. The dog ran.');
    expect(s.map((x) => x.text)).toEqual(['The cat sat.', 'The dog ran.']);
  });

  it('reports offsets such that source.slice(start, end) === text', () => {
    const source = '  Hop up.  Hop down.';
    const s = segmentSentences(source);
    expect(s.map((x) => x.text)).toEqual(['Hop up.', 'Hop down.']);
    for (const sent of s) {
      expect(source.slice(sent.start, sent.end)).toBe(sent.text);
    }
    expect(s[0]?.start).toBe(2);
    expect(s[1]?.start).toBe(11);
  });

  it('holds the slice invariant on dialogue-and-abbreviation text', () => {
    const source = `${PETER_SPREAD_3}\n\n"Now run along, and don't get into mischief. I am going out."`;
    for (const sent of segmentSentences(source)) {
      expect(source.slice(sent.start, sent.end)).toBe(sent.text);
    }
  });
});

describe('segmentSentences — terminal runs and ellipses', () => {
  it('collapses ?! and !!! runs into single terminators', () => {
    const s = segmentSentences('What?! No way!!!');
    expect(s.map((x) => x.text)).toEqual(['What?!', 'No way!!!']);
  });

  it('treats ... before a lowercase continuation as non-final', () => {
    const s = segmentSentences('He waited... and waited.');
    expect(s).toHaveLength(1);
  });

  it('treats ... before a capital as sentence-final', () => {
    const s = segmentSentences('He waited... Then he left.');
    expect(s).toHaveLength(2);
  });

  it('treats U+2026 … the same as ...', () => {
    expect(segmentSentences('He waited… and waited.')).toHaveLength(1);
    expect(segmentSentences('He waited… Then he left.')).toHaveLength(2);
  });
});

describe('segmentSentences — period guards', () => {
  it('terminates on a period even before a lowercase letter (stylized text)', () => {
    const s = segmentSentences('he ran. then he hid.');
    expect(s.map((x) => x.text)).toEqual(['he ran.', 'then he hid.']);
  });

  it('does not split after honorific abbreviations (Mrs.)', () => {
    expect(segmentSentences('Old Mrs. Rabbit took a basket.')).toHaveLength(1);
  });

  it('splits at a real boundary even when an abbreviation appears mid-text', () => {
    const s = segmentSentences('He ran to Mr. McGregor. Then he hid.');
    expect(s).toHaveLength(2);
  });

  it('does not split decimals', () => {
    expect(segmentSentences('It cost 3.5 dollars.')).toHaveLength(1);
  });

  it('does not split after a single-letter initial', () => {
    expect(segmentSentences('L. Frank Baum wrote it.')).toHaveLength(1);
  });

  it('keeps Peter Rabbit spread 3 as one sentence (honorifics, colon, semicolon)', () => {
    const s = segmentSentences(PETER_SPREAD_3);
    expect(s).toHaveLength(1);
  });
});

describe('segmentSentences — quoted dialogue', () => {
  it('merges a quote with its lowercase attribution tag', () => {
    const s = segmentSentences('"Stop!" cried Mr. McGregor.');
    expect(s).toHaveLength(1);
  });

  it('handles curly quotes from chapter-band prose', () => {
    const s = segmentSentences(
      '“Quick, Dorothy!” she screamed. “Run for the cellar!”',
    );
    expect(s).toHaveLength(2);
  });

  it('keeps an embedded shout inside its carrier sentence', () => {
    const s = segmentSentences(
      'he shouted out, "Wolf! wolf!" and when the people came running up he laughed.',
    );
    expect(s).toHaveLength(1);
  });

  it('splits between a closing quote and the next opening quote', () => {
    const s = segmentSentences(
      '"That is impossible," bleated the Lamb. "Well," retorted the Wolf, "you feed in my pastures."',
    );
    expect(s).toHaveLength(2);
  });

  it('follows the author when an attribution tag is capitalized (Lear)', () => {
    const s = segmentSentences('Your ring?" Said the Piggy, "I will."');
    expect(s).toHaveLength(2);
  });
});

describe('segmentSentences — verse and newlines', () => {
  it('treats a single newline as whitespace (hard-wrapped prose)', () => {
    const s = segmentSentences(
      'Their\nhouse was small, for the lumber had to be carried\nmany miles.',
    );
    expect(s).toHaveLength(1);
  });

  it('lets a sentence span verse lines until a real terminator', () => {
    const verse = [
      'The Owl and the Pussy-Cat went to sea',
      'In a beautiful pea-green boat:',
      'They took some honey, and plenty of money',
      'Wrapped up in a five-pound note.',
    ].join('\n');
    const s = segmentSentences(verse);
    expect(s).toHaveLength(1);
    expect(s[0]?.text).toContain('\n');
  });

  it('keeps comma-ended refrain lines inside one sentence', () => {
    const s = segmentSentences(
      'His nose,\nHis nose,\nWith a ring at the end of his nose.',
    );
    expect(s).toHaveLength(1);
  });

  it('splits when ! is followed by a capitalized verse line', () => {
    const s = segmentSentences(
      'You are,\nYou are!\nWhat a beautiful Pussy you are!',
    );
    expect(s.map((x) => x.text)).toEqual([
      'You are,\nYou are!',
      'What a beautiful Pussy you are!',
    ]);
  });

  it('flushes at a paragraph break even with no terminator', () => {
    const s = segmentSentences('The cat is up\n\nThe cat is down');
    expect(s.map((x) => x.text)).toEqual(['The cat is up', 'The cat is down']);
  });
});

describe('countClauses', () => {
  it('returns 0 for empty input', () => {
    expect(countClauses('')).toBe(0);
  });

  it('counts a simple sentence as one clause', () => {
    expect(countClauses('The cat sat.')).toBe(1);
  });

  it('counts an unguarded subordinator', () => {
    expect(countClauses('He hid because he was scared.')).toBe(2);
  });

  it('counts a relative clause and skips a serial-list coordinator', () => {
    expect(
      countClauses(
        'Flopsy, Mopsy, and Cotton-tail, who were good little bunnies, went down the lane to gather blackberries.',
      ),
    ).toBe(2);
  });

  it('counts a coordinator followed by an overt subject', () => {
    expect(countClauses('She took a basket, and she went to the wood.')).toBe(2);
  });

  it('does not count coordinated predicates sharing a subject (Hunt)', () => {
    expect(
      countClauses(
        "Then old Mrs. Rabbit took a basket and her umbrella, and went through the wood to the baker's.",
      ),
    ).toBe(1);
  });

  it('counts a semicolon as a clause join', () => {
    expect(
      countClauses('your Father had an accident there; he was put in a pie.'),
    ).toBe(2);
  });

  it('counts Peter Rabbit spread 3 as three clauses (lower bound)', () => {
    // 1 base + "but don't" (coordinator + auxiliary evidence) + semicolon.
    // The colon clause ("your Father had…") is a documented undercount.
    expect(countClauses(PETER_SPREAD_3)).toBe(3);
  });

  it('counts "while" as a subordinator', () => {
    expect(countClauses('He sang while she slept.')).toBe(2);
  });

  it('does not count "while" inside "once in a while"', () => {
    expect(countClauses('Once in a while he sang.')).toBe(1);
  });

  it('counts window-guarded "until" with a pronoun subject', () => {
    expect(countClauses('They sang until she slept.')).toBe(2);
  });

  it('does not count prepositional "before"', () => {
    expect(countClauses('He left before the storm.')).toBe(1);
  });

  it('counts compound "as if" once', () => {
    expect(countClauses('It looked as if it would rain.')).toBe(2);
  });

  it('counts compound "so that" once, not as coordinator + that', () => {
    expect(countClauses('She stood on tiptoe so that she could see.')).toBe(2);
  });

  it('skips the question word in a wh-question', () => {
    expect(countClauses('Where is the cat?')).toBe(1);
    expect(countClauses('Who ate the cake?')).toBe(1);
  });

  it('still counts a mid-sentence relative in a declarative', () => {
    expect(countClauses('The bunny who ate the cake ran away.')).toBe(2);
  });

  it('never counts a sentence-initial coordinator', () => {
    expect(countClauses("But don't go into the garden.")).toBe(1);
  });

  it('counts a mid-sentence coordinator with auxiliary evidence', () => {
    expect(
      countClauses(
        "you may go into the fields or down the lane, but don't go into the garden.",
      ),
    ).toBe(2);
  });
});

describe('classifySentence', () => {
  it('classifies ? as interrogative', () => {
    expect(classifySentence('Where is the cat?')).toBe('interrogative');
  });

  it('classifies a plain statement as declarative', () => {
    expect(classifySentence('The cat is up.')).toBe('declarative');
  });

  it('classifies non-imperative ! as exclamatory', () => {
    expect(classifySentence('But Peter squeezed under the gate!')).toBe(
      'exclamatory',
    );
  });

  it('classifies a period-final command as imperative (discourse-opener skip)', () => {
    expect(
      classifySentence("Now run along, and don't get into mischief."),
    ).toBe('imperative');
  });

  it('lets imperative take precedence over !', () => {
    expect(classifySentence('"Run for the cellar!"')).toBe('imperative');
  });

  it('classifies a wh-exclamative as exclamatory, not imperative', () => {
    expect(classifySentence('What a beautiful Pussy you are!')).toBe(
      'exclamatory',
    );
  });

  it('defaults verbless fragments to declarative', () => {
    expect(classifySentence('Good night, cat.')).toBe('declarative');
  });

  it('does not mistake a noun use of a verb for a command (aux guard)', () => {
    expect(classifySentence('Help is coming.')).toBe('declarative');
  });

  it('classifies a bare verb command as imperative', () => {
    expect(classifySentence('Come here.')).toBe('imperative');
  });

  it('classifies "Let it go." as imperative', () => {
    expect(classifySentence('Let it go.')).toBe('imperative');
  });

  it('classifies an interjection ! as exclamatory', () => {
    expect(classifySentence('Oh, gracious!')).toBe('exclamatory');
  });

  it('does not match inflected narrative inversion (Said the Piggy)', () => {
    expect(classifySentence('Said the Piggy, "I will."')).toBe('declarative');
  });

  it('classifies a tagged quoted question by its carrier (period-final)', () => {
    expect(
      classifySentence('"Won\'t you go with me?" pleaded the girl.'),
    ).toBe('declarative');
  });

  it("classifies don't-commands as imperative", () => {
    expect(classifySentence("Don't touch that!")).toBe('imperative');
  });
});

describe('analyzeSyntax — profile assembly', () => {
  it('returns an all-zero profile for empty input', () => {
    expect(analyzeSyntax('')).toEqual({
      meanClausesPerSentence: 0,
      sentenceLengthStdev: 0,
      sentenceTypes: {
        declarative: 0,
        interrogative: 0,
        exclamatory: 0,
        imperative: 0,
      },
    });
  });

  it('computes population stdev of sentence length in words', () => {
    // Lengths [3, 6]: mean 4.5, population variance 2.25, stdev 1.5.
    const profile = analyzeSyntax('The cat sat. The cat sat on the mat.');
    expect(profile.sentenceLengthStdev).toBeCloseTo(1.5, 5);
    expect(profile.meanClausesPerSentence).toBe(1);
    expect(profile.sentenceTypes.declarative).toBe(2);
  });

  it('fills all four sentence-type buckets', () => {
    const profile = analyzeSyntax(
      'Where is the cat? The cat is up. Look at the cat! What a cat!',
    );
    expect(profile.sentenceTypes).toEqual({
      declarative: 1,
      interrogative: 1,
      exclamatory: 1,
      imperative: 1,
    });
  });

  it('agrees with analyzeSyntaxFromSentences on pre-segmented input', () => {
    const text = `${PETER_SPREAD_3}\n\n"Now run along, and don't get into mischief. I am going out."`;
    expect(analyzeSyntaxFromSentences(segmentSentences(text))).toEqual(
      analyzeSyntax(text),
    );
  });

  it('profiles the synthetic board book exactly', () => {
    const sentences = segmentSentences(BOARD_BOOK);
    expect(sentences).toHaveLength(11);

    const profile = analyzeSyntax(BOARD_BOOK);
    expect(profile.sentenceTypes).toEqual({
      declarative: 9,
      interrogative: 2,
      exclamatory: 0,
      imperative: 0,
    });
    expect(profile.meanClausesPerSentence).toBe(1);
    // Lengths: 4 ×9, 5, 3 — population stdev √(2/11) ≈ 0.4264.
    expect(profile.sentenceLengthStdev).toBeCloseTo(0.4264, 3);
  });
});
