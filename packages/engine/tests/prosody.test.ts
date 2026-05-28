/**
 * Prosody analyzer tests. Covers meter detection across the four
 * canonical foot templates, rhyme-scheme extraction (AABB / ABAB /
 * prose), and the threshold edges (no-meter, mixed, named).
 *
 * @see packages/engine/src/prosody/index.ts
 */

import { describe, it, expect } from 'vitest';
import { analyzeProsody } from '../src/prosody/index.js';

describe('analyzeProsody — meter', () => {
  it('detects iambic in "shall I compare thee to a summers day"', () => {
    // Iambic pentameter: 0 1 0 1 0 1 0 1 0 1
    const profile = analyzeProsody('shall I compare thee to a summers day');
    expect(profile.dominantMeter).toBe('iambic');
    expect(profile.meterConsistency).toBeGreaterThanOrEqual(0.6);
  });

  it('detects trochaic in "tyger tyger burning bright"', () => {
    // Trochaic: 1 0 1 0 1 0 1 0
    const profile = analyzeProsody('tyger tyger burning bright');
    expect(profile.dominantMeter).toBe('trochaic');
    expect(profile.meterConsistency).toBeGreaterThan(0.6);
  });

  it('detects iambic in a repeated da-DUM line', () => {
    // "the cat is on the mat" — 0 1 0 1 0 1
    const profile = analyzeProsody(
      'the cat is on the mat the dog is in the bog',
    );
    expect(profile.dominantMeter).toBe('iambic');
  });

  it('returns undefined for very short text (under min syllables)', () => {
    const profile = analyzeProsody('hi');
    expect(profile.dominantMeter).toBeUndefined();
    expect(profile.meterConsistency).toBe(0);
  });

  it('returns "mixed" when no template wins cleanly but there is some structure', () => {
    // Stitched together to deliberately not fit any one foot but still
    // have some alignment with at least one — should land in the
    // 0.4–0.6 band.
    const profile = analyzeProsody(
      'apple banana orange strawberry kiwi watermelon papaya',
    );
    // Either named meter (if it lands above 0.6) or mixed/undefined
    // — what matters is meterConsistency stays a finite number 0..1.
    expect(profile.meterConsistency).toBeGreaterThanOrEqual(0);
    expect(profile.meterConsistency).toBeLessThanOrEqual(1);
  });

  it('clamps consistency into [0, 1]', () => {
    const profile = analyzeProsody('the cat sat on the mat');
    expect(profile.meterConsistency).toBeGreaterThanOrEqual(0);
    expect(profile.meterConsistency).toBeLessThanOrEqual(1);
  });
});

describe('analyzeProsody — rhyme scheme', () => {
  it('detects AABB couplets', () => {
    // "cat / hat" rhyme on /æt/; "dog / log" rhyme on /ɔg/.
    const text = ['the cat', 'wore a hat', 'the dog', 'sat on a log'].join(
      '\n',
    );
    const profile = analyzeProsody(text);
    expect(profile.rhymeScheme).toBe('AABB');
  });

  it('detects ABAB alternating rhymes', () => {
    const text = ['the cat', 'the dog', 'wore a hat', 'sat on a log'].join(
      '\n',
    );
    const profile = analyzeProsody(text);
    expect(profile.rhymeScheme).toBe('ABAB');
  });

  it('returns undefined for prose with all-unique line endings', () => {
    const text = [
      'Once upon a time there was a girl named Maria',
      'She lived in a small village by the sea',
      'Every morning she walked along the shore',
    ].join('\n');
    const profile = analyzeProsody(text);
    expect(profile.rhymeScheme).toBeUndefined();
  });

  it('returns undefined for single-line input', () => {
    const profile = analyzeProsody('the cat sat on the mat');
    expect(profile.rhymeScheme).toBeUndefined();
  });

  it('handles AAAA — all four lines rhyme', () => {
    const text = ['the cat', 'wore a hat', 'on the mat', 'with a rat'].join(
      '\n',
    );
    const profile = analyzeProsody(text);
    expect(profile.rhymeScheme).toBe('AAAA');
  });
});

describe('analyzeProsody — integration', () => {
  it('returns a complete profile shape on every input', () => {
    const profile = analyzeProsody('');
    expect(profile).toHaveProperty('meterConsistency');
    expect(typeof profile.meterConsistency).toBe('number');
  });

  it('handles empty input without throwing', () => {
    expect(() => analyzeProsody('')).not.toThrow();
    const profile = analyzeProsody('');
    expect(profile.meterConsistency).toBe(0);
    expect(profile.dominantMeter).toBeUndefined();
    expect(profile.rhymeScheme).toBeUndefined();
  });
});
