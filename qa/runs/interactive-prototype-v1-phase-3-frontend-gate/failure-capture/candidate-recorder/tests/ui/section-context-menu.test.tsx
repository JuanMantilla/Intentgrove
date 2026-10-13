// @vitest-environment jsdom
import { StrictMode, useRef, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import MarkdownView from "../../src/reader/MarkdownView";
import { usePinchZoom } from "../../src/reader/usePinchZoom";
import type { SectionDescriptor } from "../../src/app/api";

const content = "# One\n\nDisposable paragraph.\n";
const section: SectionDescriptor = { id: "one", kind: "heading", ordinal: 0, level: 1,
  label: "One", startByte: 0, endByte: content.length, sourceHash: "fixture" };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup() {
  vi.stubGlobal("Worker", undefined);
  const edit = vi.fn();
  function Preview() {
    const reader = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    usePinchZoom(reader, "fixture", true, zoom, setZoom);
    return <><button onClick={event => event.stopPropagation()}>Elsewhere in app</button>
      <div ref={reader} data-testid="reader"><div className="document-page" style={{ zoom }}>
        <MarkdownView content={content} fileId="fixture" locale="en" onNavigate={() => {}}
          sections={[section]} onEditSection={edit} />
      </div></div></>;
  }
  const view = render(<StrictMode><Preview /></StrictMode>);
  const open = (x = 240, y = 180) => fireEvent.contextMenu(screen.getByText("Disposable paragraph."), { clientX: x, clientY: y });
  return { ...view, edit, open, reader: screen.getByTestId("reader") };
}

it("dismisses clicks in the preview, elsewhere in the app (even stopped), and on the body without editing", () => {
  const { open, edit } = setup();
  for (const target of [screen.getByRole("heading"), screen.getByRole("button", { name: "Elsewhere in app" }), document.body]) {
    open();
    fireEvent.click(target);
    expect(screen.queryByRole("menu")).toBeNull();
  }
  expect(edit).not.toHaveBeenCalled();
});

it("preserves menu background clicks and selects Edit section exactly once", () => {
  const { open, edit } = setup();
  open();
  fireEvent.click(screen.getByRole("menu"));
  expect(screen.getByRole("menu")).toBeTruthy();
  fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
  expect(edit).toHaveBeenCalledExactlyOnceWith(section);
  expect(screen.queryByRole("menu")).toBeNull();
});

it("handles Escape from anywhere and restores the section's focus", () => {
  const { open, edit } = setup();
  open();
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  // Paragraph regions are not focusable; the preview article is the fallback.
  expect(document.activeElement?.classList.contains("markdown-body")).toBe(true);
  expect(edit).not.toHaveBeenCalled();
  fireEvent.keyDown(document.activeElement!, { key: "F10", shiftKey: true });
  expect(screen.getByRole("menu")).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
});

it("reopens and repositions during the retained exit without accumulating menus", () => {
  const { open } = setup();
  open();
  fireEvent.click(document.body);
  open(300, 200);
  open(400, 250);
  expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
  expect(screen.getByRole("menu").style.left).toBe("400px");
  expect(screen.getByRole("menu").style.top).toBe("250px");
});

it("uses viewport coordinates including zero, independently of zoomed document bounds", () => {
  const { open } = setup();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 500, bottom: 600 } as DOMRect);
  open(0, 0);
  const menu = screen.getByRole("menu");
  expect(menu.parentElement).toBe(document.body);
  expect(menu.style.left).toBe("0px");
  expect(menu.style.top).toBe("0px");
});

it("clamps the measured menu at viewport edges and recomputes on resize", () => {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(160);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(60);
  vi.stubGlobal("innerWidth", 800); vi.stubGlobal("innerHeight", 600);
  const { open } = setup();
  open(799, 599);
  const menu = screen.getByRole("menu");
  expect([menu.style.left, menu.style.top]).toEqual(["640px", "540px"]);
  vi.stubGlobal("innerWidth", 500); vi.stubGlobal("innerHeight", 400);
  fireEvent(window, new Event("resize"));
  expect([menu.style.left, menu.style.top]).toEqual(["340px", "340px"]);
  open(-10, -20);
  expect([menu.style.left, menu.style.top]).toEqual(["0px", "0px"]);
});

it("keeps an open menu outside CSS zoom during ctrl-wheel and WebKit gestures, then opens at the next pointer position", () => {
  const { open, reader } = setup();
  open();
  const menu = screen.getByRole("menu");
  const page = reader.querySelector<HTMLElement>(".document-page")!;
  fireEvent.wheel(reader, { ctrlKey: true, deltaY: -100, clientX: 240, clientY: 180 });
  expect(Number(page.style.zoom)).toBeGreaterThan(1);
  expect(screen.getByRole("menu")).toBe(menu);
  expect([menu.style.left, menu.style.top]).toEqual(["240px", "180px"]);
  for (const scale of [0.25, 1, 4]) {
    fireEvent(reader, new Event("gesturestart", { bubbles: true, cancelable: true }));
    const gesture = Object.assign(new Event("gesturechange", { bubbles: true, cancelable: true }),
      { scale, clientX: 240, clientY: 180 });
    fireEvent(reader, gesture);
    expect(menu.closest(".document-page")).toBeNull();
    expect([menu.style.left, menu.style.top]).toEqual(["240px", "180px"]);
    fireEvent(reader, new Event("gestureend", { bubbles: true, cancelable: true }));
  }
  fireEvent.click(document.body);
  open(320, 280);
  expect([menu.style.left, menu.style.top]).toEqual(["320px", "280px"]);
  for (const [deltaY, expected] of [[100, 0.25], [-100, 4]]) {
    for (let i = 0; i < 20; i++) fireEvent.wheel(reader, { ctrlKey: true, deltaY });
    expect(Number(page.style.zoom)).toBe(expected);
    fireEvent.click(document.body);
    open(350, 300);
    expect([menu.style.left, menu.style.top]).toEqual(["350px", "300px"]);
  }
});

it("removes document and resize listeners on close, reopen, and unmount in StrictMode", () => {
  const add = vi.spyOn(document, "addEventListener"), remove = vi.spyOn(document, "removeEventListener");
  const addWindow = vi.spyOn(window, "addEventListener"), removeWindow = vi.spyOn(window, "removeEventListener");
  const { open, unmount } = setup();
  open(); fireEvent.click(document.body); open(); unmount();
  for (const [type, listener, capture] of add.mock.calls.filter(([type, , capture]) => capture === true && ["click", "keydown"].includes(type))) {
    expect(remove.mock.calls.some(call => call[0] === type && call[1] === listener && call[2] === capture)).toBe(true);
  }
  for (const [type, listener] of addWindow.mock.calls.filter(([type]) => type === "resize")) {
    expect(removeWindow.mock.calls.some(call => call[0] === type && call[1] === listener)).toBe(true);
  }
  act(() => { fireEvent.click(document.body); fireEvent.keyDown(document.body, { key: "Escape" }); });
  expect(document.querySelector('[role="menu"]')).toBeNull();
});
