// RichSection uses contenteditable and DOM Selection; CodeMirror retains source
// history only, so there is no whole-document EditorView to dispatch to.
const selectionUi = ".section-edit-button, .section-editor-header, .section-editor-status, .section-editor-actions, .rich-formatting, .rich-table-controls, .rich-properties, .rich-reason, .rich-history, .rich-lock, .rich-property-trigger, .code-block-toolbar, [role='status']";

export interface DocumentSelectionRequest { isCurrent?: () => boolean; onComplete?: () => void }
export interface DocumentSelectionAdapter { fileId: string; selectAll: (request?: DocumentSelectionRequest) => void }

// Cancel even if an incompatible owner subsequently disappears before parsing
// finishes. Checking focus only at completion would steal its earlier command.
export function watchSelectionOwner(root: () => HTMLElement | null, cancel: () => void) {
  const focus = (event: FocusEvent) => { if (ownsTextInput(event.target, root())) cancel(); };
  const observer = new MutationObserver(() => { if (document.querySelector('[aria-modal="true"]')) cancel(); });
  document.addEventListener("focusin", focus, true);
  document.addEventListener("compositionstart", cancel, true);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-modal"] });
  return () => {
    document.removeEventListener("focusin", focus, true);
    document.removeEventListener("compositionstart", cancel, true);
    observer.disconnect();
  };
}

export function selectDocumentContents(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.textContent?.length && !node.parentElement?.closest(selectionUi)
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const first = walker.nextNode();
  let last = first;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) last = node;
  // Keep a whole rendered draft in its editor so copy/replace and its source
  // selection synchronization continue to use the editor's existing handlers.
  const editor = first?.parentElement?.closest<HTMLElement>(".rich-section");
  if (!first || !last) {
    root.focus({ preventScroll: true });
    selection.collapse(root, 0);
    return;
  }
  if (!editor || !editor.contains(last)) {
    // Chromium clips text-node endpoints that cross an editing-host boundary.
    // Parent boundaries select both the live draft and its read-only siblings,
    // and survive asynchronous code highlighting in a reading document.
    root.focus({ preventScroll: true });
    selection.selectAllChildren(root);
    return;
  }
  editor.focus({ preventScroll: true });
  selection.setBaseAndExtent(first, 0, last, last.textContent!.length);
}

export function ownsTextInput(element: EventTarget | null, documentRoot: HTMLElement | null) {
  if (!(element instanceof HTMLElement)) return false;
  return Boolean(element.closest("input, textarea, select")
    || ((element.isContentEditable || element.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'))
      && !documentRoot?.contains(element)));
}
