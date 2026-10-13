export interface Visit<T> { target: T; key: string; scrollTop: number; scrollLeft: number; anchor?: string }
export interface VisitHistory<T> { entries: Visit<T>[]; cursor: number }
export const emptyHistory = <T>(): VisitHistory<T> => ({ entries: [], cursor: -1 });
export function recordVisit<T>(history: VisitHistory<T>, visit: Visit<T>): VisitHistory<T> {
  const current = history.entries[history.cursor];
  if (current?.key === visit.key && current.anchor === visit.anchor) return history;
  const entries = [...history.entries.slice(0, history.cursor + 1), visit].slice(-100);
  return { entries, cursor: entries.length - 1 };
}
export function updateVisit<T>(history: VisitHistory<T>, key: string, position: Pick<Visit<T>, "scrollTop" | "scrollLeft">): VisitHistory<T> {
  if (history.entries[history.cursor]?.key !== key) return history;
  const entries = [...history.entries];
  entries[history.cursor] = { ...entries[history.cursor], ...position };
  return { ...history, entries };
}
