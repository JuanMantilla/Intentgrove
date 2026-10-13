# Small agent control surface

**FACT:** [/Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/control.py](/Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/control.py) exposes an experimental line-delimited JSON interface over private stdio to a task-owned native player. No server, token installation, full MCP or shipping automation listener. Python callers use `Prototype.call`; CLI callers send one JSON object per line. The operation set is closed and has no arbitrary eval capability.

```json
{"op":"prototype.open","path":"/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/four-scenes.igproto"}
{"op":"prototype.click","scene":"login","target":"login-button"}
{"op":"prototype.current_scene"}
{"op":"prototype.inspect"}
{"op":"prototype.screenshot","path":"/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/html-native-agent.png"}
{"op":"prototype.reset"}
```

Run `python3 -B /Users/juanmantilla/projects/personal/md-reader/experimental/prototype-poc/control.py`. Screenshot names must contain `html-native-` because the existing Intentgrove test-only snapshot API enforces that constraint. Current scene means the base scene; `inspect` also returns overlay stack, local visibility, history, target visibility, busy/transition trace. Click rejects inactive scenes, missing/hidden/occluded targets. Screenshot/reset/open call the real native surface. The fixed security-probe/broker-log operations are POC-only QA helpers, not future public agent API.

**EXPERIMENTAL RESULT:** [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/control-trace.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/control-trace.json) and [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/fidelity-control-trace.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/fidelity-control-trace.json) exercise all six requested operations. Native events enter the actual player handler. **INFERENCE:** scene+prototype marker, inspectable state and native screenshot are the smallest useful future QA boundary. Production MCP/authorization/lifecycle/request cancellation remain planning work.
