/**
 * Corpus regression gate.
 *
 * Reads every `corpora/<slug>.meta.json` in the repo, runs the engine
 * against the sibling `<slug>.txt`, and asserts that each path in the
 * `expected` block (e.g. `vocabulary.sightWordCoverage`) falls inside
 * the declared `{ min?, max? }` range.
 *
 * Adding a fixture is the contract — drop a new pair into `corpora/`
 * and the runner picks it up automatically.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { analyze } from '@harmonic-systems/early-literacy';
import type {
  AgeBand,
  Manuscript,
  ReadabilityProfile,
} from '@harmonic-systems/early-literacy';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPORA = resolve(__dirname, '../../../corpora');

interface ConstraintBound {
  min?: number;
  max?: number;
}

interface FixtureMeta {
  title: string;
  ageBand: AgeBand;
  expected?: Record<string, ConstraintBound>;
}

function buildManuscript(text: string, meta: FixtureMeta): Manuscript {
  const spreads = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text, i) => ({ index: i + 1, text }));
  return { title: meta.title, ageBand: meta.ageBand, spreads };
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const fixtures = readdirSync(CORPORA)
  .filter((name) => name.endsWith('.meta.json'))
  .map((name) => name.replace(/\.meta\.json$/, ''))
  .sort();

describe('corpus fixtures', () => {
  if (fixtures.length === 0) {
    it('found at least one .meta.json fixture', () => {
      expect(fixtures.length).toBeGreaterThan(0);
    });
    return;
  }

  for (const slug of fixtures) {
    describe(slug, () => {
      const meta = JSON.parse(
        readFileSync(join(CORPORA, `${slug}.meta.json`), 'utf8'),
      ) as FixtureMeta;
      const text = readFileSync(join(CORPORA, `${slug}.txt`), 'utf8');
      const manuscript = buildManuscript(text, meta);
      const profile: ReadabilityProfile = analyze(manuscript);

      it(`declares the ${meta.ageBand} age band`, () => {
        expect(profile.ageBand).toBe(meta.ageBand);
      });

      const expected = meta.expected ?? {};
      for (const [path, bound] of Object.entries(expected)) {
        if (typeof bound.min === 'number') {
          it(`${path} >= ${bound.min}`, () => {
            const actual = getByPath(profile, path);
            expect(actual, `${path} must be a number`).toEqual(expect.any(Number));
            expect(actual as number).toBeGreaterThanOrEqual(bound.min as number);
          });
        }
        if (typeof bound.max === 'number') {
          it(`${path} <= ${bound.max}`, () => {
            const actual = getByPath(profile, path);
            expect(actual, `${path} must be a number`).toEqual(expect.any(Number));
            expect(actual as number).toBeLessThanOrEqual(bound.max as number);
          });
        }
      }
    });
  }
});
