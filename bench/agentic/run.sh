#!/usr/bin/env bash
# effortless on and off, on real coding tasks. Every run gets a fresh copy of this repo, one task, one setup:
#   m / h / x  = the app at medium / high / xhigh, effortless not loaded
#   on         = the app at medium, effortless loaded (it picks the effort for each prompt)
# Billed to an API key, never your plan: put ANTHROPIC_API_KEY=... in ~/.config/effortless-bench.env.
# Usage: bash bench/agentic/run.sh [models] [reps] [jobs]   e.g. bash bench/agentic/run.sh "opus sonnet" 3 4
# Then:  node bench/agentic/score.cjs   (writes the tables; every run's JSON stays in the work folder)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
MODELS="${1:-opus sonnet}"; REPS="${2:-3}"; JOBS="${3:-4}"
KEYFILE="$HOME/.config/effortless-bench.env"
[ -f "$KEYFILE" ] || { echo "no $KEYFILE with ANTHROPIC_API_KEY=..." >&2; exit 1; }
export B="${EFFORTLESS_BENCH_DIR:-${TEMP:-/tmp}/effbench}"
mkdir -p "$B/r" "$B/w" "$B/cfg" "$B/pristine"
git -C "$REPO" archive HEAD -o "$B/src.tar"
(cd "$B/pristine" && tar --force-local -xf ../src.tar 2>/dev/null || tar -xf ../src.tar)

one() {
  local id=$1 model=$2 cond=$3 rep=$4 P eff PL=()
  local tag="ab2-$model-$id-$cond-$rep" dir="$B/w/ab2-$model-$id-$cond-$rep"
  mkdir -p "$dir" && (cd "$dir" && { tar --force-local -xf ../../src.tar 2>/dev/null || tar -xf ../../src.tar; })
  [ -f "$dir/hooks/register.tsx" ] || { echo "$tag: repo copy failed"; return 1; }
  case $id in
    t1) P="Find where the threshold for showing the cold-cache band is defined and explain in three sentences how it is used. Do not change any files.";;
    t2) P="In hooks/theme.ts, add a one-line JSDoc comment above every exported function that does not have one. Change nothing else.";;
    t3) P="Write tools/count-tests.mjs: it prints how many test(...) calls tests/effortless.test.ts contains. Run it with node and tell me the number.";;
    t4) P="Explain the full flow when a person presses the Update button in the update card, from the click until the new version runs in the chat. Name every function it goes through, in order, and say what each one does. Do not change any files.";;
  esac
  case $cond in m) eff=medium;; h) eff=high;; x) eff=xhigh;; on) eff=medium; PL=(--plugin-dir "$REPO");; esac
  (
    set -a; . "$KEYFILE"; set +a
    # An empty config folder: no login there, so the API key is what pays.
    export CLAUDE_CONFIG_DIR="$B/cfg" CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 EFFORTLESS_LOG="$B/r/$tag.proof.log"
    cd "$dir" && timeout 900 claude -p "$P" --model "$model" --effort "$eff" "${PL[@]}" --strict-mcp-config --no-session-persistence \
      --permission-mode acceptEdits --allowedTools "Read Edit Write Grep Glob Bash(node:*) Bash(ls:*) Bash(cat:*)" \
      --output-format json < /dev/null > "$B/r/$tag.json" 2> "$B/r/$tag.err"
  )
  echo "$tag done"
}
export -f one; export REPO KEYFILE

for rep in $(seq 1 "$REPS"); do for model in $MODELS; do for t in t1 t2 t3 t4; do for c in m h x on; do
  echo "$t $model $c $rep"
done; done; done; done | xargs -P "$JOBS" -L 1 bash -c 'one "$@"' _
echo "all runs done: node $REPO/bench/agentic/score.cjs"
