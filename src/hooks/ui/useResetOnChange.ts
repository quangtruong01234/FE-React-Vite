import { useState } from 'react';

/**
 * Runs `reset` exactly once each time `key` changes value (compared with
 * `Object.is`), synchronously during render — the React-recommended alternative
 * to a `setState`-in-`useEffect` "reset when a value changes" pattern.
 *
 * The effect version fires *after* the render commits, so React paints a frame
 * (and, for a paginated query, kicks off a fetch) with the stale value before
 * the reset lands, then re-renders — an avoidable cascading render. Adjusting
 * state during render instead lets React discard the in-progress render and
 * restart with the reset already applied, so no stale frame/refetch escapes.
 *
 * `reset` typically calls one or more `setState` updaters belonging to the host
 * component. It is never called on the initial render (only when `key` differs
 * from its previous value).
 *
 * @see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useResetOnChange(key: unknown, reset: () => void): void {
  const [prevKey, setPrevKey] = useState(key);
  if (!Object.is(key, prevKey)) {
    setPrevKey(key);
    reset();
  }
}
