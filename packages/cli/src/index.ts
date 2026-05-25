#!/usr/bin/env node
/**
 * Folio CLI — analyze a children's book manuscript.
 *
 * Usage:
 *   folio analyze <manuscript.txt> [--age-band <band>]
 *
 * Manuscript format: one spread per blank-line-separated block. See
 * corpora/README.md for the convention.
 */

import { readFileSync } from 'node:fs';
import { analyze } from '@harmonic-systems/early-literacy';
import type { AgeBand, Manuscript } from '@harmonic-systems/early-literacy';

const AGE_BANDS: readonly AgeBand[] = [
  'board',
  'early-picture',
  'picture',
  'early-reader',
  'chapter',
];

function isAgeBand(value: string): value is AgeBand {
  return (AGE_BANDS as readonly string[]).includes(value);
}

interface ParsedArgs {
  file: string;
  ageBand: AgeBand;
}

function parseArgs(args: string[]): ParsedArgs {
  let file: string | undefined;
  let ageBand: AgeBand = 'picture';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--age-band') {
      const next = args[++i];
      if (!next || !isAgeBand(next)) {
        throw new Error(
          `--age-band requires one of: ${AGE_BANDS.join(', ')}`,
        );
      }
      ageBand = next;
    } else if (arg && !arg.startsWith('-')) {
      file = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!file) throw new Error('analyze requires a file path.');
  return { file, ageBand };
}

function buildManuscript(text: string, ageBand: AgeBand): Manuscript {
  const spreads = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text, i) => ({ index: i + 1, text }));
  return { ageBand, spreads };
}

function main(argv: string[]): void {
  const [, , command, ...args] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === 'analyze') {
    let parsed: ParsedArgs;
    try {
      parsed = parseArgs(args);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }

    const text = readFileSync(parsed.file, 'utf8');
    const manuscript = buildManuscript(text, parsed.ageBand);
    const profile = analyze(manuscript);
    process.stdout.write(JSON.stringify(profile, null, 2) + '\n');
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp(): void {
  process.stdout.write(`
Folio — children's book manuscript analyzer

Usage:
  folio analyze <manuscript.txt> [--age-band <band>]
                                    Analyze a manuscript and print a
                                    ReadabilityProfile as JSON.

  folio --help                      Show this help.

Age bands: ${AGE_BANDS.join(', ')} (default: picture)

Manuscript format: plain text, one spread per blank-line-separated
block. See https://github.com/harmonicsystems/folio for details.
`);
}

main(process.argv);
