# Primary references — macOS revision
Checked 2026-09-25. Recheck exact installed versions before implementation. These
support tooling/platform choices, not claims that the app exists or passed tests.

## Spec-driven workflow and role skills
- [S1] Spec Kit installation, CLI routes and shell variants:
  https://github.github.io/spec-kit/installation.html
- [S2] Codex integration path and invocation:
  https://github.github.io/spec-kit/reference/integrations.html
- [S3] Spec Kit project and feature workflow:
  https://github.com/github/spec-kit
  https://github.github.io/spec-kit/quickstart.html
- [O1] OpenAI local role skills and invocation:
  https://developers.openai.com/codex/skills/
  (redirects to https://learn.chatgpt.com/docs/build-skills)
- [A1] Agent Skills specification:
  https://agentskills.io/specification
- [U1] uv installation, managed Python and tool PATH:
  https://docs.astral.sh/uv/getting-started/installation/
  https://docs.astral.sh/uv/guides/install-python/
  https://docs.astral.sh/uv/guides/tools/
- [G1] GitHub repository creation:
  https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository

## macOS host, build, delivery and testing
- [T1] Tauri desktop prerequisites: macOS Command Line Tools, Rust and Node:
  https://v2.tauri.app/start/prerequisites/
- [T2] Tauri WebKit/WKWebView and system runtime versions:
  https://v2.tauri.app/reference/webview-versions/
- [T3] macOS .app bundle:
  https://v2.tauri.app/distribute/macos-application-bundle/
- [T4] .dmg packaging on a Mac:
  https://v2.tauri.app/distribute/dmg/
- [T5] Signing, ad-hoc signatures and notarization:
  https://v2.tauri.app/distribute/sign/macos/
- [T6] Native automation and embedded WebdriverIO service:
  https://v2.tauri.app/develop/tests/webdriver/
- [T7] Tauri security:
  https://v2.tauri.app/security/

## Candidates inherited from the initial proposal; verify during planning
- Markdown renderer: https://github.com/remarkjs/react-markdown
- CodeMirror: https://github.com/codemirror/dev
- Mermaid policy: https://mermaid.js.org/config/schema-docs/config.html
- Roboto: https://fonts.google.com/specimen/Roboto
  https://github.com/googlefonts/roboto-3-classic

No fonts, renderer packages, third-party templates or dependency binaries ship in
this starter. Pin actual choices in the approved technical plan and lockfiles.
