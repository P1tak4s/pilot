#!/usr/bin/env bash
# Effort for helpers on and off, on tasks where Claude sends off subagents. Every run gets a fresh copy of this repo,
# effortless loaded with Auto on and the app at the given effort; the only difference is the Helpers setting:
#   off = subagents run at the app's effort (what Claude Code does without effortless)
#   on  = the judge picks each subagent's effort before it starts
# Billed to an API key, never your plan: put ANTHROPIC_API_KEY=... in ~/.config/effortless-bench.env.
# Usage: bash bench/helpers/run.sh [model] [effort] [reps] [jobs] [tasks] [setups]   e.g. bash bench/helpers/run.sh opus high 2 4
# Then:  node bench/helpers/score.cjs
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
MODEL="${1:-opus}"; EFF="${2:-high}"; REPS="${3:-2}"; JOBS="${4:-4}"; TASKS="${5:-s1 s2 s3 s4}"; CONDS="${6:-off on}"
KEYFILE="$HOME/.config/effortless-bench.env"
[ -f "$KEYFILE" ] || { echo "no $KEYFILE with ANTHROPIC_API_KEY=..." >&2; exit 1; }
export B="${EFFORTLESS_BENCH_DIR:-${TEMP:-/tmp}/effbench}"
mkdir -p "$B/r" "$B/w" "$B/pristine"
git -C "$REPO" archive HEAD -o "$B/src.tar"
(cd "$B/pristine" && { tar --force-local -xf ../src.tar 2>/dev/null || tar -xf ../src.tar; })
# One config folder per setting, no login in either, so the API key is what pays.
for h in on off; do
  mkdir -p "$B/cfg-h$h"
  printf '{ "pluginConfigs": { "effortless@inline": { "options": { "helpers": "%s", "modelAuto": "off" } } } }\n' "$h" > "$B/cfg-h$h/settings.json"
done

one() {
  local id=$1 cond=$2 rep=$3 P
  local tag="hb-$MODEL-$EFF-$id-$cond-$rep" dir="$B/w/hb-$MODEL-$EFF-$id-$cond-$rep"
  rm -rf "$dir"; mkdir -p "$dir" && (cd "$dir" && { tar --force-local -xf ../../src.tar 2>/dev/null || tar -xf ../../src.tar; })
  [ -f "$dir/hooks/register.tsx" ] || { echo "$tag: repo copy failed"; return 1; }
  case $id in
    s1) P="Use two Explore subagents in parallel: one finds the token threshold that turns on the cold-cache band, the other the token threshold for the swamp band. Then tell me both constants and their values. Do not change any files.";;
    s2) P="Use one general-purpose subagent to count how many test(...) calls tests/effortless.test.ts contains. Then tell me the number. Do not change any files.";;
    s3) P="Use subagents to work out the full flow when a person presses the Update button in the update card, from the click until the new version runs in the chat. Then name every function it goes through, in order, and say what each one does. Do not change any files.";;
    s4) P="Use one general-purpose subagent to write tools/count-hooks.mjs: it prints how many .ts and .tsx files are directly in hooks/. Have it run the script with node. Then tell me the number.";;
  esac
  (
    set -a; . "$KEYFILE"; set +a
    export CLAUDE_CONFIG_DIR="$B/cfg-h$cond" CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 EFFORTLESS_LOG="$B/r/$tag.proof.log"
    rm -f "$EFFORTLESS_LOG"
    cd "$dir" && timeout 900 claude -p "$P" --model "$MODEL" --effort "$EFF" --plugin-dir "$REPO" --strict-mcp-config --no-session-persistence \
      --permission-mode acceptEdits --allowedTools "Read Edit Write Grep Glob Agent Bash(node:*) Bash(ls:*) Bash(cat:*) Bash(grep:*)" \
      --output-format json < /dev/null > "$B/r/$tag.json" 2> "$B/r/$tag.err"
  )
  echo "$tag done"
}
export -f one; export REPO KEYFILE MODEL EFF

for rep in $(seq 1 "$REPS"); do for t in $TASKS; do for c in $CONDS; do
  echo "$t $c $rep"
done; done; done | xargs -P "$JOBS" -L 1 bash -c 'one "$@"' _
echo "all runs done: node $REPO/bench/helpers/score.cjs"
