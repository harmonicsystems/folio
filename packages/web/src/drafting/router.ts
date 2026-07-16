/**
 * Minimal hash router. Hash routes refresh and deep-link cleanly on static
 * hosting (GitHub Pages, no rewrites):
 *
 *   #/                          library
 *   #/new                       new-book flow
 *   #/book/<id>                 editor
 *   #/book/<id>/spread/<n>      editor at unit n
 *   #/book/<id>/storyboard      storyboard
 *   #/book/<id>/illustrations   illustration list
 *   #/book/<id>/submission      submission view
 */

export type BookView = 'editor' | 'storyboard' | 'illustrations' | 'submission';

export type Route =
  | { kind: 'library' }
  | { kind: 'new' }
  | { kind: 'book'; bookId: string; view: BookView; unit?: number };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'new') return { kind: 'new' };
  if (parts[0] === 'book' && parts[1]) {
    const bookId = decodeURIComponent(parts[1]);
    if (parts[2] === 'storyboard') return { kind: 'book', bookId, view: 'storyboard' };
    if (parts[2] === 'illustrations') {
      return { kind: 'book', bookId, view: 'illustrations' };
    }
    if (parts[2] === 'submission') return { kind: 'book', bookId, view: 'submission' };
    if (parts[2] === 'spread' && parts[3]) {
      const unit = Number.parseInt(parts[3], 10);
      return {
        kind: 'book',
        bookId,
        view: 'editor',
        unit: Number.isFinite(unit) ? unit : undefined,
      };
    }
    return { kind: 'book', bookId, view: 'editor' };
  }
  return { kind: 'library' };
}

export function routeToHash(route: Route): string {
  switch (route.kind) {
    case 'library':
      return '#/';
    case 'new':
      return '#/new';
    case 'book': {
      const base = `#/book/${encodeURIComponent(route.bookId)}`;
      if (route.view === 'editor') {
        return route.unit !== undefined ? `${base}/spread/${route.unit}` : base;
      }
      return `${base}/${route.view}`;
    }
  }
}

export function currentRoute(): Route {
  return parseHash(typeof window !== 'undefined' ? window.location.hash : '');
}

export function navigate(route: Route): void {
  const hash = routeToHash(route);
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

export function onRouteChange(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
