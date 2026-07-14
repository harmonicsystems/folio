/** One format choice: name, true-aspect trim silhouette, headline facts. */

import type { BookFormat } from '../../formats.js';
import { trimLabel } from '../../formats.js';
import { TrimSilhouette } from '../library/BookCard.js';

export function PresetCard({
  format,
  selected,
  onSelect,
}: {
  format: BookFormat;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="nb-preset-card"
      aria-pressed={selected}
      onClick={onSelect}
    >
      {/* F5: seat the silhouette in an inset well (parity with the library
          card) so the white-on-white trim shape actually reads. */}
      <span className="nb-preset-well">
        <TrimSilhouette
          width={format.trim.width}
          height={format.trim.height}
          box={64}
        />
      </span>
      <span className="nb-preset-name">{format.name}</span>
      <span className="nb-preset-age">ages {format.ageRange}</span>
      <span className="nb-preset-desc">{format.description}</span>
      <span className="nb-preset-facts">
        <span>{trimLabel(format.trim)}</span>
        <span>{format.pageCounts.join(' / ')} pages</span>
        <span>~{format.wordCount.target} words</span>
      </span>
    </button>
  );
}
