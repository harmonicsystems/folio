/**
 * Legacy-import mapping + index resilience. localStorage is stubbed — these
 * tests run in node. The invariant that main-branch keys are never written is
 * asserted directly on the stub.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOOK_KEY_PREFIX,
  buildLegacyImport,
  loadLibraryIndex,
} from '../../src/drafting/persistence.js';
import { newBook } from '../../src/drafting/model.js';
import { PICTURE_BOOK } from '../../src/drafting/formats.js';

class StorageStub {
  private map = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  get length(): number {
    return this.map.size;
  }
}

let stub: StorageStub;

beforeEach(() => {
  stub = new StorageStub();
  (globalThis as { localStorage?: unknown }).localStorage = stub;
});

function legacyDraft(overrides: Record<string, unknown> = {}) {
  const spreads = Array.from({ length: 16 }, () => ({
    leftPage: { text: '', placement: 'text-only' },
    rightPage: { text: '', placement: 'text-only' },
  }));
  return { version: 2, ageBand: 'picture', trimKey: 'SQUARE', spreads, ...overrides };
}

describe('buildLegacyImport', () => {
  it('returns null when no legacy draft exists', () => {
    expect(buildLegacyImport(1)).toBeNull();
  });

  it('returns null for an empty draft', () => {
    stub.setItem('folio.draft.v2', JSON.stringify(legacyDraft()));
    stub.writes = [];
    expect(buildLegacyImport(1)).toBeNull();
  });

  it('maps position-preservingly into a 32pp plus-endpapers picture book', () => {
    const draft = legacyDraft();
    // spread 1 left → page 1 (half title); spread 2 right → page 4 (story ordinal 0)
    draft.spreads[0].leftPage.text = 'The Moon Garden';
    draft.spreads[1].rightPage.text = 'Once there was a wall of ivy.';
    draft.spreads[2].leftPage = { text: '', placement: 'illustration-only' };
    stub.setItem('folio.draft.v2', JSON.stringify(draft));

    const book = buildLegacyImport(1);
    expect(book).not.toBeNull();
    expect(book?.formatId).toBe('picture-book');
    expect(book?.binding).toBe('hardcover-plusEndpapers');
    expect(book?.pageCount).toBe(32);
    expect(book?.trim).toEqual({
      width: 9,
      height: 9,
      units: 'in',
      orientation: 'square',
    });
    expect(book?.title).toBe('Imported draft');
    expect(book?.frontMatter['half-title']?.text).toBe('The Moon Garden');
    // page 4 = story ordinal 0
    expect(book?.storyPages[0].text).toBe('Once there was a wall of ivy.');
    // spread 3 left = page 5 = story ordinal 1, illustration-only → placeholder
    expect(book?.storyPages[1].placement).toBe('illustration-only');
    expect(book?.storyPages[1].placeholders[0]?.kind).toBe('full-page');
  });

  it('falls back to the v1 draft and never writes legacy keys', () => {
    const draft = legacyDraft({ version: 1, trimKey: 'STANDARD_PORTRAIT' });
    draft.spreads[3].leftPage.text = 'hello';
    stub.setItem('folio.draft.v1', JSON.stringify(draft));
    stub.writes = [];

    const book = buildLegacyImport(1);
    expect(book?.trim.width).toBe(8);
    expect(book?.trim.height).toBe(10);
    expect(
      stub.writes.filter((k) => k.startsWith('folio.draft.')),
    ).toHaveLength(0);
  });
});

describe('loadLibraryIndex resilience', () => {
  it('rebuilds the index from per-book records when missing', () => {
    const book = newBook(PICTURE_BOOK, { title: 'Rebuilt', now: 5 });
    stub.setItem(
      `${BOOK_KEY_PREFIX}${book.id}`,
      JSON.stringify({ version: 1, book, savedAt: 5 }),
    );
    const index = loadLibraryIndex();
    expect(index.books).toHaveLength(1);
    expect(index.books[0].title).toBe('Rebuilt');
    expect(index.books[0].id).toBe(book.id);
  });

  it('returns an empty library when nothing is stored', () => {
    const index = loadLibraryIndex();
    expect(index.books).toEqual([]);
    expect(index.activeBookId).toBeNull();
  });
});
