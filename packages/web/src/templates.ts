/**
 * Web-side working structures for new manuscripts.
 *
 * These are editable starting points, not publishing requirements. They carry
 * no manuscript prose and never change engine behavior.
 *
 * @see docs/decisions/0015-templates-reading-context-and-examples.md
 */

import type { AgeBand } from '@harmonic-systems/early-literacy';
import type { PagePlacement } from './types.js';
import type { ReadingSituation } from './reflections.js';

export type BookTemplateId =
  | 'board-12'
  | 'picture-16'
  | 'verse-16'
  | 'blank-16';

export interface BookTemplate {
  id: BookTemplateId;
  name: string;
  shortName: string;
  description: string;
  ageBand: AgeBand;
  readingSituation: ReadingSituation;
  spreadCount: number;
  defaultLeftPlacement: PagePlacement;
  defaultRightPlacement: PagePlacement;
}

export const BOOK_TEMPLATES: readonly BookTemplate[] = [
  {
    id: 'board-12',
    name: 'Compact board-book structure',
    shortName: 'Board book',
    description: 'Twelve facing spreads for a compact, repetition-forward working dummy.',
    ageBand: 'board',
    readingSituation: 'adult-read-aloud',
    spreadCount: 12,
    defaultLeftPlacement: 'text-only',
    defaultRightPlacement: 'illustration-only',
  },
  {
    id: 'picture-16',
    name: 'Picture-book dummy',
    shortName: 'Picture book',
    description: 'Sixteen facing spreads for page-turn pacing and flexible text/illustration composition.',
    ageBand: 'picture',
    readingSituation: 'adult-read-aloud',
    spreadCount: 16,
    defaultLeftPlacement: 'text-only',
    defaultRightPlacement: 'illustration-only',
  },
  {
    id: 'verse-16',
    name: 'Verse picture-book dummy',
    shortName: 'Verse picture book',
    description: 'Sixteen spreads with a read-aloud context and line-level rehearsal in view.',
    ageBand: 'early-picture',
    readingSituation: 'adult-read-aloud',
    spreadCount: 16,
    defaultLeftPlacement: 'text-only',
    defaultRightPlacement: 'illustration-only',
  },
  {
    id: 'blank-16',
    name: 'Blank custom structure',
    shortName: 'Custom blank',
    description: 'Sixteen unconstrained spreads with text available on both facing pages.',
    ageBand: 'picture',
    readingSituation: 'shared-reading',
    spreadCount: 16,
    defaultLeftPlacement: 'text-only',
    defaultRightPlacement: 'text-only',
  },
];

export function getBookTemplate(id: BookTemplateId): BookTemplate {
  return BOOK_TEMPLATES.find((template) => template.id === id) ?? BOOK_TEMPLATES[1]!;
}

