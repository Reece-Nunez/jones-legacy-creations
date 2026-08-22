"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reading browser-only state (localStorage, media queries) as React external
 * stores.
 *
 * The obvious way to do this is a mount effect that calls setState, and that's
 * how the admin shell and theme provider were written. It works, but it forces
 * a second render pass on every mount and `react-hooks/set-state-in-effect`
 * flags it. useSyncExternalStore is the sanctioned tool: it renders the server
 * snapshot during hydration, then swaps to the real value without a mismatch
 * warning, because that is precisely what `getServerSnapshot` is for.
 *
 * Both hooks return primitives, so the snapshot is referentially stable and
 * can't trigger the infinite re-render that object snapshots cause.
 */

// ── localStorage ────────────────────────────────────────────────────────────

const storageListeners = new Set<() => void>();

function subscribeToStorage(onChange: () => void) {
  storageListeners.add(onChange);
  // Fires for writes from *other* tabs only, hence the manual notify below.
  window.addEventListener("storage", onChange);
  return () => {
    storageListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Write a key and notify subscribers in this tab.
 *
 * `localStorage.setItem` alone would update storage but not re-render anything
 * here, because the browser's `storage` event deliberately skips the tab that
 * made the change.
 */
export function writeStoredValue(key: string, value: string): void {
  window.localStorage.setItem(key, value);
  for (const listener of [...storageListeners]) listener();
}

/** Current value of a localStorage key, or null on the server and when unset. */
export function useStoredValue(key: string): string | null {
  const getSnapshot = useCallback(() => window.localStorage.getItem(key), [key]);
  return useSyncExternalStore(subscribeToStorage, getSnapshot, () => null);
}

// ── media queries ───────────────────────────────────────────────────────────

/**
 * Whether a media query currently matches.
 *
 * `serverFallback` is what renders before hydration. Pick the value that makes
 * the pre-hydration paint least wrong for the surface in question rather than
 * defaulting blindly to false.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => serverFallback);
}
