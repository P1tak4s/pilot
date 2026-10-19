#!/usr/bin/env bash
# Publishes what is on main to everyone: the public channel is the `stable` branch, which the marketplace entry points
# at, and the update card offers the newest entry of public.json. Releases (tools/release.sh) go to main and reach only
# the dev channel; nothing reaches users until this runs.
#
# Usage: tools/publish.sh [--dry-run] "<what's new, one line>" ["<detail>"]
# The detail is one line per bullet (separate them with newlines); it is stored as `detail` and shown under the headline.
#
# It needs a clean index and main in step with origin. It runs the tests, bumps the minor version (1.35.x -> 1.36.0),
# writes the release into releases.json and public.json, commits, pushes main, then moves stable to that commit.
# Last it runs tools/site.sh, which rebuilds the site so What's new lists the release, and publishes gh-pages.
set -euo pipefail
dry=0
if [ "${1:-}" = "--dry-run" ]; then dry=1; shift; fi
[ $# -ge 1 ] || { echo "usage: tools/publish.sh [--dry-run] \"<what's new>\" [\"<detail>\"]" >&2; exit 2; }
cd "$(dirname "$0")/.."

git diff --cached --quiet || { echo "publish stopped: the index holds staged changes" >&2; exit 1; }
git fetch -q origin
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "publish stopped: main is not in step with origin/main (pull or push first)" >&2; exit 1; }

old=$(node -p 'require("./.claude-plugin/plugin.json").version')
new=$(node -p 'const [a,b]=process.argv[1].split(".").map(Number); `${a}.${b+1}.0`' "$old")
last=$(node -p 'try { require("./public.json")[0].version } catch { "none" }')
echo "publish: $old -> $new (public now: $last, stable at $(git rev-parse --short origin/stable 2>/dev/null || echo none))"
[ "$dry" = 1 ] && { echo "dry run: nothing changed"; exit 0; }

out=$(tools/test.sh 2>&1) || true
echo "$out" | grep -qE '^ *0 fail' || { echo "$out" | tail -20; echo "publish stopped: tests fail" >&2; exit 1; }

node -e '
const fs = require("fs")
const [v, note, detailText] = process.argv.slice(1)
const p = JSON.parse(fs.readFileSync(".claude-plugin/plugin.json", "utf8")); p.version = v
fs.writeFileSync(".claude-plugin/plugin.json", JSON.stringify(p, null, 2) + String.fromCharCode(10))
const lines = (detailText || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean)
const entry = { version: v, date: new Date().toISOString().slice(0, 10), note, ...(lines.length ? { detail: lines.length === 1 ? lines[0] : lines } : {}), public: true }
for (const file of ["releases.json", "public.json"]) {
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []
  list.unshift(entry)
  fs.writeFileSync(file, JSON.stringify(list, null, 2) + String.fromCharCode(10))
}' "$new" "$1" "${2:-}"
blob=$(git show HEAD:HANDOFF.md | sed "s/version $old/version $new/" | git hash-object -w --stdin)
git update-index --cacheinfo "100644,$blob,HANDOFF.md"
git add -- .claude-plugin/plugin.json releases.json public.json
git commit -q -m "Publish $new: $1" -m "${2:-}" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
git push -q origin HEAD:stable
sed -i "s/version $old/version $new/" HANDOFF.md 2>/dev/null || true
echo "published $new: stable is at $(git rev-parse --short HEAD); users see the update card within 6 hours"
tools/site.sh "$new: $1"
