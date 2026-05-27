/**
 * Core types for the early-literacy engine.
 *
 * These types are the public contract. Internal implementations may change;
 * these should remain stable across minor versions.
 *
 * See docs/linguistics/SOURCES.md for citations.
 */

/**
 * Developmental age bands corresponding to children's book categories.
 *
 * Word count targets per band:
 * - `board`         (0–3): ≤100 words
 * - `early-picture` (0–3): ≤400 words
 * - `picture`       (3–7): ≤600 words
 * - `early-reader`  (5–9): 1,000–2,500 words
 * - `chapter`       (7–10): 5,000–10,000 words
 *
 * @see Mary Kole, "Children's Book Length Guidelines"
 * @see SCBWI submission standards
 */
export type AgeBand =
  | 'board'
  | 'early-picture'
  | 'picture'
  | 'early-reader'
  | 'chapter';

/**
 * A single spread in a picture book — typically one of 16 in a 32-page
 * standard format. For longer-form work (chapter books), `spreads` is a
 * stand-in for chapters or sections.
 */
export interface Spread {
  /** 1-indexed position. For picture books, typically 1–16. */
  index: number;
  /** The text content of this spread. May be empty for wordless spreads. */
  text: string;
  /** True if this spread is intentionally wordless. */
  wordless?: boolean;
  /** Optional authorial notes about this spread. */
  notes?: string;
}

/**
 * A complete manuscript with metadata sufficient for analysis.
 */
export interface Manuscript {
  title?: string;
  ageBand: AgeBand;
  spreads: Spread[];
}

/**
 * The output of `analyze()` — a complete developmental profile of a manuscript.
 */
export interface ReadabilityProfile {
  ageBand: AgeBand;
  wordCount: number;
  wordCountTarget: { min: number; max: number };
  sentenceCount: number;
  averageSentenceLength: number;

  vocabulary: VocabularyProfile;
  phonology: PhonologyProfile;
  syntax: SyntaxProfile;
  prosody: ProsodyProfile;

  /**
   * Words that sit at or just beyond the reader's expected mastery — the
   * productive ZPD zone (Vygotsky 1978, Krashen's i+1, Beck/McKeown/Kucan
   * Tier 2). A "good" picture book intentionally includes some of these.
   */
  reachWords: ReachWord[];

  /** Developmental warnings — text demanding more than the age band supports. */
  warnings: Warning[];

  /**
   * Per-spread analysis. One entry per `Manuscript.spreads` entry, in
   * order. Spread-first authoring surfaces (e.g., the editor in
   * `packages/web/`) bind sidebar panels to this.
   *
   * @see docs/decisions/0003-spread-native-engine-api.md
   */
  perSpread: SpreadProfile[];
}

/**
 * Per-spread analysis. Indexed parallel to `Manuscript.spreads`.
 *
 * Per-spread word-count signals (`wordCountCeiling`, the
 * `SPREAD_WORD_COUNT_HIGH` warning) are engine *heuristics*, not cited
 * developmental norms — picture books distribute words unevenly by
 * design. See ADR 0003 for the formula and rationale.
 */
export interface SpreadProfile {
  index: number;
  wordCount: number;
  /**
   * Heuristic upper-soft-bound for this spread's word count. Computed as
   * `ceil(manuscriptWordCountTarget.max / nonWordlessSpreadCount * 1.5)`.
   * Wordless spreads have ceiling `0`. UI signal, not a developmental
   * claim.
   */
  wordCountCeiling: number;
  /** Percentage (0–1) of this spread's tokens covered by Dolch + Fry. */
  sightWordCoverage: number;
  /** Reach words that first appear on this spread. */
  reachWords: ReachWord[];
  /** Per-spread warnings (e.g., `SPREAD_WORD_COUNT_HIGH`, info severity). */
  warnings: Warning[];
}

export interface VocabularyProfile {
  /** Percentage (0–1) of tokens classified as Tier 1 (Beck et al.). */
  tier1Coverage: number;
  tier2Words: string[];
  tier3Words: string[];
  /** Percentage (0–1) of tokens covered by Dolch + Fry sight word lists. */
  sightWordCoverage: number;
  uniqueWords: number;
  /** Type-token ratio — vocabulary diversity (0–1). */
  typeTokenRatio: number;
}

export interface PhonologyProfile {
  phonemeInventory: PhonemeOccurrence[];
  syllableTypes: SyllableTypeBreakdown;
  averageSyllablesPerWord: number;
  /**
   * 0–1 score reflecting how decodable the text is for an emerging reader.
   * Weighted by phoneme acquisition age (Crowe & McLeod 2020) and syllable
   * complexity.
   */
  decodabilityScore: number;
}

export interface PhonemeOccurrence {
  /** IPA representation. */
  phoneme: string;
  /** Total occurrences in the manuscript. */
  count: number;
  /** Spread index where this phoneme first appears. */
  firstSpread: number;
  place: ArticulationPlace;
  manner: ArticulationManner;
  voicing: 'voiced' | 'voiceless';
  /**
   * Typical age (in years) at which 90% of children produce this phoneme
   * accurately.
   * @see Crowe & McLeod (2020), AJSLP 29(4)
   */
  acquisitionAge: number;
}

export type ArticulationPlace =
  | 'bilabial'
  | 'labiodental'
  | 'dental'
  | 'alveolar'
  | 'postalveolar'
  | 'palatal'
  | 'velar'
  | 'glottal';

export type ArticulationManner =
  | 'stop'
  | 'fricative'
  | 'affricate'
  | 'nasal'
  | 'liquid'
  | 'glide'
  | 'vowel';

export interface SyllableTypeBreakdown {
  /** Consonant-vowel (e.g., "go"). */
  CV: number;
  /** Vowel-consonant (e.g., "at"). */
  VC: number;
  /** Consonant-vowel-consonant (e.g., "cat"). */
  CVC: number;
  /** Consonant cluster + vowel + consonant (e.g., "stop"). */
  CCVC: number;
  /** Consonant-vowel + cluster (e.g., "lost"). */
  CVCC: number;
  /** Vowel only (e.g., "a"). */
  V: number;
  /** Other / complex patterns. */
  other: number;
}

/**
 * Structural sentence-level metrics. Norms and thresholds (e.g., target
 * mean-length-of-utterance by grade) are out of scope here — they get
 * applied by `readability/` when composing the profile, and must cite
 * their source per docs/linguistics/SOURCES.md.
 *
 * Sentence type breakdown supports dialogic-reading affordances (PEER /
 * CROWD prompts, Whitehurst & Lonigan 1998) — already in SOURCES.md.
 */
export interface SyntaxProfile {
  /** Mean clauses per sentence — proxy for subordination depth. */
  meanClausesPerSentence: number;
  /** Standard deviation of sentence length in words. Rhythm vs monotony. */
  sentenceLengthStdev: number;
  sentenceTypes: SentenceTypeBreakdown;
}

export interface SentenceTypeBreakdown {
  declarative: number;
  interrogative: number;
  exclamatory: number;
  imperative: number;
}

export interface ProsodyProfile {
  /** Dominant metric foot pattern, when detectable. */
  dominantMeter?: 'iambic' | 'trochaic' | 'anapestic' | 'dactylic' | 'mixed';
  /** Detected rhyme scheme notation (e.g., "ABAB", "AABB"). */
  rhymeScheme?: string;
  /** 0–1 score reflecting consistency of meter where present. */
  meterConsistency: number;
}

export interface ReachWord {
  word: string;
  /** Spread on which this reach word first appears. */
  spread: number;
  reason: 'tier-2' | 'tier-3' | 'low-frequency' | 'morphologically-complex';
  /** A simpler suggestion, if appropriate. Optional. */
  suggestion?: string;
}

export interface Warning {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  spread?: number;
}
