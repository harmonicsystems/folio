/**
 * ZIP structure + XML well-formedness of the emitted .docx package.
 * (Real-app validation in Word/Pages/Google Docs happens in verification;
 * these tests catch structural regressions.)
 */

import { describe, expect, it } from 'vitest';
import { buildDocxBytes, buildZip, docxFileName } from '../../src/drafting/docx.js';
import { buildSubmission } from '../../src/drafting/submission.js';
import { newBook, withStoryPage } from '../../src/drafting/model.js';
import { PICTURE_BOOK } from '../../src/drafting/formats.js';

function sampleDoc() {
  let book = newBook(PICTURE_BOOK, { title: 'The Moon Garden', now: 1 });
  book = { ...book, author: { name: 'David Nyman' } };
  book = withStoryPage(book, 0, (p) => ({ ...p, text: 'Once there was a wall of ivy & <thorns>.' }), 2);
  return buildSubmission(book);
}

/** Minimal ZIP reader: walk local file headers, return entry names + bytes. */
function readZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    entries.set(name, decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize)));
    offset = dataStart + compressedSize;
  }
  return entries;
}

describe('buildZip', () => {
  it('produces a walkable stored-entry archive with an end record', () => {
    const bytes = buildZip([
      { name: 'a.txt', bytes: new TextEncoder().encode('hello') },
      { name: 'dir/b.txt', bytes: new TextEncoder().encode('world') },
    ]);
    const entries = readZip(bytes);
    expect([...entries.keys()]).toEqual(['a.txt', 'dir/b.txt']);
    expect(entries.get('a.txt')).toBe('hello');
    // End-of-central-directory signature present
    const view = new DataView(bytes.buffer);
    let found = false;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

describe('buildDocxBytes', () => {
  const entries = readZip(buildDocxBytes(sampleDoc()));

  it('ships every required OOXML part', () => {
    expect([...entries.keys()].sort()).toEqual(
      [
        '[Content_Types].xml',
        '_rels/.rels',
        'word/_rels/document.xml.rels',
        'word/document.xml',
        'word/header1.xml',
        'word/styles.xml',
      ].sort(),
    );
  });

  it('escapes text and carries the standard format facts', () => {
    const docXml = entries.get('word/document.xml')!;
    expect(docXml).toContain('ivy &amp; &lt;thorns&gt;.');
    expect(docXml).toContain('<w:pgSz w:w="12240" w:h="15840"/>'); // US Letter
    expect(docXml).toContain('w:top="1440"'); // 1" margins
    expect(docXml).toContain('<w:titlePg/>'); // no header on page 1
    expect(docXml).toContain('The Moon Garden');
    expect(docXml).toContain('by David Nyman');
    expect(docXml).toContain('about 10 words');

    const styles = entries.get('word/styles.xml')!;
    expect(styles).toContain('Times New Roman');
    expect(styles).toContain('w:line="480"'); // double-spaced
    expect(styles).toContain('<w:sz w:val="24"/>'); // 12pt
    // Google Docs ignores docDefaults fonts, so Normal must carry the font too
    // (round-trip check 2026-07-16: font came back dropped when it lived only
    // in docDefaults).
    const normalStyle = styles.match(/<w:style [^>]*w:styleId="Normal">.*?<\/w:style>/)?.[0];
    expect(normalStyle).toContain('Times New Roman');
    expect(normalStyle).toContain('<w:sz w:val="24"/>');

    const header = entries.get('word/header1.xml')!;
    expect(header).toContain('NYMAN / THE MOON GARDEN / ');
    expect(header).toContain('PAGE');
  });

  it('every XML part is well-formed enough to balance its root element', () => {
    for (const [name, xml] of entries) {
      expect(xml.startsWith('<?xml'), name).toBe(true);
      const root = xml.match(/<([\w:]+)[ >]/)?.[1];
      expect(root, name).toBeTruthy();
      expect(xml.trimEnd().endsWith(`</${root}>`) || xml.includes(`/>`), name).toBe(true);
    }
  });
});

describe('docxFileName', () => {
  it('slugs the title safely', () => {
    expect(docxFileName('The Moon Garden')).toBe('The-Moon-Garden.docx');
    expect(docxFileName('  ')).toBe('manuscript.docx');
    expect(docxFileName('Wíld! Stuff?')).toBe('Wíld-Stuff.docx');
  });
});
