import { parseBounded } from "./bounded-parser";
import { BLOCK_PROTOCOL } from "./block-budget";
self.onmessage = (event: MessageEvent<string | { version: number; generation: number; source: string }>) => {
  const request = event.data;
  const source = typeof request === "string" ? request : request.source;
  const generation = typeof request === "string" ? 0 : request.generation;
  if (typeof request !== "string" && request.version !== BLOCK_PROTOCOL) return;
  try {
    const result = parseBounded(source);
    self.postMessage({ kind: "parsed", version: BLOCK_PROTOCOL, generation, ...result });
  } catch {
    self.postMessage({ kind: "overBudget", version: BLOCK_PROTOCOL, generation });
  }
};
