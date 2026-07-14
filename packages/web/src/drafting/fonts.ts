/**
 * Page fonts for drafting — data, not code. A per-book choice that changes
 * how the book renders on the pages (and honestly changes what fits: a
 * different face wraps differently at the same point size).
 *
 * This is a WORKSPACE choice: the submission manuscript always renders and
 * exports in 12pt Times New Roman regardless (ADR 0016 §5) — the drafting
 * font falls away with the rest of the design layer.
 *
 * Stacks are system-first with graceful fallbacks; 'Comic Neue' (the
 * handwritten option's web fallback) loads from Google Fonts alongside the
 * fonts the site already ships — no new dependency class. Futura is a
 * licensed face: present on Apple devices, falling back to Century Gothic /
 * Jost-adjacent geometrics elsewhere.
 */

export interface PageFont {
  id: string;
  label: string;
  note: string;
  stack: string;
  /** Whole-page weight (Futura Bold); the editor itself stays plain text. */
  weight?: number;
}

export const PAGE_FONTS: PageFont[] = [
  {
    id: 'caslon',
    label: 'Caslon',
    note: 'bookish serif',
    stack: "'Libre Caslon Text', ui-serif, Georgia, serif",
  },
  {
    id: 'futura',
    label: 'Futura',
    note: 'geometric sans',
    stack: "Futura, 'Century Gothic', 'Trebuchet MS', sans-serif",
  },
  {
    id: 'futura-bold',
    label: 'Futura Bold',
    note: 'geometric sans, heavy',
    stack: "Futura, 'Century Gothic', 'Trebuchet MS', sans-serif",
    weight: 700,
  },
  {
    id: 'atkinson',
    label: 'Atkinson',
    note: 'humanist sans',
    stack: "'Atkinson Hyperlegible', system-ui, sans-serif",
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    note: 'monospace',
    stack: "ui-monospace, 'Courier New', Courier, monospace",
  },
  {
    id: 'handwritten',
    label: 'Handwritten',
    note: 'casual script',
    stack: "'Comic Neue', 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive",
  },
];

export const DEFAULT_PAGE_FONT_ID = 'caslon';

export function getPageFont(id: string | undefined): PageFont {
  return PAGE_FONTS.find((f) => f.id === id) ?? PAGE_FONTS[0];
}

/** Inheritable CSS custom properties that PageRenderer's .pg-text consumes. */
export function pageFontStyle(id: string | undefined): React.CSSProperties {
  const font = getPageFont(id);
  return {
    '--page-font': font.stack,
    '--pg-font-weight': font.weight ?? 400,
  } as React.CSSProperties;
}
