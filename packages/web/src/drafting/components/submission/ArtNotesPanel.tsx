/**
 * The art-notes quarantine, made visible: the notes lift out of the
 * manuscript (never silently dropped, never inlined) and travel in a
 * separate file labeled so it cannot be mistaken for the submission.
 */

import type { SubmissionDoc } from '../../submission.js';
import { artNotesFileText } from '../../submission.js';

function download(name: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ArtNotesPanel({ doc }: { doc: SubmissionDoc }) {
  if (doc.artNotes.length === 0) return null;
  return (
    <div className="ms-quarantine" role="note">
      <strong>
        {doc.artNotes.length} art{' '}
        {doc.artNotes.length === 1 ? 'note' : 'notes'} lifted out of the
        manuscript.
      </strong>{' '}
      Editors pair the story with their own illustrator and read the visual
      space themselves — art notes in a submission read as not knowing the
      industry. Yours travel in a separate file instead:
      <ul>
        {doc.artNotes.slice(0, 4).map((n, i) => (
          <li key={i}>
            {n.label} · {n.kind}
            {n.note ? ` · “${n.note}”` : ''}
          </li>
        ))}
        {doc.artNotes.length > 4 && <li>… and {doc.artNotes.length - 4} more</li>}
      </ul>
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() =>
          download('art-notes-do-not-submit.txt', artNotesFileText(doc))
        }
      >
        Download “Art notes — do not submit” (.txt)
      </button>
    </div>
  );
}
