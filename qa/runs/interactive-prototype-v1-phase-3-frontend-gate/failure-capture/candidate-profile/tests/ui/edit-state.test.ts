import { describe, expect, it } from "vitest";
import { editReducer, type SectionEdit } from "../../src/workspace/editState";

const edit: SectionEdit = {
  sessionId: "session-a", diskVersion: "v1",
  section: { id: "section-a", kind: "heading", ordinal: 0, label: "A",
    startByte: 0, endByte: 8, sourceHash: "hash" },
  source: "# A\nold\n", draft: "# A\nold\n", lineSeparator: "\n",
  checkpointStatus: "pending", sequence: 0
};

describe("section edit state", () => {
  it("holds one session per document until Save or Discard removes it", () => {
    const first = editReducer({}, { type: "begin", tabId: "file", edit });
    const blocked = editReducer(first, { type: "begin", tabId: "file",
      edit: { ...edit, sessionId: "session-b" } });
    expect(blocked).toBe(first);
    const released = editReducer(blocked, { type: "remove", tabId: "file" });
    expect(released.file).toBeUndefined();
    expect(editReducer(released, { type: "begin", tabId: "file",
      edit: { ...edit, sessionId: "session-b" } }).file.sessionId).toBe("session-b");
  });

  it("does not acknowledge an older or different session checkpoint", () => {
    let state = editReducer({}, { type: "begin", tabId: "file", edit });
    state = editReducer(state, { type: "checkpoint", tabId: "file", sessionId: "session-a",
      sequence: 1, draft: "first", editorJson: { doc: "first" }, scrollTop: 1, scrollLeft: 0 });
    state = editReducer(state, { type: "checkpoint", tabId: "file", sessionId: "session-a",
      sequence: 2, draft: "second", editorJson: { doc: "second" }, scrollTop: 2, scrollLeft: 0 });
    expect(editReducer(state, { type: "checkpointResult", tabId: "file", sessionId: "session-a",
      sequence: 1, status: "saved" })).toBe(state);
    expect(editReducer(state, { type: "checkpointResult", tabId: "file", sessionId: "session-b",
      sequence: 2, status: "saved" })).toBe(state);
    const saved = editReducer(state, { type: "checkpointResult", tabId: "file",
      sessionId: "session-a", sequence: 2, status: "saved" });
    expect(saved.file.checkpointStatus).toBe("saved");
    expect(saved.file.draft).toBe("second");
  });

  it("keeps a paused conflicting draft until explicit removal", () => {
    let state = editReducer({}, { type: "begin", tabId: "file", edit });
    state = editReducer(state, { type: "draft", tabId: "file", sessionId: "session-a", draft: "changed" });
    state = editReducer(state, { type: "pause", tabId: "file", paused: true });
    state = editReducer(state, { type: "conflict", tabId: "file" });
    expect(state.file).toMatchObject({ draft: "changed", paused: true, conflict: true });
  });
});
