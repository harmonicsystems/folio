/**
 * Top-level orchestration. Takes a Manuscript, returns a ReadabilityProfile
 * by composing the vocabulary, phonology, and prosody modules.
 *
 * TODO: implement. See ARCHITECTURE.md Milestone 1.
 */

import type { Manuscript, ReadabilityProfile } from '../types.js';

export function analyze(_manuscript: Manuscript): ReadabilityProfile {
  throw new Error('Not implemented. See ARCHITECTURE.md Milestone 1.');
}
