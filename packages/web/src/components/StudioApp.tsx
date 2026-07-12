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
import {
  BOOK_TEMPLATES,
  getBookTemplate,
  type BookTemplate,
  type BookTemplateId,
} from '../templates.js';

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
  version: 4;
  documentId: string;
  templateId: BookTemplateId;
  spreadCount: number;
  sampleKey?: string;
  returnDocumentId?: string;
  title: string;
  ageBand: AgeBand;
  readingSituation: ReadingSituation;
  currentSpread: number;
  lens: Lens;
  spreads: Array<{ leftPage: SavedPage; rightPage: SavedPage }>;
  savedAt: number;
}

interface LibraryEntry {
  id: string;
  title: string;
  templateId: BookTemplateId;
  updatedAt: number;
}

const DRAFT_KEY = 'folio.draft.v3';
const LEGACY_DRAFT_KEY = 'folio.draft.v2';
const ACTIVE_DOCUMENT_KEY = 'folio.active-document.v1';
const LIBRARY_KEY = 'folio.documents.v1';
const DOCUMENT_PREFIX = 'folio.document.v1.';

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

const DEFAULT_TEMPLATE = getBookTemplate('picture-16');

function blankPlacements(
  template: BookTemplate,
): Array<{ left: PagePlacement; right: PagePlacement }> {
  return Array.from({ length: template.spreadCount }, () => ({
    left: template.defaultLeftPlacement,
    right: template.defaultRightPlacement,
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

function createId(prefix = 'manuscript'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLibrary(): LibraryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as LibraryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeDocument(saved: SavedStudio, includeInLibrary = true): void {
  localStorage.setItem(`${DOCUMENT_PREFIX}${saved.documentId}`, JSON.stringify(saved));
  if (!includeInLibrary) return;
  const library = loadLibrary().filter((entry) => entry.id !== saved.documentId);
  library.unshift({
    id: saved.documentId,
    title: saved.title,
    templateId: saved.templateId,
    updatedAt: saved.savedAt,
  });
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.slice(0, 20)));
}

function setActiveDocument(id: string): void {
  localStorage.setItem(ACTIVE_DOCUMENT_KEY, id);
}

function loadSavedStudio(): SavedStudio | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_DOCUMENT_KEY);
    if (activeId) {
      const activeRaw = localStorage.getItem(`${DOCUMENT_PREFIX}${activeId}`);
      if (activeRaw) {
        const active = JSON.parse(activeRaw) as Partial<SavedStudio>;
        if (active.version === 4 && Array.isArray(active.spreads)) {
          return active as SavedStudio;
        }
      }
    }

    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        version?: number;
        title?: string;
        ageBand?: AgeBand;
        readingSituation?: ReadingSituation;
        currentSpread?: number;
        lens?: Lens;
        spreads?: Array<{ leftPage: SavedPage; rightPage: SavedPage }>;
        savedAt?: number;
      };
      if (parsed.version === 3 && Array.isArray(parsed.spreads)) {
        const migrated: SavedStudio = {
          version: 4,
          documentId: createId(),
          templateId: 'picture-16',
          spreadCount: parsed.spreads.length,
          title: parsed.title ?? 'Untitled manuscript',
          ageBand: parsed.ageBand ?? 'picture',
          readingSituation: isReadingSituation(parsed.readingSituation)
            ? parsed.readingSituation
            : 'adult-read-aloud',
          currentSpread: parsed.currentSpread ?? 0,
          lens: isLens(parsed.lens) ? parsed.lens : 'draft',
          spreads: parsed.spreads,
          savedAt: parsed.savedAt ?? Date.now(),
        };
        writeDocument(migrated);
        setActiveDocument(migrated.documentId);
        return migrated;
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
      version: 4,
      documentId: createId(),
      templateId: 'picture-16',
      spreadCount: legacy.spreads.length,
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
  spreadCount: number,
): WebManuscript {
  const handles = editors();
  const spreads: WebSpread[] = Array.from(
    { length: spreadCount },
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
  const [documentId, setDocumentId] = useState(() => createId());
  const [templateId, setTemplateId] =
    useState<BookTemplateId>(DEFAULT_TEMPLATE.id);
  const [spreadCount, setSpreadCount] = useState(DEFAULT_TEMPLATE.spreadCount);
  const [sampleKey, setSampleKey] = useState<string | null>(null);
  const [returnDocumentId, setReturnDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled manuscript');
  const [ageBand, setAgeBand] = useState<AgeBand>('picture');
  const [readingSituation, setReadingSituation] =
    useState<ReadingSituation>('adult-read-aloud');
  const [lens, setLens] = useState<Lens>('draft');
  const [currentSpread, setCurrentSpread] = useState(0);
  const [placements, setPlacements] = useState(() =>
    blankPlacements(DEFAULT_TEMPLATE),
  );
  const [profile, setProfile] = useState<ReadabilityProfile | null>(null);
  const [manuscript, setManuscript] = useState<WebManuscript | null>(null);
  const [guessedWords, setGuessedWords] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [activePhoneme, setActivePhoneme] = useState<string | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [templateDialog, setTemplateDialog] = useState<'new' | 'convert' | null>(null);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [restoring, setRestoring] = useState(true);
  const readyPages = useRef(new Set<string>());
  const restored = useRef(false);
  const analyzeTimer = useRef<number | null>(null);

  const runAnalysis = useCallback(() => {
    const web = makeWebManuscript(
      ageBand,
      readingSituation,
      placements,
      title,
      spreadCount,
    );
    const engine = toEngineManuscript(web);
    const nextProfile = analyze(engine);
    const fullText = engine.spreads.map((spread) => spread.text).join('\n\n');
    setManuscript(web);
    setProfile(nextProfile);
    setGuessedWords(getGuessedWords(fullText));

    const handles = editors();
    const saved: SavedStudio = {
      version: 4,
      documentId,
      templateId,
      spreadCount,
      ...(sampleKey ? { sampleKey } : {}),
      ...(returnDocumentId ? { returnDocumentId } : {}),
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
      if (!sampleKey) {
        writeDocument(saved);
        setActiveDocument(documentId);
        setLibrary(loadLibrary());
      }
      setSavedAt(saved.savedAt);
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [
    ageBand,
    currentSpread,
    documentId,
    lens,
    placements,
    readingSituation,
    returnDocumentId,
    sampleKey,
    spreadCount,
    templateId,
    title,
  ]);

  const scheduleAnalysis = useCallback(() => {
    if (analyzeTimer.current !== null) window.clearTimeout(analyzeTimer.current);
    analyzeTimer.current = window.setTimeout(runAnalysis, 220);
  }, [runAnalysis]);

  useEffect(() => {
    if (restored.current) return;
    let readinessTimer: number | null = null;

    const restoreWhenReady = () => {
      const handles = editors();
      if (Object.keys(handles).length < spreadCount * 2 || restored.current) {
        return;
      }
      restored.current = true;
      if (readinessTimer !== null) window.clearInterval(readinessTimer);
      const saved = loadSavedStudio();
      if (saved) {
        setDocumentId(saved.documentId);
        setTemplateId(saved.templateId);
        setSpreadCount(saved.spreadCount);
        setSampleKey(saved.sampleKey ?? null);
        setReturnDocumentId(saved.returnDocumentId ?? null);
        setTitle(saved.title || 'Untitled manuscript');
        setAgeBand(saved.ageBand ?? 'picture');
        setReadingSituation(
          isReadingSituation(saved.readingSituation)
            ? saved.readingSituation
            : 'adult-read-aloud',
        );
        setCurrentSpread(
          Math.max(0, Math.min(saved.spreadCount - 1, saved.currentSpread ?? 0)),
        );
        setLens(isLens(saved.lens) ? saved.lens : 'draft');
        setPlacements(
          Array.from({ length: saved.spreadCount }, (_, index) => ({
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
        if (!saved.sampleKey) setActiveDocument(saved.documentId);
      } else {
        window.setTimeout(runAnalysis, 0);
      }
      setLibrary(loadLibrary());
      window.setTimeout(() => setRestoring(false), 60);
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
  }, [runAnalysis, scheduleAnalysis, spreadCount]);

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
        setCurrentSpread((value) => Math.min(spreadCount - 1, value + 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusMode, spreadCount]);

  useEffect(() => {
    if (!sampleOpen && !exportOpen && !documentsOpen) return;
    const closeMenus = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (event.type === 'keydown') {
        if ((event as KeyboardEvent).key !== 'Escape') return;
      } else if (target?.closest('.studio-menu-wrap')) {
        return;
      }
      setSampleOpen(false);
      setExportOpen(false);
      setDocumentsOpen(false);
    };
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      document.removeEventListener('click', closeMenus);
      document.removeEventListener('keydown', closeMenus);
    };
  }, [documentsOpen, exportOpen, sampleOpen]);

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
  const currentTemplate = getBookTemplate(templateId);
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

  const captureCurrentDocument = (): SavedStudio => {
    const web = makeWebManuscript(
      ageBand,
      readingSituation,
      placements,
      title,
      spreadCount,
    );
    const handles = editors();
    return {
      version: 4,
      documentId,
      templateId,
      spreadCount,
      title,
      ageBand,
      readingSituation,
      currentSpread,
      lens,
      spreads: web.spreads.map((spread, index) => ({
        leftPage: {
          ...spread.leftPage,
          state: handles[`${index + 1}-left`]?.getStateJSON(),
        },
        rightPage: {
          ...spread.rightPage,
          state: handles[`${index + 1}-right`]?.getStateJSON(),
        },
      })),
      savedAt: Date.now(),
    };
  };

  const switchToDocument = (id: string) => {
    setActiveDocument(id);
    window.location.reload();
  };

  const exploreSample = (key: string) => {
    const sample = samples[key];
    if (!sample) return;
    const sourceId = sampleKey ? returnDocumentId : documentId;
    if (!sampleKey) {
      const current = captureCurrentDocument();
      writeDocument(current);
    } else {
      localStorage.removeItem(`${DOCUMENT_PREFIX}${documentId}`);
    }
    const sampleTemplateId: BookTemplateId =
      key === 'board'
        ? 'board-12'
        : key === 'early-picture'
          ? 'verse-16'
          : 'picture-16';
    const template = getBookTemplate(sampleTemplateId);
    const chunks = sample.text
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    const sampleDocument: SavedStudio = {
      version: 4,
      documentId: createId('sample'),
      templateId: template.id,
      spreadCount: template.spreadCount,
      sampleKey: key,
      ...(sourceId ? { returnDocumentId: sourceId } : {}),
      title: sample.label.replace(/^.+?·\s*/, ''),
      ageBand: sample.ageBand,
      readingSituation: 'adult-read-aloud',
      currentSpread: 0,
      lens: 'draft',
      spreads: Array.from({ length: template.spreadCount }, (_, index) => ({
        leftPage: {
          text: chunks[index] ?? '',
          placement: 'text-only' as const,
        },
        rightPage: {
          text: '',
          placement: chunks[index]
            ? ('illustration-only' as const)
            : ('text-only' as const),
        },
      })),
      savedAt: Date.now(),
    };
    writeDocument(sampleDocument, false);
    switchToDocument(sampleDocument.documentId);
  };

  const returnFromSample = () => {
    if (!returnDocumentId) return;
    localStorage.removeItem(`${DOCUMENT_PREFIX}${documentId}`);
    switchToDocument(returnDocumentId);
  };

  const createFromTemplate = (template: BookTemplate, convert: boolean) => {
    const source = captureCurrentDocument();
    if (!sampleKey) writeDocument(source);
    const blank = Array.from({ length: template.spreadCount }, () => ({
      leftPage: {
        text: '',
        placement: template.defaultLeftPlacement,
      },
      rightPage: {
        text: '',
        placement: template.defaultRightPlacement,
      },
    }));
    const mapped = convert
      ? blank.map((spread, index) => source.spreads[index] ?? spread)
      : blank;
    const next: SavedStudio = {
      version: 4,
      documentId: createId(),
      templateId: template.id,
      spreadCount: template.spreadCount,
      title: convert ? source.title : 'Untitled manuscript',
      ageBand: template.ageBand,
      readingSituation: template.readingSituation,
      currentSpread: 0,
      lens: 'draft',
      spreads: mapped,
      savedAt: Date.now(),
    };
    writeDocument(next);
    setTemplateDialog(null);
    switchToDocument(next.documentId);
  };

  const download = (format: 'txt' | 'md') => {
    const handles = editors();
    const blocks: string[] = [];
    for (let index = 0; index < spreadCount; index++) {
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
        `Clear all ${spreadCount} spreads in this manuscript?`,
      )
    ) {
      return;
    }
    Object.values(editors()).forEach((editor) => editor.setText(''));
    setTitle('Untitled manuscript');
    setPlacements(blankPlacements(getBookTemplate(templateId)));
    setCurrentSpread(0);
    setLens('draft');
    window.setTimeout(runAnalysis, 0);
  };

  return (
    <div className={`studio-shell${focusMode ? ' focus-mode' : ''}${restoring ? ' restoring' : ''}`}>
      {restoring && (
        <div className="studio-restoring" role="status">
          <span>Folio</span>
          <small>Opening your manuscript…</small>
        </div>
      )}
      <header className="studio-mast">
        <div className="studio-identity">
          <a className="studio-brand" href="/about">Folio</a>
          <span className="studio-local">local manuscript</span>
          <input
            className="studio-title"
            aria-label="Manuscript title"
            value={title}
            readOnly={Boolean(sampleKey)}
            onChange={(event) => setTitle(event.target.value)}
          />
          <span className={`studio-saved${saveFailed ? ' failed' : ''}`}>
            {saveFailed
              ? 'not saved — browser storage unavailable'
              : savedAt > 0
                ? 'saved on this device'
                : 'not yet saved'}
          </span>
          <button
            type="button"
            className="studio-structure"
            disabled={Boolean(sampleKey)}
            onClick={() => setTemplateDialog('convert')}
          >
            {currentTemplate.shortName} · {spreadCount} spreads
          </button>
        </div>

        <div className="studio-context">
          <fieldset className="studio-reading-context" disabled={Boolean(sampleKey)}>
            <legend>Reading context · analysis only</legend>
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
          </fieldset>
          <div className="studio-menu-wrap">
            <button
              type="button"
              className="studio-button quiet"
              aria-haspopup="menu"
              aria-expanded={sampleOpen}
              onClick={() => {
                setSampleOpen((value) => !value);
                setExportOpen(false);
                setDocumentsOpen(false);
              }}
            >
              Explore
            </button>
            {sampleOpen && (
              <div className="studio-menu">
                {Object.entries(samples).map(([key, sample]) => (
                  <button key={key} type="button" onClick={() => exploreSample(key)}>
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
              aria-expanded={documentsOpen}
              onClick={() => {
                setDocumentsOpen((value) => !value);
                setSampleOpen(false);
                setExportOpen(false);
              }}
            >
              Manuscripts
            </button>
            {documentsOpen && (
              <div className="studio-menu align-right studio-document-menu">
                <button type="button" onClick={() => setTemplateDialog('new')}>
                  New manuscript…
                </button>
                {sampleKey && returnDocumentId && (
                  <button type="button" onClick={returnFromSample}>
                    Return to my manuscript
                  </button>
                )}
                {library
                  .filter((entry) => entry.id !== documentId)
                  .map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => switchToDocument(entry.id)}
                    >
                      <strong>{entry.title || 'Untitled manuscript'}</strong>
                      <small>{getBookTemplate(entry.templateId).shortName}</small>
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
                setDocumentsOpen(false);
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
          {!sampleKey && (
            <button type="button" className="studio-button quiet reset" onClick={reset}>
              Clear
            </button>
          )}
        </div>
      </header>

      {sampleKey && (
        <div className="studio-sample-banner" role="status">
          <div>
            <strong>Exploring an example</strong>
            <span>This manuscript is read-only. Your work is still saved separately.</span>
          </div>
          {returnDocumentId && (
            <button type="button" onClick={returnFromSample}>Return to my manuscript</button>
          )}
        </div>
      )}

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
              <span>of {spreadCount}</span>
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

          <div className="studio-carousel">
            <div
              className="studio-track"
              style={{
                width: `${spreadCount * 100}%`,
                transform: `translateX(-${currentSpread * (100 / spreadCount)}%)`,
              }}
            >
              {Array.from({ length: spreadCount }, (_, index) => (
                <article
                  className="studio-spread"
                  key={index}
                  style={{ width: `${100 / spreadCount}%` }}
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
                            disabled={Boolean(sampleKey)}
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
                            readOnly={Boolean(sampleKey)}
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
              disabled={currentSpread === spreadCount - 1}
              onClick={() =>
                setCurrentSpread((value) => Math.min(spreadCount - 1, value + 1))
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
        spreadCount={spreadCount}
        currentSpread={currentSpread}
        reflections={reflections}
        onSelect={setCurrentSpread}
      />

      {templateDialog && (
        <div
          className="studio-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTemplateDialog(null);
          }}
        >
          <section
            className="studio-template-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-dialog-title"
          >
            <div className="studio-template-head">
              <div>
                <span className="studio-margin-label">
                  {templateDialog === 'new' ? 'New manuscript' : 'Change structure'}
                </span>
                <h2 id="template-dialog-title">Choose a working structure</h2>
              </div>
              <button type="button" onClick={() => setTemplateDialog(null)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="studio-template-note">
              {templateDialog === 'new'
                ? 'Templates are blank, editable starting points—not publishing requirements.'
                : 'Folio creates a separate copy and keeps this manuscript in Manuscripts. Text maps by spread where possible; it is never rewritten or automatically reflowed.'}
            </p>
            <div className="studio-template-grid">
              {BOOK_TEMPLATES.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={template.id === templateId ? 'current' : ''}
                  onClick={() =>
                    createFromTemplate(template, templateDialog === 'convert')
                  }
                >
                  <strong>{template.name}</strong>
                  <span>{template.spreadCount} spreads · {AGE_BANDS.find((band) => band.id === template.ageBand)?.label}</span>
                  <p>{template.description}</p>
                  {template.id === templateId && templateDialog === 'convert' && (
                    <small>Current structure</small>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

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
  spreadCount,
  currentSpread,
  reflections,
  onSelect,
}: {
  profile: ReadabilityProfile | null;
  spreadCount: number;
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
        {Array.from({ length: spreadCount }, (_, index) => {
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
