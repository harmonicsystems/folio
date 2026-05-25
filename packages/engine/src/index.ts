/**
 * @harmonic-systems/early-literacy
 *
 * Developmental linguistic analysis for children's literature.
 *
 * See ARCHITECTURE.md and docs/linguistics/SOURCES.md.
 */

export * from './types.js';

export { analyze } from './readability/index.js';
export {
  analyzeVocabulary,
  identifyReachWords,
  identifyReachWordsBySpread,
  typeTokenRatio,
  tokenize,
  tokenizeWords,
  isSightWord,
  sightWordCoverage,
} from './vocabulary/index.js';

export {
  analyzePhonology,
  analyzePhonologyBySpread,
  estimatePronunciation,
  getPronunciation,
  syllabify,
  syllableCount,
} from './phonology/index.js';

// Module re-exports — uncomment as implementations land.
// export { analyzeSyntax } from './syntax/index.js';
// export { analyzeProsody } from './prosody/index.js';
