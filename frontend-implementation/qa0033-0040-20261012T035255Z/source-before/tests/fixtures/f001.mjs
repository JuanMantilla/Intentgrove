import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, lstat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, relative } from "node:path";

async function snapshot(root) {
  const base = resolve(root);
  if (!basename(dirname(base)).startsWith("md-reader-f001-") || !["workspace", "large"].includes(basename(base))) {
    throw new Error("Snapshot requires a generated F001 fixture under the temporary directory");
  }
  const entries = [];
  const visit = async (directory) => {
    for (const name of (await readdir(directory)).sort()) {
      const file = join(directory, name);
      const info = await lstat(file);
      const entry = { path: relative(base, file), kind: info.isDirectory() ? "directory" : info.isSymbolicLink() ? "symlink" : "file" };
      if (info.isFile()) entry.sha256 = createHash("sha256").update(await readFile(file)).digest("hex");
      entries.push(entry);
      if (info.isDirectory()) await visit(file);
    }
  };
  await visit(base);
  return entries;
}

if (process.argv[2] === "create") {
  const parent = await mkdtemp(join(tmpdir(), "md-reader-f001-"));
  const root = join(parent, "workspace");
  await mkdir(join(root, "docs"), { recursive: true });
  await mkdir(join(root, "empty"));
  await mkdir(join(root, ".github"));
  await mkdir(join(root, ".git"));
  await writeFile(join(root, "README.md"), [
    "# Workspace guide", "", "- [x] Read-only task", "- List item", "",
    "| Name | Value |", "| --- | --- |", "| Local | Safe |", "",
    "```text", "This is displayed, not executed.", "```", "",
    "[Local guide](docs/guide.md#destination)", "",
    "![Local diagram](docs/diagram.png)", "",
    "![Remote image](https://example.test/pixel.png)", "",
    "[Blocked executable](javascript:alert(1))", "", "<script>blocked()</script>", ""
  ].join("\n"));
  await writeFile(join(root, "docs", "guide.md"), "# Destination\n\nA local target.\n");
  await writeFile(join(root, "docs", "README.md"), "# Nested README\n");
  await writeFile(join(root, "docs", "invalid.md"), Buffer.from([0xff, 0xfe]));
  await writeFile(join(root, "docs", "oversize.md"), Buffer.alloc(10 * 1024 * 1024 + 1, 0x61));
  await writeFile(join(root, "docs", "diagram.png"), await readFile(new URL("../../src-tauri/icons/32x32.png", import.meta.url)));
  await writeFile(join(parent, "outside.md"), "# Outside selection\n");
  await symlink(join(parent, "outside.md"), join(root, "docs", "escape.md"));
  if (process.argv.includes("--large")) {
    const large = join(parent, "large");
    await mkdir(large);
    for (let start = 0; start < 25_000; start += 100) {
      await Promise.all(Array.from({ length: 100 }, (_, index) =>
        writeFile(join(large, `entry-${String(start + index).padStart(5, "0")}.md`), "# Entry\n")));
    }
  }
  await writeFile(join(parent, "workspace-before.json"), JSON.stringify(await snapshot(root)));
  if (process.argv.includes("--large")) {
    await writeFile(join(parent, "large-before.json"), JSON.stringify(await snapshot(join(parent, "large"))));
  }
  console.log(parent);
} else if (process.argv[2] === "snapshot" && process.argv[3]) {
  console.log(JSON.stringify(await snapshot(process.argv[3])));
} else if (process.argv[2] === "verify" && process.argv[3]) {
  const root = resolve(process.argv[3]);
  const before = await readFile(join(dirname(root), `${basename(root)}-before.json`), "utf8");
  const after = JSON.stringify(await snapshot(root));
  console.log(before === after ? "PASS: fixture hashes and inventory unchanged" : "FAIL: fixture hashes or inventory changed");
  if (before !== after) process.exitCode = 1;
} else {
  console.error("Usage: node tests/fixtures/f001.mjs create [--large] | snapshot <generated workspace-or-large> | verify <generated workspace-or-large>");
  process.exitCode = 2;
}
