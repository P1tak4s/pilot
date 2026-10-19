#!/usr/bin/env bash
# Ships a release to the dev channel (main): tests, version bump, commit, push, local install. Users get it only
# when tools/publish.sh moves the stable branch. Stops at the first failure, a failing test included,
# so a broken build never reaches the marketplace.
#
# Usage: tools/release.sh [--no-install] [--dry-run] (--files <path>... -- | --all) "<commit subject>" ["<commit body>"]
#
# Several chats share this checkout, so the release commits only what the caller names: --files takes paths (a
# directory covers everything changed under it) up to a lone --, and --all takes every change in the tree. Without
# either it lists the changed files and stops. The version files the script bumps itself (.claude-plugin/plugin.json,
# releases.json and the version line in HANDOFF.md) always go in.
# --no-install pushes without updating this machine's copy, so the mod's update card can be tried here.
# --dry-run prints what the release would stage and leave out, then stops before the tests and changes nothing.
# tools/release-selfcheck.sh runs the gate against a scratch repo.
set -euo pipefail
install=1 dry=0 all=0 files=()
while [ $# -gt 0 ]; do
  case "$1" in
    --no-install) install=0; shift ;;
    --dry-run) dry=1; shift ;;
    --all) all=1; shift ;;
    --files)
      shift
      while [ $# -gt 0 ] && [ "$1" != "--" ]; do files+=("${1%/}"); shift; done
      [ $# -gt 0 ] || { echo "release stopped: end the --files list with a lone --" >&2; exit 2; }
      shift ;;
    *) break ;;
  esac
done
[ $# -ge 1 ] || { echo "usage: tools/release.sh [--no-install] [--dry-run] (--files <path>... -- | --all) \"<subject>\" [\"<body>\"]" >&2; exit 2; }
cd "$(dirname "$0")/.."

# Every changed path, untracked ones included. -z keeps odd names intact; a rename carries its old path as an extra field.
changed=()
while IFS= read -r -d '' entry; do
  changed+=("${entry:3}")
  case "${entry:0:2}" in R*|C*) IFS= read -r -d '' _ ;; esac
done < <(git status --porcelain=v1 -z --untracked-files=all)

if ! git diff --cached --quiet; then
  echo "release stopped: the index already holds staged changes (another chat's?):" >&2
  git diff --cached --name-only | sed 's/^/  /' >&2
  exit 1
fi

bumped=(.claude-plugin/plugin.json releases.json HANDOFF.md)
named() {
  [ "$all" = 1 ] && return 0
  local f
  for f in "${files[@]}"; do [ "$1" = "$f" ] || [[ "$1" == "$f/"* ]] && return 0; done
  return 1
}
is_bumped() { local b; for b in "${bumped[@]}"; do [ "$1" = "$b" ] && return 0; done; return 1; }

if [ "$all" = 0 ] && [ ${#files[@]} -eq 0 ]; then
  echo "release stopped: name the files to release with --files <path>... -- or pass --all." >&2
  if [ ${#changed[@]} -gt 0 ]; then
    echo "changed in the working tree:" >&2
    printf '  %s\n' "${changed[@]}" >&2
  else
    echo "the working tree is clean." >&2
  fi
  exit 1
fi

# A name that matches no change is most likely a typo, and the release would silently leave that work out.
for f in "${files[@]}"; do
  hit=0
  for c in "${changed[@]}"; do [ "$c" = "$f" ] || [[ "$c" == "$f/"* ]] && { hit=1; break; }; done
  [ "$hit" = 1 ] || { echo "release stopped: --files names $f, which has no changes" >&2; exit 1; }
done

stage=() leave=()
for c in "${changed[@]}"; do
  if named "$c"; then stage+=("$c")
  elif is_bumped "$c" && [ "$c" != HANDOFF.md ]; then
    echo "release stopped: $c has changes the release would overwrite; name it in --files or commit it first" >&2
    exit 1
  else leave+=("$c")
  fi
done

echo "release stages:"
[ ${#stage[@]} -gt 0 ] && printf '  %s\n' "${stage[@]}"
printf '  %s (version)\n' "${bumped[@]}"
if [ ${#leave[@]} -gt 0 ]; then
  echo "left out:"
  printf '  %s\n' "${leave[@]}"
fi
if [ "$dry" = 1 ]; then echo "dry run: nothing changed"; exit 0; fi

out=$(tools/test.sh 2>&1) || true
if ! grep -q '^ 0 fail' <<<"$out"; then
  grep -E '^\s*[0-9]+ (pass|fail)|\(fail\)' <<<"$out" || echo "$out" | tail -20
  echo "release stopped: tests failed" >&2
  exit 1
fi
old=$(node -p "require('./.claude-plugin/plugin.json').version")
new=$(node -p "const v='$old'.split('.');v[2]=+v[2]+1;v.join('.')")
sed -i "s/\"version\": \"$old\"/\"version\": \"$new\"/" .claude-plugin/plugin.json
sed -i "s/version $old/version $new/" HANDOFF.md
# The mod's update card reads the newest entry: the version, the day and the commit's subject as the note.
node -e '
const fs = require("fs"), [v, note] = process.argv.slice(1)
const list = fs.existsSync("releases.json") ? JSON.parse(fs.readFileSync("releases.json", "utf8")) : []
list.unshift({ version: v, date: new Date().toISOString().slice(0, 10), note })
fs.writeFileSync("releases.json", JSON.stringify(list, null, 2) + String.fromCharCode(10))' "$new" "$1"
if [ ${#stage[@]} -gt 0 ]; then git add -A -- "${stage[@]}"; fi
git add -- .claude-plugin/plugin.json releases.json
if named HANDOFF.md; then
  git add -- HANDOFF.md
else
  # Another chat may be editing HANDOFF.md: stage only the version line, bumped on the committed copy.
  blob=$(git show HEAD:HANDOFF.md | sed "s/version $old/version $new/" | git hash-object -w --stdin)
  git update-index --cacheinfo "100644,$blob,HANDOFF.md"
fi
git commit -q -m "$1" -m "${2:-}" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git pull -q --rebase --autostash
git push -q
if [ "$install" = 1 ]; then
  # This machine runs the dev channel (channels/dev): main, every release. Users get stable, moved by tools/publish.sh.
  claude plugin marketplace update effortless-dev >/dev/null
  claude plugin update effortless@effortless-dev | tail -1
fi
echo "released $new"
