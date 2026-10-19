# render-band

Renders the dashboard band above the prompt the way the Claude desktop app (Code tab) draws it, as a PNG, without
opening the app. Use it to check a visual change to the band before shipping it.

```
node tools/render-band/render.mjs --percent 45 --width 768 --glow --at 0
```

Prints the paths of the page, the PNG and a JSON of measured boxes (CSS px), all in `tools/render-band/out/`.

## How it stays faithful

1. **The tree comes from the real mod.** The script copies the mod to a temp folder, writes `dump.template.ts` into it
   as a test, and runs `claude plugin test` on the copy. The test drives the hooks (judge verdict, one turn, cache,
   context) and prints what the band returns for `AbovePrompt` on desktop. `hooks/` is never touched. `--glow` flips
   `HANDOFF_GLOW` in the copy only.
2. **The DOM and CSS come from the installed app.** `page.js` fetches the app's renderer chunk (the one containing
   `data-press-cue` and `--engine-band-line`), strips its imports and runs it with the app's other modules stubbed,
   except the design tokens and DOMPurify, which are imported for real. It then calls the app's own functions: the band's
   tree shaper, the shadow-root setup with the engine CSS and the band's surface CSS, and the element renderer. The page
   loads the app's three stylesheets and fonts from `ion-dist`, and nests the host in the same wrappers and classes the
   app uses.
3. **The app's zoom.** Chromium stores the app's page zoom as a level (`per_host_zoom_levels` in the app's
   `Preferences`). The script reads it (2.5 here, so a factor of 1.5774) and passes it to headless Chrome as the device
   scale factor. The PNG is in device pixels, like a screenshot of the app.

The script finds the renderer, the token module and the helper imports by content, not by file name, and the renderer's
own functions (tree shaper, shadow-root setup, marks collector, element renderer, colour resolver, ink, hover-rule
writer, surface CSS) by what they do, not by their minified names, which change with every app build (`rendererNames`
in `render.mjs`). After an app update it either keeps working or exits and says which of these it could not find.

## Options

| flag | default | |
|---|---|---|
| `--percent N` | 19 | context fill; Handoff turns primary and the glow appears from 30 |
| `--width N` | 768 | CSS px of the band slot (the composer column; 768 in a wide window) |
| `--glow` | off | render with `HANDOFF_GLOW = true` (temporary copy only) |
| `--at S` | live | freezes the CSS animations inside Svg leaves at S seconds, for repeatable shots (0 = start of the glow's pulse, the low point) |
| `--wait S` | 0 | let S seconds of real time pass before the shot: use it for animations that run once (an entrance), which `--at` cannot hold past their end |
| `--trace MS` | | simulates clicks: presses the `--press` buttons on the drawn band, records every redraw for MS ms of the mod's clock, then replays each one at its time with the app's renderer (a redraw swaps the whole band, as in the app) and shoots frames into `out/<name>-frames/` (named by ms). Prints the redraws per step. Use it for flicker, animations across redraws and clicks that get lost |
| `--command C`, `--press k1,k2` | | run an `/effortless` subcommand first (`--command settings` opens the settings panel), then press band buttons by key, in order (`--press settings-card-effort`) |
| `--hit k1,k2` | | click-target check: for each key (a Button key, or a Box key such as `settings-helpers` or `card-judge`, found around its buttons, texts and images), takes the visible box, sends points at left+2, 25%, center, 75%, right-2 on its top+2, middle and bottom-2 lines through the shadow root's `elementFromPoint` and prints which button key each one hits (a dead zone shows as `(no button: ...)`), with the full and visible boxes of the key's own buttons. Also written to the JSON as `hit` |
| `--cache M` / `--cache off` | 59 | minutes left on a 1 h cache |
| `--effort E`, `--reason "..."`, `--model M` | medium, opus | the judge's verdict (Haiku judge); `--model haiku` puts the prompt on a cheaper model |
| `--handoff "..."` | | the Haiku judge's reason that a fresh chat would suit now; Handoff lights up with it |
| `--auto off`, `--fresh`, `--judging`, `--working` | | other states |
| `--columns N` | 100 | cells across the band body (props.bodyColumns); under 80 the Compact button is hidden |
| `--density compact\|comfortable` | compact | the Code tab's CDS density (the reference screenshots match compact) |
| `--mode dark\|light` | dark | |
| `--zoom Z` | app | override the zoom factor (`1` = no zoom) |
| `--tree file.json` | | redraw a tree saved earlier (`out/*.tree.json`) without running the mod |
| `--serve [--port N]` | | keep a local server running and print the page URL (the page applies CSS zoom to match the app) |
| `--out file.html` | `out/band-<percent>-<width>[-glow].html` | |
| `--app <ion-dist>` / `--chrome <exe>` | auto | |

## Limits

- Headless Chrome is not the app's Electron build. Layout matches to about 1 device px; text antialiasing can differ a
  little.
- Interactive Svgs (`isInteractive`) go through the app's sandboxed iframe path using the real DOMPurify. The band uses
  none: every Svg there is a plain `<img>`, as in the app.
- `--trace` counts redraws through a patched copy (each band `ui.render` writes a store key the test takes). Real time between redraws inside one act is a guess (16 ms).
- Hover states, hover cards and the host's "Turn off" button (added only when the band root is a plain layout box) are
  not drawn.
- Needs the desktop app installed (Windows Store build), Chrome or Edge, and `claude` on PATH.
