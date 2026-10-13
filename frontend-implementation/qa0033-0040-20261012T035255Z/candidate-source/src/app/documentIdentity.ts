/** Display paths only. Native handles/opaque IDs own all access decisions. */
function displayPath(path: string): string {
  return /^(?:\\\\\?\\)?[A-Za-z]:\\/.test(path) ? path.replaceAll("\\", "/") : path;
}

export interface DocumentIdentity { name: string; displayPath: string }

export function tabFilename(item: DocumentIdentity, siblings: DocumentIdentity[]): string {
  const name = item.name;
  if (name.length <= 28) return name;
  const compact = (value: string) => value.slice(0, 8) + "…" + value.slice(-19);
  const result = compact(name);
  // If abbreviation hides the differing segment, display the real filename, wrapped.
  return siblings.some((other) => other.name !== name && compact(other.name) === result) ? name : result;
}

export function distinguishingParent(item: DocumentIdentity, siblings: DocumentIdentity[]): string {
  const others = siblings.filter((other) => other.name === item.name && other.displayPath !== item.displayPath);
  if (!others.length) return "";
  const parent = (path: string) => displayPath(path).split("/").filter(Boolean).slice(0, -1);
  const parts = parent(item.displayPath);
  for (let count = 1; count <= parts.length; count++) {
    const suffix = parts.slice(-count).join("/");
    if (others.every((other) => parent(other.displayPath).slice(-count).join("/") !== suffix)) return suffix;
  }
  return parts.join("/");
}

/** Display identity only: this never grants access to a parent directory. */
export function workspaceSegments(path: string, rootPath: string | undefined): string[] | null {
  if (!rootPath) return null;
  const base = displayPath(rootPath).replace(/\/+$/, "") + "/";
  path = displayPath(path);
  if (!path.startsWith(base)) return null;
  const segments = path.slice(base.length).split("/");
  return segments.length && segments.every((part) => part && part !== "." && part !== "..") ? segments : null;
}
