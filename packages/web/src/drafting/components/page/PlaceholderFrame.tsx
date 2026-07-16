/**
 * An illustration placeholder: an elegant labeled frame marking space the
 * art will hold. PURE — renders identically in the editor and thumbnails.
 * Notes are edited in chrome (milestone 5), never on the page itself.
 */

import type { IllustrationPlaceholder } from '../../model.js';

const KIND_LABEL: Record<IllustrationPlaceholder['kind'], string> = {
  'spread-bleed': 'full-bleed spread',
  'full-page': 'full page',
  'half-page-top': 'half page · top',
  'half-page-bottom': 'half page · bottom',
  spot: 'spot',
};

export function PlaceholderFrame({
  placeholder,
}: {
  placeholder: IllustrationPlaceholder;
}) {
  return (
    <div className="pg-ph" data-kind={placeholder.kind}>
      <span className="pg-ph-label">
        {KIND_LABEL[placeholder.kind]}
        {placeholder.note ? `\n“${placeholder.note}”` : ''}
      </span>
    </div>
  );
}
