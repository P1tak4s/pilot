# Showcase brief: the dashboard bar

The site (`site/`) still shows effortless as the old minimal look: small buttons in the footer and no bar. The mod's
default is now the **dashboard bar** above the prompt. It is one bar that changes with what is going on in the chat. The
minimal look still exists as a setting (Settings → Show → Minimal), but the site should lead with the bar.

## What to redo

1. Make the bar the hero. It is one band that adapts itself: the effort word, a context ring and %, the cache
   countdown, the judge's reason, the Auto switch, Handoff and the settings gear.
2. Rework any section that demos the footer buttons (the footer lens, the step-through) to tell the same story on the
   bar. The minimal look can drop to a one-line mention ("prefer it quiet? there's a minimal look").
3. Tell the Handoff story through the bar. Handoff has no box on a fresh chat. A grey box fades in by 15% context and
   turns white by 30%. From 30% a violet glow grows, a step every 10%, up to 80%.

## Renders (`bar/`)

Every state has three files from the real mod drawn by the app's own renderer and CSS (`tools/render-band`):
`.png` (device px at the app's zoom 1.5774), `.html` (the real DOM and CSS, which is a good source to rebuild the bar
in the site), and `.tree.json` (the element tree the mod returned).

| file | state |
|---|---|
| 01-fresh-3pct | fresh chat, no verdict yet, no Handoff box |
| 02-deciding | judge running: the word reads "Deciding" |
| 03-low-12pct | Low, Handoff box fading in |
| 04-medium-22pct-greybox | Medium, grey Handoff box |
| 05-high-38pct-handoff-glow | High, white Handoff with the first glow step |
| 06-high-75pct-handoff-full-glow | glow near its strongest |
| 07-working | a reply running |
| 08-auto-off | Auto off: the mark dims and the word reads "Off" |
| 09-cache-running-out | cache with 4 minutes left |
| 10-settings | the gear opens settings (Effort, Judge, Handoff, Show cards) |
| 11-handoff-bar | Handoff pressed: Quick/Full, what happens after, Go |

To render more: `node tools/render-band/render.mjs --help` (flags: `--percent`, `--effort`, `--reason`, `--judging`,
`--working`, `--auto off`, `--cache M`, `--press <button key>`, `--glow`, `--at S`, `--out`).

## Motion to recreate (the PNGs are stills)

- The effort word: when the verdict changes, the word turns violet `#9b7bff`, holds for 1 s, then fades to the band's
  white `#d4d4d8` over 0.8 s. Turning Auto off or on changes the word with no flash.
- Deciding: an animated word while the judge runs.
- The Handoff glow pulses between a low and a peak, and its period gets shorter as context grows (3.4 s down to
  1.5 s). The values are in `GLOW_LEVELS` in `hooks/register.tsx`.
- The settings cards light as a whole on hover (`#1c1c20` fill, `#3b3b42` edge).

## Brand

`brand/` holds the mark (colour and white), the lockup, the favicon and icon PNGs, and the social preview. The bar's
left mark is `MARK_SVG` at 18 px, drawn at 35% opacity when Auto is off. The app font is anthropic-sans, 13 px,
weight 580.

Colours: band text `#d4d4d8`, accent violet `#9b7bff` (flash), Handoff box grey `#2b2b2f` → white `#ececf0`, and the
label goes dark `#141416` once the box is light.
