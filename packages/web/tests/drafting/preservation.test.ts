/**
 * Preservation guarantees: overflow positional fidelity, place-in-book,
 * versions (snapshot/prune/restore), backup round-trip, trash, and the
 * rebuilt-index import guard. localStorage is stubbed — node environment.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { EARLY_READER, PICTURE_BOOK } from '../../src/drafting/formats.js';
import {
  applyPageCount,
  chapterAt,
  isEmptyPage,
  newBook,
  placeOverflowPage,
  setChapterAt,
  validateBook,
  withStoryPage,
} from '../../src/drafting/model.js';
import {
  BOOK_KEY_PREFIX,
  BookStore,
  loadLibraryIndex,
  loadTrash,
} from '../../src/drafting/persistence.js';
import {
  listVersions,
  saveSnapshot,
  versionBook,
} from '../../src/drafting/versions.js';
import { buildBookBackup, importBackup } from '../../src/drafting/backup.js';

class StorageStub {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  get length() {
    return this.map.size;
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new StorageStub();
});

describe('overflow positional fidelity (chapters reattach)', () => {
  it('shrink-then-grow restores every page to its original ordinal', () => {
    let book = newBook(EARLY_READER, { pageCount: 48, now: 1 }); // budget 46
    book = withStoryPage(book, 10, (p) => ({ ...p, text: 'alpha' }), 2);
    book = withStoryPage(book, 40, (p) => ({ ...p, text: 'omega' }), 2);
    book = setChapterAt(book, 40, 'The End Begins', 2);

    const small = applyPageCount(book, EARLY_READER, 32, 3); // budget 30
    expect(small.storyPages[10].text).toBe('alpha');
    expect(small.storyPages.some((p) => p.text === 'omega')).toBe(false);

    const restored = applyPageCount(small, EARLY_READER, 48, 4);
    expect(restored.storyPages[40].text).toBe('omega'); // exact ordinal back
    expect(chapterAt(restored, 40)?.title).toBe('The End Begins'); // reattached
    expect(restored.overflow).toHaveLength(0);
  });

  it('placeOverflowPage moves a trayed page into the first empty slot', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 }); // budget 26
    book = withStoryPage(book, 25, (p) => ({ ...p, text: 'trailing' }), 2);
    const small = applyPageCount(book, PICTURE_BOOK, 24, 3); // budget 18
    const trayIndex = small.overflow.findIndex((p) => !isEmptyPage(p));
    expect(trayIndex).toBeGreaterThanOrEqual(0);

    const placed = placeOverflowPage(small, trayIndex, 4);
    expect(placed.storyPages[0].text).toBe('trailing');
    expect(placed.overflow.filter((p) => !isEmptyPage(p))).toHaveLength(0);
  });

  it('validateBook keeps chapters even off early-reader formats', () => {
    let book = newBook(EARLY_READER, { now: 1 });
    book = setChapterAt(book, 2, 'Kept', 2);
    const roundTripped = validateBook(
      JSON.parse(JSON.stringify({ ...book, formatId: 'picture-book' })),
    );
    expect(roundTripped?.chapters?.[0]?.title).toBe('Kept');
  });
});

describe('versions', () => {
  it('snapshots, prunes unnamed history, and never prunes named versions', () => {
    let book = newBook(PICTURE_BOOK, { title: 'V', now: 1 });
    saveSnapshot(book, 'manual', 'keep me');
    for (let i = 0; i < 30; i++) {
      book = withStoryPage(book, 0, (p) => ({ ...p, text: `draft ${i}` }), 2 + i);
      saveSnapshot(book, 'auto');
    }
    const versions = listVersions(book.id);
    expect(versions.filter((v) => !v.name).length).toBeLessThanOrEqual(20);
    expect(versions.some((v) => v.name === 'keep me')).toBe(true);
  });

  it('skips duplicate auto snapshots but honors manual ones', () => {
    const book = newBook(PICTURE_BOOK, { now: 1 });
    saveSnapshot(book, 'page-count change');
    saveSnapshot(book, 'page-count change');
    expect(listVersions(book.id)).toHaveLength(1);
    saveSnapshot(book, 'manual');
    expect(listVersions(book.id)).toHaveLength(2);
  });

  it('versionBook returns a validated copy for restore', () => {
    let book = newBook(PICTURE_BOOK, { now: 1 });
    book = withStoryPage(book, 0, (p) => ({ ...p, text: 'the old draft' }), 2);
    saveSnapshot(book, 'manual', 'v1');
    const id = listVersions(book.id)[0].id;
    expect(versionBook(book.id, id)?.storyPages[0].text).toBe('the old draft');
  });
});

describe('backup round-trip', () => {
  it('export → import restores the full record; collisions import as copies', () => {
    const store = new BookStore();
    const book = store.createBook(PICTURE_BOOK, { title: 'Original', now: 1 });
    saveSnapshot(book, 'manual', 'checkpoint');

    const backup = buildBookBackup(book.id);
    expect(backup?.record.book.title).toBe('Original');
    expect(backup?.versions).toHaveLength(1);

    // Import over an existing id → renamed copy, nothing clobbered.
    const summary = importBackup(backup);
    expect(summary.renamed).toHaveLength(1);
    const index = loadLibraryIndex();
    expect(index.books.some((b) => b.title === 'Original (imported)')).toBe(true);

    // Import into an empty library → same id, original title.
    (globalThis as { localStorage?: unknown }).localStorage = new StorageStub();
    const fresh = importBackup(backup);
    expect(fresh.imported).toEqual(['Original']);
    expect(fresh.renamed).toHaveLength(0);
  });

  it('rejects non-backup files', () => {
    expect(() => importBackup({ hello: 'world' })).toThrow();
  });
});

describe('trash + undo', () => {
  it('deleteBook soft-deletes; undoDelete restores record and index entry', () => {
    const store = new BookStore();
    const book = store.createBook(PICTURE_BOOK, { title: 'Oops', now: 1 });
    store.deleteBook(book.id);

    expect(localStorage.getItem(`${BOOK_KEY_PREFIX}${book.id}`)).toBeNull();
    expect(loadTrash().items).toHaveLength(1);
    expect(store.getSnapshot().lastDeleted?.title).toBe('Oops');

    expect(store.undoDelete(book.id)).toBe(true);
    expect(localStorage.getItem(`${BOOK_KEY_PREFIX}${book.id}`)).not.toBeNull();
    expect(loadTrash().items).toHaveLength(0);
    expect(
      store.getSnapshot().library.books.some((b) => b.title === 'Oops'),
    ).toBe(true);
  });
});

describe('rebuilt index cannot re-trigger the legacy import', () => {
  it('sets importedLegacyAt when book records exist', () => {
    const store = new BookStore();
    store.createBook(PICTURE_BOOK, { title: 'Existing', now: 1 });
    localStorage.removeItem('folio.drafting.library.v1');
    const rebuilt = loadLibraryIndex();
    expect(rebuilt.books).toHaveLength(1);
    expect(rebuilt.importedLegacyAt).toBeDefined();
  });
});
