/**
 * Static text render with the page's layout applied. PURE. Shares the
 * .pg-text class (and therefore the exact wrapping) with the live editor —
 * that shared layout path is the honesty guarantee between editing surface
 * and thumbnails.
 */

import type { TextLayout } from '../../model.js';

export function TextBlock({
  text,
  layout,
}: {
  text: string;
  layout: TextLayout;
}) {
  return (
    <div
      className="pg-text"
      data-h={layout.position.h}
      style={{ textAlign: layout.align }}
    >
      {text}
    </div>
  );
}
