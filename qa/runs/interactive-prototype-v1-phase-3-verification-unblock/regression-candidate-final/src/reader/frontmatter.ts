import { isMap, isScalar, parseDocument } from "yaml";

export interface MetadataResult {
  status: "valid" | "invalid";
  entries: Array<{ key: string; value: string }>;
  source: string;
}

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_ENTRIES = 100;

export function parseFrontmatter(source: string): MetadataResult {
  const invalid = (): MetadataResult => ({ status: "invalid", entries: [], source });
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) return invalid();
  if (!source.trim()) return { status: "valid", entries: [], source };
  try {
    const document = parseDocument(source, {
      schema: "failsafe", customTags: [], uniqueKeys: true
    });
    if (document.errors.length || !isMap(document.contents)
      || document.contents.items.length > MAX_ENTRIES) return invalid();
    const entries: MetadataResult["entries"] = [];
    for (const pair of document.contents.items) {
      if (!isScalar(pair.key) || !isScalar(pair.value)
        || pair.key.anchor || pair.value.anchor || pair.key.tag || pair.value.tag
        || typeof pair.key.value !== "string" || typeof pair.value.value !== "string"
        || !pair.key.value.trim() || pair.key.value.length > 128
        || pair.value.value.length > 2048) return invalid();
      entries.push({ key: pair.key.value, value: pair.value.value });
    }
    return { status: "valid", entries, source };
  } catch {
    return invalid();
  }
}
