# @harmonic-systems/folio-cli

CLI for analyzing children's book manuscripts.

## Usage

```bash
folio analyze path/to/manuscript.txt
```

Outputs a JSON `ReadabilityProfile`.

## Status

Working. `folio analyze <file> [--age-band <band>]` emits a complete `ReadabilityProfile` JSON to stdout including vocabulary, phonology, prosody, per-spread breakdown, reach words, and warnings. Manuscripts are read from a `.txt` file with one spread per blank-line-separated block (matching the `/paste` web surface's convention).

## Development

```bash
pnpm install
pnpm --filter @harmonic-systems/folio-cli build
node packages/cli/dist/index.js --help
```
