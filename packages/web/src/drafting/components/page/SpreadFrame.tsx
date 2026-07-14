/**
 * One render unit at native size: facing pages abutting at the spine, or a
 * single page beside a ghost slot so page 1 sits right-of-center (recto)
 * and the last page left-of-center (verso). PURE — shared by the editor
 * canvas and storyboard thumbnails.
 */

import type { ReactNode } from 'react';
import type { BookFormat, Trim } from '../../formats.js';
import type { DraftPageContent } from '../../model.js';
import type { PageSlot, RenderUnit } from '../../pageMap.js';
import { PageRenderer } from './PageRenderer.js';

export function SpreadFrame({
  format,
  trim,
  unit,
  contentFor,
  mode,
  showGuides = false,
  renderEditor,
  renderPageFrame,
}: {
  format: BookFormat;
  trim: Trim;
  unit: RenderUnit;
  contentFor: (slot: PageSlot) => DraftPageContent;
  mode: 'edit' | 'thumb';
  showGuides?: boolean;
  /** Edit mode: produce the live editor for an editable page. */
  renderEditor?: (slot: PageSlot) => ReactNode;
  /** Optional wrapper around each page (focus frame etc.). */
  renderPageFrame?: (slot: PageSlot, page: ReactNode) => ReactNode;
}) {
  const style = {
    '--trim-w': trim.width,
    '--trim-h': trim.height,
  } as React.CSSProperties;

  const page = (slot: PageSlot): ReactNode => {
    const rendered = (
      <PageRenderer
        key={slot.pageNumber}
        format={format}
        trim={trim}
        slot={slot}
        content={contentFor(slot)}
        mode={mode}
        showGuides={showGuides && slot.role !== 'self-end'}
      >
        {mode === 'edit' && slot.editable ? renderEditor?.(slot) : undefined}
      </PageRenderer>
    );
    return renderPageFrame ? renderPageFrame(slot, rendered) : rendered;
  };

  if (unit.kind === 'single') {
    const slot = unit.pages[0];
    const ghost = <div className="pg-ghost" aria-hidden="true" />;
    return (
      <div className="pg-spread" style={style}>
        {slot.side === 'recto' ? ghost : null}
        {page(slot)}
        {slot.side === 'verso' ? ghost : null}
      </div>
    );
  }

  return (
    <div className="pg-spread" style={style}>
      {unit.pages.map(page)}
      <div className="pg-spine" aria-hidden="true" />
    </div>
  );
}
