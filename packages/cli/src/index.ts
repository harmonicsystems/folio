#!/usr/bin/env node
/**
 * Folio CLI — analyze a children's book manuscript.
 *
 * Usage: folio analyze <manuscript.txt> [--age-band <band>]
 *
 * TODO: wire up to the engine once Milestone 1 lands.
 * See ARCHITECTURE.md.
 */

import { readFileSync } from 'node:fs';

function main(argv: string[]): void {
  const [, , command, ...args] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === 'analyze') {
    const file = args[0];
    if (!file) {
      console.error('Error: analyze requires a file path.');
      process.exit(1);
    }
    const text = readFileSync(file, 'utf8');
    console.log(`Loaded ${text.length} characters from ${file}.`);
    console.log(
      'Analysis not yet implemented. See ARCHITECTURE.md Milestone 1.'
    );
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp(): void {
  console.log(`
Folio — children's book manuscript analyzer

Usage:
  folio analyze <manuscript.txt>    Analyze a manuscript file
  folio --help                      Show this help

Status: pre-alpha. See ARCHITECTURE.md.
`);
}

main(process.argv);
