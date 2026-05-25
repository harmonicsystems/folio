# @harmonic-systems/folio-cli

CLI for analyzing children's book manuscripts.

## Usage

```bash
folio analyze path/to/manuscript.txt
```

Outputs a JSON `ReadabilityProfile`.

## Status

Pre-alpha. Help text works; analysis is not yet wired up. See `../../ARCHITECTURE.md`.

## Development

```bash
pnpm install
pnpm --filter @harmonic-systems/folio-cli build
node packages/cli/dist/index.js --help
```
