/**
 * Two steps on one page: pick a format, then name it and choose its physical
 * variants (trim, page count, construction, reader level). The spec sheet
 * updates live so the author learns the format before writing a word.
 */

import { useState } from 'react';
import {
  getFormat,
  trimLabel,
  DEFAULT_FORMAT_ID,
  type BindingId,
  type FormatId,
  type Trim,
} from '../../formats.js';
import { sameTrim } from '../../formats.js';
import { navigate } from '../../router.js';
import { useBookStore } from '../../hooks/useBookStore.js';
import { PresetPicker } from './PresetPicker.js';
import { SpecSheet } from './SpecSheet.js';

interface Choices {
  trim: Trim;
  pageCount: number;
  binding: BindingId;
  level: 1 | 2 | 3;
}

function defaultChoices(formatId: FormatId): Choices {
  const format = getFormat(formatId);
  return {
    trim: format.trim,
    pageCount: format.defaultPageCount,
    binding: format.construction.binding,
    level: 1,
  };
}

export function NewBookFlow() {
  const { store } = useBookStore();
  const [formatId, setFormatId] = useState<FormatId>(DEFAULT_FORMAT_ID);
  const [title, setTitle] = useState('');
  const [choices, setChoices] = useState<Choices>(() =>
    defaultChoices(DEFAULT_FORMAT_ID),
  );
  const format = getFormat(formatId);

  const selectFormat = (id: FormatId) => {
    setFormatId(id);
    setChoices(defaultChoices(id));
  };

  const create = () => {
    const book = store.createBook(format, {
      title,
      trim: choices.trim,
      pageCount: choices.pageCount,
      binding: choices.binding,
      readerLevel: format.levels ? choices.level : undefined,
    });
    navigate({ kind: 'book', bookId: book.id, view: 'editor' });
  };

  return (
    <div className="nb-root">
      <h1>New book</h1>

      <section>
        <div className="nb-step-label">Format</div>
        <PresetPicker selected={formatId} onSelect={selectFormat} />
      </section>

      <section className="nb-options">
        <div className="nb-field">
          <label htmlFor="nb-title">Title</label>
          <input
            id="nb-title"
            type="text"
            placeholder="Untitled book"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="nb-field">
          <label>Trim</label>
          <div className="nb-chips" role="group" aria-label="Trim size">
            {format.trimOptions.map((trim) => (
              <button
                key={trimLabel(trim)}
                type="button"
                aria-pressed={sameTrim(choices.trim, trim)}
                onClick={() => setChoices((c) => ({ ...c, trim }))}
              >
                {trimLabel(trim)}
                <span className="nb-chip-note">{trim.orientation}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="nb-field">
          <label>Pages</label>
          <div className="nb-chips" role="group" aria-label="Page count">
            {format.pageCounts.map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={choices.pageCount === count}
                onClick={() => setChoices((c) => ({ ...c, pageCount: count }))}
              >
                {count}
                {count === format.defaultPageCount && (
                  <span className="nb-chip-note">classic</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {format.constructionOptions.length > 1 && (
          <div className="nb-field">
            <label>Construction</label>
            <div className="nb-chips" role="group" aria-label="Construction">
              {format.constructionOptions.map((construction) => (
                <button
                  key={construction.binding}
                  type="button"
                  aria-pressed={choices.binding === construction.binding}
                  onClick={() =>
                    setChoices((c) => ({ ...c, binding: construction.binding }))
                  }
                >
                  {construction.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {format.levels && (
          <div className="nb-field">
            <label>Reading level</label>
            <div className="nb-chips" role="group" aria-label="Reading level">
              {format.levels.map((l) => (
                <button
                  key={l.level}
                  type="button"
                  aria-pressed={choices.level === l.level}
                  onClick={() => setChoices((c) => ({ ...c, level: l.level }))}
                >
                  {l.label}
                  <span className="nb-chip-note">
                    {l.words.min}–{l.words.max} words
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="nb-field">
          <label>The physical facts</label>
          <SpecSheet
            format={format}
            trim={choices.trim}
            pageCount={choices.pageCount}
            binding={choices.binding}
            level={format.levels ? choices.level : undefined}
          />
        </div>

        <div className="nb-actions">
          <button type="button" className="btn btn-primary" onClick={create}>
            Start writing
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => navigate({ kind: 'library' })}
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
