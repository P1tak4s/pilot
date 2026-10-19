# Agent panel: plan

A right-side pane that shows the main chat and every subagent it sends off, live, and lets effortless pick each
subagent's model and effort the way it already picks effort for the main chat.

Type references are to `plugin-authoring/types/claude-code.d.ts` of Claude Code 2.1.289 (the bundled skill), as
`d.ts:LINE`. "Verified" below means read in the types; nothing here has run in the app yet.

## Goal

1. See what the main chat and its agents are doing without opening each agent's transcript.
2. Each agent runs on the cheapest model and effort that does its job, picked by effortless, with the reason shown.
3. See what agents cost, and roughly what picking saved.

## User stories

- I ask for a big job. Claude sends out three agents. The pane opens on the right and shows each one: type, task,
  model and effort, running time, cost, and the tool it is in right now.
- An Explore agent gets Haiku, a branch review gets Opus at High. I can see why in one line, and in full when I open it.
- An agent waits on `npm test`. Its card turns amber and says so, with how long it has waited.
- An agent finishes. Its card turns green, says it reported back to the main chat, and keeps its total.
- Claude names a model itself (`model: "opus"`). effortless keeps it and only picks the effort, unless I say otherwise.
- I turn picking off and the pane still shows everything (observe only).

## What the pane shows

Header: mark, "effortless Agents", count, total cost. Then the main chat card (effort, model, context ring, cache,
"waits on N"). Then one card per agent, newest last, and a footer with totals and two buttons.

| State | Source | Look |
|---|---|---|
| queued (picking) | `agent.spawn` fired, judge running | violet card, moving dots, "picking" |
| running | first `turn.step` with its `agentId` | spinning arc, the current tool in white |
| waiting for a tool | inside its `tool.call`, before `next(e)` returns; or `AgentInfo.status` `waiting` | amber card, tool and wait time |
| done | its `turn.complete` with `reason: 'answer'` | green card, total time and cost |
| failed / stopped | `turn.complete` `error`/`aborted`, or status `failed`/`killed` | red row, folded to one line |
| reported back | main loop's `tool.call` for `Agent` resolves, or the `task-notification` row arrives | green "Reported back" line |

Per agent card: status icon, type, short task, elapsed clock, pick tag (model and effort), calls and tokens, cost,
what it does now (last tool and its argument), and the pick reason. Click opens the detail view: header, model,
effort, cost, tokens, a "Why" card (judge, time, sureness, the inputs, next best pick with its price), tool calls per
10 s, the last five calls, and Message / Stop / Copy task.

## How effortless picks for a subagent

Inputs at `agent.spawn` (`AgentSpawnInput`, d.ts:256-357): `subagentType` (287), `description` (278), `prompt`,
`model` if Claude named one (300), `parentModel` (305), `fork` (333). From effortless: the main chat's current pick,
the bias, floor and ceiling from settings, Save mode.

Order:
1. Fork: model is inherited and ignored (d.ts:295-300). Keep the parent's effort too, so the fork's shared cache prefix
   is not rewritten.
2. Claude named a model: keep it (setting "Keep a model Claude names", default on). Pick the effort only.
3. Known types get a prior with no judge call: Explore and claude-code-guide to Haiku, Plan to Sonnet Medium,
   reviewers and security agents to Opus High. The judge can still move a prior one step when it is sure (> 0.85).
4. Everything else asks the judge already in `register.tsx` (`judge()`, Jev, Haiku or custom) with a subagent
   question: type, description, the first 2000 characters of the prompt, and the parent's pick. Same JSON reply:
   `{ model, effort, why, sure }`. Then `tipped`, `bounded`, `capped` as for the main chat.
5. Judge fails or takes more than 3 s: use the prior, else the parent's pair.
6. Effort is only sent on Opus 5.5 and Sonnet 5.5 (`cacheSafe`); Haiku takes none.

Applying it:
- Model: return `next({ ...e, model })` from `agent.spawn` (d.ts:3967-3974). Verified in the types; whether it beats a
  model set in the agent's own definition is unverified.
- Effort: `turn.step` fires for a subagent's requests with `e.agentId` (d.ts:4294-4301, 12806-12810) and takes
  `next({ ...e, effort })` (12796). The current code passes subagent requests through untouched (`register.tsx`
  turn.step, `p` is null when `e.agentId` is set), so today every subagent runs at the app's base effort. Set it on
  request 0 and keep it for the agent's life.
- Linking: `agent.spawn` resolves with the new `agentId` (d.ts:369-381), but the agent's first `turn.step` may come
  first. Keep a promise per spawn; a `turn.step` with an unknown `agentId` awaits the pending spawns (a `$` or `next`
  wait does not count against the 10 s hook budget, d.ts:4915-4936).

## Where the live data comes from

| Need | API |
|---|---|
| the agent list, type, description, status, parent | `$.agent.list()` d.ts:3085, `AgentInfo` 125-180, `AgentStatus` 502 |
| what it does now | `tool.call` carries `agentId` (`ToolCallInput` = envelope & `AgentLoop`, d.ts:12103, 194-206) |
| model and cost per request | `turn.step` result `usage` and `model` (d.ts:12837-12864, `ModelUsage` 6131) |
| finished, why, total | `turn.complete` `agentId`, `reason`, `durationMs`, `usage` (d.ts:12627-12662) |
| its transcript, for the detail view | `$.session.messages({ agentId })` d.ts:2641 |
| Message button | `$.session.send({ to: { agentId }, text })` d.ts:2785 |
| the pane itself | `$.ui.open({ id, title, columns })` `PaneOpenArgs` d.ts:7058-7127; render on `{ component: 'Pane', requestId }`, props `placement`, `bodyColumns`, `view` d.ts:9761-9813 |
| whether a pane docks beside the chat | `e.viewport.isFullscreen` d.ts:9872 |

## What is not possible, and the fallbacks

- No dollar cost per request: usage is tokens only (d.ts:6131). Only the session total is in USD (`SessionCost.usd`,
  d.ts:10441). Fallback: a price table per model in the mod, or show weighted tokens like `/effortless stats` does.
- No effort field on `agent.spawn`. Effort goes through `turn.step` only. A plugin's own registered agent types can
  carry `effort` (`AgentSpec.effort`, d.ts:442), which does not help with built-in or user agents.
- No text sizes. Text has colour, bold, dim, italic only (`TextProps`, d.ts:12011). Hierarchy comes from bold,
  colour and boxes; big numbers would have to be Svg.
- Only Svg animates on desktop (spinners, the elapsed clock, the dots). Elapsed time is a self-ticking image like the
  cache clock, redrawn at most once a minute. A `Client` element (desktop only, d.ts:1426, `every()` 1512) could
  tick plain text without redraws, but its table has no Svg (d.ts:1336) and it is unproven in a pane.
- A bordered Box gets vertical padding on desktop, so tags are borderless Boxes with a background (seen in the rig).
- Opening an agent's own transcript from the pane: `view` is read-only (d.ts:11320). No button for it; the detail
  view reads the transcript instead.
- Stop: no `$.agent.stop`. Calling the TaskStop tool from the plugin is the likely path; unverified for subagents.
- Desktop placement is unverified. The types say a pane docks beside a fullscreen transcript and sits above the prompt
  otherwise (d.ts:9761-9796). A memory note says a pane did draw in split view's right side (2026-10-06). If desktop
  places it inline, the fallback is a slim summary in the band ("3 agents · $0.58") that opens the pane on click.
- Every state write redraws the pane, which restarts its images (known from the band). Writes are throttled to one
  per second per agent, and tool starts within that second fold into one.

## Build plan

Phase 0, spike (half a day). In the app: `/effortless try pane` (exists) and log `placement`, `bodyColumns`,
`isFullscreen`; check `columns: 46` widens the dock. Log one subagent's `turn.step` model and effort before and after
a rewrite, and whether the first step comes before `agent.spawn` resolves. Check a hook `model` beats an agent
definition's. Stop and report if the pane does not dock on desktop.

Phase 1, observe only (MVP). State `agentPanel` (one record per agent) fed by `agent.spawn`, `tool.call`,
`turn.step`, `turn.complete`. The pane as mockup (a) without picking: types, states, clocks, tokens, cost. Opens with
`/effortless agents`, and by itself on the first spawn where it docks. Tests in `tests/effortless.test.ts` drive a
fake spawn through the states.

Phase 2, picking. Priors, the subagent judge question, apply model at spawn and effort per request, the "why" line,
settings "Pick model and effort for agents" and "Keep a model Claude names". Add 20 subagent cases to
`bench/judge-cases.json` and run `/effortless bench`.

Phase 3, detail and control. Mockup (b): Why card, activity bars, recent calls, Message, Stop (if Phase 0 shows a
way), Copy task. Per-agent lines in `/effortless stats`. The savings estimate.

Phase 4, other surfaces. Terminal fullscreen dock (Raster art like the bands), and the inline fallback.

## Open questions for Isac

1. When Claude names a model for an agent, keep it (default here) or let effortless override it?
2. Cost in dollars (a price table we keep up to date) or in weighted tokens like `/effortless stats`?
3. The savings line ("all on Opus High would be") only reprices the same tokens. Show it, label it, or leave it out?
4. Open the pane by itself on the first agent, or only on `/effortless agents` and a band button?
5. Should agents ever get Fable, or stay on Haiku, Sonnet and Opus?
6. Teammates (named agents that stay idle between turns): in the same list, or out of scope for now?
7. Is Stop needed in the first version, given it is unverified?
