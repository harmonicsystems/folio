/**
 * The scale stage: measures its container, computes the fit for a spread
 * laid out at native inches, and applies transform: scale(). Transforms
 * don't affect layout, so wraps and overflow are computed once at native
 * size — identical at every zoom. --page-scale feeds hairline compensation.
 */

import type { ReactNode } from 'react';
import type { Trim } from '../../formats.js';
import { useElementSize } from '../../hooks/useElementSize.js';

const PPI = 96; // CSS 1in = 96px, exactly
const MAX_SCALE = 1.25;

export function SpreadCanvas({
  trim,
  children,
}: {
  trim: Trim;
  children: ReactNode;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const nativeW = 2 * trim.width * PPI;
  const nativeH = trim.height * PPI;
  const scale =
    size.width > 0 && size.height > 0
      ? Math.min(size.width / nativeW, size.height / nativeH, MAX_SCALE)
      : 0;

  return (
    <div className="ed-canvas" ref={ref}>
      {scale > 0 && (
        <div
          className="ed-canvas-fit"
          style={{ width: nativeW * scale, height: nativeH * scale }}
        >
          <div
            className="ed-canvas-native"
            style={
              {
                width: nativeW,
                height: nativeH,
                transform: `scale(${scale})`,
                transformOrigin: '0 0',
                '--page-scale': scale,
              } as React.CSSProperties
            }
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
