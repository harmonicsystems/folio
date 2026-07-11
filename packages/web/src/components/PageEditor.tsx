/**
 * Per-page Lexical editor. One instance per page (32 total across a
 * 16-spread manuscript). Replaces the plain <textarea>.
 *
 * Communication with the surrounding vanilla Astro script:
 * - **Reads / writes:** each editor registers a handle on
 *   `window.__pageEditors[`${spread}-${side}`]` with `getText`,
 *   `setText`, `getMarkdown`, lossless `getStateJSON`/`setStateJSON`
 *   (the autosave payload), and offset-addressed `replaceRange` (the
 *   format-preserving find-and-replace primitive). The vanilla
 *   `readManuscript()` / `setPage()` helpers go through this registry.
 * - **Change notifications:** every editor-state change dispatches a
 *   `page-text-change` CustomEvent on document with
 *   `{ spread, side, text }` in `detail`. The vanilla script listens
 *   and re-runs the debounced analysis.
 * - **Ready signal:** on mount each editor dispatches a
 *   `page-editor-ready` event so the vanilla script can run its
 *   initial analysis once all 32 are hydrated.
 *
 * Rich formatting (bold, italic, etc.) lands in Slice 2c-C. This
 * file ships with RichTextPlugin so the foundation is in place, but
 * no toolbar yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
} from '@lexical/markdown';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
} from 'lexical';

// Curated transformer list. We deliberately omit headings, lists,
// links, code, and quote — none of those belong inside picture-book
// page text, and exposing them as shortcuts would invite drift.
const PAGE_TRANSFORMERS = [
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

type Side = 'left' | 'right';

interface EditorHandle {
  getText: () => string;
  getMarkdown: () => string;
  setText: (text: string) => void;
  /** Lossless Lexical editor state, JSON-serialized — the autosave payload. */
  getStateJSON: () => string;
  /**
   * Restore a state produced by {@link getStateJSON}. Returns false on
   * parse failure so callers can fall back to plain-text `setText`.
   */
  setStateJSON: (json: string) => boolean;
  /**
   * Replace [start, end) — offsets in `getText()` coordinates — with
   * `replacement`, preserving all formatting outside the range (the
   * inserted text inherits the format at the anchor). Returns false if
   * an endpoint can't be resolved to a text position (e.g. a stale
   * match, or an endpoint landing on a line break or paragraph gap),
   * in which case nothing changes. A range whose endpoints are valid
   * but which SPANS a line break will resolve and merge the lines —
   * find matches can never produce one (queries can't contain "\n"),
   * so callers passing arbitrary ranges must guard that themselves.
   */
  replaceRange: (start: number, end: number, replacement: string) => boolean;
}

declare global {
  interface Window {
    __pageEditors?: Record<string, EditorHandle>;
  }
}

const initialConfig = {
  namespace: 'PageEditor',
  onError: (e: Error) => {
    // Lexical wants a global error hook; keep it loud during dev.
    console.error('Lexical error:', e);
  },
  theme: {
    paragraph: 'page-editor-paragraph',
    text: {
      bold: 'page-editor-text-bold',
      italic: 'page-editor-text-italic',
      underline: 'page-editor-text-underline',
      strikethrough: 'page-editor-text-strikethrough',
    },
  },
};

function FloatingToolbar() {
  const [editor] = useLexicalComposerContext();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel) || sel.isCollapsed()) {
        setPos(null);
        return;
      }
      const nativeSel = window.getSelection();
      if (!nativeSel || nativeSel.rangeCount === 0) {
        setPos(null);
        return;
      }
      const rect = nativeSel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPos(null);
        return;
      }
      setPos({ top: rect.top - 38, left: rect.left + rect.width / 2 });
      setActive({
        bold: sel.hasFormat('bold'),
        italic: sel.hasFormat('italic'),
        underline: sel.hasFormat('underline'),
        strikethrough: sel.hasFormat('strikethrough'),
      });
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, updateToolbar]);

  if (!pos) return null;

  const dispatch =
    (fmt: 'bold' | 'italic' | 'underline' | 'strikethrough') =>
    (e: React.MouseEvent) => {
      e.preventDefault();
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, fmt);
    };

  return (
    <div
      className="lex-toolbar"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
    >
      <button
        type="button"
        className={`lex-tool lex-tool-bold${active.bold ? ' active' : ''}`}
        onMouseDown={dispatch('bold')}
        aria-label="Bold"
        aria-pressed={active.bold}
      >
        B
      </button>
      <button
        type="button"
        className={`lex-tool lex-tool-italic${active.italic ? ' active' : ''}`}
        onMouseDown={dispatch('italic')}
        aria-label="Italic"
        aria-pressed={active.italic}
      >
        I
      </button>
      <button
        type="button"
        className={`lex-tool lex-tool-underline${active.underline ? ' active' : ''}`}
        onMouseDown={dispatch('underline')}
        aria-label="Underline"
        aria-pressed={active.underline}
      >
        U
      </button>
      <button
        type="button"
        className={`lex-tool lex-tool-strike${active.strikethrough ? ' active' : ''}`}
        onMouseDown={dispatch('strikethrough')}
        aria-label="Strikethrough"
        aria-pressed={active.strikethrough}
      >
        S
      </button>
    </div>
  );
}

/**
 * Typography helpers. Registers keyboard shortcuts on each editor for
 * inserting characters that don't have keys but matter for line-break
 * control:
 * - Cmd/Ctrl + Shift + -   → soft hyphen (U+00AD, invisible until a
 *                            line wraps where it appears)
 * - Cmd/Ctrl + Shift + Space → non-breaking space (U+00A0)
 */
function TypographyShortcuts() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return false;
        const insert = (ch: string) => {
          event.preventDefault();
          editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) sel.insertText(ch);
          });
          return true;
        };
        if (event.key === '-' || event.code === 'Minus') return insert('­');
        if (event.key === ' ' || event.code === 'Space') return insert(' ');
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [editor]);
  return null;
}

/**
 * Map every TextNode to its [start, start+len) interval in
 * `$getRoot().getTextContent()` coordinates. Mirrors Lexical's
 * serialization exactly: top-level blocks join with "\n\n" and each
 * LineBreakNode contributes "\n". Must run inside a read/update.
 */
interface TextSegment {
  key: string;
  start: number;
  len: number;
}

function collectTextSegments(): TextSegment[] {
  const segs: TextSegment[] = [];
  let pos = 0;
  $getRoot()
    .getChildren()
    .forEach((block, i) => {
      if (i > 0) pos += 2; // '\n\n' block separator, per getTextContent()
      if (!$isElementNode(block)) {
        pos += block.getTextContentSize();
        return;
      }
      for (const child of block.getChildren()) {
        if ($isTextNode(child)) {
          const len = child.getTextContentSize();
          segs.push({ key: child.getKey(), start: pos, len });
          pos += len;
        } else if ($isLineBreakNode(child)) {
          pos += 1; // '\n'
        } else {
          pos += child.getTextContentSize();
        }
      }
    });
  return segs;
}

/** Resolve a global start offset to (nodeKey, offsetInNode), text nodes only. */
function resolveStart(segs: TextSegment[], offset: number): { key: string; offset: number } | null {
  for (const s of segs) {
    if (s.len > 0 && offset >= s.start && offset < s.start + s.len) {
      return { key: s.key, offset: offset - s.start };
    }
  }
  return null;
}

/** Resolve a global end offset (exclusive) to (nodeKey, offsetInNode). */
function resolveEnd(segs: TextSegment[], offset: number): { key: string; offset: number } | null {
  for (const s of segs) {
    if (s.len > 0 && offset > s.start && offset <= s.start + s.len) {
      return { key: s.key, offset: offset - s.start };
    }
  }
  return null;
}

function HandleRegister({ spread, side }: { spread: number; side: Side }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const key = `${spread}-${side}`;
    if (!window.__pageEditors) window.__pageEditors = {};
    window.__pageEditors[key] = {
      getText: () => {
        let out = '';
        editor.getEditorState().read(() => {
          out = $getRoot().getTextContent();
        });
        return out;
      },
      getMarkdown: () => {
        let out = '';
        editor.getEditorState().read(() => {
          out = $convertToMarkdownString(PAGE_TRANSFORMERS);
        });
        return out;
      },
      setText: (text: string) => {
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          if (text.length === 0) {
            root.append($createParagraphNode());
            return;
          }
          // Preserve blank-line paragraph breaks; collapse single
          // newlines into spaces (matches plain-text convention).
          for (const para of text.split(/\n\n+/)) {
            const p = $createParagraphNode();
            p.append($createTextNode(para.replace(/\n/g, ' ')));
            root.append(p);
          }
        });
        // Programmatic bulk set (draft restore, sample load, migration):
        // the pre-set contents must not be reachable via Cmd+Z, or an
        // undo right after load blanks the page and autosaves the blank.
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      },
      getStateJSON: () => JSON.stringify(editor.getEditorState().toJSON()),
      setStateJSON: (json: string): boolean => {
        try {
          const state = editor.parseEditorState(json);
          editor.setEditorState(state);
          editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
          return true;
        } catch {
          return false;
        }
      },
      replaceRange: (start: number, end: number, replacement: string): boolean => {
        if (end < start) return false;
        let ok = false;
        editor.update(() => {
          const segs = collectTextSegments();
          const anchor = resolveStart(segs, start);
          const focus = end === start ? anchor : resolveEnd(segs, end);
          if (!anchor || !focus) return;
          const sel = $createRangeSelection();
          sel.anchor.set(anchor.key, anchor.offset, 'text');
          sel.focus.set(focus.key, focus.offset, 'text');
          $setSelection(sel);
          sel.insertText(replacement);
          ok = true;
        });
        return ok;
      },
    };
    document.dispatchEvent(
      new CustomEvent('page-editor-ready', { detail: { spread, side } }),
    );
    return () => {
      if (window.__pageEditors) delete window.__pageEditors[key];
    };
  }, [editor, spread, side]);
  return null;
}

interface Props {
  spread: number;
  side: Side;
  placeholder?: string;
}

export default function PageEditor({ spread, side, placeholder }: Props) {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="page-editor-shell">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="page-text page-editor-editable"
              aria-label={`Spread ${spread} ${side} page text`}
              spellCheck={false}
            />
          }
          placeholder={
            <div className="page-editor-placeholder">{placeholder ?? '…'}</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={PAGE_TRANSFORMERS} />
        <OnChangePlugin
          onChange={(state) => {
            state.read(() => {
              const text = $getRoot().getTextContent();
              document.dispatchEvent(
                new CustomEvent('page-text-change', {
                  detail: { spread, side, text },
                }),
              );
            });
          }}
        />
        <HandleRegister spread={spread} side={side} />
        <TypographyShortcuts />
        <FloatingToolbar />
      </div>
    </LexicalComposer>
  );
}
