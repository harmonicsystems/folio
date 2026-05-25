import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { analyze } from '../src/readability/index.js';
import type { AgeBand, Manuscript } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPORA = resolve(__dirname, '../../../corpora');

interface ConstraintBound {
  min?: number;
  max?: number;
}

interface Meta {
  title: string;
  ageBand: AgeBand;
  expected: Record<string, ConstraintBound>;
}

function loadFixture(slug: string): { manuscript: Manuscript; meta: Meta } {
  const text = readFileSync(`${CORPORA}/${slug}.txt`, 'utf8');
  const meta = JSON.parse(
    readFileSync(`${CORPORA}/${slug}.meta.json`, 'utf8'),
  ) as Meta;

  const spreads = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text, i) => ({ index: i + 1, text }));

  return { manuscript: { title: meta.title, ageBand: meta.ageBand, spreads }, meta };
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe('analyze() end-to-end', () => {
  describe('synthetic-board-book fixture', () => {
    const { manuscript, meta } = loadFixture('synthetic-board-book');
    const profile = analyze(manuscript);

    it('classifies as board ageBand with the right target', () => {
      expect(profile.ageBand).toBe('board');
      expect(profile.wordCountTarget).toEqual({ min: 0, max: 100 });
    });

    it('does not emit a WORD_COUNT_OVER warning for board-book-scale text', () => {
      expect(profile.warnings.map((w) => w.code)).not.toContain('WORD_COUNT_OVER');
    });

    it('satisfies every constraint declared in the fixture meta', () => {
      for (const [path, bound] of Object.entries(meta.expected)) {
        const actual = getByPath(profile, path);
        expect(actual, `${path} must be a number`).toEqual(expect.any(Number));
        if (typeof bound.min === 'number') {
          expect(actual as number, `${path} >= ${bound.min}`).toBeGreaterThanOrEqual(bound.min);
        }
        if (typeof bound.max === 'number') {
          expect(actual as number, `${path} <= ${bound.max}`).toBeLessThanOrEqual(bound.max);
        }
      }
    });
  });

  describe('inline manuscript', () => {
    it('emits WORD_COUNT_OVER when text exceeds the age-band max', () => {
      // Board target: 0-100. 150 "the"s = 150 words = over.
      const text = Array(150).fill('the').join(' ') + '.';
      const profile = analyze({
        ageBand: 'board',
        spreads: [{ index: 1, text }],
      });
      expect(profile.warnings.map((w) => w.code)).toContain('WORD_COUNT_OVER');
    });

    it('emits WORD_COUNT_UNDER for early-readers below 1000 words', () => {
      const profile = analyze({
        ageBand: 'early-reader',
        spreads: [{ index: 1, text: 'A short story.' }],
      });
      expect(profile.warnings.map((w) => w.code)).toContain('WORD_COUNT_UNDER');
    });

    it('attributes reach words to the spread they first appear on', () => {
      const profile = analyze({
        ageBand: 'picture',
        spreads: [
          { index: 1, text: 'The cat sat.' },
          { index: 2, text: 'A hippopotamus appeared.' },
        ],
      });
      const hippo = profile.reachWords.find((r) => r.word === 'hippopotamus');
      expect(hippo?.spread).toBe(2);
    });
  });
});
