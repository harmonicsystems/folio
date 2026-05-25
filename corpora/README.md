# Corpora

Canonical children's books used as test fixtures for the engine.

Each book is stored as a `.txt` file with one spread per blank-line-separated block, and a sibling `.meta.json` with known properties for test assertion (Lexile, F&P level, word count, target age band, structural trope, etc.).

## File format

```
corpora/
  brown-bear.txt
  brown-bear.meta.json
  goodnight-moon.txt
  goodnight-moon.meta.json
  ...
```

### `<book>.txt`

One spread per blank-line-separated block. Spreads are 1-indexed implicitly.

```
In the great green room

There was a telephone
And a red balloon

And a picture of —
The cow jumping over the moon
```

### `<book>.meta.json`

```json
{
  "title": "Goodnight Moon",
  "ageBand": "picture",
  "fpLevel": "I",
  "lexile": 360,
  "wordCount": 130,
  "trope": "list",
  "expected": {
    "vocabulary.sightWordCoverage": { "min": 0.85 },
    "phonology.decodabilityScore": { "min": 0.75 }
  }
}
```

The `expected` block drives the test suite — the engine's output must satisfy these constraints for the book to pass.

## Selection criteria

Books in the corpus should be:

1. **Canonical** — Caldecott or Newbery recognition, ALA notable, or widely used in literacy research.
2. **Calibrated** — already analyzed in the published literature so we have ground-truth properties to test against.
3. **Diverse** — across age bands (board through chapter book), across structural tropes (cumulative, transformation, home-away-home, etc.), across linguistic register.

## In the repo

| Slug | Age band | Words | Source |
|---|---|---|---|
| `synthetic-board-book` | board | 20–100 | Synthetic stand-in (opposites, max repetition). |
| `owl-and-pussycat` | early-picture | ~210 | Edward Lear (1871) — Project Gutenberg #13650. |
| `peter-rabbit` | picture | ~155 | Beatrix Potter (1902) — Project Gutenberg #14838. |
| `aesop-selected` | early-reader | ~1,100 | Vernon Jones's translation of Aesop (1912) — Project Gutenberg #11339. |
| `wizard-of-oz-opening` | chapter | ~5,100 | L. Frank Baum (1900) — Project Gutenberg #55. |

All five age bands have at least one fixture. The constraint-validator in `packages/corpus-tests/` reads every `.meta.json` here and asserts the engine's output against the declared `expected` block.

## Starter corpus (Milestone 1)

To be added:

- *Brown Bear, Brown Bear, What Do You See?* (Martin/Carle) — high repetition, simple syntax. F&P B/C.
- *Goodnight Moon* (Brown) — list/catalog structure. F&P I.
- *Where the Wild Things Are* (Sendak) — home-away-home, Tier-2-rich vocabulary. Caldecott.
- *The Very Hungry Caterpillar* (Carle) — transformation, counting/days. F&P J.
- *Frog and Toad Are Friends* (Lobel) — early reader, episodic.

In-copyright entries above will likely live as private fixtures; public-domain stand-ins (additional traditional tales, more Potter) get checked in.

## Copyright

Full texts of in-copyright works will not be checked into the repo. Options:

1. **Synthetic stand-ins** — write our own texts that have the same structural properties.
2. **Public-domain works** — *The Tale of Peter Rabbit* (Potter, 1902), traditional tales (*The Three Little Pigs*, *Goldilocks*).
3. **Local-only fixtures** — keep canonical texts in a `.gitignore`d `corpora/private/` directory for personal calibration.

The current plan is to start with public-domain texts plus synthetic stand-ins, and use private fixtures only for personal validation.
