import { expect, it } from "vitest";
import { emptyHistory, recordVisit, updateVisit, type Visit } from "../../src/workspace/visitHistory";
const visit = (key: string, anchor?: string): Visit<string> => ({ key, target: key, anchor, scrollTop: 0, scrollLeft: 0 });
it("limits the window session to 100 committed visits and drops the oldest", () => {
  let history = emptyHistory<string>();
  for (let i = 0; i < 105; i++) history = recordVisit(history, visit(String(i)));
  expect(history.entries).toHaveLength(100); expect(history.entries[0].key).toBe("5"); expect(history.cursor).toBe(99);
});
it("branches after a new visit, preserves repeated separated visits and ignores selecting the current location", () => {
  let history = recordVisit(recordVisit(recordVisit(emptyHistory<string>(), visit("a")), visit("b")), visit("a"));
  expect(history.entries.map(entry => entry.key)).toEqual(["a", "b", "a"]);
  expect(recordVisit(history, visit("a"))).toBe(history);
  history = recordVisit({ ...history, cursor: 0 }, visit("a", "section"));
  expect(history.entries.map(entry => [entry.key, entry.anchor])).toEqual([["a", undefined], ["a", "section"]]);
});
it("scrolling updates only the owned location without appending or changing the forward branch", () => {
  const history = { ...recordVisit(recordVisit(emptyHistory<string>(), visit("a")), visit("b")), cursor: 0 };
  expect(updateVisit(history, "b", { scrollTop: 5, scrollLeft: 2 })).toBe(history);
  const changed = updateVisit(history, "a", { scrollTop: 700, scrollLeft: 25 });
  expect(changed.entries[0].scrollTop).toBe(700); expect(changed.entries[1]).toBe(history.entries[1]); expect(changed.cursor).toBe(0);
  expect(history.entries[0].scrollTop).toBe(0);
});
