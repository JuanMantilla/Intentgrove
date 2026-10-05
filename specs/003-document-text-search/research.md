# F003S research decisions

**Date:** 2026-09-29. Planning research, not implementation evidence.

| Question | Decision and reason |
|---|---|
| Searchable text | Visible reader text nodes, excluding controls/hidden/placeholder content. Markdown AST positions include syntax the reader does not see. Edit mode uses live CodeMirror draft only. |
| Highlight | Keep React ownership of DOM. CSS Custom Highlight paints `Range`s; verify system WebKit and use noninteractive overlays if needed. Avoid imperative `<mark>` wrappers. |
| Count/position | Versioned normalized string and reversible UTF-16 offsets; invalidate on refresh/draft/tab change. Count all displayed text; bound painting only. |
| Edit integration | CodeMirror `EditorState.doc` plus editor navigation. `@codemirror/search` is a candidate requiring lock/dependency review. |
| Open risks | WebKit support, Unicode case-fold offset mapping and 1 MiB / 250 ms performance need fixture and packaged measurement. |

Primary references: [react-markdown](https://github.com/remarkjs/react-markdown), [remark-rehype](https://github.com/remarkjs/remark-rehype), [TreeWalker](https://developer.mozilla.org/en-US/docs/Web/API/Document/createTreeWalker), [CSS Custom Highlight](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API), [WebKit support](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/), [CodeMirror search](https://codemirror.net/docs/ref/#search), [Range geometry](https://developer.mozilla.org/en-US/docs/Web/API/Range/getBoundingClientRect).
