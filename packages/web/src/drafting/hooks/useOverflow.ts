/**
 * Measure how far a text block extends past its safe-area box, in native
 * (pre-transform) pixels. offsetHeight is a layout-box value, so it is
 * unaffected by the ancestor `transform: scale()` — exactly what the
 * comparison needs. Re-measures on resize, input, and webfont arrival
 * (font swap changes metrics).
 */

import { useEffect, useRef, useState } from 'react';

export function useOverflow(
  ref: React.RefObject<HTMLElement | null>,
  safeHeightPx: number,
): number {
  const [overflowPx, setOverflowPx] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      frame.current = null;
      const over = Math.max(0, el.offsetHeight - safeHeightPx);
      setOverflowPx((prev) => (prev === over ? prev : over));
    };
    const schedule = () => {
      if (frame.current === null) {
        frame.current = requestAnimationFrame(measure);
      }
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    document.fonts?.ready.then(schedule).catch(() => {});
    schedule();

    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [ref, safeHeightPx]);

  return overflowPx;
}
