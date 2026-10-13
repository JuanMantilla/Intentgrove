# Native packaging evidence

approval.json: actual user statement and reviewed artifact hashes.
tested-paths.json/tested-snapshot.json: native verification input baseline.
evidence/smoke-build.log: successful isolated production-code app build.
evidence/smoke-entitlements.log, smoke-signature.log: isolated main-app entitlement/signature inspection.
evidence/native-ui-attempt.json: actual Computer Use refusal.
evidence/production-build.log, production-signature.log: successful normal app/helper packaging and strict verification.
evidence/production-entitlements.log, architecture.log: normal main-app entitlements/arm64 inspection.
evidence/production-boundary.log: current compiled production asset/native harness separation.
evidence/package-manifest.json: actual bundle identity/content hashes.
fixtures/: disposable prepared navigation inputs; no native GUI success is claimed.
