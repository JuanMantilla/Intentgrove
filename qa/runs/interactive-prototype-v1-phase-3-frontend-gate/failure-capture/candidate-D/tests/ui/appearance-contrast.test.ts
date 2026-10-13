import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../src/styles/app.css", import.meta.url), "utf8");
const palettes = [
  ["light", css.match(/:root \{([^}]+)\}/)![1]],
  ["dark", css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)![1]]
] as const;
function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.slice(0, 3).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const pairs: Array<[string, string, number]> = [
  ...["canvas", "chrome", "sidebar", "surface", "hover", "code"].flatMap((surface) =>
    [["text", surface, 4.5], ["muted", surface, 4.5]] as Array<[string, string, number]>),
  ["text", "selection", 4.5], ["accent", "surface", 4.5], ["accent-hover", "surface", 4.5],
  ["action-text", "accent", 4.5], ["action-text", "accent-hover", 4.5],
  ["warning-text", "warning-surface", 4.5], ["error", "surface", 4.5],
  ...["canvas", "chrome", "sidebar", "surface", "hover", "warning-surface"].map((surface) =>
    ["focus", surface, 3] as [string, string, number]),
  ["control-border", "surface", 3], ["control-border", "chrome", 3]
];

describe("F002A palette contrast requirements", () => {
  it("sets selected text to the primary foreground in both app and editor", () => {
    expect(css).toMatch(/::selection\s*\{[^}]*color:\s*var\(--text\)/);
    expect(css).toMatch(/\.cm-content ::selection\s*\{[^}]*color:\s*var\(--text\)/);
  });
  for (const [theme, declarations] of palettes) {
    const tokens = Object.fromEntries(Array.from(declarations.matchAll(/--([\w-]+):\s*(#[\da-f]+)/gi))
      .map((match) => [match[1], match[2]]));
    it.each(pairs)(`${theme}: %s on %s meets %s:1`, (foreground, background, minimum) => {
      const values = [luminance(tokens[foreground]), luminance(tokens[background])].sort((a, b) => b - a);
      expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(minimum);
    });
  }
});
