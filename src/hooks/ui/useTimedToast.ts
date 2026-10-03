import { useCallback, useEffect, useRef, useState } from 'react';

interface TimedToast<T> {
  toast: T | null;
  showToast: (value: T) => void;
}

/**
 * Local-state toast that clears itself after `durationMs`.
 *
 * Holds one timer and replaces it on every toast: without that, two actions
 * less than `durationMs` apart let the first toast's countdown wipe the
 * second one early (TOAST-TIMER-01). The pending timer is cleared on unmount.
 */
export function useTimedToast<T>(durationMs = 3000): TimedToast<T> {
  const [toast, setToast] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((value: T) => {
    clearTimeout(timer.current);
    setToast(value);
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, showToast };
}
