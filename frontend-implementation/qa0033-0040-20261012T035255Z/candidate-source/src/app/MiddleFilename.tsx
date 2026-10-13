import { useLayoutEffect, useRef, useState } from "react";

/** Display-only abbreviation. The actual name remains available to assistive technology. */
export function fitFilename(name: string, width: number, measure: (text: string) => number): string {
  if (measure(name) <= width) return name;
  const chars = Array.from(name);
  // Prefer a substantial suffix so shared-prefix files remain distinguishable.
  for (let count = chars.length - 1; count > 0; count--) {
    const tail = Math.max(1, Math.ceil(count * .65));
    const head = count - tail;
    const value = chars.slice(0, head).join("") + "…" + chars.slice(-tail).join("");
    if (measure(value) <= width) return value;
  }
  return "…";
}

export default function MiddleFilename({ name, className = "" }: { name: string; className?: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState(name);
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    let disposed = false;
    const update = () => {
      if (disposed || node.clientWidth <= 0) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      const style = getComputedStyle(node);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      setLabel(fitFilename(name, node.clientWidth, text => context.measureText(text).width));
    };
    setLabel(name);
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(node);
    void document.fonts?.ready.then(update);
    return () => { disposed = true; observer?.disconnect(); };
  }, [name]);
  return <span ref={element} className={`middle-filename ${className}`} aria-label={name}>{label}</span>;
}
