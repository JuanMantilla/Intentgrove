import { useLayoutEffect, useState } from "react";

// Keep an overlay painted briefly after logical close. Its caller removes it from
// focus and the accessibility tree immediately; the retained node is visual only.
export function useRetainedOverlay<T>(value: T | null, exitMs: number, instantQuery?: string) {
  const [retained, setRetained] = useState<T | null>(value);

  useLayoutEffect(() => {
    if (value !== null) {
      setRetained(value);
      return;
    }
    if (retained === null) return;
    const instant = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      || (instantQuery ? window.matchMedia?.(instantQuery).matches : false);
    if (instant) {
      setRetained(null);
      return;
    }
    const timer = window.setTimeout(() => setRetained(null), exitMs);
    return () => window.clearTimeout(timer);
  }, [value, retained, exitMs, instantQuery]);

  return { shown: value ?? retained, closing: value === null && retained !== null };
}
