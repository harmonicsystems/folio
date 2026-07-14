/** Prev/next chevrons + editorial position text ("pages 4–5 · 3 of 17"). */

import type { RenderUnit } from '../../pageMap.js';

export function SpreadNav({
  unit,
  unitCount,
  onPrev,
  onNext,
}: {
  unit: RenderUnit;
  unitCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const noun = unit.kind === 'single' ? 'page' : 'pages';
  return (
    <div className="ed-nav">
      <button
        type="button"
        className="app-iconbtn"
        onClick={onPrev}
        disabled={unit.index === 0}
        aria-label="Previous spread (Page Up)"
      >
        ←
      </button>
      <span className="ed-nav-label">
        {noun} {unit.label}
        <span className="ed-nav-sub">
          {unit.storyLabel ? ` · ${unit.storyLabel}` : ''} · {unit.index + 1} of{' '}
          {unitCount}
        </span>
      </span>
      <button
        type="button"
        className="app-iconbtn"
        onClick={onNext}
        disabled={unit.index === unitCount - 1}
        aria-label="Next spread (Page Down)"
      >
        →
      </button>
    </div>
  );
}
