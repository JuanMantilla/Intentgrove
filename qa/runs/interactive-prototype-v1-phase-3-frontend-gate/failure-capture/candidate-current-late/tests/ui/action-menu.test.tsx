// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ActionMenu from "../../src/app/ActionMenu";

afterEach(cleanup);
function setup() {
  const close = vi.fn();
  render(<><button>Invoker</button><button>Outside</button><div data-testid="surface" /></>);
  const anchor = screen.getByRole("button", { name: "Invoker" });
  render(<ActionMenu anchor={anchor} x={10} y={10} onClose={close}
    actions={[{ label: "Action", run: vi.fn() }]} />);
  return { anchor, close, item: screen.getByRole("menuitem") };
}
it("dismisses on outside pointer-down without moving focus back to the invoker", () => {
  const { anchor, close, item } = setup();
  expect(document.activeElement).toBe(item);
  fireEvent.pointerDown(screen.getByTestId("surface"));
  expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).not.toBe(anchor);
});
it("dismisses on target scroll without scrolling focus back to the invoker", () => {
  const { anchor, close } = setup();
  fireEvent.scroll(screen.getByTestId("surface"));
  expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).not.toBe(anchor);
});
it("restores the invoker only on keyboard cancellation", () => {
  const { anchor, close, item } = setup();
  fireEvent.keyDown(item, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(anchor);
});
it("dismisses for Tab and resumes navigation from the invoker", () => {
  const { anchor, close, item } = setup();
  fireEvent.keyDown(item, { key: "Tab" });
  expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(anchor);
});
