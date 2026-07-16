/**
 * One book on the shelf: a trim-true silhouette, the title, and plain counts.
 */

import { getFormat, trimLabel } from '../../formats.js';
import type { LibraryEntry } from '../../persistence.js';

function relativeTime(ts: number, now = Date.now()): string {
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function TrimSilhouette({
  width,
  height,
  box = 72,
}: {
  width: number;
  height: number;
  box?: number;
}) {
  const scale = box / Math.max(width, height);
  return (
    <div
      className="trim-silhouette"
      style={{ width: width * scale, height: height * scale }}
      aria-hidden="true"
    />
  );
}

export function BookCard({
  entry,
  onOpen,
  onDelete,
}: {
  entry: LibraryEntry;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const format = getFormat(entry.formatId);
  return (
    <div className="lib-card">
      <button
        type="button"
        className="lib-card-preview"
        onClick={onOpen}
        aria-label={`Open ${entry.title}`}
      >
        <TrimSilhouette width={format.trim.width} height={format.trim.height} />
      </button>
      <div>
        <div className="lib-card-title">{entry.title}</div>
        <div className="lib-card-meta">
          <span>
            {format.name} · {trimLabel(format.trim)} · {entry.pageCount} pages
          </span>
          <div className="lib-card-row">
            <span>
              {entry.wordCount} {entry.wordCount === 1 ? 'word' : 'words'} ·
              edited {relativeTime(entry.updatedAt)}
            </span>
            <button
              type="button"
              className="btn-danger-quiet app-iconbtn"
              onClick={onDelete}
              aria-label={`Delete ${entry.title}`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
