import { tokenizeCode } from "./code-tokens";

self.onmessage = (event: MessageEvent<{ language: string; source: string }>) => {
  const value = event.data;
  if (!value || typeof value.language !== "string" || typeof value.source !== "string") {
    self.postMessage({ kind: "plain" });
    return;
  }
  const tokens = tokenizeCode(value.language, value.source);
  self.postMessage(tokens ? { kind: "tokens", tokens } : { kind: "plain" });
};
