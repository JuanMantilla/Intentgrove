// @vitest-environment jsdom
import { useRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { boundZoom, usePinchZoom } from "../../src/reader/usePinchZoom";
afterEach(cleanup);
function Viewer({ identity = "a", enabled = true, scale = 1, change }: {
  identity?: string; enabled?: boolean; scale?: number; change: (scale: number, point: { x: number; y: number }) => void
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePinchZoom(ref, identity, enabled, scale, change);
  return <div ref={ref} data-testid="viewer" />;
}
const gesture = (type: string, scale = 1) => Object.assign(new Event(type, { cancelable: true, bubbles: true }), { scale, clientX: 80, clientY: 120 });
it("uses WebKit absolute gesture scale from its initial scale across React updates and suppresses duplicate ctrl-wheel", () => {
  const change = vi.fn(); const view = render(<Viewer scale={1.5} change={change} />), element = view.getByTestId("viewer");
  fireEvent(element, gesture("gesturestart")); fireEvent(element, gesture("gesturechange", 1.2));
  expect(change.mock.lastCall?.[0]).toBeCloseTo(1.8);
  view.rerender(<Viewer scale={1.8} change={change} />);
  fireEvent(element, new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, cancelable: true })); expect(change).toHaveBeenCalledTimes(1);
  fireEvent(element, gesture("gesturechange", 0.8)); expect(change.mock.lastCall?.[0]).toBeCloseTo(1.2);
  const end = gesture("gestureend"); fireEvent(element, end); expect(end.defaultPrevented).toBe(true);
  fireEvent(element, gesture("gesturestart")); fireEvent(element, gesture("gesturechange", 2));
  expect(change.mock.lastCall?.[0]).toBeCloseTo(2.4); expect(change.mock.lastCall?.[1]).toEqual({ x: 80, y: 120 });
});
it("accumulates repeated pinch input before a render, clamps limits, and leaves ordinary wheel alone", () => {
  const change = vi.fn(); const view = render(<Viewer change={change} />), element = view.getByTestId("viewer");
  act(() => { for (let i = 0; i < 30; i++) element.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, cancelable: true })); });
  expect(change.mock.lastCall?.[0]).toBe(4);
  act(() => { for (let i = 0; i < 30; i++) element.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: 100, cancelable: true })); });
  expect(change.mock.lastCall?.[0]).toBe(0.25);
  const ordinary = new WheelEvent("wheel", { deltaY: 100, cancelable: true }); fireEvent(element, ordinary);
  expect(ordinary.defaultPrevented).toBe(false); expect(change).toHaveBeenCalledTimes(60);
  expect(boundZoom(0.1)).toBe(0.25); expect(boundZoom(6)).toBe(4);
});
it("resets gesture ownership on file switch, ignores invalid values and detaches for disabled viewers", () => {
  const change = vi.fn(); const view = render(<Viewer change={change} />), element = view.getByTestId("viewer");
  fireEvent(element, gesture("gesturestart")); fireEvent(element, gesture("gesturechange", Number.NaN)); expect(change).not.toHaveBeenCalled();
  view.rerender(<Viewer identity="b" scale={2} change={change} />);
  fireEvent(element, new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, cancelable: true })); expect(change.mock.lastCall?.[0]).toBeGreaterThan(2);
  view.rerender(<Viewer identity="b" enabled={false} change={change} />);
  const disabled = gesture("gesturestart"); fireEvent(element, disabled); expect(disabled.defaultPrevented).toBe(false);
  view.unmount(); const unmounted = new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, cancelable: true }); element.dispatchEvent(unmounted);
  expect(unmounted.defaultPrevented).toBe(false);
});
it("uses the content viewport center when a native GestureEvent supplies no pointer coordinates", () => {
  const change = vi.fn(), view = render(<Viewer change={change} />), element = view.getByTestId("viewer");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 30, 400, 300));
  fireEvent(element, new Event("gesturestart", { cancelable: true }));
  fireEvent(element, Object.assign(new Event("gesturechange", { cancelable: true }), { scale: 1.5 }));
  expect(change).toHaveBeenCalledWith(1.5, { x: 220, y: 180 });
});
