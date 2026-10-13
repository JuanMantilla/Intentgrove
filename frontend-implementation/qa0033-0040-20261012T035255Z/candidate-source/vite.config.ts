import { defineConfig } from "vite";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default defineConfig({
  clearScreen: false,
  resolve: {
    // The package's browser export uses document at module load, which is absent
    // in the Markdown worker. Its standard export works in both contexts.
    alias: {
      "decode-named-character-reference": require.resolve("decode-named-character-reference")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] }
  }
});
