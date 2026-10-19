#!/usr/bin/env bash
# Publishes textless to everyone: the update card in the chat offers the newest entry of plugin/public.json, and the
# site's What's new page lists the same file. Nothing else writes public.json.
#
# Usage: scripts/publish.sh [--dry-run] "<what's new, one line>" ["<detail>"]
# The detail is one line per bullet (separate them with newlines); it shows under the headline on What's new.
#
# It runs the tests, bumps the minor version (0.9.x -> 0.10.0), writes the release into plugin/public.json and
# commits. Inside the effortless repo (textless/ there) it also pushes main and moves stable to that commit, the
# branch the marketplace installs from. In its own repo before launch it only commits: the local heycubit marketplace
# reads this folder, so the card offers the version on the next check (or /textless update).
set -euo pipefail
dry=0
if [ "${1:-}" = "--dry-run" ]; then dry=1; shift; fi
[ $# -ge 1 ] || { echo "usage: scripts/publish.sh [--dry-run] \"<what's new>\" [\"<detail>\"]" >&2; exit 2; }
cd "$(dirname "$0")/.."
here=$(pwd)
top=$(git rev-parse --show-toplevel)
# textless/ inside the effortless repo, or a repo of its own.
inside=0
[ "$(cd "$top" && pwd)" != "$here" ] && inside=1

git diff --cached --quiet || { echo "publish stopped: the index holds staged changes" >&2; exit 1; }
if [ "$inside" = 1 ]; then
  git fetch -q origin
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "publish stopped: main is not in step with origin/main (pull or push first)" >&2; exit 1; }
fi

old=$(node -p 'require("./plugin/.claude-plugin/plugin.json").version')
new=$(node -p 'const [a,b]=process.argv[1].split(".").map(Number); `${a}.${b+1}.0`' "$old")
last=$(node -p 'try { require("./plugin/public.json")[0].version } catch { "none" }')
echo "publish: $old -> $new (public now: $last)"
[ "$dry" = 1 ] && { echo "dry run: nothing changed"; exit 0; }

out=$(cd plugin && CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test . 2>&1) || true
echo "$out" | grep -qE '^ *0 fail' || { echo "$out" | tail -20; echo "publish stopped: tests fail" >&2; exit 1; }

node -e '
const fs = require("fs")
const [v, note, detailText] = process.argv.slice(1)
const pj = "plugin/.claude-plugin/plugin.json", pub = "plugin/public.json"
const p = JSON.parse(fs.readFileSync(pj, "utf8")); p.version = v
fs.writeFileSync(pj, JSON.stringify(p, null, 2) + String.fromCharCode(10))
const lines = (detailText || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean)
const entry = { version: v, date: new Date().toISOString().slice(0, 10), note, ...(lines.length ? { detail: lines.length === 1 ? lines[0] : lines } : {}), public: true }
const list = fs.existsSync(pub) ? JSON.parse(fs.readFileSync(pub, "utf8")) : []
list.unshift(entry)
fs.writeFileSync(pub, JSON.stringify(list, null, 2) + String.fromCharCode(10))' "$new" "$1" "${2:-}"
git add -- plugin/.claude-plugin/plugin.json plugin/public.json
git commit -q -m "Publish textless $new: $1" -m "${2:-}" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
if [ "$inside" = 1 ]; then
  git push -q origin HEAD:main
  git push -q origin HEAD:stable
  echo "published textless $new: stable is at $(git rev-parse --short HEAD); users see the update card within 6 hours"
  [ -x "$top/tools/textless-site.sh" ] && (cd "$top" && tools/textless-site.sh) || echo "rebuild the site so What's new lists $new"
else
  echo "published textless $new locally (commit $(git rev-parse --short HEAD)); /textless update in a chat offers it"
fi
