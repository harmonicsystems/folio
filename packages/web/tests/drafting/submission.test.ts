import { describe, expect, it } from 'vitest';
import { PICTURE_BOOK } from '../../src/drafting/formats.js';
import {
  newBook,
  setPagePlaceholder,
  setPlaceholderNote,
  withFrontMatterPage,
  withStoryPage,
} from '../../src/drafting/model.js';
import {
  artNotesFileText,
  buildSubmission,
  lastNameOf,
  roundWordCount,
} from '../../src/drafting/submission.js';
import { paginate, wrapText, CONTENT_H } from '../../src/drafting/components/submission/layout.js';

function sampleBook() {
  let book = newBook(PICTURE_BOOK, { title: 'The Moon Garden', now: 1 });
  book = { ...book, author: { name: 'David Nyman', contact: '12 Milk St\nkinderhook@example.com' } };
  book = withStoryPage(book, 0, (p) => ({ ...p, text: 'Once there was a wall of ivy.' }), 2);
  book = withStoryPage(book, 1, (p) => ({ ...p, text: 'Nobody remembered who planted it.\nNobody at all.' }), 2);
  book = withFrontMatterPage(book, 'title', (p) => ({ ...p, text: 'THE MOON GARDEN' }), 2);
  book = setPagePlaceholder(book, { kind: 'story', ordinal: 1 }, 'spot', 3);
  book = setPlaceholderNote(book, { kind: 'story', ordinal: 1 }, 'ivy curling', 3);
  return book;
}

describe('roundWordCount', () => {
  it('rounds to the nearest 10 under 1,000 and 100 above', () => {
    expect(roundWordCount(0)).toBe(0);
    expect(roundWordCount(3)).toBe(10); // never rounds a draft to zero
    expect(roundWordCount(487)).toBe(490);
    expect(roundWordCount(996)).toBe(1000);
    expect(roundWordCount(1487)).toBe(1500);
  });
});

describe('lastNameOf', () => {
  it('takes the final name token, uppercased', () => {
    expect(lastNameOf('David Nyman')).toBe('NYMAN');
    expect(lastNameOf('  Ana de la Cruz ')).toBe('CRUZ');
    expect(lastNameOf('')).toBe('');
  });
});

describe('buildSubmission', () => {
  it('carries story text in book order; front matter stays behind', () => {
    const doc = buildSubmission(sampleBook());
    expect(doc.blocks.map((b) => b.text)).toEqual([
      'Once there was a wall of ivy.',
      'Nobody remembered who planted it.',
      'Nobody at all.',
    ]);
    expect(doc.blocks.every((b) => b.kind === 'text')).toBe(true);
    expect(doc.title).toBe('The Moon Garden');
    expect(doc.byline).toBe('by David Nyman');
    expect(doc.runningHeader).toBe('NYMAN / THE MOON GARDEN');
    expect(doc.contactLines).toEqual(['12 Milk St', 'kinderhook@example.com']);
    expect(doc.roundedWordCount).toBe(20); // 15 words → nearest 10
  });

  it('page markers are off by default and label by unit when enabled', () => {
    const plain = buildSubmission(sampleBook());
    expect(plain.blocks.some((b) => b.kind === 'marker')).toBe(false);

    const marked = buildSubmission(sampleBook(), { includePageMarkers: true });
    const markers = marked.blocks.filter((b) => b.kind === 'marker');
    // story pages 5 and 6 live in units [4–5] and [6–7]
    expect(markers.map((m) => m.text)).toEqual(['PAGES 4–5:', 'PAGES 6–7:']);
  });

  it('quarantines art notes with editorial labels — never inlined', () => {
    const doc = buildSubmission(sampleBook());
    expect(doc.artNotes).toEqual([
      { label: 'page 6', kind: 'spot', note: 'ivy curling' },
    ]);
    expect(doc.blocks.some((b) => b.text.includes('ivy curling'))).toBe(false);
    const file = artNotesFileText(doc);
    expect(file).toContain('do not submit');
    expect(file).toContain('page 6 · spot · “ivy curling”');
  });
});

describe('paginate', () => {
  const mono = (text: string) => text.length * 8; // fake measure: 8px/char

  it('keeps the head on page one and flows body lines after it', () => {
    const doc = buildSubmission(sampleBook());
    const pages = paginate(doc, mono);
    expect(pages).toHaveLength(1);
    const kinds = pages[0].map((l) => l.kind);
    expect(kinds.slice(0, 3)).toEqual(['contact', 'contact', 'contact']);
    expect(kinds).toContain('title');
    expect(kinds.filter((k) => k === 'body')).toHaveLength(3);
  });

  it('splits long paragraphs across sheets at line boundaries', () => {
    let book = sampleBook();
    const long = Array(80).fill('the ivy held its breath all winter long').join(' ');
    book = withStoryPage(book, 2, (p) => ({ ...p, text: long }), 4);
    const pages = paginate(buildSubmission(book), mono);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      const height = page.reduce((s, l) => s + l.h + (l.marginTop ?? 0), 0);
      expect(height).toBeLessThanOrEqual(CONTENT_H);
    }
  });
});

describe('wrapText', () => {
  const mono = (text: string) => text.length * 10;
  it('wraps greedily and honors a narrower first line', () => {
    const lines = wrapText('aa bb cc dd', mono, 60, 120);
    expect(lines[0]).toBe('aa bb'); // 5 chars = 50 ≤ 60; adding ' cc' → 80 > 60
    expect(lines.slice(1).join(' ')).toBe('cc dd');
  });
  it('hard-places unbreakable words', () => {
    expect(wrapText('supercalifragilistic', mono, 60, 60)).toEqual([
      'supercalifragilistic',
    ]);
  });
});
