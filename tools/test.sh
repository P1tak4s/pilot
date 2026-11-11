#!/usr/bin/env bash
# Runs pilot's tests on a copy of the working tree: tracked files plus new ones not ignored, as they are on disk now,
# so ignored local folders (data/, node_modules/) never reach `claude plugin test`.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git ls-files -z --cached --others --exclude-standard | while IFS= read -r -d '' f; do
  [ -f "$f" ] && mkdir -p "$tmp/$(dirname "$f")" && cp -- "$f" "$tmp/$f"
done
cd "$tmp"
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test .
