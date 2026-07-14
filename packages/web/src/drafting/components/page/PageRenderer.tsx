/**
 * One physical page at native inch size: paper, safe area, text block or
 * editor slot, placeholder frames, optional guides. PURE — the same layout
 * path serves the live editor (mode="edit", editor passed as children) and
 * static thumbnails (mode="thumb"), so what fits on the page is identical
 * everywhere. All dimensions are CSS physical units driven by custom
 * properties; the ancestor applies transform: scale().
 */

import type { ReactNode } from 'react';
import type { BookFormat, Trim } from '../../formats.js';
import { fontPtFor } from '../../formats.js';
import type { DraftPageContent } from '../../model.js';
import type { PageSlot } from '../../pageMap.js';
import { PlaceholderFrame } from './PlaceholderFrame.js';
import { TextBlock } from './TextBlock.js';

export function PageRenderer({
  format,
  trim,
  slot,
  content,
  mode,
  showGuides = false,
  children,
}: {
  format: BookFormat;
  trim: Trim;
  slot: PageSlot;
  content: DraftPageContent;
  mode: 'edit' | 'thumb';
  showGuides?: boolean;
  /** Edit mode: the live PageTextEditor for this page. */
  children?: ReactNode;
}) {
  const { margins } = format;
  const style = {
    '--trim-w': trim.width,
    '--trim-h': trim.height,
    '--m-top': margins.top,
    '--m-bottom': margins.bottom,
    '--m-outside': margins.outer,
    '--m-inside': margins.gutter,
    '--bleed': format.bleed,
    '--pg-font-pt': fontPtFor(format, content.layout.typeStep),
    '--pg-leading': format.typography.defaultLeading,
  } as React.CSSProperties;

  const hideText = content.placement === 'illustration-only' && !content.text;

  return (
    <div className="pg-page" data-side={slot.side} data-role={slot.role} style={style}>
      {content.placeholders.map((ph) => (
        <PlaceholderFrame key={ph.id} placeholder={ph} />
      ))}
      {slot.role !== 'self-end' && (
        <div className="pg-safe" data-v={content.layout.position.v}>
          {mode === 'edit' && children
            ? children
            : !hideText && <TextBlock text={content.text} layout={content.layout} />}
          {showGuides && <div className="pg-safe-guide" />}
        </div>
      )}
    </div>
  );
}
