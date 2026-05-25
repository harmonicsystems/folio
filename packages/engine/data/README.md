# Linguistic Data Files

This directory holds the linguistic data the engine depends on. Treat these as **first-class IP**: version them, document provenance, keep citations in `docs/linguistics/SOURCES.md`.

## Expected files (to be added in Milestones 1–2)

- `cmu-dict.json` — derived from the CMU Pronouncing Dictionary, preprocessed for fast lookup.
- `dolch.json` — Dolch sight word lists (220 service words + 95 nouns).
- `fry.json` — Fry 1000 instant words.
- `phoneme-norms.json` — Crowe & McLeod (2020) acquisition norms by phoneme, with place, manner, voicing.
- `vocabulary-tiers.json` — Beck/McKeown/Kucan Tier 1 / Tier 2 / Tier 3 classification. Tier 2 requires curation.

## License notes

- CMU dict: permissively licensed (free for any use).
- Dolch and Fry lists: public domain.
- Beck tier classifications: derivative work — store as our own curation, attributed.

See `../../../docs/linguistics/SOURCES.md` for full citations.
