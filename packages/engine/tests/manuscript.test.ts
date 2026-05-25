/**
 * Placeholder tests. Will be expanded as the engine is implemented.
 *
 * Strategy: use canonical books from `corpora/` as test fixtures with
 * known properties (e.g., "Brown Bear, Brown Bear should be F&P level B
 * with >85% repetition density").
 */

import { describe, it, expect } from 'vitest';
import type { Manuscript } from '../src/types.js';

describe('Manuscript type', () => {
  it('accepts a minimal manuscript shape', () => {
    const m: Manuscript = {
      ageBand: 'picture',
      spreads: [
        { index: 1, text: 'In the great green room' },
        { index: 2, text: 'There was a telephone' },
      ],
    };
    expect(m.spreads).toHaveLength(2);
    expect(m.ageBand).toBe('picture');
  });

  it('accepts wordless spreads', () => {
    const m: Manuscript = {
      ageBand: 'picture',
      spreads: [
        { index: 1, text: '' },
        { index: 2, text: '', wordless: true },
      ],
    };
    expect(m.spreads[1]?.wordless).toBe(true);
  });
});
