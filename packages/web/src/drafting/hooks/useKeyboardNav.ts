/**
 * Editor keyboard map. PageUp/PageDown move between spreads even while a
 * page editor is focused (pages are short; caret paging is low-value there).
 * Cmd/Ctrl+arrow combos are deliberately avoided — macOS uses them for
 * line start/end in editable text. Cmd/Ctrl+; toggles the safe-area guides.
 * Esc zooms out to the storyboard — unless a popover is open (it closes
 * itself on Esc; the zoom must not fire underneath it).
 */

import { useEffect } from 'react';

export function useKeyboardNav({
  onPrev,
  onNext,
  onToggleGuides,
  onEscape,
}: {
  onPrev: () => void;
  onNext: () => void;
  onToggleGuides: () => void;
  onEscape?: () => void;
}): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === 'PageUp') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        onNext();
      } else if ((e.metaKey || e.ctrlKey) && e.key === ';') {
        e.preventDefault();
        onToggleGuides();
      } else if (e.key === 'Escape' && onEscape) {
        if (document.querySelector('.app-popover, .specs-panel')) return;
        onEscape();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onPrev, onNext, onToggleGuides, onEscape]);
}
