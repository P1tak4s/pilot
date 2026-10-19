# Planted-bug bench

Measures how smart a Claude Code setup is against what it costs. Each of the 10 tasks in `tasks.json` plants one bug in
a fresh copy of this repo and hands Claude the bug report a user would write: the symptom only, no file, function or
test names. A run counts as solved when `tests/` is untouched and the whole test suite passes afterwards.

Setups (`run.sh`, 5th argument):

| Setup | What runs |
| --- | --- |
| `m` | the app at medium effort, effortless not loaded |
| `h` | the app at high effort, effortless not loaded |
| `x` | the app at xhigh effort, effortless not loaded (not in the default set) |
| `on` | the app at medium, effortless loaded from this repo with its defaults (Auto on) |

Tasks: 3 easy (an inverted comparison), 4 medium (a swapped constant, an off-by-one, a regex), 3 hard (clamps in the
wrong order, a cost formula that only goes wrong when two caches differ, a bug whose symptom shows in another function).
`fails` in each task lists the tests that catch it, for you only; the model never sees `tasks.json`.

## Run

```bash
node bench/hard/verify.cjs                     # every bug: snippet unique, suite fails with it, passes without (free)
DRY=1 bash bench/hard/run.sh                   # copies + planted bugs + the commands, no model called
bash bench/hard/run.sh opus 2 4                # [model] [reps] [jobs] [tasks] [setups], defaults opus 1 4 all "m h on"
node bench/hard/score.cjs                      # runs the suite in every copy, prints the tables, writes hard-scored.json
```

Runs land in `$TEMP/effbench-hard` (`$TEMP/effbench-hard-dry` for a dry run); `EFFBENCH_HARD_DIR` moves both
`run.sh` and `score.cjs`. Per run: `r/<tag>.json` (the `claude -p` result), `r/<tag>.err`, `r/<tag>.proof.log`
(effortless's picks, `on` only) and the work copy `w/<tag>`.

The model gets Read, Edit, Write, Grep, Glob, `node`, `ls`, `cat`, `grep` and `claude plugin test` (the repo's README
names that command; the prompt does not). The copy has no `.git` and no `bench/`, so neither git nor this folder gives
the bug away.

## Billing safety

- Only an API key pays: `ANTHROPIC_API_KEY=...` in `~/.config/effortless-bench.env`, loaded with `set -a`.
- `CLAUDE_CONFIG_DIR` is an empty folder in the bench dir, so there is no login to fall back on;
  `CLAUDE_CODE_OAUTH_TOKEN` and `ANTHROPIC_AUTH_TOKEN` are removed from the environment, and `ANTHROPIC_BASE_URL` is
  dropped unless it is `https://api.anthropic.com`.
- `--strict-mcp-config --no-session-persistence`: no MCP servers, nothing saved.
- `BUDGET` (dollars, default 30): before each run the costs of the finished runs in `r/` are summed; at or over the
  budget every remaining run is skipped with "budget reached". Runs already going are not counted until they finish,
  so the total can pass the budget by up to `jobs` runs. The sum covers every run in `r/`: empty it, or raise
  `BUDGET`, for a new round.
- `verify.cjs`, `score.cjs` and `DRY=1` never call a model: `claude plugin test` is a local runner.
