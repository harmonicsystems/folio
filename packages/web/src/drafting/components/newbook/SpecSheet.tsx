/**
 * The physical facts of a format, stated plainly — the author learns the
 * format while using it. Pure: props in, facts out.
 */

import type { BindingId, BookFormat, Trim } from '../../formats.js';
import { findConstruction, trimLabel, wordBandFor } from '../../formats.js';
import { buildPageMap } from '../../pageMap.js';

const ROLE_LABEL: Record<string, string> = {
  'half-title': 'half title',
  title: 'title',
  copyright: 'copyright · dedication',
};

export function SpecSheet({
  format,
  trim,
  pageCount,
  binding,
  level,
}: {
  format: BookFormat;
  trim?: Trim;
  pageCount?: number;
  binding?: BindingId;
  level?: 1 | 2 | 3;
}) {
  const chosenTrim = trim ?? format.trim;
  const chosenCount = pageCount ?? format.defaultPageCount;
  const construction = findConstruction(
    format,
    binding ?? format.construction.binding,
  );
  const map = buildPageMap(chosenCount, construction);
  const band = wordBandFor(format, level);
  const storySpreads = map.units.filter((u) =>
    u.pages.some((p) => p.role === 'story'),
  ).length;
  const frontMatter = construction.frontMatterOrder
    .map((r) => ROLE_LABEL[r] ?? r)
    .join(', ');

  return (
    <dl className="spec-sheet">
      <dt>Trim</dt>
      <dd>
        {trimLabel(chosenTrim)} {chosenTrim.orientation}
      </dd>
      <dt>Binding</dt>
      <dd>{construction.label}</dd>
      <dt>Bleed</dt>
      <dd>{format.bleed}″ on trimmed edges</dd>
      <dt>Margins</dt>
      <dd>
        {format.margins.outer}″ outer · {format.margins.top}″ top ·{' '}
        {format.margins.bottom}″ bottom · {format.margins.gutter}″ gutter
      </dd>
      <dt>Pages</dt>
      <dd>
        {chosenCount} printed
        {construction.binding === 'hardcover-selfEnded'
          ? ' (4 become the self-ends)'
          : ''}{' '}
        → {map.storyBudget} story pages across {storySpreads} spreads
      </dd>
      <dt>Front matter</dt>
      <dd>{frontMatter}</dd>
      <dt>Words</dt>
      <dd>
        {band.min}–{band.max}, around {band.target}
      </dd>
      <dt>Type</dt>
      <dd>
        {format.typography.defaultFontPt} pt body, {format.typography.minFontPt}{' '}
        pt minimum, {format.typography.defaultLeading} leading
      </dd>
    </dl>
  );
}
