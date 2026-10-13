// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it("parses GFM in the actual worker module and returns a plain syntax tree", async () => {
  const scope = {
    onmessage: null as ((event: MessageEvent<string>) => void) | null,
    postMessage: vi.fn()
  };
  vi.stubGlobal("self", scope);
  await import("../../src/reader/markdownBudget.worker");
  scope.onmessage?.({ data: "# Guide\n\n| A | B |\n| - | - |\n| 1 | 2 |" } as MessageEvent<string>);
  expect(scope.postMessage).toHaveBeenCalledOnce();
  const response = scope.postMessage.mock.calls[0][0] as { kind: string; tree: { children: { type: string }[] } };
  expect(response.kind).toBe("parsed");
  expect(response.tree.children.map((node) => node.type)).toEqual(["heading", "table"]);
});
