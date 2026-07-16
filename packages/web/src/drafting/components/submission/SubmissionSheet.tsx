/**
 * One US-Letter sheet of the submission manuscript, rendering exactly the
 * lines the paginator computed. Pages after the first carry the running
 * header `LASTNAME / TITLE / page#` — baked per sheet, so the printed PDF
 * needs no @page margin-box support.
 */

import type { MsLine } from './layout.js';
import { FIRST_LINE_INDENT } from './layout.js';

export function SubmissionSheet({
  lines,
  pageNumber,
  runningHeader,
}: {
  lines: MsLine[];
  pageNumber: number;
  runningHeader: string;
}) {
  return (
    <div className="ms-sheet">
      {pageNumber > 1 && (
        <div className="ms-running-header">
          {runningHeader} / {pageNumber}
        </div>
      )}
      {lines.map((line, i) => (
        <div
          key={i}
          className="ms-block"
          data-kind={line.kind}
          style={{
            height: line.h,
            lineHeight: `${line.h}px`,
            marginTop: line.marginTop,
            paddingLeft: line.indent ? FIRST_LINE_INDENT : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
