# RUN / RETEST — later approved frontend revision

Scope DR-001/002/004/005 and nearby regression; DR-003 deferred. Earlier as-is acceptance does not waive these checks. Source/config read-only. Native macOS WKWebView, isolated compiled identifier/incognito main; Settings excluded because auxiliary WKWebView isolation is unproven. Disposable fixtures only. No installs, OS permissions, fixes, release, cleanup.

Cases: N01 native access; N02 real resize/narrow/short; N03 two sidebar widths/tree/disclosure; N04 Save; N05 Keep; N06 Cancel; N07 Discard; N08 quit/relaunch draft; N09 native cancellation; N10 errors/retry; N11 ignored discovery; N12 conflict/recovery; A01 keyboard; A02 VoiceOver; A03 200% zoom; A04 measured contrast; R01 Margin/Folio/Atlas EN/ES light/dark. Mocked/component evidence separate. Capture baseline before every check; all prior evidence retained.
