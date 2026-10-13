#!/bin/bash
set -euo pipefail
POC_DIR="$(cd "$(dirname "$0")" && pwd)"
NATIVE_ROOT="$POC_DIR/../../src-tauri"
python3 - "$POC_DIR" "$NATIVE_ROOT" <<'PYINC'
import sys,json
from pathlib import Path
p,n=map(Path,sys.argv[1:]);(p/'html_surface-poc.m').write_text((n/'src/html_surface.m').read_text().replace('config.defaultWebpagePreferences.allowsContentJavaScript=NO;', 'config.defaultWebpagePreferences.allowsContentJavaScript=YES;').replace('sandbox allow-same-origin\";', 'sandbox allow-same-origin allow-scripts\";'))
(p/'html_inspect.inc').write_text('#define IG_HTML_INSPECT '+json.dumps((n/'src/html_inspect.js').read_text())+'\n')
PYINC
clang -I "$POC_DIR" -mmacosx-version-min=14.0 -fblocks -fobjc-arc -DIG_HTML_PROBE=1 -framework Cocoa -framework WebKit "$POC_DIR/host.m" "$POC_DIR/html_surface-poc.m" -o "$POC_DIR/native-player"
