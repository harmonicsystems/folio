/**
 * Minimal OOXML (.docx) writer — zero dependencies (ADR 0016 §5).
 *
 * A .docx is a ZIP of XML parts. The document we emit is deliberately
 * trivial — uniform double-spaced 12pt Times New Roman paragraphs, one
 * header with a PAGE field, titlePg so page 1 goes headerless, US-Letter
 * with 1" margins — well within hand-rolling range. Entries are STORED
 * (no compression), so the ZIP layer is ~60 lines of offsets and CRCs.
 * Word does its own pagination; we ship paragraphs and styles, not pages.
 */

import type { SubmissionDoc } from './submission.js';

// ---- ZIP (stored entries only) ---------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

function u16(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff];
}
function u32(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

/** Store (method 0) every entry; fixed DOS timestamp keeps output stable. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.bytes);
    const size = entry.bytes.length;
    const local = [
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method: stored
      ...u16(0), // mod time
      ...u16(0x21), // mod date (1980-01-01)
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra length
    ];
    chunks.push(...local, ...nameBytes, ...entry.bytes);
    central.push(
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0x21),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(offset),
      ...nameBytes,
    );
    offset += local.length + nameBytes.length + size;
  }

  const centralOffset = offset;
  const end = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(centralOffset),
    ...u16(0),
  ];
  return Uint8Array.from([...chunks, ...central, ...end]);
}

// ---- OOXML parts ------------------------------------------------------------

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const CONTENT_TYPES =
  XML_DECL +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
  `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  XML_DECL +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

const DOC_RELS =
  XML_DECL +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>` +
  `</Relationships>`;

/** 12pt TNR; Normal is double-spaced (w:line 480/auto = 2 × 240). */
const STYLES =
  XML_DECL +
  `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:docDefaults><w:rPrDefault><w:rPr>` +
  `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>` +
  `<w:sz w:val="24"/><w:szCs w:val="24"/>` +
  `</w:rPr></w:rPrDefault></w:docDefaults>` +
  `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>` +
  `<w:pPr><w:spacing w:after="0" w:line="480" w:lineRule="auto"/></w:pPr>` +
  `</w:style>` +
  `</w:styles>`;

/** Right-aligned "LASTNAME / TITLE / <page#>" via a PAGE field. */
function headerXml(runningHeader: string): string {
  return (
    XML_DECL +
    `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="auto"/><w:jc w:val="right"/></w:pPr>` +
    `<w:r><w:t xml:space="preserve">${esc(runningHeader)} / </w:t></w:r>` +
    `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
    `<w:r><w:t>2</w:t></w:r>` +
    `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
    `</w:p></w:hdr>`
  );
}

function p(
  text: string,
  opts: {
    align?: 'left' | 'right' | 'center';
    firstLineIndent?: boolean;
    singleSpaced?: boolean;
    spaceBeforeTwips?: number;
  } = {},
): string {
  const pPr =
    `<w:pPr>` +
    (opts.singleSpaced ? `<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>` : '') +
    (opts.spaceBeforeTwips ? `<w:spacing w:before="${opts.spaceBeforeTwips}" w:line="480" w:lineRule="auto"/>` : '') +
    (opts.firstLineIndent ? `<w:ind w:firstLine="720"/>` : '') +
    (opts.align && opts.align !== 'left' ? `<w:jc w:val="${opts.align}"/>` : '') +
    `</w:pPr>`;
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function documentXml(doc: SubmissionDoc): string {
  const parts: string[] = [];

  // Page 1 head: contact block left (single-spaced), rounded count right.
  for (const line of [doc.authorName, ...doc.contactLines].filter(Boolean)) {
    parts.push(p(line, { singleSpaced: true }));
  }
  parts.push(p(`about ${doc.roundedWordCount.toLocaleString('en-US')} words`, { align: 'right', singleSpaced: true }));

  // Title ~⅓ down (space-before ≈ 2.2in = 3170 twips), byline beneath.
  parts.push(p(doc.title, { align: 'center', spaceBeforeTwips: 3170 }));
  if (doc.byline) parts.push(p(doc.byline, { align: 'center' }));

  for (const block of doc.blocks) {
    parts.push(
      block.kind === 'marker'
        ? p(block.text, {})
        : p(block.text, { firstLineIndent: true }),
    );
  }

  // Letter, 1" margins, header from page 2 (titlePg), header 0.5" down.
  const sectPr =
    `<w:sectPr>` +
    `<w:headerReference w:type="default" r:id="rId2"/>` +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>` +
    `<w:titlePg/>` +
    `</w:sectPr>`;

  return (
    XML_DECL +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"` +
    ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<w:body>${parts.join('')}${sectPr}</w:body></w:document>`
  );
}

export function buildDocxBytes(doc: SubmissionDoc): Uint8Array {
  const encoder = new TextEncoder();
  return buildZip([
    { name: '[Content_Types].xml', bytes: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', bytes: encoder.encode(ROOT_RELS) },
    { name: 'word/document.xml', bytes: encoder.encode(documentXml(doc)) },
    { name: 'word/_rels/document.xml.rels', bytes: encoder.encode(DOC_RELS) },
    { name: 'word/styles.xml', bytes: encoder.encode(STYLES) },
    { name: 'word/header1.xml', bytes: encoder.encode(headerXml(doc.runningHeader)) },
  ]);
}

export function docxFileName(title: string): string {
  const slug =
    title
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '') // keep letters in any script
      .replace(/\s+/g, '-') || 'manuscript';
  return `${slug}.docx`;
}
