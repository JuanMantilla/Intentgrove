// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CodeBlock, { fencedSource } from "../../src/reader/CodeBlock";
import { tokenizeCode, type CodeToken } from "../../src/reader/code-tokens";
import MarkdownView from "../../src/reader/MarkdownView";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function flatten(tokens: CodeToken[]): string {
  return tokens.map((token) => "text" in token ? token.text : flatten(token.children)).join("");
}

describe("local code tokens", () => {
  it("preserves source text and only emits fixed token classes", () => {
    const source = 'const answer = "<script>alert(1)</script>";';
    const tokens = tokenizeCode("js", source);
    expect(tokens).not.toBeNull();
    expect(flatten(tokens!)).toBe(source);
    expect(JSON.stringify(tokens)).toContain("tok-keyword");
    expect(JSON.stringify(tokens)).not.toContain("<span");
    expect(tokenizeCode("unknownlanguage", source)).toBeNull();
    expect(tokenizeCode("javascript", "a".repeat(32 * 1024 + 1))).toBeNull();
  });

  it("copies exact fenced bytes while rendering plain fallback without a worker", async () => {
    vi.stubGlobal("Worker", undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const content = "```js\r\nconst x = 1;\r\n```\r\n";
    expect(fencedSource(content, 0, content.length - 2, "fallback"))
      .toBe("const x = 1;\r\n");
    render(<MarkdownView content={content} fileId="fixture" locale="en"
      onNavigate={() => {}} />);
    expect(screen.getByText("js")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("const x = 1;\r\n"));
    expect(screen.getByRole("status").textContent).toBe("Code copied");
  });

  it("renders worker tokens as React text spans", async () => {
    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage(input: { language: string; source: string }) {
        const tokens = tokenizeCode(input.language, input.source);
        queueMicrotask(() => this.onmessage?.({ data: tokens
          ? { kind: "tokens", tokens } : { kind: "plain" } } as MessageEvent));
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FakeWorker);
    const source = "const x = 1;";
    const { container } = render(<CodeBlock source={source} copySource={source}
      language="javascript" locale="es" />);
    await waitFor(() => expect(container.querySelector(".tok-keyword")?.textContent).toBe("const"));
    expect(container.querySelector("code")?.textContent).toBe(source);
    expect(container.querySelector("script")).toBeNull();
  });

  it("bounds simultaneous token workers when a document has many fences", () => {
    let started = 0;
    class PendingWorker {
      constructor() { started += 1; }
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal("Worker", PendingWorker);
    const blocks = Array.from({ length: 20 }, (_, index) =>
      <CodeBlock key={index} source="const x = 1;" copySource="const x = 1;"
        language="javascript" locale="en" />);
    const { container } = render(<>{blocks}</>);
    expect(started).toBe(2);
    expect(container.querySelectorAll(".code-block")).toHaveLength(20);
  });
});
