# Linguistic Data Files

This directory holds the linguistic data the engine depends on. Treat these as **first-class IP**: version them, document provenance, keep citations in `docs/linguistics/SOURCES.md`.

Data is stored as TypeScript modules (not JSON) so the engine stays browser-portable — no `readFileSync`, no file-IO side effects, bundlers can tree-shake unused lists.

## Currently included

- **`dolch.ts`** — Dolch (1948) sight word lists. All 220 service words across five grade-level groups (pre-primer, primer, first, second, third) plus 95 picture nouns. Exports per-group arrays, a combined `DOLCH_ALL` set, and a `dolchLevel(word)` lookup.
- **`fry.ts`** — Fry (1980) instant word list, **first 100 only** for now. Groups 2–10 (words 101–1000) are a known follow-up. The first 100 alone covers ~50% of typical printed English and is enough for sight-word coverage to be useful on board books and very-early-reader text.

## Pending (Milestones 1–2)

- **`fry.ts`** — extend to groups 2–10. Requires careful transcription from Fry (1980).
- **`cmu-dict.ts`** — derived from the CMU Pronouncing Dictionary, preprocessed for fast phoneme lookup.
- **`phoneme-norms.ts`** — Crowe & McLeod (2020) acquisition norms by phoneme, with place, manner, voicing.
- **`vocabulary-tiers.ts`** — Beck/McKeown/Kucan Tier 1 / Tier 2 / Tier 3 classification. **This is the open architectural decision** — see ARCHITECTURE.md open questions. Tier 1 needs a sourced proxy (General Service List? Children's Printed Word Database?). Tier 2 requires curation.

## Verification

The Dolch and Fry lists are widely reproduced (educational worksheets, libraries, university literacy programs). They are also widely *misreproduced* — small variants and additions appear in the wild. When verifying:

1. Cross-reference against multiple independent primary sources (libraries, university literacy centers, the original publications where possible).
2. Treat any list with > 220 Dolch service words or that re-orders Fry's first 100 as derivative, not canonical.
3. Open issues for any discrepancies; do not silently amend the lists.

## License notes

- CMU dict: permissively licensed (free for any use).
- Dolch (1948) and Fry (1980) word lists: factual data, no copyrightable creative authorship. Published > 45 years ago. Public-domain status for the *words themselves*.
- Beck tier classifications: derivative work — when added, store as our own curation with attribution.

See `../../../docs/linguistics/SOURCES.md` for full citations.
