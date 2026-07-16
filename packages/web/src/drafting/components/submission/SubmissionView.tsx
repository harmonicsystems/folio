/**
 * Submission View: the whole book re-rendered live as the plain
 * standard-format manuscript — trim, fonts, layouts, and illustration
 * frames fall away; same words and nothing else. File export lives only
 * here. Deliberately un-themed (white paper, black TNR).
 */

import { useEffect, useMemo, useState } from 'react';
import type { DraftBook } from '../../model.js';
import { isEmptyPage } from '../../model.js';
import { navigate } from '../../router.js';
import { buildSubmission } from '../../submission.js';
import { buildDocxBytes, docxFileName } from '../../docx.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { paginate, type MeasureFn } from './layout.js';
import { SubmissionSheet } from './SubmissionSheet.js';
import { ArtNotesPanel } from './ArtNotesPanel.js';
import { AuthorBlockEditor } from './AuthorBlockEditor.js';

function makeMeasure(): MeasureFn {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return (text) => text.length * 8;
  ctx.font = '16px "Times New Roman", "Liberation Serif", Times, serif';
  return (text) => ctx.measureText(text).width;
}

export function SubmissionView({ book }: { book: DraftBook }) {
  const { store } = useBookStore();
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true)).catch(() => {});
  }, []);

  const includeMarkers = book.submission?.includePageMarkers ?? false;
  const doc = useMemo(
    () => buildSubmission(book, { includePageMarkers: includeMarkers }),
    [book, includeMarkers],
  );
  const pages = useMemo(
    () => paginate(doc, makeMeasure()),
    // fontsReady re-wraps once system fonts settle.
    [doc, fontsReady], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const downloadDocx = () => {
    const bytes = buildDocxBytes(doc);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docxFileName(doc.title);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ms-root">
      <div className="ms-toolbar">
        <label className="app-toggle-row">
          <input
            type="checkbox"
            checked={includeMarkers}
            onChange={(e) =>
              store.updateBook((b) => ({
                ...b,
                submission: { includePageMarkers: e.target.checked },
                updatedAt: Date.now(),
              }))
            }
          />
          Page markers (“PAGES 4–5:”) — off is the version no editor will fault
        </label>
        <button type="button" className="btn btn-primary" onClick={downloadDocx}>
          Download .docx
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => window.print()}
        >
          Print / PDF
        </button>
      </div>

      {/* Rendered once, in a fixed slot — never relocated as the name is
          typed (which would drop focus mid-word). */}
      <div className="ms-side">
        {(() => {
          const unplaced = book.overflow.filter((p) => !isEmptyPage(p)).length;
          if (unplaced === 0) return null;
          return (
            <div className="ms-quarantine" role="alert">
              <strong>
                {unplaced} written {unplaced === 1 ? 'page is' : 'pages are'}{' '}
                unplaced and will not appear in this manuscript
              </strong>{' '}
              (or in its word count). They're outside the current page budget —
              place them from the storyboard's tray before submitting.
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() =>
                    navigate({ kind: 'book', bookId: book.id, view: 'storyboard' })
                  }
                >
                  Open the storyboard tray
                </button>
              </div>
            </div>
          );
        })()}
        <AuthorBlockEditor book={book} highlight={!doc.authorName} />
        {doc.blocks.length === 0 && (
          <p className="ill-empty">
            The manuscript is empty — the words you write on the pages in
            Write view flow here as the plain submission document.
          </p>
        )}
        <ArtNotesPanel doc={doc} />
      </div>

      <p className="ms-eyebrow">
        Standard manuscript format — deliberately plain. This is the file an
        editor receives.
      </p>

      <div className="ms-sheets">
        {pages.map((lines, i) => (
          <SubmissionSheet
            key={i}
            lines={lines}
            pageNumber={i + 1}
            runningHeader={doc.runningHeader}
          />
        ))}
      </div>
    </div>
  );
}
