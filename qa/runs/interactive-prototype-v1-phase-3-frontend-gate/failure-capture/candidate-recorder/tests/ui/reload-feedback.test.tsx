// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import ReloadFeedback from "../../src/app/ReloadFeedback";

afterEach(() => { cleanup(); vi.useRealTimers(); });
it("expires manual success after five seconds but retains the reserved footer", () => {
  vi.useFakeTimers();
  const { container } = render(<ReloadFeedback message="a.md: Already current" successful dismissLabel="Dismiss" />);
  expect(screen.getByRole("status").textContent).toContain("✓ a.md: Already current");
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.queryByRole("status")).toBeNull();
  expect(container.querySelector(".reload-feedback-footer")).toBeTruthy();
});
it("pauses the remaining time while hovered or keyboard focused", () => {
  vi.useFakeTimers();
  const { container } = render(<ReloadFeedback message="a.md: Updated" successful dismissLabel="Dismiss" />);
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.mouseEnter(container.firstChild!);
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByRole("status")).toBeTruthy();
  const button = screen.getByRole("button");
  act(() => button.focus());
  fireEvent.mouseLeave(container.firstChild!);
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByRole("status")).toBeTruthy();
  act(() => button.blur());
  act(() => vi.advanceTimersByTime(2999));
  expect(screen.getByRole("status")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("status")).toBeNull();
});
it("keeps failures until dismissed and reveals a subsequent outcome", () => {
  vi.useFakeTimers();
  const view = render(<ReloadFeedback message="a.md: Cannot confirm" successful={false} dismissLabel="Dismiss" />);
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole("status").textContent).not.toContain("✓");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.queryByRole("status")).toBeNull();
  view.rerender(<ReloadFeedback message="b.md: Already current" successful dismissLabel="Dismiss" />);
  expect(screen.getByRole("status").textContent).toContain("b.md");
});
