# Color

## Pick a strategy before picking colors

| Strategy | What it means | Use for |
|---|---|---|
| **Restrained** (default) | neutrals + one accent, accent under ~10% of the surface | Operate and Read surfaces, trust-first products |
| **Committed** | one saturated color owns 30 to 60% of the surface | brand landings, campaigns |
| **Full palette** | 3 to 4 named color roles | illustration-heavy, kids, data-rich marketing |
| **Drenched** | the surface is the color | launches, portfolios, single bold statements |

Commit at page scale: whole regions owned by a color read as intentional; small accents sprinkled everywhere read as noise.

## Build roles, not swatches

Define semantic tokens and use only those in components:

```css
:root {
  --bg: oklch(99% 0.003 250);        /* canvas */
  --surface: oklch(97.5% 0.004 250); /* raised areas, sidebars */
  --border: oklch(91% 0.006 250);
  --text: oklch(22% 0.01 250);       /* never pure #000 */
  --text-muted: oklch(48% 0.012 250);
  --accent: oklch(58% 0.17 255);     /* primary action only */
  --accent-contrast: oklch(99% 0 0);
  --focus: oklch(62% 0.19 255);
  --success: oklch(56% 0.13 150);
  --warning: oklch(72% 0.15 75);
  --danger: oklch(56% 0.19 25);
}
```

- Primitives (`blue-500`) feed semantic tokens (`--accent`); components never use raw hex.
- The accent color is reserved for the primary action, focus and selection. Do not spend it on decoration, or the primary action stops standing out (Von Restorff).
- One neutral family per project (do not mix warm and cool grays). Tint neutrals slightly toward the brand hue (chroma about 0.003 to 0.01) only when it adds cohesion.
- Avoid pure `#000` text and pure `#fff` for huge areas when a softer near-white or near-black works; keep pure white for cards on tinted canvases if that is the system.
- Never gray text on a colored background: derive the muted text from the background hue (darker/lighter shade of it) or use transparency of the foreground.

## OKLCH ramps

- Use OKLCH for generated scales: equal lightness steps look equal, unlike HSL.
- Ramp: vary L in steady steps (97, 93, 86, 76, 65, 56, 47, 38, 29, 21); reduce chroma near the extremes so tints and shades do not look neon or muddy.
- Gradients: interpolate in OKLCH (`linear-gradient(in oklch, a, b)`) to avoid gray midpoints.
- Pick hue from the brand and the visual world, not by category habit.

## Contrast (WCAG 2.2 AA)

| Element | Minimum |
|---|---|
| Body text | 4.5:1 |
| Large text (24px+, or 18.66px+ bold) | 3:1 |
| Icons, input borders, focus indicators, chart marks | 3:1 against neighbors |
| Placeholder text | still 4.5:1 if it carries information |
| Disabled controls | exempt, but must still look disabled, not invisible |

- Check every state (hover, pressed, selected), text over images (add a scrim or gradient overlay), and both themes.
- Color is never the only signal: pair with icon, text, shape or position. Avoid red/green-only distinctions (8% of men have a color vision deficiency).
- Semantic color stays semantic: red only for errors and destructive actions, green for success.

## Dark mode

- Design it, do not invert it. Decide dark or light from the use scene (dim room, long sessions, media), not from "tech products are dark".
- Elevation goes lighter, not shadowier: canvas `oklch(17% 0.01 250)`, surface 21%, raised 25%.
- Desaturate accents 10 to 20% and raise their lightness so they do not vibrate on dark.
- Text: primary around 93% L, muted around 70% L; avoid pure white body text on pure black.
- Borders as low-alpha white (`oklch(100% 0 0 / 0.08)`), shadows mostly disappear.
- Follow `prefers-color-scheme` by default, allow manual override, and set `color-scheme: dark` so native controls and scrollbars match.
- The brand color must stay recognizable in both themes.

## Banned habits

- Purple-to-blue "AI" gradients, rainbow mesh backgrounds, gradient text on headings.
- Neon outer glows as a way to show importance; use contrast, size or position.
- Oversaturated accents (chroma near the gamut edge on large areas).
- The reflex "premium" palette: warm cream + brass/terracotta + espresso text. Fine when the brief or subject truly calls for it, wrong as a default.
- Five accent colors competing in one view.

## Data visualization

- Categorical: up to 6 to 8 distinguishable hues with similar lightness; beyond that, group into "Other".
- Sequential: one hue, lightness ramp. Diverging: two hues meeting at a neutral midpoint.
- Marks 3:1 against the background, labels 4.5:1, gridlines faint.
- Encode with position and length first, color second; add direct labels instead of legends where possible.
