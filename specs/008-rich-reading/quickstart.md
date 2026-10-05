# F002R verification guide

Use disposable Markdown fixtures and a packaged app. Include valid/invalid/hostile Mermaid, YAML tags/aliases/duplicate keys, long code fences, repeated h1–h6 headings, 1/10 MiB mixed content and font fallback. Keep source hashes and build/host details.

1. Verify each AS-001–006 state visually and by keyboard in EN/ES at 640/900/1440 points, light/dark/System, 200% zoom and Reduce Motion.
2. Observe app-request attempts and inspect sandbox output for AS-007. Confirm no Tauri bridge from the diagram context; inject crash/timeout/oversize and verify block-level fallback.
3. Compare fixture hashes, copied code bytes and typography persistence after ten normal restarts (F003C prerequisite).
4. Time ten warm 1 MiB and 10 MiB runs after file read. Record raw timings and whether 9/10 meet targets. Test giant tables, long lines and many diagrams separately.

Use PASS/FAIL/BLOCKED/NOT TESTED per AS/SC. A diagram screenshot or package install alone is not a security or performance PASS.
