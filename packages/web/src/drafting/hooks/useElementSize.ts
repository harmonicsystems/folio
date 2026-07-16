/**
 * Observe an element's content-box size. Drives the spread canvas scale
 * (native page size → fit-to-container transform).
 */

import { useCallback, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement>(): {
  ref: (node: T | null) => void;
  size: ElementSize;
} {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { inlineSize, blockSize } = entry.contentBoxSize[0] ?? {
        inlineSize: entry.contentRect.width,
        blockSize: entry.contentRect.height,
      };
      // rAF guard avoids "ResizeObserver loop" warnings on rapid relayout.
      requestAnimationFrame(() =>
        setSize((prev) =>
          prev.width === inlineSize && prev.height === blockSize
            ? prev
            : { width: inlineSize, height: blockSize },
        ),
      );
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return { ref, size };
}
