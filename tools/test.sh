#!/usr/bin/env bash
# Runs effortless's own tests. `claude plugin test .` runs every *.test.ts under the folder and has no exclude, so a
# plugin kept in a subfolder (textless/) would have its tests run against effortless. This runs them on a copy of the
# working tree without those folders: tracked files plus new ones not ignored, as they are on disk now.
set -euo pipefail
cd "$(dirname "$0")/.."
OTHER='^textless/'
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git ls-files -z --cached --others --exclude-standard | grep -zvE "$OTHER" | while IFS= read -r -d '' f; do
  [ -f "$f" ] && cp --parents -- "$f" "$tmp"
done
cd "$tmp"
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test .
