# Dashboard band

## Goal
Isac wants effortless to read as one place above the prompt instead of small buttons in the footer. A setting picks
the look: **Default** draws a permanent dashboard band; **Minimal** keeps today's footer buttons and no band.

## Decided (Isac, 2026-10-06)
- Setting `layout`: `default` (new installs and existing ones) or `minimal`. In the settings panel as a Select.
- The dashboard is the resting state of the slot above the prompt. Anything with more to say takes the slot instead:
  setup, the settings panel, the handoff bar, the progress bar, and the alerts (cold, swamp, hot, judge down). When
  it has passed, the dashboard comes back. Never two bands stacked.
- Content: effort with Auto on/off, the cache countdown, how full the context is, the judge's reason for the effort,
  and the last reply's cost (weighted tokens and time). Buttons: Auto, Handoff, settings.
- No "saved" figure: there is no honest baseline.

## Layout
Brand look (BRAND_BG, BRAND_EDGE, still brand art), two lines:
- Line 1: `✦ <effort>` in the accent (or `Auto paused`, `Off`), then `cache 42m` (coloured as the footer timer is) and
  `18% context`. Buttons on the right: `Auto on`/`Auto off`, `Handoff`, `⚙`.
- Line 2, dim: the judge's reason (`Jev: …`, `You: …`), then `last ≈42k tokens · 38s` once a reply has landed.
- Desktop: the footer (SessionMode) draws nothing of its own in Default; the app's footer shows.
- Terminal: the same band (terminalBand-style layout, brand art from 90 columns), with the effort row under it, as
  under the alerts.

## Data
- Effort, Auto, judge reason: `snap($)` (`current.by`, `current.why`), as the terminal note uses today.
- Cache: `cacheLeft` / `cacheLabel` / `cacheColor`, as the footer timer.
- Context: `lastContext.percent` from the usage check.
- Last reply: weighted tokens (`WEIGHT`) summed over the main thread's requests since the prompt, and the turn's
  `durationMs`, kept in an atom at `turn.complete`.

## Testing
- Default: the dashboard draws when nothing else does, with its buttons; an alert replaces it; Minimal draws no band
  and keeps the footer buttons. Desktop and terminal.
- Last reply cost: two requests then turn.complete give the summed weighted tokens and the time.
