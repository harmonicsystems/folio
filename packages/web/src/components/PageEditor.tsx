/**
 * Per-page Lexical editor. One instance per page (32 total across a
 * 16-spread manuscript). Replaces the plain <textarea>.
 *
 * Communication with the surrounding vanilla Astro script:
 * - **Reads / writes:** each editor registers a handle on
 *   `window.__pageEditors[`${spread}-${side}`]` with `getText` and
 *   `setText` methods. The vanilla `readManuscript()` / `setPage()`
 *   helpers go through this registry.
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
  $createTextNode,
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
