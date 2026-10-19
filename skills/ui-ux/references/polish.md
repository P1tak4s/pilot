# Polish: the details that make UI feel expensive

## Geometry

- **Concentric radius**: inner radius = outer radius minus padding. A 16px card with 8px padding holds 8px-radius children. Mismatched radii are the most visible amateur tell.
- **One radius system per product**: sharp (0 to 4px), soft (8 to 16px) or pill. Documented exceptions only (pill buttons on a soft-card system is a valid choice when written down).
- **Optical alignment**: nudge asymmetric icons (play triangle, arrows, chevrons) 1 to 2px toward their visual center; icon-leading buttons get slightly less padding on the icon side.
- **Hit areas** larger than visuals: a 20px icon button gets a 40 to 44px hit area via padding or `::before { inset: -10px }` without overlapping neighbors.

## Depth

- Shadows: layered, soft and tinted to the background hue; never a single hard black shadow on light UI.
  ```css
  --shadow-sm: 0 1px 2px oklch(20% 0.02 250 / 0.06), 0 1px 1px oklch(20% 0.02 250 / 0.04);
  --shadow-md: 0 4px 12px -2px oklch(20% 0.02 250 / 0.08), 0 2px 4px -2px oklch(20% 0.02 250 / 0.06);
  --shadow-lg: 0 16px 40px -12px oklch(20% 0.02 250 / 0.16);
  ```
- A ring shadow `0 0 0 1px oklch(0% 0 0 / 0.06)` instead of a border works on varied backgrounds.
- Elevation means something: flat for content, sm for cards, md for dropdowns, lg for modals.
- Images get a 1px inner outline (`outline: 1px solid oklch(0% 0 0 / 0.08); outline-offset: -1px`, white at 0.1 alpha in dark mode) so they do not bleed into the background.
- Glass (backdrop blur) only on layers that float over content (sticky header, sheet), with a 1px light inner border and a solid fallback for `prefers-reduced-transparency`. Not on every card.
- Grain/noise textures: fixed, `pointer-events: none`, 3 to 5% opacity, never on scrolling containers.

## Type and numbers

- Tabular numerals on anything that changes or aligns.
- `text-wrap: balance` on headings, `pretty` on paragraphs.
- Real punctuation (curly quotes, ellipsis, ×, non-breaking spaces before units).
- Long words and URLs: `overflow-wrap: anywhere` in user-generated content.

## Icons

- One icon family, one stroke width (1.5 or 2), one size scale (16 / 20 / 24). Good families: Lucide, Phosphor, Tabler, Radix Icons, Heroicons, SF Symbols / Material Symbols natively.
- Icons sit on the text baseline and match text color; size about 1.25x the cap height of adjacent text.
- No emoji as UI icons; no hand-drawn SVG paths when a library icon exists.
- Icon-only buttons only for universally known actions (close, search, menu, more); everything else gets a label.

## Images and illustration

- Real images beat decoration: product screenshots, real photos, custom illustration in one style.
- Never fake product UI with divs in a marketing hero; use a real screenshot or a real interactive component.
- `aspect-ratio` and `width`/`height` on every image to prevent layout shift; `loading="lazy"` below the fold, `fetchpriority="high"` on the hero image; AVIF/WebP with responsive `srcset`.
- Text over photos needs a scrim or gradient for 4.5:1 contrast.
- Avatars: real initials on a tinted background when no photo; not a generic gray silhouette.
- Logos: official SVGs (Simple Icons for common brands), all in one treatment (monochrome or original), sized by optical weight, not equal width.

## Interaction details

- Name transitioned properties; never `transition: all`.
- Disable text selection only on draggable handles, never on content.
- `cursor: pointer` on clickable non-link elements; `cursor: grab/grabbing` on draggables.
- Scroll containers: `overscroll-behavior: contain` in modals and sheets; `scrollbar-gutter: stable` to prevent layout jumps.
- Sticky headers shrink or gain a border only after scrolling begins.
- Preserve scroll position and form state on back navigation.
- Instant feedback on every click (state change within 100ms), even if the result takes longer.
- Optimistic updates for likes, toggles, reorder; roll back with a message on failure.
- Keyboard: Tab order follows visual order, Escape closes the top layer, Enter submits forms, `/` or Cmd+K for search in tools.
- `::selection` in the brand color, `accent-color` on native checkboxes and radios, `caret-color` matching the accent.
- Favicon, page `<title>` per route, `theme-color` meta for mobile browser chrome.

## Final polish pass

1. Replace every hard-coded value with a token.
2. Check concentric radii and alignment to one left edge.
3. Squint test and 2-second test (can you tell what the page is and the main action?).
4. Remove one element that does not earn its place.
5. Check all states with real, ugly data.
