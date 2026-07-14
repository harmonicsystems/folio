/**
 * Book format presets — data, not code.
 *
 * Every physical fact the drafting surface renders (trim, margins, gutter,
 * bleed, page budgets, word bands, type minimums) lives here; components
 * consume the data and never carry format-specific numbers. Adding a format
 * means adding a const object, nothing else (ADR 0016 §2).
 *
 * Provenance:
 * - Signature page counts, the 32-page standard, self-ended vs plus-endpapers
 *   construction: Harold Underdown, "The Complete Idiot's Guide to Publishing
 *   Children's Books" (3rd ed.); Tara Lazar, "Picture Book Construction: Know
 *   Your Layout" (taralazar.com).
 * - Word-count bands: the drafting-first product brief (2026-07-13), informed
 *   by SCBWI submission guidance and agent norms (Mary Kole, kidlit.com).
 *   These deliberately differ from the engine's WORD_COUNT_TARGETS — see
 *   ADR 0016 §2 for the reconciliation note.
 * - Trim sizes are common trade trims; margins/gutter are conservative
 *   safe-area defaults (not a printer spec — real printers publish their own).
 *
 * This module imports nothing. Nothing in src/drafting/ may import from the
 * analysis engine or from src/types.ts (which type-imports the engine).
 */

export type FormatId = 'board-book' | 'picture-book' | 'early-reader';

export type BindingId =
  | 'board'
  | 'hardcover-selfEnded'
  | 'hardcover-plusEndpapers'
  | 'paperback';

/** Front-matter roles are single-page slots, assigned in construction order. */
export type FrontMatterRole = 'half-title' | 'title' | 'copyright';

export type PageRole = FrontMatterRole | 'story' | 'self-end';

export interface Trim {
  /** Inches. */
  width: number;
  height: number;
  units: 'in';
  orientation: 'portrait' | 'landscape' | 'square';
}

export interface Construction {
  binding: BindingId;
  /** Whether the finished book has endpapers at all (board books do not). */
  endpapers: boolean;
  /** Content pages reserved for front matter. */
  frontMatterPages: number;
  /**
   * Which role each front-matter page carries, assigned to the first
   * editable pages in order. Length === frontMatterPages.
   */
  frontMatterOrder: FrontMatterRole[];
  /** UI label, e.g. "Hardcover, self-ended". */
  label: string;
}

export interface WordBand {
  min: number;
  target: number;
  max: number;
}

export interface ReaderLevel {
  level: 1 | 2 | 3;
  label: string;
  words: WordBand;
}

/** Safe-area margins in inches. `gutter` is the inside (spine-side) margin. */
export interface Margins {
  outer: number;
  top: number;
  bottom: number;
  gutter: number;
}

export interface BookFormat {
  id: FormatId;
  name: string;
  description: string;
  ageRange: string;
  /** Default trim; always present in `trimOptions`. */
  trim: Trim;
  trimOptions: Trim[];
  /** Printer signatures — the only legal page counts. */
  pageCounts: number[];
  defaultPageCount: number;
  /** Default construction; always present in `constructionOptions`. */
  construction: Construction;
  constructionOptions: Construction[];
  margins: Margins;
  /** Inches; trade standard 0.125". */
  bleed: number;
  /** For leveled formats this is the default (Level 1) band. */
  wordCount: WordBand;
  levels?: ReaderLevel[];
  supportsChapters?: boolean;
  typography: {
    minFontPt: number;
    defaultFontPt: number;
    /** Line-height multiplier. */
    defaultLeading: number;
  };
}

const BOARD_CONSTRUCTION: Construction = {
  binding: 'board',
  endpapers: false,
  frontMatterPages: 1,
  frontMatterOrder: ['title'],
  label: 'Board (self-cover)',
};

export const BOARD_BOOK: BookFormat = {
  id: 'board-book',
  name: 'Board book',
  description:
    'Rigid self-cover pages for the youngest readers. Few words, big type, one thought per spread.',
  ageRange: '0–3',
  trim: { width: 6, height: 6, units: 'in', orientation: 'square' },
  trimOptions: [
    { width: 6, height: 6, units: 'in', orientation: 'square' },
    { width: 5, height: 5, units: 'in', orientation: 'square' },
    { width: 7, height: 7, units: 'in', orientation: 'square' },
  ],
  pageCounts: [12, 16, 20, 24],
  defaultPageCount: 20,
  construction: BOARD_CONSTRUCTION,
  constructionOptions: [BOARD_CONSTRUCTION],
  margins: { outer: 0.5, top: 0.5, bottom: 0.5, gutter: 0.5 },
  bleed: 0.125,
  wordCount: { min: 0, target: 50, max: 100 },
  typography: { minFontPt: 18, defaultFontPt: 24, defaultLeading: 1.3 },
};

const PICTURE_SELF_ENDED: Construction = {
  binding: 'hardcover-selfEnded',
  endpapers: true,
  frontMatterPages: 2,
  frontMatterOrder: ['title', 'copyright'],
  label: 'Hardcover, self-ended',
};

const PICTURE_PLUS_ENDPAPERS: Construction = {
  binding: 'hardcover-plusEndpapers',
  endpapers: true,
  frontMatterPages: 3,
  frontMatterOrder: ['half-title', 'copyright', 'title'],
  label: 'Hardcover + separate endpapers',
};

export const PICTURE_BOOK: BookFormat = {
  id: 'picture-book',
  name: 'Picture book',
  description:
    'The classic 32-page hardcover. Text and art share every spread; the page turn is a storytelling device.',
  ageRange: '3–8',
  trim: { width: 10, height: 10, units: 'in', orientation: 'square' },
  trimOptions: [
    { width: 10, height: 10, units: 'in', orientation: 'square' },
    { width: 8.5, height: 11, units: 'in', orientation: 'portrait' },
    { width: 11, height: 8.5, units: 'in', orientation: 'landscape' },
  ],
  pageCounts: [24, 32, 40, 48],
  defaultPageCount: 32,
  construction: PICTURE_SELF_ENDED,
  constructionOptions: [PICTURE_SELF_ENDED, PICTURE_PLUS_ENDPAPERS],
  margins: { outer: 0.5, top: 0.5, bottom: 0.625, gutter: 0.75 },
  bleed: 0.125,
  wordCount: { min: 200, target: 500, max: 1000 },
  typography: { minFontPt: 14, defaultFontPt: 18, defaultLeading: 1.4 },
};

const EARLY_READER_CONSTRUCTION: Construction = {
  binding: 'paperback',
  endpapers: false,
  frontMatterPages: 2,
  frontMatterOrder: ['title', 'copyright'],
  label: 'Paperback',
};

export const EARLY_READER: BookFormat = {
  id: 'early-reader',
  name: 'Early reader',
  description:
    'Leveled paperback for children reading on their own. Generous leading, larger-than-adult body text, optional chapters.',
  ageRange: '5–8',
  trim: { width: 6, height: 9, units: 'in', orientation: 'portrait' },
  trimOptions: [
    { width: 6, height: 9, units: 'in', orientation: 'portrait' },
    { width: 5.5, height: 8.5, units: 'in', orientation: 'portrait' },
  ],
  pageCounts: [32, 48, 64],
  defaultPageCount: 32,
  construction: EARLY_READER_CONSTRUCTION,
  constructionOptions: [EARLY_READER_CONSTRUCTION],
  margins: { outer: 0.625, top: 0.75, bottom: 0.75, gutter: 0.75 },
  bleed: 0.125,
  wordCount: { min: 100, target: 250, max: 400 },
  levels: [
    { level: 1, label: 'Level 1', words: { min: 100, target: 250, max: 400 } },
    { level: 2, label: 'Level 2', words: { min: 400, target: 800, max: 1200 } },
    { level: 3, label: 'Level 3', words: { min: 1200, target: 1800, max: 2500 } },
  ],
  supportsChapters: true,
  typography: { minFontPt: 14, defaultFontPt: 16, defaultLeading: 1.6 },
};

export const FORMATS: Record<FormatId, BookFormat> = {
  'board-book': BOARD_BOOK,
  'picture-book': PICTURE_BOOK,
  'early-reader': EARLY_READER,
};

export const FORMAT_LIST: BookFormat[] = [PICTURE_BOOK, BOARD_BOOK, EARLY_READER];

export const DEFAULT_FORMAT_ID: FormatId = 'picture-book';

export function getFormat(id: string): BookFormat {
  return FORMATS[id as FormatId] ?? FORMATS[DEFAULT_FORMAT_ID];
}

export function sameTrim(a: Trim, b: Trim): boolean {
  return a.width === b.width && a.height === b.height;
}

export function trimLabel(trim: Trim): string {
  return `${trim.width}″ × ${trim.height}″`;
}

export function findConstruction(
  format: BookFormat,
  binding: BindingId,
): Construction {
  return (
    format.constructionOptions.find((c) => c.binding === binding) ??
    format.construction
  );
}

export function wordBandFor(format: BookFormat, level?: 1 | 2 | 3): WordBand {
  if (format.levels && level) {
    const found = format.levels.find((l) => l.level === level);
    if (found) return found.words;
  }
  return format.wordCount;
}
