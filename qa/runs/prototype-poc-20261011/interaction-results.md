# Native interaction results

**EXPERIMENTAL RESULT: PASS.** Command: `python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/test_runtime.py`. Result: 26 assertions PASS. Detailed assertions [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/interaction-results.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/interaction-results.json); exact requests/state/native coordinates/transports [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/control-trace.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/control-trace.json).

| Operation through actual player | Verified result |
|---|---|
| open `.igproto` | Login, empty stacks/state |
| native click login/login-button | Dashboard; history `[login]`; DISSOLVE completes |
| native click dashboard/profile-avatar | Profile overlay on Dashboard |
| native click profile-overlay/close-button | Overlay removed; Dashboard retained |
| native click dashboard/settings-button | Settings; history `[login,dashboard]` |
| native click settings/back-button | Dashboard; history `[login]` |
| native click dashboard/menu-button | local `dashboard/menu-panel=true`; actual group visible |
| reset | Login, empty history/overlays/local/trace |

Every click resolves an authored custom marker to rendered geometry and actual `elementFromPoint`; native `NSEvent` mouse-down/up enters WebKit. All six resulting CLICK events report `isTrusted: true`. The tests never call the state machine's action functions. DOM trace records the active scene/marker/action. Reset image equals original Login exactly.

Screenshots: [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-login.png](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-login.png), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-dashboard.png](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-dashboard.png), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-dashboard-menu.png](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-dashboard-menu.png), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-profile-overlay.png](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-profile-overlay.png), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-settings.png](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-settings.png). Agent visual review is documented in [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/fidelity-results.md](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/fidelity-results.md); state assertions alone were not treated as visual proof.

**FACT:** max-8 overlay stack/max-32 back history are implemented. **UNKNOWN:** deep stacks, long sessions, gestures, keyboard/AT and input concurrency are outside this four-scene test. DISSOLVE is a 100 ms fade-in; no Smart Animate.
