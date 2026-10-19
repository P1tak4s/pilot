#!/usr/bin/env bash
# Planted bugs: how many a Claude Code setup fixes, and what it pays per fix. Every run gets a fresh copy of this
# repo's HEAD (no .git, no bench/), one bug from tasks.json planted in it, and the bug report as the prompt:
#   m / h / x  = the app at medium / high / xhigh, effortless not loaded
#   on         = the app at medium, effortless loaded from this repo with its defaults (Auto on)
# The model may read, edit and run the test suite; the score is whether the full suite passes afterwards.
# Billed to an API key, never your plan: put ANTHROPIC_API_KEY=... in ~/.config/effortless-bench.env.
# Spending stops at BUDGET dollars (default 30), summed over the finished runs in the results folder.
# Usage: bash bench/hard/run.sh [model] [reps] [jobs] [tasks] [setups]   e.g. bash bench/hard/run.sh opus 2 4 "b1 b8" "m on"
#        DRY=1 bash bench/hard/run.sh ...   prepares the copies and plants the bugs, prints the commands, calls no model
# Then:  node bench/hard/score.cjs
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
ALL_TASKS="$(node -e 'console.log(require(process.argv[1]).map(t => t.id).join(" "))' "$REPO/bench/hard/tasks.json")"
MODEL="${1:-opus}"; REPS="${2:-1}"; JOBS="${3:-4}"; TASKS="${4:-$ALL_TASKS}"; CONDS="${5:-m h on}"
DRY="${DRY:-}"; BUDGET="${BUDGET:-30}"
KEYFILE="$HOME/.config/effortless-bench.env"
if [ -z "$DRY" ]; then
  [ -f "$KEYFILE" ] || { echo "no $KEYFILE with ANTHROPIC_API_KEY=..." >&2; exit 1; }
  ( set -a; . "$KEYFILE"; set +a; [ -n "${ANTHROPIC_API_KEY:-}" ] ) || { echo "$KEYFILE sets no ANTHROPIC_API_KEY" >&2; exit 1; }
  export B="${EFFBENCH_HARD_DIR:-${TEMP:-/tmp}/effbench-hard}"
else
  export B="${EFFBENCH_HARD_DIR:-${TEMP:-/tmp}/effbench-hard-dry}"
fi
mkdir -p "$B/r" "$B/w" "$B/cfg"
git -C "$REPO" archive HEAD -o "$B/src.tar"
rm -rf "$B/pristine"; mkdir -p "$B/pristine"
(cd "$B/pristine" && { tar --force-local -xf ../src.tar 2>/dev/null || tar -xf ../src.tar; })
rm -rf "$B/pristine/bench"
echo "bench dir: $B   model: $MODEL   reps: $REPS   tasks: $TASKS   setups: $CONDS   budget: \$$BUDGET${DRY:+   (dry run)}"

# Dollars spent so far: total_cost_usd over the finished runs' JSON in the results folder (a run still going counts 0).
spent() {
  node -e 'const fs = require("fs"), p = require("path"); let s = 0
    for (const f of fs.readdirSync(process.argv[1])) if (f.startsWith("hd-") && f.endsWith(".json")) {
      try { s += Number(JSON.parse(fs.readFileSync(p.join(process.argv[1], f), "utf8")).total_cost_usd) || 0 } catch {}
    }
    console.log(s.toFixed(4) + (s >= Number(process.argv[2]) ? " stop" : " go"))' "$B/r" "$BUDGET"
}

one() {
  local id=$1 cond=$2 rep=$3 eff PL=() report P money
  local tag="hd-$MODEL-$id-$cond-$rep" dir="$B/w/hd-$MODEL-$id-$cond-$rep"
  money="$(spent)"
  if [ "${money#* }" = "stop" ]; then echo "$tag skipped: budget reached (\$${money% *} of \$$BUDGET)"; return 0; fi
  rm -rf "$dir"; mkdir -p "$dir" && (cd "$dir" && { tar --force-local -xf ../../src.tar 2>/dev/null || tar -xf ../../src.tar; })
  [ -f "$dir/hooks/register.tsx" ] || { echo "$tag: repo copy failed"; return 1; }
  # The tasks, their answers and this script stay out of the copy.
  rm -rf "$dir/bench"
  report="$(node "$REPO/bench/hard/plant.cjs" "$id" "$dir")" || { echo "$tag: could not plant the bug"; return 1; }
  P="$report

Fix the bug in the code. Do not change the tests. When done, say what you changed."
  case $cond in m) eff=medium;; h) eff=high;; x) eff=xhigh;; on) eff=medium; PL=(--plugin-dir "$REPO");; *) echo "$tag: unknown setup $cond"; return 1;; esac
  rm -f "$B/r/$tag.json" "$B/r/$tag.err" "$B/r/$tag.proof.log"
  local ALLOWED="Read Edit Write Grep Glob Bash(node:*) Bash(ls:*) Bash(cat:*) Bash(grep:*) Bash(claude plugin test:*) Bash(CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test:*)"
  if [ -n "$DRY" ]; then
    echo "[dry] $tag in $dir: claude -p <report $id> --model $MODEL --effort $eff ${PL[*]} --strict-mcp-config --no-session-persistence --permission-mode acceptEdits --allowedTools \"$ALLOWED\" --output-format json"
    printf '{"dry":true,"total_cost_usd":0,"duration_ms":0,"num_turns":0,"result":"(dry run, no model called)"}\n' > "$B/r/$tag.json"
    return 0
  fi
  (
    set -a; . "$KEYFILE"; set +a
    # Only the real API host: a base URL pointing elsewhere could bill somewhere else.
    if [ -n "${ANTHROPIC_BASE_URL:-}" ] && [ "$ANTHROPIC_BASE_URL" != "https://api.anthropic.com" ]; then unset ANTHROPIC_BASE_URL; fi
    # An empty config folder: no login there, so the API key is what pays. The function hooks flag lets the model run
    # the plugin's test suite (local, no model) and lets effortless load in the "on" setup.
    export CLAUDE_CONFIG_DIR="$B/cfg" CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 EFFORTLESS_LOG="$B/r/$tag.proof.log"
    cd "$dir" && env -u CLAUDE_CODE_OAUTH_TOKEN -u ANTHROPIC_AUTH_TOKEN timeout 1200 claude -p "$P" --model "$MODEL" --effort "$eff" "${PL[@]}" \
      --strict-mcp-config --no-session-persistence --permission-mode acceptEdits --allowedTools "$ALLOWED" \
      --output-format json < /dev/null > "$B/r/$tag.json" 2> "$B/r/$tag.err"
  ) || echo "$tag: claude exited non-zero (see $B/r/$tag.err)"
  echo "$tag done"
}
export -f one spent; export REPO KEYFILE MODEL DRY BUDGET

for rep in $(seq 1 "$REPS"); do for t in $TASKS; do for c in $CONDS; do
  echo "$t $c $rep"
done; done; done | xargs -P "$JOBS" -L 1 bash -c 'one "$@"' _
money="$(spent)"
echo "all runs done, \$${money% *} spent in $B/r: EFFBENCH_HARD_DIR=\"$B\" node $REPO/bench/hard/score.cjs"
