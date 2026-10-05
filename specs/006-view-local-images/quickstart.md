# F006 verification guide

Use disposable files and a packaged signed macOS app. Record image and neighboring-file hashes before/after. Include valid samples of every listed format, animated first frames, large/small dimensions, extension/byte mismatch, corrupt/truncated data, 8 MiB and 40 MP boundaries, hostile SVG, symlinks, remote/out-of-scope Markdown references and external replacements.

1. Open each format through tree and explicit picker; verify one read-only tab per file, actual format/dimensions and file-only picker scope. Repeat as inline Markdown and relative image link where applicable.
2. At 640 and 1440 points, verify Fit, Actual Size, zoom, all image edges, resize, keyboard focus, EN/ES status and Reduce Motion.
3. Exercise decoder crash/timeout, malformed SVG, remote/resource references, oversized/unstable files and wrong extensions. Record that other tabs stay usable and no stale pixels claim current status.
4. Replace root-relative and explicit-file images using an external writer, trigger automatic/manual reload and verify required reselect behavior.
5. Compare hashes/inventory; observe app-request attempts during hostile content. Record exact observer coverage. Time 20 trials and record memory/response sizes, build hash, OS and display.

Mark each AS/SC PASS, FAIL, BLOCKED or NOT TESTED. In particular, helper compilation alone does not prove XPC packaging, signing, crash isolation or native visual behavior.
