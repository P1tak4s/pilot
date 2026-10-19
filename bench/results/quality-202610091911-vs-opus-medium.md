Quality benchmark 2026-10-09T19:11Z. Baseline = opus medium for every prompt. Routed = the model and effort in the case file. Grader = opus high, blind, random order.

| Tier | Routed better | Tie | Baseline better | Routed as good or better | Routed good enough | Baseline cost | Routed cost | Saved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| easy (12) | 0 | 5 | 7 | 42% | 75% | $0.124 | $0.029 | 77% |
| normal (12) | 1 | 4 | 7 | 42% | 100% | $0.284 | $0.115 | 60% |
| hard (6) | 2 | 3 | 1 | 83% | 100% | $0.714 | $0.903 | -26% |
| all (30) | 3 | 12 | 15 | 50% | 90% | $1.121 | $1.046 | 7% |

Median time per answer: baseline 7397 ms, routed 6371 ms (easy: 4085 vs 4448; normal: 9397 vs 6470).

Models that actually answered: baseline claude-opus-5-5; routed claude-haiku-4-5-20251001, claude-sonnet-5-5, claude-opus-5-5.

"Good enough" = routed won, tied, or lost but the grader said it would still serve the user.

Cases where baseline won:
- e01 (haiku low): Both are correct, but B adds that the stash is kept when applying it causes a conflict, while A's unconditional 'removes' is a minor oversimplification that would not cause data loss or need a follow-up question.
- e03 (haiku low): Both answers are correct on the core distinction, but A's examples are all accurate and it adds more useful material: NaN, reference comparison, Object.is, and the `x == null` idiom. B's explanation of `"" == false` as 'both convert to falsy values' is slightly inaccurate (both actually become the number 0), though that slip does not mislead on the main point.
- e04 (haiku low) NOT GOOD ENOUGH: Answer A's main regex has no boundaries or anchors, yet it claims '20000' doesn't match (it matches '2000' inside it), which is misleading; Answer B uses correct boundaries by default and adds anchored and lookaround variants.
- e07 (haiku low) NOT GOOD ENOUGH: Answer A's PowerShell total command fails because `Measure-Object -Sum` is applied to GenericMeasureInfo objects without `-Property Lines`, and its Bash total breaks on filenames with spaces, while B's commands all work and B handles spaces with `-print0`/`-0`.
- e09 (haiku low): Both correctly explain that calling an async function returns a coroutine that must be awaited, but A also warns that blocking calls still freeze the event loop and that async gives single-threaded I/O concurrency, not parallelism, which B's vague 'non-blocking execution' claim leaves out.
- e11 (haiku low) NOT GOOD ENOUGH: A is a natural, correct translation, while B's main suggestion uses 'på fredagen' ('on the Friday') instead of the idiomatic 'på fredag' for an upcoming Friday, and wrongly calls it the most common option.
- e12 (haiku low): Both are correct, but B frames the cause more precisely as execution order rather than A's 'which thread finishes first', and adds useful points such as intermittency and atomic operations, while A's minor imprecision would not mislead a reader.
- n01 (sonnet medium): Both implementations are correct trailing-edge debounces with a working cancel(). A is slightly better because it types `this` through a generic `T`, while B forwards `this` at runtime but types it only as `unknown`. B is still fully usable.
- n02 (sonnet medium): Both answers correctly identify the bug and give three working fixes, but B states more clearly that the error happens on any non-empty input and adds a useful note about punctuation, while A is still fully correct and sufficient.
- n05 (sonnet medium): Both scripts work, but B uses `cd && pwd` instead of `realpath`, which is more portable. It also writes to a partial file and renames it only on success, explains the `-mtime` off-by-one (A's `+14` keeps backups about a day longer than asked), and adds restore and Windows scheduling instructions.
- n07 (sonnet medium): Both hooks correctly guard JSON parse and storage errors and handle lazy initial values, key changes and cross-tab sync, but A ignores malformed cross-tab writes instead of resetting state, logs failures, and documents the same-tab sync limitation, while B is still correct and usable (and even handles localStorage.clear()).
- n10 (sonnet medium): Both are polite, correct two-paragraph declines, but A makes a more concrete offer to take the job later by proposing a specific start and delivery date, while B only offers general flexibility, which still meets the request.
- n11 (sonnet medium): Both conversions are correct and preserve error propagation, but B is more complete: it shows a full example that distinguishes read errors from parse errors, warns about binding `this` for `promisify`, and mentions `util.callbackify`.
- n12 (sonnet medium): Both are accurate. B is somewhat more complete and clearer: it explains why random I/O loses to sequential scans, covers indexes the query can't use (functions, leading wildcards, column order), mentions covering indexes, and judges indexes by the whole workload, while A, though correct and sufficient, is terser and its 'most selective column first' advice is oversimplified.
- h02 (opus high): Both are technically correct and cover the same five causes with similar diagnostics, but B fits the question slightly better: it gives an explicit confirm and rule-out criterion for each cause and sharper promise checks ([[PromiseState]] pending, async_hooks init vs promiseResolve), while A remains fully adequate and adds a useful post-GC heapUsed check.
