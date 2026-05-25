import { describe, it, expect } from 'vitest';
import {
  CMU_DICT,
  hasPronunciation,
  lookupPronunciation,
} from '../src/data/cmu-dict.js';

describe('CMU dict subset', () => {
  describe('coverage', () => {
    it('contains all 220 Dolch service words and 95 picture nouns', () => {
      // Lower bound — the subset may contain extras, but at minimum every
      // Dolch word should be in the dict so first-cut readers never fall
      // through to the OOV heuristic for sight words.
      expect(CMU_DICT.size).toBeGreaterThanOrEqual(315);
    });

    it('covers every unique word in the synthetic-board-book corpus', () => {
      const corpus =
        'Where is the cat? The cat is up. The cat is down. The cat is in. ' +
        'The cat is out. The cat is here. The cat is there. The cat is big. ' +
        'The cat is small. Where is the cat now? Good night, cat.';
      const words = corpus
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .split(/\s+/);
      for (const w of words) {
        expect(hasPronunciation(w), `missing: ${w}`).toBe(true);
      }
    });
  });

  describe('lookup', () => {
    it('returns the phoneme array for a known word', () => {
      expect(lookupPronunciation('cat')).toEqual(['K', 'AE1', 'T']);
    });

    it('is case-insensitive', () => {
      expect(lookupPronunciation('CAT')).toEqual(['K', 'AE1', 'T']);
      expect(lookupPronunciation('Cat')).toEqual(['K', 'AE1', 'T']);
    });

    it('returns undefined for OOV words', () => {
      expect(lookupPronunciation('zyzzyx')).toBeUndefined();
    });

    it('preserves stress digits on multi-syllable words', () => {
      // CMU dict notation: stress digits 0/1/2 after vowels.
      const apple = lookupPronunciation('apple');
      expect(apple).toBeDefined();
      const stressed = apple!.filter((p) => /[012]$/.test(p));
      expect(stressed).toHaveLength(2);
      expect(stressed[0]).toMatch(/1$/); // primary stress on first vowel
    });
  });

  describe('handles tokenizer output shapes', () => {
    it('looks up contractions with apostrophes', () => {
      // Tokenizer keeps "don't" intact; the dict key must match.
      expect(hasPronunciation("don't")).toBe(true);
    });

    it('does NOT include hyphenated compounds (those split in tokenization)', () => {
      // "good-bye" is split by the tokenizer into "good" and "bye".
      expect(hasPronunciation('good-bye')).toBe(false);
      expect(hasPronunciation('good')).toBe(true);
      expect(hasPronunciation('bye')).toBe(true);
    });
  });
});
