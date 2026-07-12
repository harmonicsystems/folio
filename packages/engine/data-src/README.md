# Vendored upstream data sources

Raw source files the generator scripts read. These are **build-time inputs**,
never imported by the engine — shipped engine data lives in `src/data/` as
TypeScript modules (see `src/data/README.md` for the rationale).

## cmudict-0.7b

- **What:** The CMU Pronouncing Dictionary, frozen release 0.7b. ~134k entries,
  `WORD  PH ON EM ES` per line, ARPABET with stress digits on vowels, `;;;`
  comment lines, alternate pronunciations as `WORD(2)`.
- **Source:** `http://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b`
  (CMUSphinx project SVN, canonical home of the 0.7b release).
- **Fetched:** 2026-07-12.
- **SHA-256:** `209a8b4cd265013e96f4658632a9878103b0c5abf62b50d4ef3ae1be226b29e4`
- **License:** BSD-2-Clause-style permissive (header inside the file); free for
  any use with attribution. See `docs/linguistics/SOURCES.md`.
- **Consumed by:** `scripts/generate-cmu-dict.mjs`, which regenerates
  `src/data/cmu-dict.ts` from a word list (corpus vocabulary ∪ current
  entries). Only first pronunciations are taken; keys are lowercased,
  straight-apostrophe, letters+apostrophe only (the tokenizer splits hyphens,
  so hyphenated upstream entries are never keyed whole).

Do not hand-edit vendored files. To update, re-fetch, update the hash and date
here, and re-run the generator.
