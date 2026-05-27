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

import { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';

type Side = 'left' | 'right';

interface EditorHandle {
  getText: () => string;
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
  },
};

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
      </div>
    </LexicalComposer>
  );
}
