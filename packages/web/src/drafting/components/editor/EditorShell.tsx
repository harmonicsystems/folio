/**
 * The editing surface for one book: the current spread rendered at true
 * proportions with live page editors, page captions beneath (word counts,
 * overflow whispers, the explicit page-break control), and spread navigation.
 * The book is the hero; everything else recedes.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { findConstruction, getFormat } from '../../formats.js';
import type { DraftBook, DraftPageContent } from '../../model.js';
import {
  chapterAt,
  getFrontMatterPage,
  getStoryPage,
  setChapterAt,
  splitStoryPageAt,
  withFrontMatterPage,
  withStoryPage,
  type PageTarget,
} from '../../model.js';
import type { FrontMatterRole } from '../../formats.js';
import {
  buildPageMap,
  unitForOrdinal,
  unitForPage,
  type PageSlot,
} from '../../pageMap.js';
import { countWords } from '../../counts.js';
import { pageFontStyle } from '../../fonts.js';
import { loadPrefs, savePrefs } from '../../persistence.js';
import { navigate } from '../../router.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { useKeyboardNav } from '../../hooks/useKeyboardNav.js';
import { SpreadFrame } from '../page/SpreadFrame.js';
import { CountersBar } from './CountersBar.js';
import { LayoutControls } from './LayoutControls.js';
import { SpecsPanel } from './SpecsPanel.js';
import { SpreadCanvas } from './SpreadCanvas.js';
import { SpreadNav } from './SpreadNav.js';
import {
  PageTextEditor,
  type AutoFocusRequest,
} from './PageTextEditor.js';
import { getCaretOffset, serializeEditable } from './caret.js';

const PPI = 96;

const ROLE_CAPTION: Record<string, string> = {
  'half-title': 'half title',
  title: 'title page',
  copyright: 'copyright · dedication',
  'self-end': 'self-end',
  story: 'story',
};

const ROLE_PLACEHOLDER: Partial<Record<string, string>> = {
  'half-title': 'Half title',
  title: 'Title page',
  copyright: 'Copyright · dedication',
};

function slotKey(slot: PageSlot): string {
  return slot.role === 'story' ? `story:${slot.storyOrdinal}` : `fm:${slot.role}`;
}

export function EditorShell({
  book,
  unitIndex,
}: {
  book: DraftBook;
  unitIndex?: number;
}) {
  const { store } = useBookStore();
  const format = getFormat(book.formatId);
  const construction = findConstruction(format, book.binding);
  const map = useMemo(
    () => buildPageMap(book.pageCount, construction),
    [book.pageCount, construction],
  );

  const defaultUnit = useMemo(
    () => map.units.find((u) => u.pages.some((p) => p.editable))?.index ?? 0,
    [map],
  );
  const clamped = Math.max(0, Math.min(unitIndex ?? defaultUnit, map.units.length - 1));
  const unit = map.units[clamped];

  const [showGuides, setShowGuides] = useState(
    () => loadPrefs().showSafeArea ?? false,
  );
  const toggleGuides = useCallback(() => {
    setShowGuides((v) => {
      savePrefs({ version: 1, showSafeArea: !v });
      return !v;
    });
  }, []);

  const [pendingFocus, setPendingFocus] = useState<{
    key: string;
    req: AutoFocusRequest;
  } | null>(null);
  const [overflows, setOverflows] = useState<Record<number, number>>({});
  const pageWraps = useRef(new Map<number, HTMLDivElement>());

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, map.units.length - 1));
      navigate({ kind: 'book', bookId: book.id, view: 'editor', unit: next });
    },
    [book.id, map.units.length],
  );
  const goPrev = useCallback(() => goTo(unit.index - 1), [goTo, unit.index]);
  const goNext = useCallback(() => goTo(unit.index + 1), [goTo, unit.index]);
  const zoomOut = useCallback(
    () => navigate({ kind: 'book', bookId: book.id, view: 'storyboard' }),
    [book.id],
  );
  useKeyboardNav({
    onPrev: goPrev,
    onNext: goNext,
    onToggleGuides: toggleGuides,
    onEscape: zoomOut,
  });
  const [specsOpen, setSpecsOpen] = useState(false);
  const [layoutFor, setLayoutFor] = useState<number | null>(null);

  const contentFor = useCallback(
    (slot: PageSlot): DraftPageContent =>
      slot.role === 'story'
        ? getStoryPage(book, slot.storyOrdinal ?? 0)
        : getFrontMatterPage(book, slot.role as FrontMatterRole),
    [book],
  );

  const handleChange = useCallback(
    (slot: PageSlot, text: string) => {
      if (slot.role === 'story') {
        const ordinal = slot.storyOrdinal ?? 0;
        store.updateBook((b) => withStoryPage(b, ordinal, (p) => ({ ...p, text })));
      } else {
        const role = slot.role as FrontMatterRole;
        store.updateBook((b) =>
          withFrontMatterPage(b, role, (p) => ({ ...p, text })),
        );
      }
    },
    [store],
  );

  const handlePageBreak = useCallback(
    (slot: PageSlot, offset: number) => {
      if (slot.role !== 'story' || slot.storyOrdinal === undefined) return;
      const result = splitStoryPageAt(book, map.storyBudget, slot.storyOrdinal, offset);
      if (result.book !== book) store.updateBook(() => result.book);
      const target = unitForOrdinal(map, result.focusOrdinal);
      if (target.index !== unit.index) goTo(target.index);
      setPendingFocus({
        key: `story:${result.focusOrdinal}`,
        req: { offset: result.movedToOverflow ? -1 : 0, token: Date.now() },
      });
    },
    [book, map, store, unit.index, goTo],
  );

  /** Page-break button: read the caret from the page's live editor. */
  const breakFromButton = useCallback(
    (slot: PageSlot) => {
      const wrap = pageWraps.current.get(slot.pageNumber);
      const editable = wrap?.querySelector<HTMLElement>('.pg-text[contenteditable]');
      if (!editable) return;
      const offset =
        document.activeElement === editable
          ? (getCaretOffset(editable) ?? serializeEditable(editable).length)
          : serializeEditable(editable).length;
      handlePageBreak(slot, offset);
    },
    [handlePageBreak],
  );

  const safeHeightPx =
    (book.trim.height - format.margins.top - format.margins.bottom) * PPI;

  /** Arrow past a page edge: the caret flows to the neighboring editable
   *  page, crossing spreads when needed. */
  const handleBoundary = useCallback(
    (slot: PageSlot, direction: 'prev' | 'next'): boolean => {
      const editable = map.pages.filter((p) => p.editable);
      const at = editable.findIndex((p) => p.pageNumber === slot.pageNumber);
      if (at < 0) return false;
      const neighbor = editable[direction === 'next' ? at + 1 : at - 1];
      if (!neighbor) return false;
      const key =
        neighbor.role === 'story'
          ? `story:${neighbor.storyOrdinal}`
          : `fm:${neighbor.role}`;
      const targetUnit = unitForPage(map, neighbor.pageNumber);
      if (targetUnit.index !== unit.index) goTo(targetUnit.index);
      setPendingFocus({
        key,
        req: { offset: direction === 'next' ? 0 : -1, token: Date.now() },
      });
      return true;
    },
    [map, unit.index, goTo],
  );

  const renderEditor = (slot: PageSlot) => {
    const content = contentFor(slot);
    const key = slotKey(slot);
    return (
      <PageTextEditor
        value={content.text}
        layout={content.layout}
        safeHeightPx={safeHeightPx}
        placeholder={ROLE_PLACEHOLDER[slot.role]}
        ariaLabel={`Page ${slot.pageNumber}, ${ROLE_CAPTION[slot.role]}`}
        onChange={(text) => handleChange(slot, text)}
        onPageBreak={
          slot.role === 'story' ? (offset) => handlePageBreak(slot, offset) : undefined
        }
        onBoundary={(direction) => handleBoundary(slot, direction)}
        onOverflowChange={(px) =>
          setOverflows((prev) =>
            prev[slot.pageNumber] === px
              ? prev
              : { ...prev, [slot.pageNumber]: px },
          )
        }
        autoFocus={pendingFocus?.key === key ? pendingFocus.req : null}
      />
    );
  };

  const chapterFor = format.supportsChapters
    ? (slot: PageSlot) =>
        slot.role === 'story' && slot.storyOrdinal !== undefined
          ? chapterAt(book, slot.storyOrdinal)?.title
          : undefined
    : undefined;

  const renderPageFrame = (slot: PageSlot, page: React.ReactNode) => (
    <div
      key={slot.pageNumber}
      className="ed-pagewrap"
      ref={(node) => {
        if (node) pageWraps.current.set(slot.pageNumber, node);
        else pageWraps.current.delete(slot.pageNumber);
      }}
      onClick={(e) => {
        // Click anywhere on the paper focuses its editor.
        const wrap = e.currentTarget;
        const editable = wrap.querySelector<HTMLElement>('.pg-text[contenteditable]');
        if (editable && document.activeElement !== editable) editable.focus();
      }}
    >
      {page}
    </div>
  );

  return (
    <div className="ed-root">
      <div className="ed-canvasrow">
        <button
          type="button"
          className="ed-turn"
          data-dir="prev"
          onClick={goPrev}
          disabled={unit.index === 0}
          aria-label="Previous spread"
        >
          ‹
        </button>
        <SpreadCanvas trim={book.trim}>
          <div style={pageFontStyle(book.pageFont)}>
            <SpreadFrame
              format={format}
              trim={book.trim}
              unit={unit}
              contentFor={contentFor}
              mode="edit"
              showGuides={showGuides}
              chapterFor={chapterFor}
              renderEditor={renderEditor}
              renderPageFrame={renderPageFrame}
            />
          </div>
        </SpreadCanvas>
        <button
          type="button"
          className="ed-turn"
          data-dir="next"
          onClick={goNext}
          disabled={unit.index === map.units.length - 1}
          aria-label="Next spread"
        >
          ›
        </button>
      </div>

      <div className="ed-pagerow" data-single={unit.kind === 'single'}>
        {unit.pages.map((slot) => {
          const content = contentFor(slot);
          const words = slot.role === 'story' ? countWords(content.text) : null;
          const over = overflows[slot.pageNumber] ?? 0;
          const target: PageTarget | null = !slot.editable
            ? null
            : slot.role === 'story'
              ? { kind: 'story', ordinal: slot.storyOrdinal ?? 0 }
              : { kind: 'front-matter', role: slot.role as FrontMatterRole };
          return (
            <div
              key={slot.pageNumber}
              className="ed-pagecaption"
              data-side={slot.side}
            >
              <span>
                p. {slot.pageNumber} · {ROLE_CAPTION[slot.role]}
                {words !== null && words > 0 &&
                  ` · ${words} ${words === 1 ? 'word' : 'words'}`}
              </span>
              {over > 0 && slot.editable && (
                <span className="ed-overflow-note">past the safe area</span>
              )}
              {target && (
                <span className="ed-layout-anchor">
                  <button
                    type="button"
                    className="app-iconbtn ed-break"
                    aria-pressed={layoutFor === slot.pageNumber}
                    title="Text position, type size, and illustration space for this page"
                    onClick={() =>
                      setLayoutFor((v) =>
                        v === slot.pageNumber ? null : slot.pageNumber,
                      )
                    }
                  >
                    ⊞ Text & art
                  </button>
                  {layoutFor === slot.pageNumber && (
                    <LayoutControls
                      target={target}
                      page={content}
                      format={format}
                      canSpreadBleed={
                        slot.role === 'story' &&
                        slot.side === 'verso' &&
                        unit.kind === 'spread'
                      }
                      onClose={() => setLayoutFor(null)}
                    />
                  )}
                </span>
              )}
              {slot.role === 'story' && (
                <button
                  type="button"
                  className="app-iconbtn ed-break"
                  title="Push the text after the caret to the next page (⌘⏎)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => breakFromButton(slot)}
                >
                  ↵ Page break
                </button>
              )}
              {format.supportsChapters &&
                slot.role === 'story' &&
                slot.storyOrdinal !== undefined &&
                (chapterAt(book, slot.storyOrdinal) ? (
                  <span className="ed-chapter">
                    <input
                      className="ed-chapter-input"
                      aria-label={`Chapter title, page ${slot.pageNumber}`}
                      value={chapterAt(book, slot.storyOrdinal)?.title ?? ''}
                      onChange={(e) =>
                        store.updateBook((b) =>
                          setChapterAt(b, slot.storyOrdinal ?? 0, e.target.value),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="app-iconbtn ed-break"
                      aria-label="Remove chapter"
                      onClick={() =>
                        store.updateBook((b) =>
                          setChapterAt(b, slot.storyOrdinal ?? 0, null),
                        )
                      }
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="app-iconbtn ed-break"
                    onClick={() =>
                      store.updateBook((b) =>
                        setChapterAt(
                          b,
                          slot.storyOrdinal ?? 0,
                          `Chapter ${(b.chapters?.length ?? 0) + 1}`,
                        ),
                      )
                    }
                  >
                    + Chapter
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      <div className="ed-statusrow">
        <SpreadNav
          unit={unit}
          unitCount={map.units.length}
          onPrev={goPrev}
          onNext={goNext}
        />
        <div className="app-topbar-spacer" />
        <CountersBar book={book} map={map} format={format} unit={unit} />
        <button
          type="button"
          className="app-iconbtn"
          aria-pressed={specsOpen}
          onClick={() => setSpecsOpen((v) => !v)}
        >
          Specs
        </button>
        <button
          type="button"
          className="app-iconbtn"
          aria-pressed={showGuides}
          onClick={toggleGuides}
          title="Safe-area guides (⌘;)"
        >
          Guides
        </button>
      </div>
      <SpecsPanel book={book} open={specsOpen} onClose={() => setSpecsOpen(false)} />
    </div>
  );
}
