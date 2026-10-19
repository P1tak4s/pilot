# Terminal art and layout

## Goal
effortless looks like itself in the terminal CLI, not only in the desktop app. Isac's reason for the terminal release
is the visual elements, so each band gets moving art, and the bands lay out cleanly at 80 columns and wider.

## Decided
- Art is a `Raster` (terminal only): a fixed grid of cells, each `▀` with a foreground (top pixel) and background
  (bottom pixel), so one cell is two pixels tall. `Image` is out: Windows Terminal draws only its alt text.
- Spike 2026-10-06 (throwaway, scratchpad): a 16x2 Raster in an AbovePrompt box drew in CLI 2.1.288 and `$.ui.blit`
  every 80 ms changed it between captures.
- Art sits in a small box on the band's right, 16 columns by 2 rows (16x4 pixels). Text and buttons keep their room;
  under 90 columns the art drops before any text is cut.
- Same rule as desktop: alert bands move (cold, swamp, hot, judge down, compacting), setup, settings and the handoff
  bar are still.
- The effort row stays as one line under a band instead of being replaced by it.
- Everything ships in one release; the reply cards already work in the terminal.

## Motifs (palette from the desktop constants)
| Band | Motif | Colours |
| --- | --- | --- |
| cold | snow drifting down over a pale frost edge | ICE `#7cc4ff` on ICE_BG |
| swamp | bubbles rising through dark water | BOG `#a7c98f` on BOG_BG |
| hot | embers rising from a glowing bottom row | EMBER `#f08a3c`, `#ffb06a` on EMBER_BG |
| judge down | a slow dim pulse, static flecks | SLATE `#b4b8c4` on SLATE_BG |
| brand (settings, setup, handoff bar) | still sparkles | ACCENT `#a79cf7` on BRAND_BG |
| compacting / done | brand sparkles moving; done = green tick | ACCENT; DONE_EDGE `#2f7a4c` |

Each motif fades in from the left over its first 6 columns, like the desktop art's mask.

## Units
- `hooks/art.ts`: pure functions, no `$`. `artFrame(kind, t, cols, rows): string` returns base64 cells. Tested on
  its own: size, the fade, frames differ over time for moving kinds and stay equal for still ones.
- `hooks/register.tsx`: a terminal branch per band in AbovePrompt draws text, buttons, then
  `<Raster key="art" …>`. One `$.clock.every(100)` runs while a moving band is drawn and blits the next frame to it;
  it is cancelled when no moving band shows.

## Layout fixes in the same pass (from docs/terminal-audit-2026-10-06.md)
1. Shorter terminal copy so the band line fits at 80 columns; nothing desktop-only ("footer", "the app's control").
2. The effort row never breaks the word "Effort"; its hint drops first.
3. Settings: Show row wraps; no empty rows under the title; Esc closes it; setup opens over it.
4. Progress bar draws a visible track in the terminal.
5. Check whether `turnBusy` stays set after a turn that ends in an API error (audit item 9); fix if so.

## Testing
- Unit tests for `art.ts`.
- Plugin tests mounting each band on `surface: 'terminal'` at 80 and 120 columns: Raster present above 90, absent
  below, text not cut.
- Real CLI check with the pty harness at 80, 100 and 120 columns, screenshots for Isac.
