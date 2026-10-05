import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

export type CodeToken = { text: string; className?: string; children?: never }
  | { children: CodeToken[]; className?: string; text?: never };

const MAX_CODE = 32 * 1024;
const MAX_TOKENS = 5_000;
const MAX_DEPTH = 20;
const highlighter = createLowlight({ bash, css, javascript, json, markdown, python,
  rust, typescript, xml, yaml });
const aliases: Record<string, string> = {
  sh: "bash", shell: "bash", js: "javascript", jsx: "javascript", ts: "typescript",
  tsx: "typescript", py: "python", rs: "rust", html: "xml", svg: "xml",
  yml: "yaml", md: "markdown"
};
const knownClasses = new Set([
  "keyword", "built_in", "type", "literal", "number", "string", "regexp", "symbol",
  "comment", "doctag", "meta", "meta-keyword", "title", "title-function",
  "title-class", "function", "params", "attr", "attribute", "variable", "property",
  "operator", "punctuation", "tag", "name", "selector-tag", "selector-class",
  "selector-id", "selector-attr", "section", "bullet", "quote", "addition", "deletion"
]);

function tokenClass(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const item of value) {
    if (typeof item !== "string" || !item.startsWith("hljs-")) continue;
    const name = item.slice(5);
    if (knownClasses.has(name)) return `tok-${name}`;
  }
  return undefined;
}

export function tokenizeCode(language: string, source: string): CodeToken[] | null {
  if (source.length > MAX_CODE || !/^[a-z][a-z0-9+_-]{0,31}$/i.test(language)) return null;
  const normalized = aliases[language.toLowerCase()] ?? language.toLowerCase();
  if (!highlighter.registered(normalized)) return null;
  try {
    const tree = highlighter.highlight(normalized, source);
    let count = 0;
    let rendered = "";
    const convert = (node: unknown, depth: number): CodeToken => {
      if (++count > MAX_TOKENS || depth > MAX_DEPTH || !node || typeof node !== "object")
        throw new Error("token budget");
      const value = node as { type?: string; value?: unknown; tagName?: unknown;
        properties?: { className?: unknown }; children?: unknown[] };
      if (value.type === "text" && typeof value.value === "string") {
        rendered += value.value;
        return { text: value.value };
      }
      if (value.type !== "element" || value.tagName !== "span" || !Array.isArray(value.children))
        throw new Error("invalid token");
      return { className: tokenClass(value.properties?.className),
        children: value.children.map((child) => convert(child, depth + 1)) };
    };
    const tokens = tree.children.map((child) => convert(child, 0));
    return rendered === source ? tokens : null;
  } catch {
    return null;
  }
}
