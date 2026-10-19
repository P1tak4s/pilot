#!/usr/bin/env bash
# Screenshots each mockup page with headless Chrome at 1.5x: <name>.html -> <name>.png
cd "$(dirname "$0")"
CH="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
W=$(cygpath -w "$PWD"); M=$(cygpath -m "$PWD")
for n in a-panel b-detail c-idle d-hub; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1.5 --window-size=1440,960 \
    --virtual-time-budget=2500 --screenshot="$M/$n.png" "file:///$M/$n.html" 2>&1 | grep -i written
done
