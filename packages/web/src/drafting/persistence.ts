/**
 * localStorage persistence for the drafting library (ADR 0016 §4).
 *
 * Keys live under the `folio.drafting.*` namespace — one record per book so
 * writes stay small and quota failures are isolated. The main branch's
 * `folio.draft.v2`/`v1` keys are read exactly once (non-destructive import)
 * and NEVER written; version numbers 3/4 and the `folio.draft` prefix are
 * avoided deliberately (used by the unmerged codex/reflection-ui branch).
 *
 * Save failures surface visibly ("not saved — browser storage unavailable")
 * rather than letting a stale saved-time imply the draft is safe — the same
 * bar the existing editor sets.
 */

import type { BookFormat, Trim } from './formats.js';
import { FORMATS, findConstruction } from './formats.js';
import type { DraftBook, DraftPageContent, PagePlacement } from './model.js';
import { emptyPage, newBook, validateBook } from './model.js';
import { buildPageMap } from './pageMap.js';
import { countWords } from './counts.js';

export const LIBRARY_KEY = 'folio.drafting.library.v1';
export const BOOK_KEY_PREFIX = 'folio.drafting.book.v1.';
export const PREFS_KEY = 'folio.drafting.prefs.v1';
export const THEME_KEY = 'folio.drafting.theme';

/** Main-branch keys — READ ONLY, for the one-time import. */
const LEGACY_DRAFT_V2 = 'folio.draft.v2';
const LEGACY_DRAFT_V1 = 'folio.draft.v1';

export function bookKey(id: string): string {
  return `${BOOK_KEY_PREFIX}${id}`;
}

export interface LibraryEntry {
  id: string;
  title: string;
  formatId: string;
  pageCount: number;
  wordCount: number;
  updatedAt: number;
}

export interface LibraryIndexV1 {
  version: 1;
  activeBookId: string | null;
  books: LibraryEntry[];
  importedLegacyAt?: number;
}

export interface SavedBookV1 {
  version: 1;
  book: DraftBook;
  savedAt: number;
}

export interface DraftingPrefs {
  version: 1;
  showSafeArea?: boolean;
  /** Storyboard thumbnail width in px. */
  storyboardZoom?: number;
  /** Last-edited render-unit index, per book id — so view switches return you there. */
  lastUnit?: Record<string, number>;
}

/** Read the remembered spread for a book (undefined if never visited). */
export function lastUnitFor(bookId: string): number | undefined {
  return loadPrefs().lastUnit?.[bookId];
}

/** Remember which spread a book was last on. */
export function rememberUnit(bookId: string, unitIndex: number): void {
  const prefs = loadPrefs();
  savePrefs({
    ...prefs,
    lastUnit: { ...prefs.lastUnit, [bookId]: unitIndex },
  });
}

function storageAvailable(): boolean {
  try {
    const probe = '__folio_drafting_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const emptyIndex = (): LibraryIndexV1 => ({
  version: 1,
  activeBookId: null,
  books: [],
});

export function loadLibraryIndex(): LibraryIndexV1 {
  const parsed = readJSON(LIBRARY_KEY) as LibraryIndexV1 | null;
  if (parsed?.version === 1 && Array.isArray(parsed.books)) return parsed;
  // Resilience: rebuild the index from per-book records if it went missing.
  const rebuilt = emptyIndex();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(BOOK_KEY_PREFIX)) continue;
      const record = readJSON(key) as SavedBookV1 | null;
      const book = record?.version === 1 ? validateBook(record.book) : null;
      if (book) rebuilt.books.push(libraryEntry(book));
    }
  } catch {
    /* private mode etc. — an empty library is the honest fallback */
  }
  rebuilt.books.sort((a, b) => b.updatedAt - a.updatedAt);
  return rebuilt;
}

function libraryEntry(book: DraftBook): LibraryEntry {
  return {
    id: book.id,
    title: book.title,
    formatId: book.formatId,
    pageCount: book.pageCount,
    wordCount: book.storyPages.reduce((sum, p) => sum + countWords(p.text), 0),
    updatedAt: book.updatedAt,
  };
}

export function loadBook(id: string): DraftBook | null {
  const record = readJSON(bookKey(id)) as SavedBookV1 | null;
  if (record?.version !== 1) return null;
  return validateBook(record.book);
}

export function loadPrefs(): DraftingPrefs {
  const parsed = readJSON(PREFS_KEY) as DraftingPrefs | null;
  if (parsed?.version === 1) return parsed;
  return { version: 1 };
}

export function savePrefs(prefs: DraftingPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* prefs are droppable */
  }
}

// ---- one-time legacy import -------------------------------------------------

interface LegacyPage {
  text?: unknown;
  placement?: unknown;
}
interface LegacySpread {
  leftPage?: LegacyPage;
  rightPage?: LegacyPage;
}
interface LegacyDraft {
  version?: unknown;
  ageBand?: unknown;
  trimKey?: unknown;
  spreads?: unknown;
}

const LEGACY_TRIMS: Record<string, Trim> = {
  STANDARD_PORTRAIT: { width: 8, height: 10, units: 'in', orientation: 'portrait' },
  STANDARD_LANDSCAPE: { width: 10, height: 8, units: 'in', orientation: 'landscape' },
  SQUARE: { width: 9, height: 9, units: 'in', orientation: 'square' },
};

const LEGACY_PLACEMENTS: readonly PagePlacement[] = [
  'text-only',
  'text-top',
  'text-bottom',
  'illustration-only',
];

function legacyPageContent(
  raw: LegacyPage | undefined,
  format: BookFormat,
): DraftPageContent {
  const page = emptyPage(format.id);
  if (!raw) return page;
  page.text = typeof raw.text === 'string' ? raw.text : '';
  if (LEGACY_PLACEMENTS.includes(raw.placement as PagePlacement)) {
    page.placement = raw.placement as PagePlacement;
  }
  if (page.placement === 'illustration-only') {
    page.placeholders = [
      { id: `imported-${Math.random().toString(36).slice(2, 10)}`, kind: 'full-page', note: '' },
    ];
  }
  return page;
}

/**
 * Build (but do not save) a DraftBook from the main branch's single draft:
 * a 32-page plus-endpapers picture book — all 32 pages usable, so nothing
 * truncates. Position-preserving: spread k's left/right pages land on
 * physical pages 2k−1/2k; text on pages 1–3 fills the front-matter slots.
 * Returns null when there is no legacy draft or it is empty.
 */
export function buildLegacyImport(now?: number): DraftBook | null {
  const raw = (readJSON(LEGACY_DRAFT_V2) ?? readJSON(LEGACY_DRAFT_V1)) as
    | LegacyDraft
    | null;
  if (!raw || !Array.isArray(raw.spreads)) return null;

  const spreads = raw.spreads as LegacySpread[];
  const format = FORMATS['picture-book'];
  const hasContent = spreads.some((s) =>
    [s?.leftPage, s?.rightPage].some(
      (p) =>
        (typeof p?.text === 'string' && p.text.trim().length > 0) ||
        p?.placement === 'illustration-only',
    ),
  );
  if (!hasContent) return null;

  const book = newBook(format, {
    title: 'Imported draft',
    binding: 'hardcover-plusEndpapers',
    pageCount: 32,
    trim:
      LEGACY_TRIMS[typeof raw.trimKey === 'string' ? raw.trimKey : ''] ??
      format.trim,
    now,
  });

  const map = buildPageMap(32, findConstruction(format, book.binding));
  for (let pageNumber = 1; pageNumber <= 32; pageNumber++) {
    const spread = spreads[Math.ceil(pageNumber / 2) - 1];
    if (!spread) continue;
    const source = pageNumber % 2 === 1 ? spread.leftPage : spread.rightPage;
    const content = legacyPageContent(source, format);
    const slot = map.pages[pageNumber - 1];
    if (slot.role === 'story' && slot.storyOrdinal !== undefined) {
      book.storyPages[slot.storyOrdinal] = content;
    } else if (slot.role !== 'self-end') {
      if (content.text || content.placeholders.length > 0) {
        book.frontMatter[slot.role as 'half-title' | 'title' | 'copyright'] =
          content;
      }
    }
  }
  return book;
}

// ---- the store ---------------------------------------------------------------

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'unavailable';

export interface StoreSnapshot {
  library: LibraryIndexV1;
  activeBook: DraftBook | null;
  saveState: SaveState;
  lastSavedAt: number | null;
  /** True after another tab writes our keys — banner-worthy, last write wins. */
  externalChange: boolean;
}

type Listener = () => void;

const SAVE_DEBOUNCE_MS = 750;
const SAVE_MAX_WAIT_MS = 5000;

/**
 * Single mutable store behind `useSyncExternalStore`. Components never touch
 * localStorage directly; every mutation flows through here and autosaves
 * (debounced 750 ms, max-wait 5 s, flushed on tab hide).
 */
export class BookStore {
  private snapshot: StoreSnapshot;
  private listeners = new Set<Listener>();
  private available: boolean;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor() {
    this.available = typeof localStorage !== 'undefined' && storageAvailable();
    let library = this.available ? loadLibraryIndex() : emptyIndex();

    if (this.available && library.importedLegacyAt === undefined) {
      const imported = buildLegacyImport();
      library = { ...library, importedLegacyAt: Date.now() };
      if (imported) {
        this.writeBookRecord(imported);
        library.books = [libraryEntry(imported), ...library.books];
      }
      this.writeIndex(library);
    }

    this.snapshot = {
      library,
      activeBook: null,
      saveState: this.available ? 'idle' : 'unavailable',
      lastSavedAt: null,
      externalChange: false,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorage);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
      window.addEventListener('pagehide', () => this.flush());
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => this.snapshot;

  private emit(next: Partial<StoreSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const l of this.listeners) l();
  }

  private onStorage = (e: StorageEvent): void => {
    if (!e.key) return;
    if (e.key === LIBRARY_KEY || e.key.startsWith(BOOK_KEY_PREFIX)) {
      this.emit({ library: loadLibraryIndex(), externalChange: true });
    }
  };

  dismissExternalChange(): void {
    this.emit({ externalChange: false });
  }

  // -- library actions --

  createBook(format: BookFormat, opts: Parameters<typeof newBook>[1]): DraftBook {
    const book = newBook(format, opts);
    this.emit({ activeBook: book });
    this.persistNow(book);
    return book;
  }

  openBook(id: string): DraftBook | null {
    this.flush();
    const book = this.available ? loadBook(id) : null;
    if (book) {
      const library = {
        ...this.snapshot.library,
        activeBookId: id,
      };
      this.writeIndex(library);
      this.emit({ activeBook: book, library });
    }
    return book;
  }

  closeBook(): void {
    this.flush();
    this.emit({ activeBook: null });
  }

  deleteBook(id: string): void {
    try {
      localStorage.removeItem(bookKey(id));
    } catch {
      /* removal failing is non-fatal */
    }
    const library: LibraryIndexV1 = {
      ...this.snapshot.library,
      books: this.snapshot.library.books.filter((b) => b.id !== id),
      activeBookId:
        this.snapshot.library.activeBookId === id
          ? null
          : this.snapshot.library.activeBookId,
    };
    this.writeIndex(library);
    this.emit({
      library,
      activeBook:
        this.snapshot.activeBook?.id === id ? null : this.snapshot.activeBook,
    });
  }

  /** Apply a pure update to the active book and schedule an autosave. */
  updateBook(update: (book: DraftBook) => DraftBook): void {
    const current = this.snapshot.activeBook;
    if (!current) return;
    const next = update(current);
    if (next === current) return;
    this.emit({ activeBook: next });
    this.scheduleSave();
  }

  // -- persistence internals --

  private scheduleSave(): void {
    this.dirty = true;
    if (!this.available) {
      this.emit({ saveState: 'unavailable' });
      return;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => this.flush(), SAVE_MAX_WAIT_MS);
    }
  }

  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    if (!this.dirty) return;
    const book = this.snapshot.activeBook;
    if (!book) {
      this.dirty = false;
      return;
    }
    this.persistNow(book);
  }

  private persistNow(book: DraftBook): void {
    this.dirty = false;
    if (!this.available) {
      this.emit({ saveState: 'unavailable' });
      return;
    }
    try {
      this.writeBookRecordOrThrow(book);
      const entry = libraryEntry(book);
      const books = [
        entry,
        ...this.snapshot.library.books.filter((b) => b.id !== book.id),
      ];
      const library: LibraryIndexV1 = {
        ...this.snapshot.library,
        activeBookId: book.id,
        books,
      };
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      this.emit({ library, saveState: 'saved', lastSavedAt: Date.now() });
    } catch {
      // QuotaExceededError, private-mode restrictions. The in-memory book
      // still works — say so instead of implying the draft is safe.
      this.emit({ saveState: 'error' });
    }
  }

  private writeBookRecordOrThrow(book: DraftBook): void {
    const record: SavedBookV1 = { version: 1, book, savedAt: Date.now() };
    localStorage.setItem(bookKey(book.id), JSON.stringify(record));
  }

  private writeBookRecord(book: DraftBook): void {
    try {
      this.writeBookRecordOrThrow(book);
    } catch {
      /* import is best-effort */
    }
  }

  private writeIndex(library: LibraryIndexV1): void {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    } catch {
      /* index rebuilds from book records if lost */
    }
  }
}
