import { describe, expect, it } from 'vitest';
import {
  BOARD_BOOK,
  EARLY_READER,
  PICTURE_BOOK,
  findConstruction,
} from '../../src/drafting/formats.js';
import { buildPageMap } from '../../src/drafting/pageMap.js';
import {
  applyConstruction,
  applyFormat,
  applyPageCount,
  emptyPage,
  mergeWithNext,
  newBook,
  splitStoryPageAt,
  validateBook,
  withStoryPage,
  type DraftBook,
} from '../../src/drafting/model.js';

const budgetOf = (book: DraftBook) =>
  buildPageMap(
    book.pageCount,
    findConstruction(
      book.formatId === 'board-book'
        ? BOARD_BOOK
        : book.formatId === 'early-reader'
          ? EARLY_READER
          : PICTURE_BOOK,
      book.binding,
    ),
  ).storyBudget;

describe('newBook', () => {
  it('materializes the story budget for the classic picture book', () => {
    const book = newBook(PICTURE_BOOK, { now: 1 });
    expect(book.formatId).toBe('picture-book');
    expect(book.pageCount).toBe(32);
    expect(book.binding).toBe('hardcover-selfEnded');
    expect(book.storyPages).toHaveLength(26);
    expect(book.readerLevel).toBeUndefined();
    expect(book.chapters).toBeUndefined();
  });

  it('gives early readers a level and a chapters array', () => {
    const book = newBook(EARLY_READER, { now: 1 });
    expect(book.readerLevel).toBe(1);
    expect(book.chapters).toEqual([]);
    expect(book.storyPages).toHaveLength(30);
  });

  it('rejects illegal page counts, falling back to the default', () => {
    const book = newBook(PICTURE_BOOK, { pageCount: 14, now: 1 });
    expect(book.pageCount).toBe(32);
  });
});

describe('splitStoryPageAt — the explicit page break', () => {
  const base = () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'one two three' }), 2);
    book = withStoryPage(book, 1, (p) => ({ ...p, text: 'existing' }), 2);
    return book;
  };

  it('moves post-caret text to the next page, prepended', () => {
    const { book, focusOrdinal, movedToOverflow } = splitStoryPageAt(
      base(),
      26,
      0,
      'one two '.length,
      3,
    );
    expect(book.storyPages[0].text).toBe('one two ');
    expect(book.storyPages[1].text).toBe('three\nexisting');
    expect(focusOrdinal).toBe(1);
    expect(movedToOverflow).toBe(false);
  });

  it('moves everything when the caret is at offset 0', () => {
    const { book } = splitStoryPageAt(base(), 26, 0, 0, 3);
    expect(book.storyPages[0].text).toBe('');
    expect(book.storyPages[1].text).toBe('one two three\nexisting');
  });

  it('is a focus-only no-op at end of text', () => {
    const before = base();
    const { book, focusOrdinal } = splitStoryPageAt(
      before,
      26,
      0,
      'one two three'.length,
      3,
    );
    expect(book).toBe(before);
    expect(focusOrdinal).toBe(1);
  });

  it('sends the remainder to overflow on the last budgeted page', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 25, (p) => ({ ...p, text: 'stay go' }), 2);
    const result = splitStoryPageAt(book, 26, 25, 'stay '.length, 3);
    expect(result.movedToOverflow).toBe(true);
    expect(result.book.storyPages[25].text).toBe('stay ');
    expect(result.book.overflow[0].text).toBe('go');
    expect(result.focusOrdinal).toBe(25);
  });
});

describe('mergeWithNext — break deletion', () => {
  it('joins text, moves placeholders, shifts later pages up', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'a' }), 2);
    book = withStoryPage(book, 1, (p) => ({
      ...p,
      text: 'b',
      placeholders: [{ id: 'x', kind: 'spot', note: 'moon' }],
    }), 2);
    book = withStoryPage(book, 2, (p) => ({ ...p, text: 'c' }), 2);

    const merged = mergeWithNext(book, 0, 3);
    expect(merged.storyPages[0].text).toBe('a\nb');
    expect(merged.storyPages[0].placeholders).toHaveLength(1);
    expect(merged.storyPages[1].text).toBe('c');
    expect(merged.storyPages).toHaveLength(26); // freed slot refilled at the end
  });

  it('does nothing on the last page or out of range', () => {
    const book = newBook(PICTURE_BOOK, { now: 1 });
    expect(mergeWithNext(book, 25, 2)).toBe(book);
    expect(mergeWithNext(book, -1, 2)).toBe(book);
  });
});

describe('applyPageCount', () => {
  it('shrink queues ALL trailing pages (positional fidelity); empty tail trimmed', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 }); // 26 story pages
    book = withStoryPage(book, 24, (p) => ({ ...p, text: 'late page' }), 2);
    const shrunk = applyPageCount(book, PICTURE_BOOK, 24, 3); // budget 18
    expect(budgetOf(shrunk)).toBe(18);
    expect(shrunk.storyPages).toHaveLength(18);
    // Ordinals 18..24 queue (empties kept as spacers so a later grow puts
    // every page back where it was); the empty tail (25) is trimmed.
    expect(shrunk.overflow).toHaveLength(7);
    expect(shrunk.overflow[6].text).toBe('late page');
  });

  it('grow re-places overflow at its ORIGINAL ordinals', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 24, (p) => ({ ...p, text: 'late page' }), 2);
    const shrunk = applyPageCount(book, PICTURE_BOOK, 24, 3);
    const grown = applyPageCount(shrunk, PICTURE_BOOK, 32, 4);
    expect(grown.overflow).toHaveLength(0);
    expect(grown.storyPages[24].text).toBe('late page'); // back where it lived
  });

  it('snaps illegal counts to the nearest legal', () => {
    const book = newBook(PICTURE_BOOK, { now: 1 });
    expect(applyPageCount(book, PICTURE_BOOK, 30, 2).pageCount).toBe(32);
  });
});

describe('applyConstruction — self-ended ↔ plus-endpapers at 32pp', () => {
  it('renumbers 26 ↔ 29 without losing content', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 }); // self-ended, 26
    for (let i = 0; i < 26; i++) {
      book = withStoryPage(book, i, (p) => ({ ...p, text: `page ${i}` }), 2);
    }
    const plus = applyConstruction(book, PICTURE_BOOK, 'hardcover-plusEndpapers', 3);
    expect(plus.storyPages).toHaveLength(29);
    expect(plus.storyPages[0].text).toBe('page 0');
    expect(plus.storyPages[25].text).toBe('page 25');
    expect(plus.storyPages[26].text).toBe('');

    // Fill the three new pages, then switch back: they must go to overflow.
    let full = plus;
    for (const i of [26, 27, 28]) {
      full = withStoryPage(full, i, (p) => ({ ...p, text: `page ${i}` }), 4);
    }
    const back = applyConstruction(full, PICTURE_BOOK, 'hardcover-selfEnded', 5);
    expect(back.storyPages).toHaveLength(26);
    expect(back.overflow.map((p) => p.text)).toEqual([
      'page 26',
      'page 27',
      'page 28',
    ]);
  });
});

describe('applyFormat', () => {
  it('snaps trim, page count, and binding to the new preset', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 }); // 10×10, 32pp
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'hello' }), 2);
    const board = applyFormat(book, BOARD_BOOK, 3);
    expect(board.formatId).toBe('board-book');
    expect(board.trim).toEqual(BOARD_BOOK.trim); // 10×10 is off the board menu
    expect(board.pageCount).toBe(24); // nearest legal to 32
    expect(board.binding).toBe('board');
    expect(board.storyPages[0].text).toBe('hello');
  });
});

describe('validateBook', () => {
  it('returns null for garbage', () => {
    expect(validateBook(null)).toBeNull();
    expect(validateBook({})).toBeNull();
    expect(validateBook('book')).toBeNull();
  });

  it('snaps illegal persisted page counts and coerces bad fields', () => {
    const book = newBook(PICTURE_BOOK, { now: 1 });
    const tampered = JSON.parse(JSON.stringify(book));
    tampered.pageCount = 14;
    tampered.storyPages[0].placement = 'sideways';
    tampered.storyPages[0].layout.typeStep = 9;
    const validated = validateBook(tampered);
    expect(validated).not.toBeNull();
    expect(validated?.pageCount).toBe(24); // nearest legal picture-book count to 14
    expect(validated?.storyPages[0].placement).toBe('text-only');
    expect(validated?.storyPages[0].layout.typeStep).toBe(0);
  });

  it('round-trips a healthy book through JSON unchanged where it matters', () => {
    let book = newBook(EARLY_READER, { title: 'Frog Days', now: 1 });
    book = withStoryPage(book, 3, (p) => ({ ...p, text: 'Chapter one.' }), 2);
    const validated = validateBook(JSON.parse(JSON.stringify(book)));
    expect(validated?.title).toBe('Frog Days');
    expect(validated?.readerLevel).toBe(1);
    expect(validated?.storyPages[3].text).toBe('Chapter one.');
    expect(validated?.storyPages).toHaveLength(30);
  });
});

describe('emptyPage layout defaults', () => {
  it('centers picture/board pages, top-lefts early readers', () => {
    expect(emptyPage('picture-book').layout.position).toEqual({
      v: 'middle',
      h: 'center',
    });
    expect(emptyPage('early-reader').layout.position).toEqual({
      v: 'top',
      h: 'left',
    });
  });
});

describe('chapters (early reader)', () => {
  it('sets, renames, and removes a chapter at an ordinal', async () => {
    const { setChapterAt, chapterAt } = await import('../../src/drafting/model.js');
    let book = newBook(EARLY_READER, { now: 1 });
    book = setChapterAt(book, 0, 'The Wall', 2);
    book = setChapterAt(book, 4, 'The Gap', 3);
    expect(book.chapters?.map((c) => c.title)).toEqual(['The Wall', 'The Gap']);
    expect(chapterAt(book, 4)?.title).toBe('The Gap');
    const renamed = setChapterAt(book, 0, 'The Ivy Wall', 4);
    expect(chapterAt(renamed, 0)?.title).toBe('The Ivy Wall');
    expect(chapterAt(renamed, 0)?.id).toBe(chapterAt(book, 0)?.id);
    const removed = setChapterAt(renamed, 4, null, 5);
    expect(removed.chapters?.map((c) => c.title)).toEqual(['The Ivy Wall']);
  });
});
