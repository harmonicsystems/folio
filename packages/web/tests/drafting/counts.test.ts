import { describe, expect, it } from 'vitest';
import { PICTURE_BOOK } from '../../src/drafting/formats.js';
import { buildPageMap } from '../../src/drafting/pageMap.js';
import {
  bandStatus,
  bookWordCount,
  budgetUsage,
  countWords,
  unitWordCount,
} from '../../src/drafting/counts.js';
import { newBook, withStoryPage, withFrontMatterPage } from '../../src/drafting/model.js';

describe('countWords — whitespace tokenization, documented divergences', () => {
  it('counts plain words', () => {
    expect(countWords('the fox looked back')).toBe(4);
  });
  it('treats hyphenated compounds and contractions as one word', () => {
    expect(countWords("mother-of-pearl doesn't")).toBe(2);
  });
  it('handles empty and whitespace-only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  \n\n  ')).toBe(0);
  });
  it('counts across line breaks', () => {
    expect(countWords('one\ntwo\n\nthree')).toBe(3);
  });
});

describe('book counts', () => {
  it('counts story pages only — front matter never counts', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'five little ducks went' }), 2);
    book = withFrontMatterPage(book, 'title', (p) => ({ ...p, text: 'The Title Page' }), 2);
    expect(bookWordCount(book)).toBe(4);
  });

  it('counts words per render unit', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'one two' }), 2); // page 5
    book = withStoryPage(book, 1, (p) => ({ ...p, text: 'three' }), 2); // page 6
    const map = buildPageMap(32, PICTURE_BOOK.construction);
    expect(unitWordCount(book, map.units[2])).toBe(2); // pages 4–5
    expect(unitWordCount(book, map.units[3])).toBe(1); // pages 6–7
    expect(unitWordCount(book, map.units[0])).toBe(0); // page 1 (self-end)
  });
});

describe('bandStatus', () => {
  const band = { min: 200, target: 500, max: 1000 };
  it('reports plain position against the band', () => {
    expect(bandStatus(0, band)).toBe('below');
    expect(bandStatus(200, band)).toBe('within');
    expect(bandStatus(1000, band)).toBe('within');
    expect(bandStatus(1001, band)).toBe('above');
  });
});

describe('budgetUsage', () => {
  it('counts pages carrying text or placeholders, plus the overflow tray', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'words' }), 2);
    book = withStoryPage(book, 1, (p) => ({
      ...p,
      placeholders: [{ id: 'x', kind: 'full-page', note: '' }],
    }), 2);
    const map = buildPageMap(32, PICTURE_BOOK.construction);
    expect(budgetUsage(book, map)).toEqual({
      used: 2,
      budget: 26,
      overflowCount: 0,
    });
  });
});
