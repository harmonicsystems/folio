/** Subscribe to the hash route. */

import { useSyncExternalStore } from 'react';
import { currentRoute, onRouteChange, type Route } from '../router.js';

let cached: { hash: string; route: Route } | null = null;

function getSnapshot(): Route {
  const hash = window.location.hash;
  if (!cached || cached.hash !== hash) {
    cached = { hash, route: currentRoute() };
  }
  return cached.route;
}

export function useRoute(): Route {
  return useSyncExternalStore(onRouteChange, getSnapshot);
}
