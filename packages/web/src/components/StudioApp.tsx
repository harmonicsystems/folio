import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyze,
  analyzeProsody,
  getGuessedWords,
  getPronunciation,
  getWordPhonemes,
  syllableCount,
  tokenizeWords,
  type AgeBand,
  type ReadabilityProfile,
} from '@harmonic-systems/early-literacy';
import PageEditor from './PageEditor.js';
import {
  deriveReflections,
  type ReadingSituation,
  type Reflection,
} from '../reflections.js';
import {
  toEngineManuscript,
  TRIM_SIZES,
  type PagePlacement,
  type WebManuscript,
  type WebSpread,
} from '../types.js';
import '../styles/studio.css';

type Lens = 'draft' | 'listen' | 'language';
type Side = 'left' | 'right';

interface Sample {
  ageBand: AgeBand;
  label: string;
  text: string;
}

interface Props {
  samples: Record<string, Sample>;
}

interface EditorHandle {
  getText: () => string;
  getMarkdown: () => string;
  setText: (text: string) => void;
  getStateJSON: () => string;
  setStateJSON: (json: string) => boolean;
}

interface SavedPage {
  text: string;
  placement: PagePlacement;
  state?: string;
}

interface SavedStudio {
  version: 3;
  title: string;
  ageBand: AgeBand;
  readingSituation: ReadingSituation;
  currentSpread: number;
  lens: Lens;
  spreads: Array<{ leftPage: SavedPage; rightPage: SavedPage }>;
  savedAt: number;
}

const SPREAD_COUNT = 16;
const DRAFT_KEY = 'folio.draft.v3';
const LEGACY_DRAFT_KEY = 'folio.draft.v2';

const AGE_BANDS: Array<{ id: AgeBand; label: string }> = [
  { id: 'board', label: 'Board book · 0–3' },
  { id: 'early-picture', label: 'Early picture · 0–3' },
  { id: 'picture', label: 'Picture book · 3–7' },
  { id: 'early-reader', label: 'Early reader · 5–9' },
  { id: 'chapter', label: 'Chapter book · 7–10' },
];

const SITUATIONS: Array<{ id: ReadingSituation; label: string }> = [
  { id: 'adult-read-aloud', label: 'Read aloud' },
  { id: 'shared-reading', label: 'Read together' },
  { id: 'independent-reading', label: 'Read independently' },
];

const PLACEMENTS: Array<{ id: PagePlacement; label: string }> = [
  { id: 'text-only', label: 'Text only' },
  { id: 'text-top', label: 'Text top' },
  { id: 'text-bottom', label: 'Text bottom' },
  { id: 'illustration-only', label: 'Illustration' },
];

function blankPlacements(): Array<{ left: PagePlacement; right: PagePlacement }> {
  return Array.from({ length: SPREAD_COUNT }, () => ({
    left: 'text-only',
    right: 'text-only',
  }));
}

function editors(): Record<string, EditorHandle> {
  return (
    window as unknown as { __pageEditors?: Record<string, EditorHandle> }
  ).__pageEditors ?? {};
}

function isReadingSituation(value: unknown): value is ReadingSituation {
  return (
    value === 'adult-read-aloud' ||
    value === 'shared-reading' ||
    value === 'independent-reading'
  );
}

function isLens(value: unknown): value is Lens {
  return value === 'draft' || value === 'listen' || value === 'language';
}

function loadSavedStudio(): SavedStudio | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedStudio>;
      if (parsed.version === 3 && Array.isArray(parsed.spreads)) {
        return parsed as SavedStudio;
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as {
      version?: number;
      ageBand?: AgeBand;
      spreads?: Array<{
        leftPage?: SavedPage;
        rightPage?: SavedPage;
      }>;
    };
    if (legacy.version !== 2 || !Array.isArray(legacy.spreads)) return null;
    return {
      version: 3,
      title: 'Untitled manuscript',
      ageBand: legacy.ageBand ?? 'picture',
      readingSituation: 'adult-read-aloud',
      currentSpread: 0,
      lens: 'draft',
      spreads: legacy.spreads.map((spread) => ({
        leftPage: spread.leftPage ?? { text: '', placement: 'text-only' },
        rightPage: spread.rightPage ?? { text: '', placement: 'text-only' },
      })),
      savedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function makeWebManuscript(
  ageBand: AgeBand,
  readingSituation: ReadingSituation,
  placements: Array<{ left: PagePlacement; right: PagePlacement }>,
  title: string,
): WebManuscript {
  const handles = editors();
  const spreads: WebSpread[] = Array.from(
    { length: SPREAD_COUNT },
    (_, index) => ({
      index: index + 1,
      leftPage: {
        text: handles[`${index + 1}-left`]?.getText() ?? '',
        placement: placements[index]?.left ?? 'text-only',
      },
      rightPage: {
        text: handles[`${index + 1}-right`]?.getText() ?? '',
        placement: placements[index]?.right ?? 'text-only',
      },
    }),
  );
  return {
    title,
    ageBand,
    readingSituation,
    trimSize: TRIM_SIZES.STANDARD_PORTRAIT,
    spreads,
  };
}

export default function StudioApp({ samples }: Props) {
  const [title, setTitle] = useState('Untitled manuscript');
  const [ageBand, setAgeBand] = useState<AgeBand>('picture');
  const [readingSituation, setReadingSituation] =
    useState<ReadingSituation>('adult-read-aloud');
  const [lens, setLens] = useState<Lens>('draft');
  const [currentSpread, setCurrentSpread] = useState(0);
  const [placements, setPlacements] = useState(blankPlacements);
  const [profile, setProfile] = useState<ReadabilityProfile | null>(null);
  const [manuscript, setManuscript] = useState<WebManuscript | null>(null);
  const [guessedWords, setGuessedWords] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [activePhoneme, setActivePhoneme] = useState<string | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const readyPages = useRef(new Set<string>());
  const restored = useRef(false);
  const analyzeTimer = useRef<number | null>(null);

  const runAnalysis = useCallback(() => {
    const web = makeWebManuscript(
      ageBand,
      readingSituation,
      placements,
      title,
    );
    const engine = toEngineManuscript(web);
    const nextProfile = analyze(engine);
    const fullText = engine.spreads.map((spread) => spread.text).join('\n\n');
    setManuscript(web);
    setProfile(nextProfile);
    setGuessedWords(getGuessedWords(fullText));

    const handles = editors();
    const saved: SavedStudio = {
      version: 3,
      title,
      ageBand,
      readingSituation,
      currentSpread,
      lens,
      spreads: web.spreads.map((spread, index) => ({
        leftPage: {
          text: spread.leftPage.text,
          placement: spread.leftPage.placement,
          state: handles[`${index + 1}-left`]?.getStateJSON(),
        },
        rightPage: {
          text: spread.rightPage.text,
          placement: spread.rightPage.placement,
          state: handles[`${index + 1}-right`]?.getStateJSON(),
        },
      })),
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(saved));
      setSavedAt(saved.savedAt);
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [ageBand, currentSpread, lens, placements, readingSituation, title]);

  const scheduleAnalysis = useCallback(() => {
    if (analyzeTimer.current !== null) window.clearTimeout(analyzeTimer.current);
    analyzeTimer.current = window.setTimeout(runAnalysis, 220);
  }, [runAnalysis]);

  useEffect(() => {
    let readinessTimer: number | null = null;

    const restoreWhenReady = () => {
      const handles = editors();
      if (Object.keys(handles).length !== SPREAD_COUNT * 2 || restored.current) {
        return;
      }
      restored.current = true;
      if (readinessTimer !== null) window.clearInterval(readinessTimer);
      const saved = loadSavedStudio();
      if (saved) {
        setTitle(saved.title || 'Untitled manuscript');
        setAgeBand(saved.ageBand ?? 'picture');
        setReadingSituation(
          isReadingSituation(saved.readingSituation)
            ? saved.readingSituation
            : 'adult-read-aloud',
        );
        setCurrentSpread(
          Math.max(0, Math.min(SPREAD_COUNT - 1, saved.currentSpread ?? 0)),
        );
        setLens(isLens(saved.lens) ? saved.lens : 'draft');
        setPlacements(
          Array.from({ length: SPREAD_COUNT }, (_, index) => ({
            left: saved.spreads[index]?.leftPage.placement ?? 'text-only',
            right: saved.spreads[index]?.rightPage.placement ?? 'text-only',
          })),
        );
        saved.spreads.forEach((spread, index) => {
          const left = handles[`${index + 1}-left`];
          const right = handles[`${index + 1}-right`];
          if (
            !(
              spread.leftPage.state &&
              left?.setStateJSON(spread.leftPage.state)
            )
          ) {
            left?.setText(spread.leftPage.text ?? '');
          }
          if (
            !(
              spread.rightPage.state &&
              right?.setStateJSON(spread.rightPage.state)
            )
          ) {
            right?.setText(spread.rightPage.text ?? '');
          }
        });
        setSavedAt(saved.savedAt ?? 0);
      }
      window.setTimeout(runAnalysis, 0);
    };
    const onReady = (event: Event) => {
      const detail = (event as CustomEvent<{ spread: number; side: Side }>).detail;
      readyPages.current.add(`${detail.spread}-${detail.side}`);
      restoreWhenReady();
    };
    const onChange = () => scheduleAnalysis();
    document.addEventListener('page-editor-ready', onReady);
    document.addEventListener('page-text-change', onChange);
    // Child effects can register their editor handles before this parent
    // effect subscribes to the ready event. Poll the registry briefly so
    // a reload can never miss restoration because of React effect order.
    readinessTimer = window.setInterval(restoreWhenReady, 50);
    restoreWhenReady();
    return () => {
      if (readinessTimer !== null) window.clearInterval(readinessTimer);
      document.removeEventListener('page-editor-ready', onReady);
      document.removeEventListener('page-text-change', onChange);
    };
  }, [runAnalysis, scheduleAnalysis]);

  useEffect(() => {
    if (!restored.current) return;
    scheduleAnalysis();
  }, [ageBand, currentSpread, lens, placements, readingSituation, scheduleAnalysis, title]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusMode) {
        setFocusMode(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, select, textarea, button, [contenteditable="true"]',
        )
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        setCurrentSpread((value) => Math.max(0, value - 1));
      } else if (event.key === 'ArrowRight') {
        setCurrentSpread((value) => Math.min(SPREAD_COUNT - 1, value + 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusMode]);

  useEffect(() => {
    if (!sampleOpen && !exportOpen) return;
    const closeMenus = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (event.type === 'keydown') {
        if ((event as KeyboardEvent).key !== 'Escape') return;
      } else if (target?.closest('.studio-menu-wrap')) {
        return;
      }
      setSampleOpen(false);
      setExportOpen(false);
    };
    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeMenus);
    };
  }, [exportOpen, sampleOpen]);

  useEffect(() => {
    applyPhonemeHighlight(activePhoneme);
  }, [activePhoneme, currentSpread, profile]);

  const engineSpreads = useMemo(
    () => (manuscript ? toEngineManuscript(manuscript).spreads : []),
    [manuscript],
  );
  const reflections = useMemo(
    () =>
      profile
        ? deriveReflections({
            profile,
            spreads: engineSpreads,
            readingSituation,
            guessedWords,
          })
        : [],
    [engineSpreads, guessedWords, profile, readingSituation],
  );
  const currentProfile = profile?.perSpread[currentSpread];
  const currentEngineSpread = engineSpreads[currentSpread];
  const currentLines = (currentEngineSpread?.text ?? '')
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const setPlacement = (side: Side, value: PagePlacement) => {
    setPlacements((current) =>
      current.map((spread, index) =>
        index === currentSpread ? { ...spread, [side]: value } : spread,
      ),
    );
  };

  const loadSample = (key: string) => {
    const sample = samples[key];
    if (!sample) return;
    const hasText = Object.values(editors()).some((editor) =>
      editor.getText().trim(),
    );
    if (
      hasText &&
      !window.confirm(
        'Load this sample and replace the manuscript currently on the canvas?',
      )
    ) {
      return;
    }
    const chunks = sample.text
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    const handles = editors();
    for (let index = 0; index < SPREAD_COUNT; index++) {
      handles[`${index + 1}-left`]?.setText(chunks[index] ?? '');
      handles[`${index + 1}-right`]?.setText('');
    }
    setPlacements(
      Array.from({ length: SPREAD_COUNT }, (_, index) => ({
        left: 'text-only' as const,
        right: chunks[index]
          ? ('illustration-only' as const)
          : ('text-only' as const),
      })),
    );
    setAgeBand(sample.ageBand);
    setReadingSituation('adult-read-aloud');
    setTitle(sample.label.replace(/^.+?·\s*/, ''));
    setCurrentSpread(0);
    setLens('draft');
    setSampleOpen(false);
    window.setTimeout(runAnalysis, 0);
  };

  const download = (format: 'txt' | 'md') => {
    const handles = editors();
    const blocks: string[] = [];
    for (let index = 0; index < SPREAD_COUNT; index++) {
      const left =
        format === 'md'
          ? handles[`${index + 1}-left`]?.getMarkdown()
          : handles[`${index + 1}-left`]?.getText();
      const right =
        format === 'md'
          ? handles[`${index + 1}-right`]?.getMarkdown()
          : handles[`${index + 1}-right`]?.getText();
      const text = [left, right].filter((value) => value?.trim()).join('\n');
      if (text.trim()) blocks.push(text.trim());
    }
    if (blocks.length === 0) return;
    const blob = new Blob([`${blocks.join('\n\n')}\n`], {
      type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(title) || 'manuscript'}.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 100);
    setExportOpen(false);
  };

  const reset = () => {
    if (
      !window.confirm(
        'Clear all 16 spreads? This removes the saved manuscript from this device.',
      )
    ) {
      return;
    }
    Object.values(editors()).forEach((editor) => editor.setText(''));
    localStorage.removeItem(DRAFT_KEY);
    setTitle('Untitled manuscript');
    setPlacements(blankPlacements());
    setCurrentSpread(0);
    setLens('draft');
    window.setTimeout(runAnalysis, 0);
  };

  return (
    <div className={`studio-shell${focusMode ? ' focus-mode' : ''}`}>
      <header className="studio-mast">
        <div className="studio-identity">
          <a className="studio-brand" href="/about">Folio</a>
          <span className="studio-local">local manuscript</span>
          <input
            className="studio-title"
            aria-label="Manuscript title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <span className={`studio-saved${saveFailed ? ' failed' : ''}`}>
            {saveFailed
              ? 'not saved — browser storage unavailable'
              : savedAt > 0
                ? 'saved on this device'
                : 'not yet saved'}
          </span>
        </div>

        <div className="studio-context">
          <label>
            <span>Audience</span>
            <select
              value={ageBand}
              onChange={(event) => setAgeBand(event.target.value as AgeBand)}
            >
              {AGE_BANDS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Experience</span>
            <select
              value={readingSituation}
              onChange={(event) =>
                setReadingSituation(event.target.value as ReadingSituation)
              }
            >
              {SITUATIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="studio-menu-wrap">
            <button
              type="button"
              className="studio-button quiet"
              aria-haspopup="menu"
              aria-expanded={sampleOpen}
              onClick={() => {
                setSampleOpen((value) => !value);
                setExportOpen(false);
              }}
            >
              Samples
            </button>
            {sampleOpen && (
              <div className="studio-menu">
                {Object.entries(samples).map(([key, sample]) => (
                  <button key={key} type="button" onClick={() => loadSample(key)}>
                    {sample.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="studio-menu-wrap">
            <button
              type="button"
              className="studio-button quiet"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => {
                setExportOpen((value) => !value);
                setSampleOpen(false);
              }}
            >
              Export
            </button>
            {exportOpen && (
              <div className="studio-menu align-right">
                <button type="button" onClick={() => download('txt')}>Plain text</button>
                <button type="button" onClick={() => download('md')}>Markdown</button>
                <button type="button" onClick={() => window.print()}>PDF / Print</button>
              </div>
            )}
          </div>
          <button type="button" className="studio-button quiet reset" onClick={reset}>
            Clear
          </button>
        </div>
      </header>

      <nav className="studio-lenses" aria-label="Workspace lens">
        {(['draft', 'listen', 'language'] as const).map((nextLens) => (
          <button
            key={nextLens}
            type="button"
            aria-pressed={lens === nextLens}
            onClick={() => setLens(nextLens)}
          >
            {nextLens === 'draft'
              ? 'Draft'
              : nextLens === 'listen'
                ? 'Listen'
                : 'Language'}
          </button>
        ))}
      </nav>

      <main className="studio-stage">
        <section className="studio-canvas" aria-label="Facing-page editor">
          <div className="studio-canvas-head">
            <div>
              <span className="studio-spread-kicker">Spread</span>
              <strong>{currentSpread + 1}</strong>
              <span>of {SPREAD_COUNT}</span>
            </div>
            <span className="studio-spread-status">
              {currentProfile?.wordCount ?? 0} words
              {currentProfile?.reachWords.length
                ? ` · ${currentProfile.reachWords.length} less-familiar here`
                : ''}
            </span>
            <button
              type="button"
              className="studio-focus-toggle"
              aria-pressed={focusMode}
              title="Hide analysis and manuscript controls; press Escape to return"
              onClick={() => setFocusMode((value) => !value)}
            >
              {focusMode ? 'Exit focus' : 'Focus on writing'}
            </button>
          </div>

          <div
            className="studio-carousel"
            style={{ '--spread-index': currentSpread } as React.CSSProperties}
          >
            <div className="studio-track">
              {Array.from({ length: SPREAD_COUNT }, (_, index) => (
                <article
                  className="studio-spread"
                  key={index}
                  aria-hidden={currentSpread !== index}
                  inert={currentSpread !== index ? true : undefined}
                >
                  {(['left', 'right'] as const).map((side) => {
                    const placement = placements[index]?.[side] ?? 'text-only';
                    return (
                      <div
                        className={`studio-page placement-${placement}`}
                        data-page={`${index + 1}-${side}`}
                        key={side}
                      >
                        <label className="studio-placement">
                          <span className="sr-only">Spread {index + 1} {side} page layout</span>
                          <select
                            aria-label={`Spread ${index + 1} ${side} page layout`}
                            value={placement}
                            onChange={(event) =>
                              setPlacement(side, event.target.value as PagePlacement)
                            }
                          >
                            {PLACEMENTS.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <div className="studio-page-body">
                          <PageEditor
                            spread={index + 1}
                            side={side}
                            placeholder="Write on this page…"
                          />
                          {placement !== 'text-only' && (
                            <div className="studio-illustration" aria-label="Illustration area">
                              <span>illustration space</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </article>
              ))}
            </div>
          </div>

          <div className="studio-carousel-controls">
            <button
              type="button"
              aria-label="Previous spread"
              disabled={currentSpread === 0}
              onClick={() => setCurrentSpread((value) => Math.max(0, value - 1))}
            >
              ← Previous
            </button>
            <button
              type="button"
              aria-label="Next spread"
              disabled={currentSpread === SPREAD_COUNT - 1}
              onClick={() =>
                setCurrentSpread((value) => Math.min(SPREAD_COUNT - 1, value + 1))
              }
            >
              Next →
            </button>
          </div>
        </section>

        <aside className="studio-margin" aria-label="Studio reader">
          {lens === 'draft' && (
            <DraftLens
              profile={profile}
              reflections={reflections}
              currentSpread={currentSpread}
              onGoToSpread={(spread) => setCurrentSpread(spread - 1)}
              onOpenLens={setLens}
            />
          )}
          {lens === 'listen' && (
            <ListenLens
              profile={profile}
              lines={currentLines}
              guessedWords={guessedWords}
            />
          )}
          {lens === 'language' && (
            <LanguageLens
              profile={profile}
              currentSpread={currentSpread}
              guessedWords={guessedWords}
              activePhoneme={activePhoneme}
              onPhoneme={setActivePhoneme}
            />
          )}
        </aside>
      </main>

      <BookMap
        profile={profile}
        currentSpread={currentSpread}
        reflections={reflections}
        onSelect={setCurrentSpread}
      />

      <footer className="studio-footer">
        <span>Folio observes the ingredients. You decide what the book becomes.</span>
        <nav aria-label="Supporting pages">
          <a href="/guide">Guide</a>
          <a href="/about">About</a>
          <a href="/paste">Paste &amp; analyze</a>
        </nav>
      </footer>
    </div>
  );
}

function DraftLens({
  profile,
  reflections,
  currentSpread,
  onGoToSpread,
  onOpenLens,
}: {
  profile: ReadabilityProfile | null;
  reflections: readonly Reflection[];
  currentSpread: number;
  onGoToSpread: (spread: number) => void;
  onOpenLens: (lens: Lens) => void;
}) {
  if (!profile || profile.wordCount === 0) {
    return (
      <div className="studio-empty">
        <span className="studio-margin-label">Studio reader</span>
        <h2>The margin stays quiet until there is something to notice.</h2>
        <p>Write on either page, or load a sample. Folio will surface a few patterns without grading the story.</p>
      </div>
    );
  }
  const local = profile.perSpread[currentSpread];
  const scoped = reflections.filter(
    (reflection) => reflection.spread === undefined || reflection.spread === currentSpread + 1,
  );
  const visible = (scoped.length > 0 ? scoped : reflections).slice(0, 3);
  return (
    <>
      <div className="studio-margin-intro">
        <span className="studio-margin-label">Draft · what changed</span>
        <p>{profile.wordCount} words in the manuscript · {local?.wordCount ?? 0} on this spread</p>
      </div>
      {visible.map((reflection) => (
        <ReflectionCard
          key={reflection.id}
          reflection={reflection}
          onGoToSpread={onGoToSpread}
          onOpenLens={onOpenLens}
        />
      ))}
    </>
  );
}

function ReflectionCard({
  reflection,
  onGoToSpread,
  onOpenLens,
}: {
  reflection: Reflection;
  onGoToSpread: (spread: number) => void;
  onOpenLens: (lens: Lens) => void;
}) {
  const nextLens: Lens =
    reflection.mode === 'prosody'
      ? 'listen'
      : reflection.mode === 'phonology'
        ? 'language'
        : 'draft';
  return (
    <article
      className="studio-reflection"
      data-domain={reflection.domain}
      data-confidence={reflection.confidence}
    >
      <h2>{reflection.title}</h2>
      <p>{reflection.observation}</p>
      <p className="studio-evidence">{reflection.evidence}</p>
      <div className="studio-reflection-actions">
        {nextLens !== 'draft' && (
          <button type="button" onClick={() => onOpenLens(nextLens)}>
            {nextLens === 'listen' ? 'Listen closer' : 'See the language'}
          </button>
        )}
        {reflection.spread !== undefined && (
          <button type="button" onClick={() => onGoToSpread(reflection.spread!)}>
            Show spread {reflection.spread}
          </button>
        )}
      </div>
    </article>
  );
}

function ListenLens({
  profile,
  lines,
  guessedWords,
}: {
  profile: ReadabilityProfile | null;
  lines: readonly string[];
  guessedWords: readonly string[];
}) {
  if (!profile || profile.wordCount === 0) return <LensEmpty label="Listen" />;
  const scheme = profile.prosody.rhymeScheme;
  const localScheme = analyzeProsody(lines.join('\n')).rhymeScheme;
  return (
    <>
      <div className="studio-margin-intro">
        <span className="studio-margin-label">Listen · rehearsal view</span>
        <p>
          {profile.prosody.dominantMeter
            ? `${profile.prosody.dominantMeter} is the closest stress pattern`
            : 'No dominant stress pattern surfaced'}
        </p>
      </div>
      <article className="studio-reflection">
        <h2>{scheme ? `${scheme} rhyme pattern` : 'No repeated rhyme pattern surfaced'}</h2>
        <p>{scheme ? 'Matching letters share a pronunciation ending.' : 'Line endings are currently distinct or the text is not line-broken.'}</p>
        <p className="studio-evidence">
          {guessedWords.length
            ? `${guessedWords.length} estimated pronunciations may affect this reading.`
            : 'Dictionary pronunciations support this reading.'}
        </p>
      </article>
      <article className="studio-reflection">
        <h2>Line shape on this spread</h2>
        {lines.length === 0 ? (
          <p>No lines on this spread yet.</p>
        ) : (
          <ol className="studio-line-shape">
            {lines.map((line, index) => {
              const syllables = tokenizeWords(line).reduce(
                (sum, word) => sum + syllableCount(getPronunciation(word)),
                0,
              );
              return (
                <li key={`${line}-${index}`}>
                  <span>{localScheme?.[index] ?? '·'}</span>
                  <i style={{ width: `${Math.min(100, syllables * 8)}%` }} />
                  <small>{syllables} syl</small>
                </li>
              );
            })}
          </ol>
        )}
        <p className="studio-evidence">Bar length shows syllables per written line. Performance remains the reader’s choice.</p>
      </article>
    </>
  );
}

function LanguageLens({
  profile,
  currentSpread,
  guessedWords,
  activePhoneme,
  onPhoneme,
}: {
  profile: ReadabilityProfile | null;
  currentSpread: number;
  guessedWords: readonly string[];
  activePhoneme: string | null;
  onPhoneme: (phoneme: string | null) => void;
}) {
  if (!profile || profile.wordCount === 0) return <LensEmpty label="Language" />;
  const local = profile.perSpread[currentSpread];
  const localSounds = profile.phonology.phonemeInventory
    .filter((sound) => sound.firstSpread <= currentSpread + 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);
  const types = profile.syntax.sentenceTypes;
  return (
    <>
      <div className="studio-margin-intro">
        <span className="studio-margin-label">Language · ingredient view</span>
        <p>{formatPercent(profile.vocabulary.tier1Coverage)} familiar-word coverage</p>
      </div>
      <article className="studio-reflection">
        <h2>Sound palette</h2>
        <div className="studio-sounds">
          {localSounds.map((sound) => (
            <button
              type="button"
              key={sound.phoneme}
              aria-pressed={activePhoneme === sound.phoneme}
              onClick={() =>
                onPhoneme(activePhoneme === sound.phoneme ? null : sound.phoneme)
              }
              title={`${sound.manner} · ${sound.place} · first appears on spread ${sound.firstSpread}`}
            >
              /{sound.phoneme}/
            </button>
          ))}
        </div>
        <p className="studio-evidence">Select a sound to locate words carrying it across the manuscript.</p>
      </article>
      <article className="studio-reflection">
        <h2>Vocabulary on this spread</h2>
        <p>
          {local?.reachWords.length
            ? local.reachWords.map((word) => word.word).join(' · ')
            : 'No first-use less-familiar words on this spread.'}
        </p>
        <p className="studio-evidence">Familiarity uses the Dale–Chall proxy plus Dolch/Fry lists.</p>
      </article>
      <article className="studio-reflection">
        <h2>Sentence shape</h2>
        <p>{types.declarative} declarative · {types.interrogative} questions · {types.imperative} imperative · {types.exclamatory} exclamatory</p>
        <p className="studio-evidence">Structure only; no developmental threshold is applied.</p>
      </article>
      {guessedWords.length > 0 && (
        <article className="studio-reflection integrity">
          <h2>{guessedWords.length} estimated pronunciations</h2>
          <p>{guessedWords.slice(0, 8).join(' · ')}</p>
          <p className="studio-evidence">These words are absent from the current pronunciation dictionary.</p>
        </article>
      )}
    </>
  );
}

function LensEmpty({ label }: { label: string }) {
  return (
    <div className="studio-empty">
      <span className="studio-margin-label">{label}</span>
      <h2>This view will fill in as the manuscript takes shape.</h2>
      <p>Folio waits for evidence rather than inventing advice.</p>
    </div>
  );
}

function BookMap({
  profile,
  currentSpread,
  reflections,
  onSelect,
}: {
  profile: ReadabilityProfile | null;
  currentSpread: number;
  reflections: readonly Reflection[];
  onSelect: (spread: number) => void;
}) {
  const maxWords = Math.max(
    1,
    ...(profile?.perSpread.map((spread) => spread.wordCount) ?? [1]),
  );
  const reflected = new Set(
    reflections.flatMap((reflection) =>
      reflection.spread === undefined ? [] : [reflection.spread - 1],
    ),
  );
  return (
    <nav className="studio-book-map" aria-label="Book shape">
      <div className="studio-map-head">
        <span>Book shape</span>
        <span>
          {profile?.wordCount ?? 0} words · selected spread {currentSpread + 1}
        </span>
      </div>
      <div className="studio-map-strip">
        {Array.from({ length: SPREAD_COUNT }, (_, index) => {
          const words = profile?.perSpread[index]?.wordCount ?? 0;
          return (
            <button
              type="button"
              key={index}
              aria-label={`Spread ${index + 1}, ${words} words${reflected.has(index) ? ', reflection available' : ''}`}
              aria-pressed={currentSpread === index}
              className={reflected.has(index) ? 'has-reflection' : ''}
              onClick={() => onSelect(index)}
            >
              <i style={{ height: `${Math.max(8, (words / maxWords) * 100)}%` }} />
              <span>{index + 1}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function applyPhonemeHighlight(activePhoneme: string | null): void {
  const HighlightCtor = (
    window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }
  ).Highlight;
  const highlights = (CSS as unknown as { highlights?: Map<string, unknown> })
    .highlights;
  if (!HighlightCtor || !highlights) return;
  // Clear the old ambient vocabulary layer during hot reloads and draft
  // migrations. Less-familiar words now stay in the evidence surfaces.
  highlights.delete('reach-word');
  highlights.delete('phoneme-match');
  if (!activePhoneme) return;
  const phonemeRanges: Range[] = [];
  document.querySelectorAll<HTMLElement>('.page-editor-editable').forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? '';
      const regex = /\b[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*\b/gu;
      for (const match of text.matchAll(regex)) {
        if (match.index === undefined) continue;
        const word = match[0].toLowerCase();
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        if (getWordPhonemes(word).includes(activePhoneme)) {
          phonemeRanges.push(range.cloneRange());
        }
      }
      node = walker.nextNode();
    }
  });
  if (phonemeRanges.length) {
    highlights.set('phoneme-match', new HighlightCtor(...phonemeRanges));
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
