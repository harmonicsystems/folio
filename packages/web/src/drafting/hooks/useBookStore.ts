/**
 * React binding for the BookStore singleton. Components read state through
 * the snapshot and mutate only through the store's actions — no component
 * touches localStorage.
 */

import { useSyncExternalStore } from 'react';
import { BookStore, type StoreSnapshot } from '../persistence.js';

let instance: BookStore | null = null;

export function getBookStore(): BookStore {
  if (!instance) instance = new BookStore();
  return instance;
}

export function useBookStore(): { store: BookStore; state: StoreSnapshot } {
  const store = getBookStore();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { store, state };
}
