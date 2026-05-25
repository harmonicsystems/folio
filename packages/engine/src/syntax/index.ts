/**
 * Syntax analysis: sentence segmentation, clause counting, sentence-type
 * classification, length variance.
 *
 * Structural metrics only at this layer — developmental norms and
 * thresholds (e.g., expected MLU by age) are applied in `readability/`
 * when composing the full profile, and must cite their source per
 * docs/linguistics/SOURCES.md.
 *
 * Sentence-type classification supports downstream dialogic-reading
 * affordances (PEER / CROWD; Whitehurst & Lonigan 1998).
 *
 * TODO: implement. See ARCHITECTURE.md Milestone 1.
 */

import type { SyntaxProfile } from '../types.js';

export function analyzeSyntax(_text: string): SyntaxProfile {
  throw new Error('Not implemented. See ARCHITECTURE.md Milestone 1.');
}
