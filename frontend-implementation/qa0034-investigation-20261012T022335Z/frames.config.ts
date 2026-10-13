import { mergeConfig } from "vitest/config";
import base from "./diagnostic.config";
export default mergeConfig(base, { test: { setupFiles: ["/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0034-investigation-20261012T022335Z/frames-setup.ts"] } });
