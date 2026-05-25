import { describe, it, expect } from 'vitest';
import { tokenize, tokenizeWords } from '../src/vocabulary/tokenize.js';

describe('tokenize', () => {
  describe('basics', () => {
    it('returns [] for empty input', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('returns [] for whitespace-only input', () => {
      expect(tokenize('   \n\t  ')).toEqual([]);
    });

    it('splits a simple sentence', () => {
      expect(tokenizeWords('The cat sat on the mat.')).toEqual([
        'the', 'cat', 'sat', 'on', 'the', 'mat',
      ]);
    });

    it('lowercases all tokens', () => {
      expect(tokenizeWords('Hop. HOP! hop?')).toEqual(['hop', 'hop', 'hop']);
    });
  });

  describe('contractions', () => {
    it('keeps straight-apostrophe contractions whole', () => {
      expect(tokenizeWords("don't can't won't")).toEqual([
        "don't", "can't", "won't",
      ]);
    });

    it('keeps curly-apostrophe contractions whole', () => {
      expect(tokenizeWords('don’t')).toEqual(['don’t']);
    });
  });

  describe('possessives', () => {
    it('keeps possessive -s attached', () => {
      expect(tokenizeWords("the cat's hat")).toEqual([
        'the', "cat's", 'hat',
      ]);
    });
  });

  describe('hyphens', () => {
    it('splits hyphenated compounds into separate tokens', () => {
      expect(tokenizeWords('tip-toe')).toEqual(['tip', 'toe']);
    });

    it('handles multiple hyphens in one compound', () => {
      expect(tokenizeWords('mother-in-law')).toEqual([
        'mother', 'in', 'law',
      ]);
    });

    it('preserves offsets for each piece of a hyphenated compound', () => {
      // "tip-toe" — t=0, t=4
      const ts = tokenize('tip-toe');
      expect(ts).toEqual([
        { text: 'tip', offset: 0 },
        { text: 'toe', offset: 4 },
      ]);
    });
  });

  describe('punctuation', () => {
    it('strips terminal punctuation', () => {
      expect(tokenizeWords('Hop! Stop. Go?')).toEqual(['hop', 'stop', 'go']);
    });

    it('handles em-dashes as word separators', () => {
      expect(tokenizeWords('fast—slow')).toEqual(['fast', 'slow']);
    });

    it('handles ellipses', () => {
      expect(tokenizeWords('wait... and see')).toEqual(['wait', 'and', 'see']);
    });
  });

  describe('numbers', () => {
    it('drops standalone numeric tokens', () => {
      expect(tokenizeWords('There are 3 bears.')).toEqual([
        'there', 'are', 'bears',
      ]);
    });
  });

  describe('offsets', () => {
    it('reports correct character offsets', () => {
      const ts = tokenize('The cat sat.');
      expect(ts).toEqual([
        { text: 'the', offset: 0 },
        { text: 'cat', offset: 4 },
        { text: 'sat', offset: 8 },
      ]);
    });
  });

  describe('Unicode', () => {
    it('handles non-ASCII letters (é, ñ)', () => {
      expect(tokenizeWords('café niño')).toEqual(['café', 'niño']);
    });
  });
});
