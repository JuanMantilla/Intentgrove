# F006 image boundary contracts

Renderer `openImage(grantId, relativePath?)` and `reloadImage(tabId)` use existing scoped grants. A relative path is legal only under a selected root; an explicit-file grant resolves only that file. Native response is a typed tab state and bounded raster resource, never a workspace URL. Stale generations are ignored.

XPC decoder request: protocol version, opaque ID, claimed format, <=8 MiB bytes and bounded preview/tile intent. Response: same ID, actual type, intrinsic dimensions, first-frame flag, bounded PNG/pixel payload or `unsupported/mismatch/corrupt/over-limit/unsafe/timeout` error. No filesystem path, URL, network operation or arbitrary decoder option crosses the boundary. Both sides enforce sizes; helper death becomes a localized tab error.

Main process confirms stable file identity/version before request and validates response type, dimensions, size and generation before creating a `blob:` resource. Inline and tab paths share this contract. Release blobs and cached surfaces on close/refresh; do not retain an unbounded 40 MP buffer per tab.
