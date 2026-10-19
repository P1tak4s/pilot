# Agent panel

A right-side pane for effortless: the main chat and each subagent it sends off, live, with the model and effort
effortless picked for each agent. Plan and mockups only; nothing in `hooks/` uses this yet.

- [PLAN.md](PLAN.md): goal, states, how agents get their model and effort, the APIs with type-file line numbers,
  what is not possible, the build phases, open questions.

## Mockups

| | Page | Pane only |
|---|---|---|
| (a) main chat and five agents: running, waiting on a tool, done and reported back, picking, failed | [a-panel.html](mockups/a-panel.html) / [png](mockups/a-panel.png) | [pane-panel.png](mockups/pane-panel.png) |
| (b) one agent opened: why this pick, tool calls, Message / Stop | [b-detail.html](mockups/b-detail.html) / [png](mockups/b-detail.png) | [pane-detail.png](mockups/pane-detail.png) |
| (c) nothing running: empty state, the two settings, earlier totals | [c-idle.html](mockups/c-idle.html) / [png](mockups/c-idle.png) | [pane-idle.png](mockups/pane-idle.png) |

The pane bodies are real element trees (`Box`, `Text`, `Button`, `Svg` only, as a `Pane` hook would return them),
drawn by the installed desktop app's own renderer and CSS. The band above the prompt is the real dashboard tree from
`docs/showcase/bar`. The window around them (sidebar, chat, composer, pane frame and its close mark) is hand-drawn,
since the desktop's docked pane chrome has not been seen yet.

How they are made:

1. `node mockups/trees.mjs` writes the trees to `mockups/trees/*.json`.
2. `node mockups/rig/render.mjs --tree mockups/trees/panel.json --width 400 --out <abs>/mockups/rig/out/panel.html`
   draws one with the app's renderer (needs the desktop app, Chrome or Edge). `rig/` is a copy of
   `tools/render-band` with three changes: no max height on the slot, a 1200 px tall viewport, and `freeze.js`, which
   saves the drawn DOM with its styles inlined as `*.frozen.html`. Do the same for `idle`, `detail`, and the two band
   trees (`--width 680`).
3. `node mockups/build.mjs` puts the frozen pane and band into the window and writes the three pages.
4. `bash mockups/shoot.sh` screenshots them at 1.5x.

The pages load `anthropic-sans` from the installed app (a `file:` URL of version 2.26454.2.0) and fall back to
system-ui. No font file is copied into the repo.

## Motion (the PNGs are stills)

Only Svg moves in a pane, so all motion is in images:

- Running: the status arc turns once a second.
- Waiting on a tool: the amber ring breathes (1.6 s); the newest bar in the detail view breathes with it.
- Picking: three violet dots pass a light along, also beside "waits on 2" in the main chat card.
- Elapsed time counts up by itself, a frame a second for 75 s, like the cache clock. The pane is redrawn for the
  clocks at most once a minute.
- Idle: the big mark breathes slowly (4 s).
- Ideas not drawn: a card slides from violet to green when an agent finishes (one-shot Svg layer behind the card, as
  the settings panel's intro sweep), and the "Reported back" arrow pulses once.
