# F006 local image viewer — visual proposal

**Status:** Draft for user review, 2026-09-29. [Viewer states sketch](design/image-states.svg)
is a vector proposal, not a running-app capture. It reuses the approved F001 tab
shell and F002A palettes. Image pixels are never recolored by theme.

## Read-only image tab

Selecting a supported image opens one tab with its filename and a small image
icon. The content header gives format and intrinsic dimensions as text, then a
quiet control row: **Fit**, **Actual Size**, **−**, zoom percentage, **+**, and
the existing Reload action. The viewport uses the current semantic page surface
and centers the image. Initial Fit shows the whole image while never enlarging a
small image beyond natural size. Actual Size uses one image pixel per display
CSS pixel; on Retina displays this remains a defined 1:1 CSS-pixel view. Zoom preserves a stable
viewport point. Scrollbars let the user reach all edges. No edit/Save control
appears in an image tab.

The same image opened twice focuses its existing tab. Tab close and keyboard
navigation use the existing strip. Markdown inline images preserve alt text;
following a local image link opens the same read-only tab. Animated files show
the first frame with `Still preview` / `Vista fija` near format metadata.

## States

| State | Visible behavior |
|---|---|
| Loading | Bounded skeleton and text status with no fake dimensions. Other tabs stay usable. |
| Fit/Actual/zoom | Current mode and percentage are textual. Focus remains on the control used. Resize recalculates Fit without distortion; manual zoom persists until the image changes dimensions. |
| External change | Existing tab shows `Checking image…`, then new verified pixels; if dimensions changed, return to Fit and explain the reset. |
| Missing/denied/corrupt/mismatched/over-limit | Replace pixels with a specific localized error and Retry/Reload. Never leave stale pixels presented as current. |
| Unsafe/remote/out-of-scope inline image | Show an inline icon plus explanatory alt/blocked text; no image request or navigation. |

Tree filter defaults to `Documents and images` / `Documentos e imágenes`; the
separate all-files view retains its accurate label. File type and status are
shown through text/icon shape as well as color. Keyboard focus uses the F001/
F002A visible ring. At 640 points the viewer controls wrap and the image viewport
keeps a usable minimum height; the tab strip can scroll. Zoom never moves focus.
Reduce Motion disables decorative transitions. SVG is displayed only after
native inert rasterization; SVG text/links are not interactive in the viewer.

## Review decision

Approve or revise the read-only header/control row, first-frame label, tree
filter wording, blocked/error states and narrow layout in the
[sketch](design/image-states.svg). Actual format coverage, pixels, keyboard
and no-write behavior require packaged verification.
