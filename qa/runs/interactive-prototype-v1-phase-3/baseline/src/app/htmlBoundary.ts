import type { DocumentResponse } from "./api";

/** File classification only; names and display paths never confer access. */
export function isHtmlDocument(name: string): boolean {
  return /\.html?$/i.test(name);
}

/** For an already unsupported native link outcome only. Never resolve/grant it. */
export function isHtmlLink(target: string): boolean {
  try { return isHtmlDocument(decodeURIComponent(target.split(/[?#]/, 1)[0])); }
  catch { return false; }
}

/** HTML must not enter the privileged Markdown renderer, even if a newer host
 * returns its bytes through an older command. An isolated view is required. */
export function requireMarkdownResponse(document: DocumentResponse): DocumentResponse {
  if (isHtmlDocument(document.name)) {
    throw { code: "html_view_unavailable", message: "An isolated HTML viewer is required" };
  }
  return document;
}
