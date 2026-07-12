/**
 * Web-side reflection derivation for the editor's quiet studio reader.
 *
 * Reflections are deterministic presentations of existing engine evidence.
 * They do not add linguistic claims, grade the manuscript, or suggest prose.
 * Reading situation changes priority only; it never changes engine behavior.
 *
 * @see docs/decisions/0012-read-aloud-picture-book-mvp.md
 * @see docs/decisions/0013-quiet-studio-reader.md
 */

import type {
  ReadabilityProfile,
  Spread,
} from '@harmonic-systems/early-literacy';

export type ReadingSituation =
  | 'adult-read-aloud'
  | 'shared-reading'
  | 'independent-reading';

export type ReflectionDomain =
  | 'audience'
  | 'vocabulary'
  | 'phonology'
  | 'syntax'
  | 'prosody'
  | 'flow';

export type ReflectionMode = 'analyze' | 'phonology' | 'prosody';

export interface Reflection {
  id: string;
  domain: ReflectionDomain;
  title: string;
  observation: string;
  evidence: string;
  confidence: 'direct' | 'estimated' | 'limited';
  mode: ReflectionMode;
  spread?: number;
  phoneme?: string;
  priority: number;
}

export interface ReflectionInput {
  profile: ReadabilityProfile;
  spreads: readonly Spread[];
  readingSituation: ReadingSituation;
  guessedWords: readonly string[];
}

const CONTEXT_PRIORITY: Record<
  ReadingSituation,
  Partial<Record<ReflectionDomain, number>>
> = {
  'adult-read-aloud': { prosody: 30, phonology: 20, flow: 20, vocabulary: 10 },
  'shared-reading': { vocabulary: 25, phonology: 20, prosody: 15, flow: 15 },
  'independent-reading': { audience: 30, vocabulary: 25, syntax: 20, flow: 10 },
};

/** Return at most `limit` reflections, ordered for the reading situation. */
export function deriveReflections(
  input: ReflectionInput,
  limit = 3,
): Reflection[] {
  const { profile, readingSituation, guessedWords } = input;
  if (profile.wordCount === 0 || limit <= 0) return [];

  const candidates: Reflection[] = [];
  const add = (reflection: Omit<Reflection, 'priority'>, base: number): void => {
    candidates.push({
      ...reflection,
      priority:
        base + (CONTEXT_PRIORITY[readingSituation][reflection.domain] ?? 0),
    });
  };

  const filled = profile.perSpread.filter((spread) => spread.wordCount > 0);
  const longest = filled.slice().sort((a, b) => b.wordCount - a.wordCount)[0];
  if (longest && filled.length >= 2) {
    const others = filled.filter((spread) => spread.index !== longest.index);
    const typical = median(others.map((spread) => spread.wordCount));
    if (typical > 0 && longest.wordCount >= typical * 1.5) {
      add(
        {
          id: `density-${longest.index}`,
          domain: 'flow',
          title: `Spread ${longest.index} carries more language`,
          observation: `${longest.wordCount} words here, compared with a typical ${formatCount(typical)} across the other filled spreads.`,
          evidence: 'Spread word counts; comparison is within this manuscript.',
          confidence: 'direct',
          mode: 'analyze',
          spread: longest.index,
        },
        45,
      );
    }
  }

  const reachBySpread = new Map<number, string[]>();
  for (const reach of profile.reachWords) {
    const words = reachBySpread.get(reach.spread) ?? [];
    words.push(reach.word);
    reachBySpread.set(reach.spread, words);
  }
  const reachCluster = [...reachBySpread.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0];
  if (reachCluster) {
    const [spread, words] = reachCluster;
    add(
      {
        id: `reach-${spread}`,
        domain: 'vocabulary',
        title: `${words.length} less-familiar ${words.length === 1 ? 'word arrives' : 'words arrive'} on spread ${spread}`,
        observation: previewWords(words),
        evidence: 'Outside the Dale–Chall familiar-word proxy and Dolch/Fry sight-word lists.',
        confidence: 'limited',
        mode: 'analyze',
        spread,
      },
      words.length >= 3 ? 50 : 28,
    );
  }

  const rhyme = profile.prosody.rhymeScheme;
  if (rhyme) {
    add(
      {
        id: 'rhyme-scheme',
        domain: 'prosody',
        title: `Rhyme pattern ${rhyme} is visible`,
        observation: 'Repeated letters mark line endings with matching pronunciation suffixes.',
        evidence: guessedWords.length > 0
          ? `${guessedWords.length} pronunciation ${guessedWords.length === 1 ? 'estimate may affect' : 'estimates may affect'} this reading.`
          : 'All words contributing to the analysis have dictionary pronunciations.',
        confidence: guessedWords.length > 0 ? 'estimated' : 'direct',
        mode: 'prosody',
      },
      55,
    );
  }

  const meter = profile.prosody.dominantMeter;
  if (meter && profile.prosody.meterConsistency >= 0.4) {
    add(
      {
        id: 'meter-shape',
        domain: 'prosody',
        title: `${capitalize(meter)} rhythm is the closest detected pattern`,
        observation: `${Math.round(profile.prosody.meterConsistency * 100)}% of syllable stresses align with that template.`,
        evidence: 'Written stress suggests a rehearsal pattern; it does not predict a reader’s performance.',
        confidence: guessedWords.length > 0 ? 'estimated' : 'limited',
        mode: 'prosody',
      },
      42,
    );
  }

  const firstSounds = new Map<number, string[]>();
  for (const occurrence of profile.phonology.phonemeInventory) {
    const sounds = firstSounds.get(occurrence.firstSpread) ?? [];
    sounds.push(occurrence.phoneme);
    firstSounds.set(occurrence.firstSpread, sounds);
  }
  const soundArrival = [...firstSounds.entries()]
    .filter(([spread]) => spread !== filled[0]?.index)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (soundArrival && soundArrival[1].length >= 2) {
    const [spread, sounds] = soundArrival;
    add(
      {
        id: `sounds-${spread}`,
        domain: 'phonology',
        title: `New sounds enter on spread ${spread}`,
        observation: sounds.slice(0, 5).map((sound) => `/${sound}/`).join(', '),
        evidence: 'First appearance in the manuscript’s phoneme inventory.',
        confidence: guessedWords.length > 0 ? 'estimated' : 'direct',
        mode: 'phonology',
        spread,
        phoneme: sounds[0],
      },
      36,
    );
  }

  const questions = profile.syntax.sentenceTypes.interrogative;
  const imperatives = profile.syntax.sentenceTypes.imperative;
  if (questions + imperatives > 0) {
    add(
      {
        id: 'sentence-invitations',
        domain: 'syntax',
        title: 'The sentence mix changes how the text addresses a listener',
        observation: `${questions} ${questions === 1 ? 'question' : 'questions'} · ${imperatives} ${imperatives === 1 ? 'imperative' : 'imperatives'}`,
        evidence: 'Orthographic sentence-type classification; this does not measure engagement.',
        confidence: 'limited',
        mode: 'analyze',
      },
      24,
    );
  }

  if (readingSituation === 'independent-reading') {
    add(
      {
        id: 'independent-reading-profile',
        domain: 'audience',
        title: 'Independent-reading signals are in view',
        observation: `${Math.round(profile.vocabulary.sightWordCoverage * 100)}% sight-word coverage · ${Math.round(profile.phonology.decodabilityScore * 100)}% decodability proxy`,
        evidence: 'Decodability uses speech-production ages as a proxy and should be read with its documented limits.',
        confidence: 'limited',
        mode: 'analyze',
      },
      40,
    );
  }

  return candidates
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const current = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) return current;
  return ((sorted[middle - 1] ?? current) + current) / 2;
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function previewWords(words: readonly string[]): string {
  const visible = words.slice(0, 4).join(', ');
  const remaining = words.length - 4;
  return remaining > 0 ? `${visible}, and ${remaining} more` : visible;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
