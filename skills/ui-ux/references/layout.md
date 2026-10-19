# Layout, spacing and responsive

## Spatial thesis first

Before moving boxes, name: the primary reading path, what groups together, what must separate,
which element leads, and the intended density. Diagnose structure before decorating.

## Spacing

- One scale on a 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160. Semantic names (`--space-xs` .. `--space-3xl`) in tokens.
- Proximity (Gestalt): space inside a group is clearly smaller than space between groups. Label to input 4 to 8px, field to field 16 to 24px, group to group 32 to 48px, section to section 64 to 160px.
- Rhythm: alternate tight and generous. Equal spacing everywhere flattens hierarchy.
- Separate with space first, then a 1px divider, and only then a container. Cards are for things that are actually objects (a product, a project, a message).
- Never cards inside cards. If you need nesting, the inner level uses spacing and dividers.
- Use `gap` for siblings instead of margins on children.
- Squint test: blur your eyes; the primary element, secondary element and the main groups must still be visible in that order.

## Grid and structure

- Flexbox for one-dimensional rows, Grid for two-dimensional page structure.
- Container: `max-width: 72rem to 80rem` with side padding `clamp(1rem, 4vw, 3rem)`; text columns `max-width: 65ch`.
- Auto-fit grids without breakpoints: `grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))`.
- Left alignment reads designed; center everything only for short, symmetrical moments (a final CTA, an empty state).
- One left edge per column. Align to a grid; random offsets look accidental, deliberate offsets need to be big enough to read as intent.
- Bento grids: cell count equals content count, no empty cells, 3 to 6 cells with real visual variety, spans that interlock (`grid-auto-flow: dense`).
- Z-index from a scale: base 0, dropdown 10, sticky 20, overlay 30, modal 40, toast 50, tooltip 60. No `z-[9999]`.
- Overflow: `min-width: 0` on flex/grid children that contain text; single-line truncation with ellipsis; multi-line with `line-clamp: 3`.
- Dropdowns inside `overflow: hidden` ancestors get clipped: use the Popover API, `<dialog>`, a portal or `position: fixed`.

## Density by surface

- Persuade: generous, sections 96 to 160px apart on desktop, 64 to 96px on mobile.
- Operate: compact but breathable; table rows 40 to 48px, form fields 40 to 44px tall, sidebar 240 to 280px.
- Power-user data tools may go dense (32px rows) if they offer a density toggle.
- Use a second neutral layer (slightly darker or tinted) for sidebars and toolbars instead of borders everywhere.

## Responsive

- Mobile-first CSS: base styles for small screens, add `min-width` queries.
- Breakpoints where the content breaks; common anchors 640, 768, 1024, 1280px. Test at 360, 375, 768, 1024, 1440 and one ultra-wide.
- Responsive means restructure, not shrink: reorder by importance, collapse secondary content, turn tables into stacked cards, turn sidebars into drawers or bottom sheets.
- Container queries for components that live in different widths (`@container`).
- Fluid values with `clamp()` reduce breakpoint count.
- Full-height sections: `min-height: 100dvh`, never `100vh` (mobile browser bars).
- No horizontal scroll at 320px. Check landscape on phones.
- Detect input, not device: `@media (hover: hover) and (pointer: fine)` for hover effects, `(pointer: coarse)` for larger targets. Nothing important may depend on hover.
- Fixed headers/footers reserve space so content is not hidden behind them.
- Cap content on huge screens; a 2560px-wide paragraph is unreadable.

## Mobile and touch

- Primary actions in the thumb zone (bottom third), especially on long forms and checkout: sticky bottom bar with the main CTA.
- Touch targets 44x44pt / 48x48dp even if the visible icon is 20px; extend hit areas with padding or a pseudo-element.
- Bottom navigation: 3 to 5 items with icon + label, current item clearly marked.
- Safe areas: `viewport-fit=cover` in the viewport meta and `padding: max(1rem, env(safe-area-inset-bottom))` for bars at the edges.
- Inputs 16px font minimum to avoid iOS zoom; correct `type`, `inputmode` and `autocomplete` so the right keyboard appears.
- Avoid horizontal swipe for primary content (conflicts with system back gestures).

## Specific layouts

- **Dashboard**: one key question per screen; KPI row with 3 to 5 numbers that drive decisions; charts below; tables last. Filters persistent and visible.
- **Settings**: grouped sections with titles, left labels and right controls on desktop, stacked on mobile; save per section or autosave with feedback.
- **Forms**: single column; related short fields (city + postcode) may share a row.
- **Email**: 600px single column, table-based, inline CSS, dark-mode-safe images, live text instead of images of text.
