#!/usr/bin/env bash
# Rebuilds the site from main and publishes it: gh-pages is the site/ folder of main, one commit per publish.
# tools/publish.sh runs this after every publish, so What's new (built from public.json) never lags the release.
#
# Usage: tools/site.sh ["<what changed>"]
#
# It commits only the built pages, pushes main, then puts main's site/ tree on gh-pages as a fast-forward commit.
set -euo pipefail
cd "$(dirname "$0")/.."

pages=(site/index.html site/whats-new/index.html site/report/index.html site/bench/index.html)
node site/src/build.mjs
git fetch -q origin
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "site stopped: main is not in step with origin/main" >&2; exit 1; }
version=$(node -p 'require("./.claude-plugin/plugin.json").version')
if ! git diff --quiet -- "${pages[@]}"; then
  git commit -q -m "Site: rebuilt for $version" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- "${pages[@]}"
  git push -q origin HEAD:main
fi

tree=$(git rev-parse HEAD:site)
if [ "$tree" = "$(git rev-parse origin/gh-pages^{tree})" ]; then echo "site: gh-pages already matches main"; exit 0; fi
commit=$(git commit-tree "$tree" -p origin/gh-pages -m "Publish site from main $(git rev-parse --short HEAD): ${1:-$version}")
git push -q origin "$commit:refs/heads/gh-pages"
echo "site published: gh-pages at $(git rev-parse --short "$commit"), live within a few minutes"
