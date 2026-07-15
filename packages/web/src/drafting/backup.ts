/**
 * Full-fidelity backup for a local-first app whose only copy of every book
 * lives in this browser's localStorage. Unlike the submission .docx and the
 * illustration list (lossy, one-way deliverables), the backup file carries
 * the complete book records — layouts, placeholders, front matter, chapters,
 * fonts, overflow, and version history — and imports back losslessly.
 */

import { countWords } from './counts.js';
import type { DraftBook } from './model.js';
import { newId, validateBook } from './model.js';
import {
  BOOK_KEY_PREFIX,
  LIBRARY_KEY,
  bookKey,
  loadBookRecord,
  loadLibraryIndex,
  versionsKey,
  type SavedBookV1,
} from './persistence.js';
import { listVersions, type VersionRecord } from './versions.js';

export interface BookBackupV1 {
  kind: 'folio-drafting-book';
  version: 1;
  exportedAt: number;
  record: SavedBookV1;
  versions: VersionRecord[];
}

export interface LibraryBackupV1 {
  kind: 'folio-drafting-library';
  version: 1;
  exportedAt: number;
  books: Array<{ record: SavedBookV1; versions: VersionRecord[] }>;
}

export function buildBookBackup(bookId: string): BookBackupV1 | null {
  const record = loadBookRecord(bookId);
  if (!record) return null;
  return {
    kind: 'folio-drafting-book',
    version: 1,
    exportedAt: Date.now(),
    record,
    versions: listVersions(bookId),
  };
}

export function buildLibraryBackup(): LibraryBackupV1 {
  const books: LibraryBackupV1['books'] = [];
  for (const entry of loadLibraryIndex().books) {
    const record = loadBookRecord(entry.id);
    if (record) books.push({ record, versions: listVersions(entry.id) });
  }
  return { kind: 'folio-drafting-library', version: 1, exportedAt: Date.now(), books };
}

function slug(text: string): string {
  return (
    text.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'book'
  );
}

export function backupFileName(scope: 'library' | DraftBook): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return scope === 'library'
    ? `folio-library-backup-${stamp}.json`
    : `${slug(scope.title)}-backup-${stamp}.json`;
}

export function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportSummary {
  imported: string[];
  renamed: string[];
  skipped: number;
}

function importOne(
  record: SavedBookV1,
  versions: VersionRecord[],
  summary: ImportSummary,
): void {
  let book = validateBook(record.book);
  if (!book) {
    summary.skipped += 1;
    return;
  }
  // Never clobber an existing book: an id collision imports as a copy.
  if (localStorage.getItem(bookKey(book.id)) !== null) {
    book = { ...book, id: newId(), title: `${book.title} (imported)` };
    summary.renamed.push(book.title);
  }
  const saved: SavedBookV1 = { version: 1, book, savedAt: Date.now() };
  localStorage.setItem(bookKey(book.id), JSON.stringify(saved));
  // The shelf reads the stored index — an imported record without an index
  // entry would be invisible until a rebuild.
  const index = loadLibraryIndex();
  const entry = {
    id: book.id,
    title: book.title,
    formatId: book.formatId,
    pageCount: book.pageCount,
    wordCount: book.storyPages.reduce((sum, p) => sum + countWords(p.text), 0),
    updatedAt: book.updatedAt,
  };
  try {
    localStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify({
        ...index,
        books: [entry, ...index.books.filter((b) => b.id !== book.id)],
      }),
    );
  } catch {
    /* the index rebuilds from records if this write fails */
  }
  if (versions.length > 0) {
    try {
      localStorage.setItem(
        versionsKey(book.id),
        JSON.stringify(versions.slice(0, 30)),
      );
    } catch {
      /* history is best-effort on import; the book itself landed */
    }
  }
  summary.imported.push(book.title);
}

/**
 * Import a backup file's parsed JSON (book or whole library). Every book is
 * validated through the normal load guard; malformed entries are skipped,
 * never partially written. Throws only on unrecognizable files.
 */
export function importBackup(data: unknown): ImportSummary {
  const summary: ImportSummary = { imported: [], renamed: [], skipped: 0 };
  const d = data as {
    kind?: string;
    record?: SavedBookV1;
    versions?: VersionRecord[];
    books?: Array<{ record?: SavedBookV1; versions?: VersionRecord[] }>;
  } | null;
  if (d?.kind === 'folio-drafting-book' && d.record) {
    importOne(d.record, Array.isArray(d.versions) ? d.versions : [], summary);
    return summary;
  }
  if (d?.kind === 'folio-drafting-library' && Array.isArray(d.books)) {
    for (const item of d.books) {
      if (item?.record) {
        importOne(
          item.record,
          Array.isArray(item.versions) ? item.versions : [],
          summary,
        );
      } else {
        summary.skipped += 1;
      }
    }
    return summary;
  }
  throw new Error('Not a Folio backup file');
}

/** True if any drafting book keys exist (used to sanity-check environments). */
export function hasAnyBooks(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i)?.startsWith(BOOK_KEY_PREFIX)) return true;
  }
  return false;
}
