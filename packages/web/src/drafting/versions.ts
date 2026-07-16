/**
 * Versions v1 — snapshot history per book (git's principles without git's
 * machinery): immutable full-book checkpoints, automatic before every
 * destructive structural change, manual with a name, and restores that never
 * destroy (restoring snapshots the current state first).
 *
 * Storage: one key per book (`folio.drafting.versions.v1.<bookId>`), newest
 * first. Books are plain text — a full snapshot is a few KB — so history is
 * cheap. Pruning keeps every NAMED version and the newest UNNAMED_CAP
 * automatic ones; on quota pressure the unnamed tail is sacrificed first
 * (a snapshot must never block the save of the live book).
 */

import type { DraftBook } from './model.js';
import { newId, validateBook } from './model.js';
import { versionsKey } from './persistence.js';

export type SnapshotReason =
  | 'manual'
  | 'page-count change'
  | 'construction change'
  | 'format change'
  | 'before restore'
  | 'auto';

export interface VersionRecord {
  id: string;
  /** User-given name; named versions are never pruned automatically. */
  name?: string;
  reason: SnapshotReason;
  savedAt: number;
  wordCount: number;
  book: DraftBook;
}

const UNNAMED_CAP = 20;
const UNNAMED_CAP_TIGHT = 5;

function countWordsLocal(book: DraftBook): number {
  return book.storyPages.reduce(
    (sum, p) => sum + (p.text.match(/\S+/g)?.length ?? 0),
    0,
  );
}

export function listVersions(bookId: string): VersionRecord[] {
  try {
    const raw = localStorage.getItem(versionsKey(bookId));
    const parsed = raw ? (JSON.parse(raw) as VersionRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function prune(versions: VersionRecord[], unnamedCap: number): VersionRecord[] {
  const named = versions.filter((v) => v.name);
  const unnamed = versions.filter((v) => !v.name).slice(0, unnamedCap);
  return [...named, ...unnamed].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Checkpoint the book as it is right now (including unsaved keystrokes).
 * Returns false only when even the pruned write fails — never throws.
 */
export function saveSnapshot(
  book: DraftBook,
  reason: SnapshotReason,
  name?: string,
): boolean {
  const record: VersionRecord = {
    id: newId(),
    name: name?.trim() || undefined,
    reason,
    savedAt: Date.now(),
    wordCount: countWordsLocal(book),
    book,
  };
  const existing = listVersions(book.id);

  // Skip no-op auto checkpoints: identical content to the newest snapshot.
  if (
    reason !== 'manual' &&
    existing[0] &&
    JSON.stringify(existing[0].book) === JSON.stringify(book)
  ) {
    return true;
  }

  for (const cap of [UNNAMED_CAP, UNNAMED_CAP_TIGHT, 0]) {
    try {
      const next = prune([record, ...existing], cap);
      localStorage.setItem(versionsKey(book.id), JSON.stringify(next));
      return true;
    } catch {
      /* quota — try again with a tighter unnamed cap */
    }
  }
  return false;
}

export function deleteVersion(bookId: string, versionId: string): void {
  try {
    const next = listVersions(bookId).filter((v) => v.id !== versionId);
    localStorage.setItem(versionsKey(bookId), JSON.stringify(next));
  } catch {
    /* best-effort */
  }
}

/** A validated copy of a version's book, or null if the record is unusable. */
export function versionBook(
  bookId: string,
  versionId: string,
): DraftBook | null {
  const version = listVersions(bookId).find((v) => v.id === versionId);
  return version ? validateBook(version.book) : null;
}
