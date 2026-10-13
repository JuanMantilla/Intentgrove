# Native prompt design

Status: DRAFT FOR REVIEW. Standard macOS NSAlert; no custom renderer or frontend redesign. Visual sketch: prompt.svg.

Title (EN): **Open Markdown files with Intentgrove?**
Body (EN): “Make Intentgrove the default app for .md and .markdown files. macOS may ask you to confirm the change.”
Buttons: **Make Default**, **Not Now**. Initial keyboard focus/default Return action: Not Now. Escape dismisses as Not Now. Choosing Make Default is the only action that starts an OS request.

Title (ES): **¿Abrir archivos Markdown con Intentgrove?**
Body (ES): “Usa Intentgrove como app predeterminada para archivos .md y .markdown. macOS puede pedirte que confirmes el cambio.”
Buttons: **Usar como predeterminada**, **Ahora no**.

Use the app's selected language; consent-only script follows the saved app preference, falling back to the system language if unavailable. Show as a main-window sheet for normal launch; defer while another sheet/modal is active. Script mode uses a standalone native alert without starting a document workspace.

Do not cover an unsaved-work or restore decision with this prompt. Record the choice on dismissal, then keep the app responsive while macOS handles consent. A successful completion shows “Intentgrove is now the default Markdown app.” Failure gives a clear error and mentions rerunning the script or Finder Get Info → Open with → Change All. Partial completion states that only some Markdown associations changed. Never claim that Not Now changed a system setting.

No automatic retry and no persistent marketing banner. Script invocation is an explicit retry. Native controls provide accessibility semantics, system appearance and focus handling.
