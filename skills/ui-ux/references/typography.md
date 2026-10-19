# Typography

Type is most of the interface. Get it right and a plain layout looks designed.

## Scale

- Name roles by purpose: `display`, `h1`, `h2`, `title`, `body`, `body-sm`, `label`, `caption`, `mono`.
- Product UI: fixed rem scale with ratio 1.125 to 1.2, for example 12 / 14 / 16 / 18 / 20 / 24 / 30.
- Marketing: ratio 1.25 to 1.333 and fluid display sizes, for example `font-size: clamp(2.5rem, 5vw + 1rem, 5.5rem)`. Body stays fixed.
- Avoid muddy neighbors (14 / 15 / 16 used side by side). Each step must be clearly different.
- Display type maximum about 6rem on the web; past that it is a poster, not a page.
- Hierarchy comes from size + weight + color + space together. If only size changes, it reads flat.

## Weights and families

- 2 families maximum (display + text), or one family in several weights. A third only for real code or data (mono).
- 3 to 4 weights maximum, each with a fixed job: 400 body, 500 labels/UI, 600 headings, 700 rare emphasis.
- Pair real contrast (grotesk + serif, geometric + humanist). Two similar sans fonts look like a mistake.
- Product UI: one good sans usually carries everything. Marketing earns a separate display face.
- Emphasis inside a headline: italic or a heavier weight of the same family, never a different family.

### Choosing faces

- Body and UI sans that read well everywhere: Inter, Geist, IBM Plex Sans, Source Sans 3, Public Sans, system-ui stack.
- Display sans with character: Satoshi, General Sans, Cabinet Grotesk, PP Neue Montreal, ABC Diatype, GT Walsheim, Switzer, Manrope, Bricolage Grotesque.
- Serif when the subject is genuinely editorial, literary, luxury or heritage: Newsreader, Source Serif 4, Literata (text); Tiempos, GT Sectra, Canela, PP Editorial New, Recoleta (display).
- Mono for code and numbers: Geist Mono, JetBrains Mono, IBM Plex Mono, Berkeley Mono.
- Inter is a fine default for Operate surfaces and trust-first products. As the display face of a brand landing page it reads as "nobody chose a font"; choose something with intent.
- Rotate display faces between projects; reusing the same "designer" font everywhere becomes its own cliché (Fraunces, Playfair Display, Instrument Serif, Space Grotesk and Syne are the current overused ones).
- Never Arial/Helvetica/Times by accident, Comic Sans, or more than one decorative face.

### Habit faces and caps

- Reflex picks to avoid unless the brief names them: Cormorant, Lora, Crimson, Newsreader, Space Mono, IBM Plex, DM Sans, DM Serif, Outfit, Plus Jakarta Sans, Instrument Sans (plus the list in anti-slop). A subject association ("it is a bookshop, so a serif") is never the reason for a face.
- Starting pairs when nothing is given: Geist + Geist Mono, Satoshi + JetBrains Mono, Cabinet Grotesk + Inter Tight. Serif only when the brief earns it (PP Editorial New, GT Sectra, Tiempos, Canela).
- Caps for a calm system: one family (two at most), 3 to 4 sizes, 2 to 3 weights. Making a design quieter: 900 becomes 600, 700 becomes 500.
- Hero headline size follows its word count: 3 to 5 words may go very large, 6+ words step down. A headline that wraps to 4 lines is a size bug, not a copy problem.
- Italic display type needs line-height of at least 1.1 and a little bottom padding, or descenders (g, j, p, q, y) get clipped.
- Display sizes beyond ~6rem, tracking past -0.04em and huge scale jumps belong to Experience pages only: see `experience.md`.

## Measure and leading

- Prose 45 to 75 characters per line, 65ch default: `max-width: 65ch`. Mobile 35 to 60.
- Body line-height 1.5 to 1.7; headings 1.05 to 1.25; big display 0.95 to 1.1.
- Longer lines need more leading; light text on dark needs about +0.05 line-height and a slightly heavier weight.
- Space above a heading larger than below it (about 2:1), so it belongs to what follows.
- Paragraph spacing OR first-line indent, never both.

## Details

- `text-wrap: balance` on headings and short titles; `text-wrap: pretty` on paragraphs and captions.
- Tracking: tighten large display (-0.01em to -0.04em, never tighter); open uppercase labels (+0.04em to +0.1em); leave body at 0.
- `font-variant-numeric: tabular-nums` for prices, tables, timers, counters, anything that updates.
- Italic with descenders in tight display leading: add a little bottom padding so descenders are not clipped.
- Real quotes and apostrophes (" " ' '), real ellipsis (…), non-breaking space between number and unit (10 kg, 5 €).
- No widows in headlines; no single word on the last line of a hero.
- Sentence case for UI labels and buttons. All caps only for short labels with extra tracking.
- `-webkit-font-smoothing: antialiased` on macOS for light-on-dark text.
- Theme the leftovers: `::selection`, caret color, focus ring, link underline offset (`text-underline-offset: 0.2em`).

## Loading

- Self-host or use the framework font loader (`next/font`, Fontsource). Avoid render-blocking third-party font CSS in production.
- `font-display: swap`, preload only the 1 to 2 files used above the fold, ship only weights you use, subset to needed scripts (Latin Extended for Lithuanian, Polish, etc.).
- Metric-matched fallback (`size-adjust`, or framework automatic fallback) to avoid layout shift.
- Use `rem`, respect browser zoom and user font settings, never `maximum-scale=1`.

## Stress test

Long headings, German/Finnish strings (+30% length), Lithuanian diacritics (ą č ę ė į š ų ū ž), narrow containers, missing weights, fallback font, 200% zoom.
