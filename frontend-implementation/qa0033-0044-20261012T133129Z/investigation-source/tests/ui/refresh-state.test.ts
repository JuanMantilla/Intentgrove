import { describe, expect, it } from "vitest";
import { confirmCleanDocument, confirmDirectoryPage, noteDirectoryChange, noteFileChange } from "../../src/workspace/refreshState";

describe("refresh state", () => {
  it("keeps confirmed content while checking and ignores old generations", () => {
    const tabs = [{ id: "a", content: "old", diskVersion: "v1", freshness: "current" as const }];
    const event = { generation: 2, fileId: "a", diskVersion: "v2", identityKey: "1:1", checkedAt: 1 };
    expect(noteFileChange(tabs, event, 3)).toBe(tabs);
    const checking = noteFileChange(tabs, event, 2);
    expect(checking[0]).toMatchObject({ content: "old", diskVersion: "v1", pendingDiskVersion: "v2", freshness: "checking" });
    const confirmed = confirmCleanDocument(checking, {
      fileId: "a", name: "a.md", displayPath: "/tmp/a.md", identityKey: "1:1", content: "new", diskVersion: "v2"
    }, 2, 2);
    expect(confirmed[0]).toMatchObject({ content: "new", diskVersion: "v2", freshness: "changed" });
  });

  it("retains a dirty draft when disk changes", () => {
    const tabs = [{ id: "a", content: "my draft", diskVersion: "v1", dirty: true }];
    const changed = noteFileChange(tabs, { generation: 1, fileId: "a", diskVersion: "v2", identityKey: "1:1", checkedAt: 1 }, 1);
    expect(changed[0]).toMatchObject({ content: "my draft", freshness: "conflict" });
    const attempted = confirmCleanDocument(changed, {
      fileId: "a", name: "a.md", displayPath: "/tmp/a.md", identityKey: "1:1", content: "external", diskVersion: "v2"
    }, 1, 1);
    expect(attempted[0].content).toBe("my draft");
  });

  it("keeps unaffected directory state when one branch refreshes", () => {
    const directories = {
      docs: { entries: [{ name: "one.md", kind: "markdown" as const }], nextOffset: null, snapshotId: "one", expanded: true, loading: false, loaded: true, scrollTop: 75 },
      other: { entries: [], nextOffset: null, expanded: true, loading: false, loaded: true, scrollTop: 12 }
    };
    const marked = noteDirectoryChange(directories, "docs", { generation: 1, rootId: "root", segments: ["docs"], snapshotId: "two" }, 1);
    expect(marked.other).toBe(directories.other);
    const confirmed = confirmDirectoryPage(marked.docs, { entries: [{ name: "two.md", kind: "markdown" }], nextOffset: null, snapshotId: "two" }, false);
    expect(confirmed).toMatchObject({ expanded: true, scrollTop: 75, snapshotId: "two", refreshStatus: "current" });
  });
});
