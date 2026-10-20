#!/bin/sh
# The VS Code extension draws a plugin band's "From the <x> plugin" mark sticky at z-index 1, and its actions menu
# (the "/" menu) has no z-index, so the mark shows through the open menu. Lifts the menu over it. Idempotent; run again
# after the extension updates (the class names are hashed per build, so they are read from the build itself).
for dir in "$HOME"/.vscode/extensions/anthropic.claude-code-*/webview; do
  [ -f "$dir/index.js" ] || continue
  # Every menu popup of the build: the actions menu and the others that open over the prompt.
  sel=$(grep -o 'menuPopup:"[^"]*"' "$dir/index.js" | cut -d'"' -f2 | sort -u | sed 's/^/./' | paste -sd, -)
  [ -n "$sel" ] || continue
  sed -i '' '/pilot-menu-fix/d' "$dir/index.css"
  printf '/* pilot-menu-fix */%s{z-index:20}\n' "$sel" >> "$dir/index.css"
  echo "fixed: $dir ($sel)"
done
