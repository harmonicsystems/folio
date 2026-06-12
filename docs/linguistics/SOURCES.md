# Sources

Every linguistic claim in Folio traces to a citation. This file is the canonical record. When you add a metric, threshold, or norm to the codebase, add (or reference) its source here.

## Vocabulary

- **Beck, I. L., McKeown, M. G., & Kucan, L. (2013).** *Bringing Words to Life: Robust Vocabulary Instruction* (2nd ed.). Guilford Press.
  — Tier 1 / Tier 2 / Tier 3 vocabulary framework.

- **Dolch, E. W. (1948).** *Problems in Reading*. Garrard Press.
  — Dolch Sight Word List (220 service words + 95 nouns).

- **Fry, E. B. (1980).** "The new instant word list." *The Reading Teacher*, 34(3), 284–289.
  — Fry Instant Word Lists (1000 high-frequency words).

## Phonology and articulation

- **Crowe, K., & McLeod, S. (2020).** "Children's English consonant acquisition in the United States: A review." *American Journal of Speech-Language Pathology*, 29(4), 2155–2169.
  — Current consensus phoneme acquisition norms. Supersedes Smit et al. (1990) for English in the US.

- **Smit, A. B., Hand, L., Freilinger, J. J., Bernthal, J. E., & Bird, A. (1990).** "The Iowa Articulation Norms Project and its Nebraska replication." *Journal of Speech and Hearing Disorders*, 55(4), 779–798.
  — Historical articulation norms. Retained for cross-reference.

- **Carnegie Mellon University Pronouncing Dictionary (CMU dict).**
  http://www.speech.cs.cmu.edu/cgi-bin/cmudict
  — Open-license phonetic dictionary used for transcription. Public domain.

- **Liang, F. M. (1983).** "Word Hy-phen-a-tion by Com-pu-ter." PhD dissertation, Stanford University.
  — Liang–Knuth hyphenation algorithm used for syllabification fallback.

## Developmental psychology and language

- **Vygotsky, L. S. (1978).** *Mind in Society: The Development of Higher Psychological Processes*. Harvard University Press.
  — Zone of Proximal Development (ZPD).

- **Krashen, S. D. (1985).** *The Input Hypothesis: Issues and Implications*. Longman.
  — i+1 input hypothesis (the linguistic cousin of ZPD).

- **Tomasello, M. (1995).** "Joint attention as social cognition." In C. Moore & P. J. Dunham (Eds.), *Joint Attention: Its Origins and Role in Development* (pp. 103–130). Erlbaum.

- **Tomasello, M. (2003).** *Constructing a Language: A Usage-Based Theory of Language Acquisition*. Harvard University Press.

## Reading and shared reading

- **Whitehurst, G. J., Falco, F. L., Lonigan, C. J., Fischel, J. E., DeBaryshe, B. D., Valdez-Menchaca, M. C., & Caulfield, M. (1988).** "Accelerating language development through picture book reading." *Developmental Psychology*, 24(4), 552–559.
  — Dialogic reading foundational paper.

- **Whitehurst, G. J., & Lonigan, C. J. (1998).** "Child development and emergent literacy." *Child Development*, 69(3), 848–872.
  — PEER and CROWD frameworks.

- **Rayner, K. (1998).** "Eye movements in reading and information processing: 20 years of research." *Psychological Bulletin*, 124(3), 372–422.

- **Bus, A. G., van IJzendoorn, M. H., & Pellegrini, A. D. (1995).** "Joint book reading makes for success in learning to read: A meta-analysis on intergenerational transmission of literacy." *Review of Educational Research*, 65(1), 1–21.

## Syntax

- **Hunt, K. W. (1965).** *Grammatical Structures Written at Three Grade Levels.* NCTE Research Report No. 3. National Council of Teachers of English.
  — Finite-clause definition (a subject with its finite verb; coordinated predicates sharing a subject are the same clause) and clauses-per-unit as a syntactic maturity index. Anchors the clause construct behind `meanClausesPerSentence`. The engine counts per orthographic sentence, not per T-unit, and its estimator is an explicit lower bound (see `syntax/clauses.ts`).

- **Loban, W. (1976).** *Language Development: Kindergarten Through Grade Twelve.* NCTE Research Report No. 18.
  — Subordination as a developmental index. Construct cross-reference only; Loban's numeric norms describe child *production* and are NOT applied as input-text thresholds.

- **Quirk, R., Greenbaum, S., Leech, G., & Svartvik, J. (1985).** *A Comprehensive Grammar of the English Language.* Longman.
  — The four clause types (declarative, interrogative, imperative, exclamative); declarative as the unmarked default; closed-class memberships (subordinators, coordinators, relative pronouns, auxiliaries) used by `data/syntax-words.ts`. Anchors `SentenceTypeBreakdown` semantics and the carrier-clause classification of tagged quotations.

- **National Governors Association Center for Best Practices & Council of Chief State School Officers (2010).** *Common Core State Standards for English Language Arts*, Standard L.1.1.j.
  — The declarative / interrogative / imperative / exclamatory taxonomy as the K–2 pedagogical convention; motivates punctuation-first classification for this audience.

- **Nunberg, G. (1990).** *The Linguistics of Punctuation.* CSLI Lecture Notes 18.
  — The text-sentence as an orthographic unit delimited by terminal punctuation; the segmentation target construct in `syntax/segment.ts`.

- **Grefenstette, G., & Tapanainen, P. (1994).** "What is a word, what is a sentence? Problems of tokenisation." *Proceedings of COMPLEX '94*, Budapest.
  — The period–abbreviation ambiguity motivating the closed honorific/abbreviation guard list. The list contents are engine data, not a claim.

- **The Chicago Manual of Style (17th ed., 2017).** University of Chicago Press, ch. 13.
  — Editorial convention: a lowercase dialogue tag after a quotation ending in `?` or `!` continues the sentence. Convention source for quote-attribution segmentation, not a linguistic claim.

- **Flesch, R. (1948).** "A new readability yardstick." *Journal of Applied Psychology*, 32(3), 221–233.
  — Words-per-sentence as the conventional length unit for written-text difficulty (used for sentence length and its dispersion).

- **Brown, R. (1973).** *A First Language: The Early Stages.* Harvard University Press.
  — MLU in morphemes. **Considered and not used**: a speech-production measure over child utterances, morpheme-based; wrong construct for written input text. Recorded here so the decision isn't re-litigated.

## Readability frameworks (for cross-reference, not core algorithms)

- **Fountas, I. C., & Pinnell, G. S.** F&P Text Level Gradient. Heinemann (proprietary).
- **MetaMetrics.** The Lexile Framework for Reading. https://lexile.com
- **Beaver, J.** Developmental Reading Assessment (DRA).

## Industry standards

- **Society of Children's Book Writers and Illustrators (SCBWI).** Picture book dummy and submission guidelines. https://www.scbwi.org
- **Kole, M.** "Children's Book Length Guidelines." https://www.marykole.com/childrens-book-length

## How to cite in code

When implementing a metric, reference the source in a JSDoc comment:

```typescript
/**
 * Compute phoneme acquisition-age weighted decodability.
 * @see Crowe & McLeod (2020), AJSLP 29(4). See docs/linguistics/SOURCES.md.
 */
```
