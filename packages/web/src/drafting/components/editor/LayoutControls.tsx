/**
 * Page-level layout choices — few and beautiful, never free-form rich text:
 * text-block position (3×3), alignment, type-scale steps within the preset's
 * typography rules, and the page's illustration space with its note.
 * Constraint logic lives in the model (a half-page illustration owns its
 * half); the controls only render what's allowed.
 */

import { useEffect, useRef } from 'react';
import type { BookFormat } from '../../formats.js';
import { fontPtFor } from '../../formats.js';
import type {
  DraftPageContent,
  PageTarget,
  PlaceholderKind,
  TextLayout,
} from '../../model.js';
import {
  allowedVerticals,
  setPageLayout,
  setPagePlaceholder,
  setPlaceholderNote,
} from '../../model.js';
import { useBookStore } from '../../hooks/useBookStore.js';

const V_OPTIONS: Array<TextLayout['position']['v']> = ['top', 'middle', 'bottom'];
const H_OPTIONS: Array<TextLayout['position']['h']> = ['left', 'center', 'right'];
const ALIGN_OPTIONS: Array<TextLayout['align']> = ['left', 'center', 'right'];
const STEP_OPTIONS: Array<TextLayout['typeStep']> = [-1, 0, 1, 2];
const STEP_LABEL: Record<number, string> = { [-1]: 'A−', 0: 'A', 1: 'A+', 2: 'A++' };

const KIND_OPTIONS: Array<{ kind: PlaceholderKind; label: string }> = [
  { kind: 'full-page', label: 'full page' },
  { kind: 'half-page-top', label: 'half · top' },
  { kind: 'half-page-bottom', label: 'half · bottom' },
  { kind: 'spot', label: 'spot' },
  { kind: 'spread-bleed', label: 'full-bleed spread' },
];

export function LayoutControls({
  target,
  page,
  format,
  canSpreadBleed,
  onClose,
}: {
  target: PageTarget;
  page: DraftPageContent;
  format: BookFormat;
  /** Spread-bleed is offered only on verso story pages facing a recto. */
  canSpreadBleed: boolean;
  onClose: () => void;
}) {
  const { store } = useBookStore();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  const verticals = allowedVerticals(page);
  const currentKind = page.placeholders[0]?.kind ?? null;
  const kinds = KIND_OPTIONS.filter(
    (o) => o.kind !== 'spread-bleed' || canSpreadBleed,
  );

  return (
    <div className="layout-pop app-popover" role="dialog" aria-label="Page layout" ref={wrapRef}>
      <div className="nb-field">
        <label>Text block</label>
        <div className="layout-grid" role="group" aria-label="Text block position">
          {V_OPTIONS.map((v) =>
            H_OPTIONS.map((h) => (
              <button
                key={`${v}-${h}`}
                type="button"
                className="layout-dot"
                aria-label={`${v} ${h}`}
                aria-pressed={
                  page.layout.position.v === v && page.layout.position.h === h
                }
                disabled={!verticals.includes(v)}
                onClick={() =>
                  store.updateBook((b) =>
                    setPageLayout(b, target, { position: { v, h } }),
                  )
                }
              />
            )),
          )}
        </div>
      </div>

      <div className="nb-field">
        <label>Alignment</label>
        <div className="nb-chips" role="group" aria-label="Text alignment">
          {ALIGN_OPTIONS.map((align) => (
            <button
              key={align}
              type="button"
              aria-pressed={page.layout.align === align}
              onClick={() =>
                store.updateBook((b) => setPageLayout(b, target, { align }))
              }
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <div className="nb-field">
        <label>Type</label>
        <div className="nb-chips" role="group" aria-label="Type scale">
          {STEP_OPTIONS.map((step) => (
            <button
              key={step}
              type="button"
              aria-pressed={page.layout.typeStep === step}
              onClick={() =>
                store.updateBook((b) =>
                  setPageLayout(b, target, { typeStep: step }),
                )
              }
            >
              {STEP_LABEL[step]}
              <span className="nb-chip-note">{fontPtFor(format, step)} pt</span>
            </button>
          ))}
        </div>
      </div>

      <div className="nb-field">
        <label>Illustration</label>
        <div className="nb-chips" role="group" aria-label="Illustration space">
          <button
            type="button"
            aria-pressed={currentKind === null}
            onClick={() =>
              store.updateBook((b) => setPagePlaceholder(b, target, null))
            }
          >
            none
          </button>
          {kinds.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              aria-pressed={currentKind === kind}
              onClick={() =>
                store.updateBook((b) => setPagePlaceholder(b, target, kind))
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {page.placeholders[0] && (
        <div className="nb-field">
          <label htmlFor="ph-note">Illustration note</label>
          <textarea
            id="ph-note"
            className="layout-note"
            rows={3}
            placeholder="fox looks back over shoulder, snow falling"
            value={page.placeholders[0].note}
            onChange={(e) =>
              store.updateBook((b) =>
                setPlaceholderNote(b, target, e.target.value),
              )
            }
          />
        </div>
      )}
    </div>
  );
}
