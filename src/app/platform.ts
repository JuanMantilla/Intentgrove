/** UI composition only. Native code independently enforces unavailable writes/decoding. */
export const isWindows = typeof navigator !== "undefined" && /^Win/i.test(navigator.platform);
export const isMac = typeof navigator !== "undefined" && /^Mac/i.test(navigator.platform);
export const fileRevealAvailable = isMac || isWindows;
export function localAbsolutePath(path: string | undefined): boolean {
  return !!path && !path.includes("\0") && (isWindows ? /^(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/.test(path) : isMac && path.startsWith("/"));
}
export const editingAvailable = !isWindows;
export function commandPressed(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "altKey">, windows = isWindows): boolean {
  return !event.altKey && (windows ? event.ctrlKey && !event.metaKey : event.metaKey && !event.ctrlKey);
}
export function shortcutHint(key: string, shift = false, windows = isWindows): string {
  return windows ? `Ctrl+${shift ? "Shift+" : ""}${key}` : `${shift ? "⇧" : ""}⌘${key}`;
}
export function deviceText(text: string, windows = isWindows): string {
  return windows ? text.replaceAll("this Mac", "this device").replaceAll("este Mac", "este dispositivo").replaceAll("macOS", "Windows") : text;
}
