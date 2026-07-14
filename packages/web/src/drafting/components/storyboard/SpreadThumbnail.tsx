/**
 * One render unit at small scale — literally the same SpreadFrame the editor
 * uses, in thumb mode, under a smaller transform. Because layout happens at
 * native size, the thumbnail wraps text exactly like the editor: the
 * storyboard never lies about what fits.
 */

import { useEffect, useRef, useState } from 'react';
import type { BookFormat, Trim } from '../../formats.js';
import type { DraftBook, DraftPageContent } from '../../model.js';
import { getFrontMatterPage, getStoryPage } from '../../model.js';
import type { FrontMatterRole } from '../../formats.js';
import type { PageSlot, RenderUnit } from '../../pageMap.js';
import { chapterAt } from '../../model.js';
import { countWords } from '../../counts.js';
import { SpreadFrame } from '../page/SpreadFrame.js';

const PPI = 96;

const FM_CHIP: Partial<Record<string, string>> = {
  'half-title': 'half title',
  title: 'title',
  copyright: 'copyright · dedication',
};

export function SpreadThumbnail({
  book,
  format,
  trim,
  unit,
  width,
  selected,
  onOpen,
}: {
  book: DraftBook;
  format: BookFormat;
  trim: Trim;
  unit: RenderUnit;
  /** Cell width in CSS px; scale derives from it. */
  width: number;
  selected: boolean;
  onOpen: () => void;
}) {
  const nativeW = 2 * trim.width * PPI;
  const nativeH = trim.height * PPI;
  const scale = width / nativeW;

  const contentFor = (slot: PageSlot): DraftPageContent =>
    slot.role === 'story'
      ? getStoryPage(book, slot.storyOrdinal ?? 0)
      : getFrontMatterPage(book, slot.role as FrontMatterRole);

  // Overflow dot: measure the rendered text blocks (native units, transform-
  // immune) against the safe height — the same signal the editor shows.
  const stageRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const safeH = (trim.height - format.margins.top - format.margins.bottom) * PPI;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const blocks = stage.querySelectorAll<HTMLElement>('.pg-text');
    let over = false;
    blocks.forEach((b) => {
      if (b.offsetHeight > safeH) over = true;
    });
    setOverflowing(over);
  }, [book, safeH]);

  const chapterFor = format.supportsChapters
    ? (slot: PageSlot) =>
        slot.role === 'story' && slot.storyOrdinal !== undefined
          ? chapterAt(book, slot.storyOrdinal)?.title
          : undefined
    : undefined;

  const fmChips = unit.pages
    .map((p) => FM_CHIP[p.role])
    .filter((label): label is string => Boolean(label));
  const chapterChips = unit.pages
    .map((p) => chapterFor?.(p))
    .filter((t): t is string => Boolean(t));
  const notes = unit.pages
    .flatMap((p) => contentFor(p).placeholders)
    .map((ph) => ph.note)
    .filter(Boolean);
  const words = unit.pages.reduce(
    (sum, p) =>
      p.role === 'story' ? sum + countWords(contentFor(p).text) : sum,
    0,
  );

  const noun = unit.kind === 'single' ? 'page' : 'pages';
  return (
    <button
      type="button"
      className="sb-thumb"
      data-selected={selected}
      onClick={onOpen}
      aria-label={`${noun} ${unit.label}${fmChips.length ? ` — ${fmChips.join(', ')}` : ''}${words ? `, ${words} words` : ''}`}
    >
      <div
        className="sb-thumb-stage"
        ref={stageRef}
        style={{ width: nativeW * scale, height: nativeH * scale }}
      >
        <div
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
          <SpreadFrame
            format={format}
            trim={trim}
            unit={unit}
            contentFor={contentFor}
            mode="thumb"
            chapterFor={chapterFor}
          />
        </div>
      </div>
      <span className="sb-thumb-label">
        {unit.label}
        {overflowing && <span className="sb-thumb-dot" title="past the safe area" />}
      </span>
      {fmChips.length > 0 && (
        <span className="sb-thumb-chip">{fmChips.join(' · ')}</span>
      )}
      {chapterChips.length > 0 && (
        <span className="sb-thumb-chip">{chapterChips.join(' · ')}</span>
      )}
      {notes.length > 0 && (
        <span className="sb-thumb-note">“{notes.join('” · “')}”</span>
      )}
    </button>
  );
}
