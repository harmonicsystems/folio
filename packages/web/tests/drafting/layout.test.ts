import { describe, expect, it } from 'vitest';
import { PICTURE_BOOK } from '../../src/drafting/formats.js';
import {
  allowedVerticals,
  derivePlacement,
  newBook,
  setPageLayout,
  setPagePlaceholder,
  setPlaceholderNote,
  withStoryPage,
} from '../../src/drafting/model.js';
import { toSavedDraftSpreads } from '../../src/drafting/flatten.js';

const target = { kind: 'story', ordinal: 0 } as const;

describe('placeholder constraint logic (in the model, not the UI)', () => {
  it('a half-page illustration owns its half', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = setPagePlaceholder(book, target, 'half-page-top', 2);
    expect(allowedVerticals(book.storyPages[0])).toEqual(['bottom']);
    // The existing middle layout is clamped to the allowed half.
    expect(book.storyPages[0].layout.position.v).toBe('bottom');
    expect(book.storyPages[0].placement).toBe('text-bottom');
  });

  it('full-page art with no text derives illustration-only', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = setPagePlaceholder(book, target, 'full-page', 2);
    expect(book.storyPages[0].placement).toBe('illustration-only');
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'Over the art' }), 3);
    expect(derivePlacement(book.storyPages[0])).toBe('text-only');
  });

  it('one placeholder per page; the note survives a kind change', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = setPagePlaceholder(book, target, 'spot', 2);
    book = setPlaceholderNote(book, target, 'fox looks back', 3);
    book = setPagePlaceholder(book, target, 'full-page', 4);
    expect(book.storyPages[0].placeholders).toHaveLength(1);
    expect(book.storyPages[0].placeholders[0].note).toBe('fox looks back');
    book = setPagePlaceholder(book, target, null, 5);
    expect(book.storyPages[0].placeholders).toHaveLength(0);
  });
});

describe('setPageLayout', () => {
  it('applies position, alignment, and type steps', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = setPageLayout(book, target, {
      position: { v: 'bottom', h: 'left' },
      align: 'left',
      typeStep: 1,
    });
    const page = book.storyPages[0];
    expect(page.layout).toEqual({
      position: { v: 'bottom', h: 'left' },
      align: 'left',
      typeStep: 1,
    });
    expect(page.placement).toBe('text-bottom');
  });

  it('clamps a disallowed vertical to what the placeholder leaves open', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = setPagePlaceholder(book, target, 'half-page-bottom', 2);
    book = setPageLayout(book, target, { position: { v: 'bottom' } }, 3);
    expect(book.storyPages[0].layout.position.v).toBe('top');
  });
});

describe('toSavedDraftSpreads (flatten export path)', () => {
  it('pairs physical pages in reading order with derived placements', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 }); // self-ended 32pp
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'Story begins.' }), 2); // page 5
    book = setPagePlaceholder(book, { kind: 'story', ordinal: 1 }, 'full-page', 3); // page 6

    const spreads = toSavedDraftSpreads(book);
    expect(spreads).toHaveLength(16);
    // spread 1 = pages 1–2, both self-ends
    expect(spreads[0].leftPage.placement).toBe('illustration-only');
    // spread 3 = pages 5–6
    expect(spreads[2].leftPage.text).toBe('Story begins.');
    expect(spreads[2].rightPage.placement).toBe('illustration-only');
  });
});

describe('page fonts', () => {
  it('resolves known ids and falls back to the default serif', async () => {
    const { getPageFont, PAGE_FONTS, DEFAULT_PAGE_FONT_ID } = await import(
      '../../src/drafting/fonts.js'
    );
    expect(getPageFont('futura-bold').weight).toBe(700);
    expect(getPageFont(undefined).id).toBe(DEFAULT_PAGE_FONT_ID);
    expect(getPageFont('not-a-font').id).toBe(DEFAULT_PAGE_FONT_ID);
    expect(new Set(PAGE_FONTS.map((f) => f.id)).size).toBe(PAGE_FONTS.length);
  });

  it('pageFont survives the validate round-trip', async () => {
    const { validateBook } = await import('../../src/drafting/model.js');
    const book = newBook(PICTURE_BOOK, { now: 1 });
    const withFont = { ...book, pageFont: 'futura' };
    expect(validateBook(JSON.parse(JSON.stringify(withFont)))?.pageFont).toBe('futura');
  });
});
