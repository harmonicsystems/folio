/**
 * Line-level paginator for the submission view. Typography is uniform
 * (12pt Times New Roman, double-spaced, 1" margins on US Letter), so we
 * wrap words greedily with a measured font and deal in whole lines — the
 * on-screen sheets render exactly the lines computed here, and the print
 * PDF prints exactly those sheets. One paginator, three surfaces.
 *
 * Pure given a `measure` function (canvas measureText in the app, a fake
 * in tests). The .docx does NOT use this — Word paginates itself.
 */

import type { SubmissionDoc } from '../../submission.js';

export const PPI = 96;
export const CONTENT_W = 6.5 * PPI; // 8.5in − 2×1in margins
export const CONTENT_H = 9 * PPI; // 11in − 2×1in margins
export const BODY_LINE_H = 32; // 12pt × double spacing = 24pt = 32px
export const HEAD_LINE_H = 20; // contact block, visually single-spaced
export const TITLE_TOP = 2.2 * PPI; // title sits ~⅓ down page 1
export const FIRST_LINE_INDENT = 0.5 * PPI;

export type MsLineKind = 'contact' | 'count' | 'title' | 'byline' | 'body' | 'marker';

export interface MsLine {
  text: string;
  kind: MsLineKind;
  /** Rendered height in px (includes the line's share of spacing). */
  h: number;
  /** First line of an indented paragraph. */
  indent?: boolean;
  /** Extra space above (the title's ⅓-page drop). */
  marginTop?: number;
}

export type MeasureFn = (text: string) => number;

/** Greedy word wrap at a measured width; long unbreakable words hard-place. */
export function wrapText(
  text: string,
  measure: MeasureFn,
  firstWidth: number,
  restWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let line = '';
  let width = firstWidth;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > width) {
      lines.push(line);
      line = word;
      width = restWidth;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function blockLines(doc: SubmissionDoc, measure: MeasureFn): MsLine[] {
  const lines: MsLine[] = [];
  for (const block of doc.blocks) {
    if (block.kind === 'marker') {
      for (const text of wrapText(block.text, measure, CONTENT_W, CONTENT_W)) {
        lines.push({ text, kind: 'marker', h: BODY_LINE_H });
      }
      continue;
    }
    const wrapped = wrapText(
      block.text,
      measure,
      CONTENT_W - FIRST_LINE_INDENT,
      CONTENT_W,
    );
    wrapped.forEach((text, i) => {
      lines.push({ text, kind: 'body', h: BODY_LINE_H, indent: i === 0 });
    });
  }
  return lines;
}

/** The page-1 head: contact block, rounded count, dropped title, byline. */
function headLines(doc: SubmissionDoc): MsLine[] {
  const head: MsLine[] = [];
  for (const text of [doc.authorName, ...doc.contactLines].filter(Boolean)) {
    head.push({ text, kind: 'contact', h: HEAD_LINE_H });
  }
  head.push({
    text: `about ${doc.roundedWordCount.toLocaleString('en-US')} words`,
    kind: 'count',
    h: HEAD_LINE_H,
  });
  head.push({
    text: doc.title,
    kind: 'title',
    h: BODY_LINE_H,
    marginTop: TITLE_TOP,
  });
  if (doc.byline) head.push({ text: doc.byline, kind: 'byline', h: BODY_LINE_H });
  return head;
}

/** Distribute lines into US-Letter pages. Page 1 carries the head. */
export function paginate(doc: SubmissionDoc, measure: MeasureFn): MsLine[][] {
  const pages: MsLine[][] = [];
  let page: MsLine[] = [];
  let used = 0;

  const place = (line: MsLine) => {
    const height = line.h + (line.marginTop ?? 0);
    if (used + height > CONTENT_H && page.length > 0) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += height;
  };

  for (const line of headLines(doc)) place(line);
  for (const line of blockLines(doc, measure)) place(line);
  pages.push(page);
  return pages;
}
