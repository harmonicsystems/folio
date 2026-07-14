import { describe, expect, it } from 'vitest';
import {
  BOARD_BOOK,
  EARLY_READER,
  PICTURE_BOOK,
  findConstruction,
} from '../../src/drafting/formats.js';
import {
  buildPageMap,
  isLegalPageCount,
  nearestLegalPageCount,
  unitForOrdinal,
  unitForPage,
} from '../../src/drafting/pageMap.js';

const selfEnded = findConstruction(PICTURE_BOOK, 'hardcover-selfEnded');
const plusEnds = findConstruction(PICTURE_BOOK, 'hardcover-plusEndpapers');

describe('buildPageMap — picture book 32pp self-ended (ADR 0016 table)', () => {
  const map = buildPageMap(32, selfEnded);

  it('marks pages 1, 2, 31, 32 as self-ends', () => {
    for (const n of [1, 2, 31, 32]) {
      expect(map.pages[n - 1].role).toBe('self-end');
      expect(map.pages[n - 1].editable).toBe(false);
    }
  });

  it('puts title on page 3 and copyright on page 4', () => {
    expect(map.pages[2].role).toBe('title');
    expect(map.pages[3].role).toBe('copyright');
  });

  it('gives story pages 5–30 = 26-page budget', () => {
    expect(map.storyBudget).toBe(26);
    expect(map.storyPageNumbers[0]).toBe(5);
    expect(map.storyPageNumbers.at(-1)).toBe(30);
  });

  it('emits units [1], [2–3] … [30–31], [32] with editorial labels', () => {
    expect(map.units).toHaveLength(17);
    expect(map.units[0].label).toBe('1');
    expect(map.units[0].kind).toBe('single');
    expect(map.units[0].pages[0].side).toBe('recto');
    expect(map.units[1].label).toBe('2–3');
    expect(map.units[2].label).toBe('4–5');
    expect(map.units[15].label).toBe('30–31');
    expect(map.units[16].label).toBe('32');
    expect(map.units[16].pages[0].side).toBe('verso');
  });

  it('orders spread pages verso-then-recto', () => {
    const spread = map.units[2]; // pages 4–5
    expect(spread.pages[0].pageNumber).toBe(4);
    expect(spread.pages[0].side).toBe('verso');
    expect(spread.pages[1].pageNumber).toBe(5);
    expect(spread.pages[1].side).toBe('recto');
  });

  it('story begins on recto 5, facing the copyright page', () => {
    const spread = map.units[2];
    expect(spread.pages[0].role).toBe('copyright');
    expect(spread.pages[1].role).toBe('story');
    expect(spread.pages[1].storyOrdinal).toBe(0);
  });
});

describe('buildPageMap — picture book 32pp plus-endpapers', () => {
  const map = buildPageMap(32, plusEnds);

  it('front matter is half title p1, copyright p2, title p3', () => {
    expect(map.pages[0].role).toBe('half-title');
    expect(map.pages[1].role).toBe('copyright');
    expect(map.pages[2].role).toBe('title');
  });

  it('gives story pages 4–32 = 29-page budget', () => {
    expect(map.storyBudget).toBe(29);
    expect(map.storyPageNumbers[0]).toBe(4);
    expect(map.storyPageNumbers.at(-1)).toBe(32);
  });
});

describe('buildPageMap — board book 20pp', () => {
  const map = buildPageMap(20, BOARD_BOOK.construction);

  it('title on page 1, story starts on the first spread', () => {
    expect(map.pages[0].role).toBe('title');
    expect(map.storyPageNumbers[0]).toBe(2);
    expect(map.storyBudget).toBe(19);
  });

  it('has no self-ends', () => {
    expect(map.pages.every((p) => p.role !== 'self-end')).toBe(true);
  });
});

describe('buildPageMap — early reader 32pp', () => {
  const map = buildPageMap(32, EARLY_READER.construction);

  it('title p1, copyright p2, story pages 3–32 = 30-page budget', () => {
    expect(map.pages[0].role).toBe('title');
    expect(map.pages[1].role).toBe('copyright');
    expect(map.storyBudget).toBe(30);
    expect(map.storyPageNumbers[0]).toBe(3);
  });
});

describe('signature rule', () => {
  it('legal counts come only from the preset list', () => {
    expect(isLegalPageCount(PICTURE_BOOK, 32)).toBe(true);
    expect(isLegalPageCount(PICTURE_BOOK, 14)).toBe(false);
    expect(isLegalPageCount(BOARD_BOOK, 14)).toBe(false);
  });

  it('snaps to the nearest legal count', () => {
    expect(nearestLegalPageCount(PICTURE_BOOK, 30)).toBe(32);
    expect(nearestLegalPageCount(PICTURE_BOOK, 25)).toBe(24);
    expect(nearestLegalPageCount(BOARD_BOOK, 14)).toBe(12);
    expect(nearestLegalPageCount(BOARD_BOOK, 15)).toBe(16);
  });
});

describe('unit lookup', () => {
  const map = buildPageMap(32, selfEnded);

  it('finds the unit for a physical page', () => {
    expect(unitForPage(map, 1).label).toBe('1');
    expect(unitForPage(map, 4).label).toBe('4–5');
    expect(unitForPage(map, 5).label).toBe('4–5');
    expect(unitForPage(map, 31).label).toBe('30–31');
    expect(unitForPage(map, 32).label).toBe('32');
  });

  it('finds the unit for a story ordinal', () => {
    expect(unitForOrdinal(map, 0).label).toBe('4–5'); // story page 5
    expect(unitForOrdinal(map, 25).label).toBe('30–31'); // story page 30
  });
});
