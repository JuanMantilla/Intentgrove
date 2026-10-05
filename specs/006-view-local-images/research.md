# F006 research decisions

**Date:** 2026-09-29. Planning research, not implementation evidence.

| Question | Decision and reason |
|---|---|
| Format support | Query ImageIO runtime identifiers for PNG/JPEG/GIF/WebP/BMP/TIFF/HEIC/HEIF, then verify actual decoded type. Host `sips --formats` is indicative, not a guarantee for the bundled build. SVG uses a separate restricted rasterizer. |
| Crash containment | Decode in bundled XPC service receiving bytes only. ImageIO error returns cannot prove a malformed decoder input will not crash the Tauri process. [Apple describes XPC stability and privilege separation](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html). |
| SVG restrictions | Preflight XML and deny active/external references; override both usvg image resolvers. [Its default string resolver can open local paths](https://docs.rs/usvg/latest/usvg/struct.ImageHrefResolver.html). Rasterize before WebKit receives pixels. |
| Toolchain | [resvg 0.48.1 declares Rust 1.85](https://docs.rs/crate/resvg/latest/source/Cargo.toml.orig), versus app manifest 1.77.2. Plan proposes the explicit MSRV increase, subject to approval and locked dependency review. |
| Bounded work | 8 MiB encoded, 40 MP decoded, limited concurrency/cache and bounded PNG/tile responses. A 40 MP RGBA surface alone is about 160 MB; dimension check alone does not bound aggregate memory. |
| Remaining uncertainty | XPC bundle/signing mechanics, SVG font fidelity, full format availability, 2–5 s target and aggregate memory need prototype/packaged measurement. Do not claim them from `sips` or unit tests. |

Primary references: [Apple ImageIO source API](https://developer.apple.com/documentation/imageio/cgimagesource), [ImageIO format discovery](https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/ImageIOGuide/imageio_basics/ikpg_basics.html), [ImageIO thumbnail API](https://developer.apple.com/documentation/imageio/cgimagesourcecreatethumbnailatindex%28_%3A_%3A_%3A%29), [resvg project](https://github.com/linebender/resvg), [Tauri CSP](https://v2.tauri.app/security/csp/), [Tauri asset protocol](https://v2.tauri.app/security/asset-protocol/).
