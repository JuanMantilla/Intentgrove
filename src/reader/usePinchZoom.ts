import { useLayoutEffect, useRef, type RefObject } from "react";

type Point = { x: number; y: number };
type Gesture = Event & { scale: number; clientX: number; clientY: number };
export const boundZoom = (scale: number) => Math.max(0.25, Math.min(4, scale));

let unscaledRects: boolean | undefined;
/** Normalize CSS-zoom rectangles to the same viewport coordinates as pointer events.
 * WebKit versions can divide all rectangle coordinates by the element's CSS zoom.
 * Measure that behavior instead of relying on a browser name/version. */
export function normalizeZoomRect(rect: DOMRect, scale: number) {
  if (scale !== 1 && unscaledRects === undefined) {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:0;top:0;width:100px;height:1px;zoom:2;visibility:hidden;pointer-events:none";
    document.body.append(probe);
    unscaledRects = Math.abs(probe.getBoundingClientRect().width - 100) < 0.5;
    probe.remove();
  }
  const multiplier = unscaledRects ? scale : 1;
  return new DOMRect(rect.left * multiplier, rect.top * multiplier, rect.width * multiplier, rect.height * multiplier);
}

export const zoomRect = (element: HTMLElement, scale: number) => normalizeZoomRect(element.getBoundingClientRect(), scale);

/** WebKit gestures and ctrl-wheel trackpad pinch; ordinary scrolling is untouched. */
export function usePinchZoom(ref: RefObject<HTMLElement | null>, identity: string,
  enabled: boolean, scale: number, change: (scale: number, point: Point) => void) {
  const current = useRef({ scale, change });
  current.current = { scale, change };
  // Input must be owned when the enabled content becomes observable. A passive
  // effect leaves a committed source window briefly unable to receive pinch.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let gestureBase: number | null = null;
    const apply = (next: number, event: { clientX: number; clientY: number }) => {
      if (!Number.isFinite(next) || next <= 0) return;
      current.current.scale = boundZoom(next);
      const bounds = element.getBoundingClientRect();
      current.current.change(current.current.scale, {
        x: Number.isFinite(event.clientX) ? event.clientX : bounds.left + bounds.width / 2,
        y: Number.isFinite(event.clientY) ? event.clientY : bounds.top + bounds.height / 2
      });
    };
    const start = (event: Event) => {
      event.preventDefault();
      gestureBase = current.current.scale;
    };
    const gesture = (event: Event) => {
      event.preventDefault();
      const value = event as Gesture;
      if (gestureBase === null) gestureBase = current.current.scale;
      apply(gestureBase * value.scale, value);
    };
    const end = (event: Event) => { event.preventDefault(); gestureBase = null; };
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      // WebKit can deliver both representations for one gesture.
      if (gestureBase !== null) return;
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      apply(current.current.scale * Math.exp(-Math.max(-100, Math.min(100, event.deltaY * units)) / 300), event);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("gesturestart", start, { passive: false });
    element.addEventListener("gesturechange", gesture, { passive: false });
    element.addEventListener("gestureend", end, { passive: false });
    return () => {
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("gesturestart", start);
      element.removeEventListener("gesturechange", gesture);
      element.removeEventListener("gestureend", end);
    };
  }, [ref, identity, enabled]);
}
