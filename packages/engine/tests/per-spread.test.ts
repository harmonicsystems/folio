/**
 * Per-spread analysis tests.
 *
 * Covers `ReadabilityProfile.perSpread` shape, the `wordCountCeiling`
 * heuristic from ADR 0003, the `SPREAD_WORD_COUNT_HIGH` warning, and
 * wordless-spread handling.
 *
 * @see docs/decisions/0003-spread-native-engine-api.md
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../src/readability/index.js';

describe('perSpread', () => {
  it('emits one SpreadProfile per spread in Manuscript.spreads, in order', () => {
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'The cat sat.' },
        { index: 2, text: 'A dog ran.' },
        { index: 3, text: 'They played.' },
      ],
    });
    expect(profile.perSpread).toHaveLength(3);
    expect(profile.perSpread.map((s) => s.index)).toEqual([1, 2, 3]);
  });

  it('computes wordCount per spread, not aggregated', () => {
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'The cat sat.' }, // 3
        { index: 2, text: 'A.' }, // 1
        { index: 3, text: 'They played in the yard.' }, // 5
      ],
    });
    expect(profile.perSpread.map((s) => s.wordCount)).toEqual([3, 1, 5]);
  });

  it('computes wordCountCeiling as ceil(target.max / nonWordlessSpreadCount * 1.5)', () => {
    // picture: max 600. 3 non-wordless spreads. ceiling = ceil(600 / 3 * 1.5) = 300.
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'A.' },
        { index: 2, text: 'B.' },
        { index: 3, text: 'C.' },
      ],
    });
    for (const s of profile.perSpread) {
      expect(s.wordCountCeiling).toBe(300);
    }
  });

  it('uses ceiling 0 for wordless spreads', () => {
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'Words.' },
        { index: 2, text: '', wordless: true },
      ],
    });
    expect(profile.perSpread[0].wordCountCeiling).toBeGreaterThan(0);
    expect(profile.perSpread[1].wordCountCeiling).toBe(0);
  });

  it('excludes wordless spreads from the ceiling denominator', () => {
    // picture: max 600. 4 spreads, 1 wordless => nonWordlessCount = 3 => ceiling = 300.
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'A.' },
        { index: 2, text: 'B.' },
        { index: 3, text: '', wordless: true },
        { index: 4, text: 'C.' },
      ],
    });
    const nonWordless = profile.perSpread.filter((s) => s.wordCountCeiling > 0);
    expect(nonWordless).toHaveLength(3);
    for (const s of nonWordless) {
      expect(s.wordCountCeiling).toBe(300);
    }
  });

  it('fires SPREAD_WORD_COUNT_HIGH (info severity) when wordCount exceeds ceiling', () => {
    // board: max 100. 2 non-wordless spreads => ceiling = ceil(100/2 * 1.5) = 75.
    // Spread 1: 80 words (over). Spread 2: 3 words.
    const longText = Array(80).fill('cat').join(' ');
    const profile = analyze({
      ageBand: 'board',
      spreads: [
        { index: 1, text: longText },
        { index: 2, text: 'A small cat.' },
      ],
    });
    expect(profile.perSpread[0].warnings).toContainEqual(
      expect.objectContaining({
        severity: 'info',
        code: 'SPREAD_WORD_COUNT_HIGH',
        spread: 1,
      }),
    );
    expect(profile.perSpread[1].warnings).toHaveLength(0);
  });

  it('does not fire SPREAD_WORD_COUNT_HIGH for wordless spreads even when they have text', () => {
    const profile = analyze({
      ageBand: 'picture',
      spreads: [{ index: 1, text: 'Some text here.', wordless: true }],
    });
    expect(profile.perSpread[0].warnings).toHaveLength(0);
  });

  it('attributes reach words to their first-appearing spread', () => {
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'The cat sat.' },
        { index: 2, text: 'A hippopotamus appeared.' },
      ],
    });
    const spread2Words = profile.perSpread[1].reachWords.map((r) => r.word);
    expect(spread2Words).toContain('hippopotamus');
    // The reach word should NOT also be on spread 1.
    const spread1Words = profile.perSpread[0].reachWords.map((r) => r.word);
    expect(spread1Words).not.toContain('hippopotamus');
  });

  it('reports sightWordCoverage per spread independent of the manuscript total', () => {
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        // All sight words => coverage 1.0
        { index: 1, text: 'The cat sat on the mat.' },
        // Mostly reach words => low coverage
        { index: 2, text: 'Photosynthesis transforms chloroplasts.' },
      ],
    });
    expect(profile.perSpread[0].sightWordCoverage).toBeGreaterThan(
      profile.perSpread[1].sightWordCoverage,
    );
  });

  it('handles an empty spreads array without throwing', () => {
    const profile = analyze({ ageBand: 'picture', spreads: [] });
    expect(profile.perSpread).toEqual([]);
  });

  it('handles all-wordless manuscripts by falling back to target.max as the ceiling baseline', () => {
    // 2 wordless spreads, nonWordlessCount = 0 => baseCeiling falls back to target.max.
    // Wordless spreads still carry ceiling 0 (per the wordless override).
    const profile = analyze({
      ageBand: 'picture',
      spreads: [
        { index: 1, text: '', wordless: true },
        { index: 2, text: '', wordless: true },
      ],
    });
    expect(profile.perSpread.every((s) => s.wordCountCeiling === 0)).toBe(true);
    // And no division-by-zero NaN sneaks in.
    expect(profile.perSpread.every((s) => Number.isFinite(s.wordCountCeiling))).toBe(true);
  });
});
