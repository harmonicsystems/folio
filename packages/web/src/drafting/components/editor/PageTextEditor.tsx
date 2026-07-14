/**
 * The direct-write surface: one contenteditable="plaintext-only" div per
 * page, laid out by the same .pg-text class as the static render.
 *
 * Uncontrolled-with-reconciliation: keystrokes mutate the DOM and push
 * serialized text to the store; the DOM is only written from state when the
 * change originated elsewhere (page break, restore), with the caret restored
 * by offset. This keeps React re-renders from destroying the caret.
 *
 * Pagination is structural: Cmd/Ctrl+Enter fires onPageBreak(caretOffset).
 * Overflow past the safe area is measured (native units — offsetHeight is
 * unaffected by the ancestor transform) and tinted; it NEVER reflows.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { TextLayout } from '../../model.js';
import { useOverflow } from '../../hooks/useOverflow.js';
import { getCaretOffset, serializeEditable, setCaretOffset } from './caret.js';

export interface AutoFocusRequest {
  /** Caret offset to land on; -1 means end of text. */
  offset: number;
  /** Changes on every request so repeated focuses re-fire. */
  token: number;
}

export function PageTextEditor({
  value,
  layout,
  safeHeightPx,
  placeholder,
  onChange,
  onPageBreak,
  onOverflowChange,
  onBoundary,
  autoFocus,
  ariaLabel,
}: {
  value: string;
  layout: TextLayout;
  safeHeightPx: number;
  placeholder?: string;
  onChange: (text: string) => void;
  onPageBreak?: (caretOffset: number) => void;
  onOverflowChange?: (overflowPx: number) => void;
  /** Arrow past the text's edge: move the caret to the neighboring page. */
  onBoundary?: (direction: 'prev' | 'next') => boolean;
  autoFocus?: AutoFocusRequest | null;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastPushed = useRef<string | null>(null);

  // Reconcile DOM from state only when the change came from elsewhere.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastPushed.current === value) return;
    if (serializeEditable(el) === value) return;
    const hadFocus = document.activeElement === el;
    const caret = hadFocus ? getCaretOffset(el) : null;
    el.textContent = value;
    if (hadFocus) setCaretOffset(el, Math.min(caret ?? value.length, value.length));
  }, [value]);

  // Fulfil focus requests (after a page break, keyboard nav, etc.).
  useEffect(() => {
    const el = ref.current;
    if (!el || !autoFocus) return;
    el.focus();
    setCaretOffset(el, autoFocus.offset < 0 ? serializeEditable(el).length : autoFocus.offset);
  }, [autoFocus]);

  const overflowPx = useOverflow(ref, safeHeightPx);
  useEffect(() => {
    onOverflowChange?.(overflowPx);
  }, [overflowPx, onOverflowChange]);

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    const text = serializeEditable(el);
    lastPushed.current = text;
    onChange(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      const el = ref.current;
      if (el && onPageBreak) {
        onPageBreak(getCaretOffset(el) ?? serializeEditable(el).length);
      }
      return;
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && onBoundary) {
      const el = ref.current;
      const sel = document.getSelection();
      if (!el || !sel || !sel.isCollapsed || e.shiftKey) return;
      const offset = getCaretOffset(el);
      const length = serializeEditable(el).length;
      const atEdge =
        e.key === 'ArrowRight' ? offset === length : offset === 0;
      if (atEdge && onBoundary(e.key === 'ArrowRight' ? 'next' : 'prev')) {
        e.preventDefault();
      }
    }
  };

  // Belt-and-braces plain-text guards (plaintext-only is Baseline, but a
  // stray rich paste in an older engine must still land as plain text).
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <>
      <div
        ref={ref}
        className="pg-text"
        data-h={layout.position.h}
        style={{ textAlign: layout.align }}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      {overflowPx > 0 && (
        <div
          className="pg-overflow-tint"
          style={{ height: overflowPx }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
