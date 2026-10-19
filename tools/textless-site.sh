#!/usr/bin/env bash
# Build the textless site for the real address and put it in site/textless/, where GitHub Pages serves it as
# heycubit.github.io/effortless/textless/. The pages point at the live scene marketplace and its Turnstile key.
# Run before tools/site.sh when textless changed.
set -euo pipefail
cd "$(dirname "$0")/.."
MARKET_API=https://textless-market.isac-ehrstedt.workers.dev TURNSTILE_SITEKEY=0x4AAAAAAFV0hzRWab_rdRRk node textless/site/src/build.mjs
rm -rf site/textless && mkdir -p site/textless
cp -r textless/site/index.html textless/site/market textless/site/settings textless/site/whats-new textless/site/assets site/textless/
# Leave textless/site as it was built for local work.
node textless/site/src/build.mjs >/dev/null
git checkout -q -- textless/site/index.html textless/site/market textless/site/settings textless/site/whats-new 2>/dev/null || true
echo "built site/textless/"
