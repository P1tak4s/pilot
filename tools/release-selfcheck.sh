#!/usr/bin/env bash
# Checks the release gate in tools/release.sh against a scratch repo, with a stub `claude` whose tests always pass and a
# bare repo as origin, so nothing here touches the real checkout, the marketplace or this machine's install.
# Usage: tools/release-selfcheck.sh
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/release.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fails=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }

mkdir -p "$tmp/bin" "$tmp/repo/tools" "$tmp/repo/.claude-plugin" "$tmp/repo/hooks"
printf '#!/usr/bin/env bash\necho " 0 fail"\n' >"$tmp/bin/claude"
chmod +x "$tmp/bin/claude"
export PATH="$tmp/bin:$PATH"
git init -q --bare "$tmp/origin.git"
cd "$tmp/repo"
git init -q -b main
git config user.email selfcheck@example.invalid
git config user.name selfcheck
git config core.autocrlf false
cp "$script" tools/release.sh
echo '{ "version": "1.0.0" }' >.claude-plugin/plugin.json
# The version files come from the script itself, so a renamed release log keeps this check honest.
bumped=$(grep '^bumped=(' tools/release.sh | cut -d= -f2 | tr -d '()')
for b in $bumped; do [ -e "$b" ] || echo '[]' >"$b"; done
printf -- '- `main`, version 1.0.0\n- notes\n' >HANDOFF.md
echo 'mine v1' >hooks/mine.tsx
echo 'theirs v1' >hooks/theirs.tsx
git add -A && git commit -q -m init
git remote add origin "$tmp/origin.git"
git push -q -u origin main

# The releasing chat changed hooks/mine.tsx; another chat is halfway through other work.
echo 'mine v2' >hooks/mine.tsx
echo 'theirs v2 half done' >hooks/theirs.tsx
echo 'unrelated' >hooks/unrelated.tsx
echo '- another chat writing here' >>HANDOFF.md

set +e
out=$(tools/release.sh "subject" 2>&1); code=$?
check "no --files or --all: exits non-zero" '[ $code -ne 0 ]'
check "no --files or --all: lists the untracked unrelated file" 'grep -q "hooks/unrelated.tsx" <<<"$out"'
check "no --files or --all: commits nothing" '[ "$(git rev-list --count HEAD)" = 1 ]'

out=$(tools/release.sh --files hooks/typo.tsx -- "subject" 2>&1); code=$?
check "a name with no changes stops the release" '[ $code -ne 0 ] && grep -q "typo.tsx" <<<"$out"'

out=$(tools/release.sh --dry-run --files hooks/mine.tsx -- "subject" 2>&1); code=$?
check "dry run exits 0" '[ $code -eq 0 ]'
check "dry run leaves the unrelated file out" 'sed -n "/^left out:/,\$p" <<<"$out" | grep -q "hooks/unrelated.tsx"'
check "dry run changes nothing" '[ "$(git rev-list --count HEAD)" = 1 ] && grep -q "1.0.0" .claude-plugin/plugin.json'

echo 'stray' >staged.txt && git add staged.txt
out=$(tools/release.sh --files hooks/mine.tsx -- "subject" 2>&1); code=$?
check "an already staged change stops the release" '[ $code -ne 0 ] && grep -q "staged.txt" <<<"$out"'
git rm -q --cached staged.txt && rm staged.txt

out=$(tools/release.sh --no-install --files hooks/mine.tsx -- "Ship mine" 2>&1); code=$?
set -e
check "release with --files succeeds" '[ $code -eq 0 ]' || echo "$out"
committed=$(git show --name-only --format= HEAD | sort | tr '\n' ' ')
expected=$(printf '%s\n' $bumped hooks/mine.tsx | sort | tr '\n' ' ')
check "commit holds the named file and the version files only" '[ "$committed" = "$expected" ]' ||
  echo "  committed: $committed"$'\n'"  expected:  $expected"
check "HANDOFF.md commit takes the version line only" \
  'git show HEAD:HANDOFF.md | grep -q "version 1.0.1" && ! git show HEAD:HANDOFF.md | grep -q "another chat"'
check "the other chat's work stays in the working tree" \
  'grep -q "half done" hooks/theirs.tsx && [ -f hooks/unrelated.tsx ] && grep -q "another chat" HANDOFF.md'
check "pushed to origin" '[ "$(git rev-parse HEAD)" = "$(git --git-dir="$tmp/origin.git" rev-parse main)" ]'

[ "$fails" = 0 ] && echo "release gate: all checks pass" || { echo "release gate: $fails failed" >&2; exit 1; }
