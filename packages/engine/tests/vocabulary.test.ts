import { describe, it, expect } from 'vitest';
import {
  analyzeVocabulary,
  identifyReachWords,
  identifyReachWordsBySpread,
  isDaleChall,
  isSightWord,
  isTier1,
  reachVocabulary,
  sightWordCoverage,
  tier1Coverage,
  typeTokenRatio,
} from '../src/vocabulary/index.js';

describe('isSightWord', () => {
  it('recognizes Dolch pre-primer words', () => {
    expect(isSightWord('the')).toBe(true);
    expect(isSightWord('and')).toBe(true);
    expect(isSightWord('jump')).toBe(true);
  });

  it('recognizes Dolch nouns', () => {
    expect(isSightWord('cat')).toBe(true);
    expect(isSightWord('mother')).toBe(true);
  });

  it('recognizes Fry first-100 words not also in Dolch', () => {
    expect(isSightWord('water')).toBe(true);
    expect(isSightWord('people')).toBe(true);
  });

  it('rejects words outside both lists', () => {
    expect(isSightWord('hippopotamus')).toBe(false);
    expect(isSightWord('umbrella')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isSightWord('THE')).toBe(true);
    expect(isSightWord('Cat')).toBe(true);
  });
});

describe('sightWordCoverage', () => {
  it('returns 0 for empty input', () => {
    expect(sightWordCoverage([])).toBe(0);
  });

  it('returns 1.0 when every token is a sight word', () => {
    expect(sightWordCoverage(['the', 'cat', 'and', 'the', 'dog'])).toBe(1);
  });

  it('returns 0 when no token is a sight word', () => {
    expect(sightWordCoverage(['hippopotamus', 'umbrella'])).toBe(0);
  });

  it('returns the correct ratio for mixed input', () => {
    // 3 sight ("the", "saw", "cat") out of 4 tokens.
    expect(sightWordCoverage(['the', 'saw', 'cat', 'hippopotamus'])).toBe(0.75);
  });
});

describe('typeTokenRatio', () => {
  it('returns 0 for empty input', () => {
    expect(typeTokenRatio([])).toBe(0);
  });

  it('returns 1.0 when every token is unique', () => {
    expect(typeTokenRatio(['a', 'b', 'c'])).toBe(1);
  });

  it('returns < 1 when tokens repeat', () => {
    // 3 unique / 6 total = 0.5
    expect(typeTokenRatio(['a', 'b', 'c', 'a', 'b', 'c'])).toBe(0.5);
  });
});

describe('isDaleChall / isTier1', () => {
  it('recognizes Dale–Chall familiar words that are not sight words', () => {
    // "umbrella" and "morning" are outside Dolch+Fry but on Dale–Chall.
    expect(isSightWord('umbrella')).toBe(false);
    expect(isDaleChall('umbrella')).toBe(true);
    expect(isTier1('umbrella')).toBe(true);
    expect(isTier1('morning')).toBe(true);
  });

  it('treats sight words as Tier 1 even if not on Dale–Chall', () => {
    expect(isTier1('the')).toBe(true);
    expect(isTier1('cat')).toBe(true);
  });

  it('rejects genuinely rare words', () => {
    expect(isTier1('sirrah')).toBe(false);
    expect(isTier1('compunction')).toBe(false);
    expect(isDaleChall('hippopotamus')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isDaleChall('Umbrella')).toBe(true);
    expect(isTier1('MORNING')).toBe(true);
  });
});

describe('tier1Coverage / reachVocabulary', () => {
  it('returns 0 coverage for empty input', () => {
    expect(tier1Coverage([])).toBe(0);
  });

  it('measures the familiar-word share', () => {
    // the, cat, in, the (all Tier 1) + hippopotamus (reach) = 4/5.
    expect(tier1Coverage(['the', 'cat', 'in', 'the', 'hippopotamus'])).toBe(0.8);
  });

  it('lists unique reach words in first-appearance order', () => {
    // "sees" is a reach word (only the stem "see" is familiar); "the"
    // is Tier 1; the repeat of "hippopotamus" is deduplicated.
    expect(
      reachVocabulary(['the', 'hippopotamus', 'sees', 'the', 'hippopotamus']),
    ).toEqual(['hippopotamus', 'sees']);
  });
});

describe('identifyReachWords', () => {
  it('flags only non-Tier-1 words — familiar words now pass', () => {
    // "umbrella" is familiar (Dale–Chall) and must NOT be flagged, even
    // though it is not a Dolch/Fry sight word — the false-positive fix.
    const reach = identifyReachWords(['the', 'cat', 'umbrella', 'hippopotamus']);
    expect(reach.map((r) => r.word)).toEqual(['hippopotamus']);
  });

  it('deduplicates — each reach word is reported once', () => {
    const reach = identifyReachWords([
      'hippopotamus', 'is', 'the', 'hippopotamus',
    ]);
    expect(reach).toHaveLength(1);
    expect(reach[0]?.word).toBe('hippopotamus');
  });

  it('returns ReachWord shape with default spread=1 and reason tier-2', () => {
    const [first] = identifyReachWords(['hippopotamus']);
    expect(first).toEqual({
      word: 'hippopotamus',
      spread: 1,
      reason: 'tier-2',
    });
  });
});

describe('identifyReachWordsBySpread', () => {
  it('attributes each reach word to the spread it first appears on', () => {
    const reach = identifyReachWordsBySpread([
      { index: 1, text: 'The cat sat.' },
      { index: 2, text: 'A hippopotamus appeared.' },
      { index: 3, text: 'The hippopotamus left.' }, // reappearance
    ]);
    // "sat" and "left" are familiar (Dale–Chall Tier 1) and no longer
    // flagged — only genuinely beyond-Tier-1 words remain. "appeared"
    // stays (only the stem "appear" is listed; inflection undercount).
    expect(reach).toEqual([
      { word: 'hippopotamus', spread: 2, reason: 'tier-2' },
      { word: 'appeared', spread: 2, reason: 'tier-2' },
    ]);
  });
});

describe('analyzeVocabulary', () => {
  it('returns a profile shape for empty input', () => {
    const p = analyzeVocabulary('');
    expect(p).toEqual({
      tier1Coverage: 0,
      tier2Words: [],
      tier3Words: [],
      sightWordCoverage: 0,
      uniqueWords: 0,
      typeTokenRatio: 0,
    });
  });

  it('counts unique words correctly', () => {
    const p = analyzeVocabulary('the cat and the dog');
    expect(p.uniqueWords).toBe(4); // the, cat, and, dog
  });

  it('computes high sight-word coverage on Dolch-heavy text', () => {
    // 8 of 8 tokens are sight words.
    const p = analyzeVocabulary('the cat and the dog can see me');
    expect(p.sightWordCoverage).toBe(1);
  });

  it('computes low TTR on highly repetitive text (board-book pattern)', () => {
    const p = analyzeVocabulary('go cat go. go cat go. go cat go.');
    // 2 unique ("go", "cat"), 9 tokens — TTR = 2/9 ≈ 0.22
    expect(p.typeTokenRatio).toBeCloseTo(2 / 9, 5);
  });

  it('populates Tier-1 coverage and reach words (tier2Words)', () => {
    // the, big, cat, ran (all Tier 1) + hippopotamus (reach) = 4/5.
    const p = analyzeVocabulary('the big cat ran hippopotamus');
    expect(p.tier1Coverage).toBe(0.8);
    expect(p.tier2Words).toEqual(['hippopotamus']);
    expect(p.tier3Words).toEqual([]);
  });
});
