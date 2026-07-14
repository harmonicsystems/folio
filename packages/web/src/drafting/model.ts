/**
 * The drafting document model: a `DraftBook` plus pure operations over it.
 *
 * Story content is keyed by story ordinal and front matter by role — never by
 * physical page number. `buildPageMap` binds ordinal → page at render time, so
 * page-count and construction changes are non-destructive renumberings; pages
 * that no longer fit go to a visible `overflow` tray, never deleted
 * (ADR 0016 §3).
 *
 * All operations are `(book, …) → book` and never mutate their input.
 */

import type {
  BindingId,
  BookFormat,
  FormatId,
  FrontMatterRole,
  Trim,
} from './formats.js';
import { findConstruction, getFormat, sameTrim } from './formats.js';
import { buildPageMap, isLegalPageCount, nearestLegalPageCount } from './pageMap.js';

/**
 * Deliberate structural duplicate of `src/types.ts` PagePlacement values —
 * the drafting layer may not import that module (it type-imports the engine),
 * but the persisted strings must stay legible to main-branch semantics.
 */
export type PagePlacement =
  | 'text-only'
  | 'text-top'
  | 'text-bottom'
  | 'illustration-only';

const PLACEMENTS: readonly PagePlacement[] = [
  'text-only',
  'text-top',
  'text-bottom',
  'illustration-only',
];

export interface TextLayout {
  position: {
    v: 'top' | 'middle' | 'bottom';
    h: 'left' | 'center' | 'right';
  };
  align: 'left' | 'center' | 'right';
  /** fontPt = round(defaultFontPt * 1.2^step), clamped ≥ minFontPt. */
  typeStep: -1 | 0 | 1 | 2;
}

export type PlaceholderKind =
  | 'spread-bleed'
  | 'full-page'
  | 'half-page-top'
  | 'half-page-bottom'
  | 'spot';

export interface IllustrationPlaceholder {
  id: string;
  kind: PlaceholderKind;
  /** The illustration note — feeds the illustration list and the quarantine file. */
  note: string;
}

/**
 * Persisted page shape — a structural superset of SavedDraft v2's page
 * (`{text, placement}`; `placement` is re-derived on save so main-branch
 * semantics hold) plus additive drafting fields.
 */
export interface DraftPageContent {
  text: string;
  placement: PagePlacement;
  layout: TextLayout;
  placeholders: IllustrationPlaceholder[];
}

/** Named text division for early readers; starts at a story ordinal. */
export interface Chapter {
  id: string;
  title: string;
  startOrdinal: number;
}

export interface DraftBook {
  id: string;
  title: string;
  formatId: FormatId;
  /** Stored literally — imported legacy trims may be off the preset menu. */
  trim: Trim;
  pageCount: number;
  binding: BindingId;
  readerLevel?: 1 | 2 | 3;
  /** Contact is a freeform multiline block; both feed submission page 1. */
  author?: { name: string; contact?: string };
  submission?: { includePageMarkers: boolean };
  frontMatter: Partial<Record<FrontMatterRole, DraftPageContent>>;
  /** Ordinal order; length ≤ the page map's storyBudget. */
  storyPages: DraftPageContent[];
  /** Unplaced pages after a shrink — never silently deleted. */
  overflow: DraftPageContent[];
  chapters?: Chapter[];
  createdAt: number;
  updatedAt: number;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultLayout(formatId: FormatId): TextLayout {
  if (formatId === 'early-reader') {
    return { position: { v: 'top', h: 'left' }, align: 'left', typeStep: 0 };
  }
  return { position: { v: 'middle', h: 'center' }, align: 'center', typeStep: 0 };
}

export function emptyPage(formatId: FormatId): DraftPageContent {
  return {
    text: '',
    placement: 'text-only',
    layout: defaultLayout(formatId),
    placeholders: [],
  };
}

export function isEmptyPage(page: DraftPageContent): boolean {
  return page.text.length === 0 && page.placeholders.length === 0;
}

export interface NewBookOptions {
  title?: string;
  trim?: Trim;
  pageCount?: number;
  binding?: BindingId;
  readerLevel?: 1 | 2 | 3;
  now?: number;
}

export function newBook(format: BookFormat, opts: NewBookOptions = {}): DraftBook {
  const binding = opts.binding ?? format.construction.binding;
  const pageCount =
    opts.pageCount !== undefined && isLegalPageCount(format, opts.pageCount)
      ? opts.pageCount
      : format.defaultPageCount;
  const map = buildPageMap(pageCount, findConstruction(format, binding));
  const now = opts.now ?? Date.now();
  const book: DraftBook = {
    id: newId(),
    title: opts.title?.trim() || 'Untitled book',
    formatId: format.id,
    trim: opts.trim ?? format.trim,
    pageCount,
    binding,
    frontMatter: {},
    storyPages: Array.from({ length: map.storyBudget }, () =>
      emptyPage(format.id),
    ),
    overflow: [],
    createdAt: now,
    updatedAt: now,
  };
  if (format.levels) book.readerLevel = opts.readerLevel ?? 1;
  if (format.supportsChapters) book.chapters = [];
  return book;
}

/** The content for a story ordinal, materializing an empty page if unset. */
export function getStoryPage(book: DraftBook, ordinal: number): DraftPageContent {
  return book.storyPages[ordinal] ?? emptyPage(book.formatId);
}

export function getFrontMatterPage(
  book: DraftBook,
  role: FrontMatterRole,
): DraftPageContent {
  return book.frontMatter[role] ?? emptyPage(book.formatId);
}

function touched(book: DraftBook, now?: number): DraftBook {
  return { ...book, updatedAt: now ?? Date.now() };
}

export function withStoryPage(
  book: DraftBook,
  ordinal: number,
  update: (page: DraftPageContent) => DraftPageContent,
  now?: number,
): DraftBook {
  const storyPages = book.storyPages.slice();
  while (storyPages.length <= ordinal) storyPages.push(emptyPage(book.formatId));
  storyPages[ordinal] = update(storyPages[ordinal]);
  return touched({ ...book, storyPages }, now);
}

export function withFrontMatterPage(
  book: DraftBook,
  role: FrontMatterRole,
  update: (page: DraftPageContent) => DraftPageContent,
  now?: number,
): DraftBook {
  const current = getFrontMatterPage(book, role);
  return touched(
    { ...book, frontMatter: { ...book.frontMatter, [role]: update(current) } },
    now,
  );
}

export interface SplitResult {
  book: DraftBook;
  /** Where the caret should land (ordinal of the page now holding the remainder). */
  focusOrdinal: number;
  /** True when the remainder had to go to the overflow tray. */
  movedToOverflow: boolean;
}

/**
 * The explicit page break: text after `offset` leaves this page and is
 * prepended to the next story page (no cascade beyond that page). On the last
 * budgeted page the remainder goes to `overflow`. An empty remainder is a
 * no-op that just advances focus.
 */
export function splitStoryPageAt(
  book: DraftBook,
  storyBudget: number,
  ordinal: number,
  offset: number,
  now?: number,
): SplitResult {
  const page = getStoryPage(book, ordinal);
  const keep = page.text.slice(0, offset);
  const remainder = page.text.slice(offset);

  if (remainder.length === 0) {
    const next = Math.min(ordinal + 1, storyBudget - 1);
    return { book, focusOrdinal: next, movedToOverflow: false };
  }

  let out = withStoryPage(
    book,
    ordinal,
    (p) => ({ ...p, text: keep.replace(/\n$/, '') }),
    now,
  );

  if (ordinal >= storyBudget - 1) {
    const overflowPage: DraftPageContent = {
      ...emptyPage(book.formatId),
      text: remainder.replace(/^\n/, ''),
    };
    out = touched({ ...out, overflow: [overflowPage, ...out.overflow] }, now);
    return { book: out, focusOrdinal: ordinal, movedToOverflow: true };
  }

  const incoming = remainder.replace(/^\n/, '');
  out = withStoryPage(
    out,
    ordinal + 1,
    (p) => ({
      ...p,
      text: [incoming, p.text].filter((s) => s.length > 0).join('\n'),
    }),
    now,
  );
  return { book: out, focusOrdinal: ordinal + 1, movedToOverflow: false };
}

/**
 * Break deletion: the next story page's text joins this one, its placeholders
 * move here, and later pages shift up one ordinal (the freed slot at the end
 * of the budget becomes empty).
 */
export function mergeWithNext(
  book: DraftBook,
  ordinal: number,
  now?: number,
): DraftBook {
  if (ordinal < 0 || ordinal >= book.storyPages.length - 1) return book;
  const current = book.storyPages[ordinal];
  const next = book.storyPages[ordinal + 1];
  const merged: DraftPageContent = {
    ...current,
    text: [current.text, next.text].filter((s) => s.length > 0).join('\n'),
    placeholders: [...current.placeholders, ...next.placeholders],
  };
  const storyPages = [
    ...book.storyPages.slice(0, ordinal),
    merged,
    ...book.storyPages.slice(ordinal + 2),
    emptyPage(book.formatId),
  ];
  return touched({ ...book, storyPages }, now);
}

/** Reconcile storyPages length against a (possibly new) budget. */
function reconcileBudget(
  book: DraftBook,
  budget: number,
  now?: number,
): DraftBook {
  let storyPages = book.storyPages.slice();
  let overflow = book.overflow.slice();

  if (storyPages.length > budget) {
    // Trailing non-empty pages queue in overflow, in order; empties drop.
    const excess = storyPages.slice(budget).filter((p) => !isEmptyPage(p));
    storyPages = storyPages.slice(0, budget);
    overflow = [...excess, ...overflow];
  }

  while (storyPages.length < budget) {
    const next = overflow.shift();
    storyPages.push(next ?? emptyPage(book.formatId));
  }

  return touched({ ...book, storyPages, overflow }, now);
}

export function applyPageCount(
  book: DraftBook,
  format: BookFormat,
  pageCount: number,
  now?: number,
): DraftBook {
  const legal = isLegalPageCount(format, pageCount)
    ? pageCount
    : nearestLegalPageCount(format, pageCount);
  const map = buildPageMap(legal, findConstruction(format, book.binding));
  return reconcileBudget({ ...book, pageCount: legal }, map.storyBudget, now);
}

export function applyConstruction(
  book: DraftBook,
  format: BookFormat,
  binding: BindingId,
  now?: number,
): DraftBook {
  const construction = findConstruction(format, binding);
  const map = buildPageMap(book.pageCount, construction);
  // Front matter keyed by role carries over automatically; roles absent from
  // the new construction stay in the data, just unrendered by the page map.
  return reconcileBudget(
    { ...book, binding: construction.binding },
    map.storyBudget,
    now,
  );
}

export function applyFormat(
  book: DraftBook,
  next: BookFormat,
  now?: number,
): DraftBook {
  const trim = next.trimOptions.some((t) => sameTrim(t, book.trim))
    ? book.trim
    : next.trim;
  const pageCount = isLegalPageCount(next, book.pageCount)
    ? book.pageCount
    : nearestLegalPageCount(next, book.pageCount);
  const construction = findConstruction(next, book.binding);
  const map = buildPageMap(pageCount, construction);
  const out: DraftBook = {
    ...book,
    formatId: next.id,
    trim,
    pageCount,
    binding: construction.binding,
    readerLevel: next.levels ? (book.readerLevel ?? 1) : undefined,
    // Chapters are retained in data but only rendered where supported.
    chapters: book.chapters,
  };
  return reconcileBudget(out, map.storyBudget, now);
}

export function applyLevel(
  book: DraftBook,
  level: 1 | 2 | 3,
  now?: number,
): DraftBook {
  return touched({ ...book, readerLevel: level }, now);
}

// ---- page-level layout + placeholders -------------------------------------

export type PageTarget =
  | { kind: 'story'; ordinal: number }
  | { kind: 'front-matter'; role: FrontMatterRole };

export function withPage(
  book: DraftBook,
  target: PageTarget,
  update: (page: DraftPageContent) => DraftPageContent,
  now?: number,
): DraftBook {
  return target.kind === 'story'
    ? withStoryPage(book, target.ordinal, update, now)
    : withFrontMatterPage(book, target.role, update, now);
}

/**
 * Which vertical text positions a page's placeholder leaves open: a half-page
 * illustration owns its half, so the text block takes the other one. Full-page
 * and spread illustrations don't constrain — text over art is the norm.
 */
export function allowedVerticals(
  page: DraftPageContent,
): Array<TextLayout['position']['v']> {
  const kinds = page.placeholders.map((p) => p.kind);
  if (kinds.includes('half-page-top')) return ['bottom'];
  if (kinds.includes('half-page-bottom')) return ['top'];
  return ['top', 'middle', 'bottom'];
}

/**
 * Keep the persisted `placement` string meaningful to main-branch semantics,
 * derived from placeholders + layout (ADR 0016 §5 / flatten path).
 */
export function derivePlacement(page: DraftPageContent): PagePlacement {
  const kinds = page.placeholders.map((p) => p.kind);
  const fullArt = kinds.includes('full-page') || kinds.includes('spread-bleed');
  if (fullArt && page.text.length === 0) return 'illustration-only';
  if (kinds.includes('half-page-top')) return 'text-bottom';
  if (kinds.includes('half-page-bottom')) return 'text-top';
  if (page.layout.position.v === 'top') return 'text-top';
  if (page.layout.position.v === 'bottom') return 'text-bottom';
  return 'text-only';
}

/** Clamp layout to what placeholders allow, then refresh placement. */
export function normalizePage(page: DraftPageContent): DraftPageContent {
  const verticals = allowedVerticals(page);
  const v = verticals.includes(page.layout.position.v)
    ? page.layout.position.v
    : verticals[0];
  const normalized =
    v === page.layout.position.v
      ? page
      : { ...page, layout: { ...page.layout, position: { ...page.layout.position, v } } };
  const placement = derivePlacement(normalized);
  return placement === normalized.placement
    ? normalized
    : { ...normalized, placement };
}

export function setPageLayout(
  book: DraftBook,
  target: PageTarget,
  patch: Omit<Partial<TextLayout>, 'position'> & {
    position?: Partial<TextLayout['position']>;
  },
  now?: number,
): DraftBook {
  return withPage(
    book,
    target,
    (page) =>
      normalizePage({
        ...page,
        layout: {
          align: patch.align ?? page.layout.align,
          typeStep: patch.typeStep ?? page.layout.typeStep,
          position: { ...page.layout.position, ...patch.position },
        },
      }),
    now,
  );
}

/**
 * Set (or clear, with null) the page's illustration space. One placeholder
 * per page — few and beautiful. The note survives a kind change.
 */
export function setPagePlaceholder(
  book: DraftBook,
  target: PageTarget,
  kind: PlaceholderKind | null,
  now?: number,
): DraftBook {
  return withPage(
    book,
    target,
    (page) => {
      const existing = page.placeholders[0];
      if (kind === null) return normalizePage({ ...page, placeholders: [] });
      if (existing?.kind === kind) return page;
      return normalizePage({
        ...page,
        placeholders: [
          { id: existing?.id ?? newId(), kind, note: existing?.note ?? '' },
        ],
      });
    },
    now,
  );
}

export function setPlaceholderNote(
  book: DraftBook,
  target: PageTarget,
  note: string,
  now?: number,
): DraftBook {
  return withPage(
    book,
    target,
    (page) =>
      page.placeholders.length === 0
        ? page
        : {
            ...page,
            placeholders: [{ ...page.placeholders[0], note }],
          },
    now,
  );
}

const LAYOUT_V = ['top', 'middle', 'bottom'] as const;
const LAYOUT_H = ['left', 'center', 'right'] as const;
const TYPE_STEPS = [-1, 0, 1, 2] as const;
const PLACEHOLDER_KINDS: readonly PlaceholderKind[] = [
  'spread-bleed',
  'full-page',
  'half-page-top',
  'half-page-bottom',
  'spot',
];

function validatePage(raw: unknown, formatId: FormatId): DraftPageContent {
  const base = emptyPage(formatId);
  if (typeof raw !== 'object' || raw === null) return base;
  const p = raw as Record<string, unknown>;
  const layoutRaw = (p.layout ?? {}) as Record<string, unknown>;
  const posRaw = (layoutRaw.position ?? {}) as Record<string, unknown>;
  return {
    text: typeof p.text === 'string' ? p.text : '',
    placement: PLACEMENTS.includes(p.placement as PagePlacement)
      ? (p.placement as PagePlacement)
      : base.placement,
    layout: {
      position: {
        v: LAYOUT_V.includes(posRaw.v as never)
          ? (posRaw.v as TextLayout['position']['v'])
          : base.layout.position.v,
        h: LAYOUT_H.includes(posRaw.h as never)
          ? (posRaw.h as TextLayout['position']['h'])
          : base.layout.position.h,
      },
      align: LAYOUT_H.includes(layoutRaw.align as never)
        ? (layoutRaw.align as TextLayout['align'])
        : base.layout.align,
      typeStep: TYPE_STEPS.includes(layoutRaw.typeStep as never)
        ? (layoutRaw.typeStep as TextLayout['typeStep'])
        : 0,
    },
    placeholders: Array.isArray(p.placeholders)
      ? p.placeholders
          .filter(
            (ph): ph is Record<string, unknown> =>
              typeof ph === 'object' && ph !== null,
          )
          .map((ph) => ({
            id: typeof ph.id === 'string' ? ph.id : newId(),
            kind: PLACEHOLDER_KINDS.includes(ph.kind as PlaceholderKind)
              ? (ph.kind as PlaceholderKind)
              : 'spot',
            note: typeof ph.note === 'string' ? ph.note : '',
          }))
      : [],
  };
}

/**
 * Load-time guard for persisted (possibly tampered or stale-schema) books:
 * snaps illegal page counts to the nearest legal, coerces placements and
 * layouts, and reconciles the story budget.
 */
export function validateBook(raw: unknown): DraftBook | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.id !== 'string' || typeof b.formatId !== 'string') return null;
  const format = getFormat(b.formatId);
  const binding = findConstruction(format, b.binding as never).binding;
  const pageCount = isLegalPageCount(format, b.pageCount as number)
    ? (b.pageCount as number)
    : nearestLegalPageCount(format, Number(b.pageCount) || 0);
  const trimRaw = b.trim as Record<string, unknown> | undefined;
  const trim: Trim =
    trimRaw &&
    typeof trimRaw.width === 'number' &&
    typeof trimRaw.height === 'number' &&
    trimRaw.width > 0 &&
    trimRaw.height > 0
      ? {
          width: trimRaw.width,
          height: trimRaw.height,
          units: 'in',
          orientation:
            trimRaw.orientation === 'landscape' ||
            trimRaw.orientation === 'square'
              ? (trimRaw.orientation as Trim['orientation'])
              : 'portrait',
        }
      : format.trim;

  const frontMatter: DraftBook['frontMatter'] = {};
  const fmRaw = (b.frontMatter ?? {}) as Record<string, unknown>;
  for (const role of ['half-title', 'title', 'copyright'] as const) {
    if (fmRaw[role] !== undefined) {
      frontMatter[role] = validatePage(fmRaw[role], format.id);
    }
  }

  const authorRaw = b.author as Record<string, unknown> | undefined;
  const levelRaw = b.readerLevel;
  const book: DraftBook = {
    id: b.id,
    title: typeof b.title === 'string' && b.title.trim() ? b.title : 'Untitled book',
    formatId: format.id,
    trim,
    pageCount,
    binding,
    readerLevel:
      format.levels && (levelRaw === 1 || levelRaw === 2 || levelRaw === 3)
        ? levelRaw
        : format.levels
          ? 1
          : undefined,
    author:
      authorRaw && typeof authorRaw.name === 'string'
        ? {
            name: authorRaw.name,
            contact:
              typeof authorRaw.contact === 'string'
                ? authorRaw.contact
                : undefined,
          }
        : undefined,
    submission:
      typeof (b.submission as Record<string, unknown> | undefined)
        ?.includePageMarkers === 'boolean'
        ? {
            includePageMarkers: (b.submission as { includePageMarkers: boolean })
              .includePageMarkers,
          }
        : undefined,
    frontMatter,
    storyPages: Array.isArray(b.storyPages)
      ? b.storyPages.map((p) => validatePage(p, format.id))
      : [],
    overflow: Array.isArray(b.overflow)
      ? b.overflow.map((p) => validatePage(p, format.id))
      : [],
    chapters:
      format.supportsChapters && Array.isArray(b.chapters)
        ? b.chapters
            .filter(
              (c): c is Record<string, unknown> =>
                typeof c === 'object' && c !== null,
            )
            .map((c) => ({
              id: typeof c.id === 'string' ? c.id : newId(),
              title: typeof c.title === 'string' ? c.title : 'Chapter',
              startOrdinal:
                typeof c.startOrdinal === 'number' && c.startOrdinal >= 0
                  ? Math.floor(c.startOrdinal)
                  : 0,
            }))
        : format.supportsChapters
          ? []
          : undefined,
    createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now(),
    updatedAt: typeof b.updatedAt === 'number' ? b.updatedAt : Date.now(),
  };

  const map = buildPageMap(pageCount, findConstruction(format, binding));
  return reconcileBudget(book, map.storyBudget, book.updatedAt);
}
