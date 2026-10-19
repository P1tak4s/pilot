# Motion

Motion is a functional layer: it shows cause and effect, keeps spatial continuity and gives
feedback. Decoration that does none of those is animation debt.

## Decide whether to animate at all

1. **Name the purpose** in one sentence: feedback, state change, spatial continuity, attention to one thing, or softening an abrupt appearance. "It looks nice" is not a purpose.
2. **Frequency gate**:
   - used hundreds of times a day (typing, list navigation, command palette, hover in dense tools): no animation or near instant;
   - used daily (menus, tabs, modals, toasts): subtle and fast, 150 to 250ms;
   - rare (onboarding, first success, launch page hero): may be expressive.
3. **Keyboard-initiated actions do not animate** (shortcuts, arrow navigation, Cmd+K open).
4. **Removal test**: turn it off. If users lose understanding, it is functional. If nothing is lost, delete it.
5. **Motion gaps** are bugs too: elements that pop in/out with conditional rendering, content that jumps when loading finishes, accordions that snap. Check every `cond && <X/>` and ternary swap.
6. Pick one motion personality per product and stick to it:

| Personality | Durations quick / standard / slow | Curve | Overshoot |
|---|---|---|---|
| Corporate / productivity (default for apps) | 150 / 200 / 300ms | `cubic-bezier(0.2, 0, 0, 1)` | 0 to 5% |
| Premium / calm | 200 / 350 / 500ms | `cubic-bezier(0.4, 0, 0.2, 1)` | 0 |
| Energetic / marketing | 120 / 220 / 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 0 to 10% |
| Playful / kids / games | 150 / 250 / 400ms | springs with bounce 0.2 to 0.35 | 10 to 20% |

## Durations

| Interaction | Duration |
|---|---|
| Hover in (color, background) | 100 to 150ms; hover out may be slightly slower (150 to 200ms) |
| Press feedback | 100 to 160ms |
| Toggle, checkbox, small icon swap | 150 to 200ms |
| Tooltip, small popover | 125 to 200ms |
| Dropdown, menu, select | 150 to 250ms |
| Toast in | 200 to 300ms |
| Modal, drawer, sheet | 200 to 400ms (drawer up to 500ms with an iOS-like curve) |
| Accordion / height change | 200 to 300ms |
| Page or route transition | 250 to 400ms |
| Marketing focal entrance | 500 to 800ms, one per page |
| Spinner rotation | 700 to 1000ms per turn, linear |

- Exits are faster than entrances: about 60 to 75% of the enter duration.
- Scale duration with travel distance. Take the table value as the 100px case and multiply: 50px x0.8, 200px x1.3, 300px x1.5, 400px x1.6, full screen x1.8 to 2.0.
- Page transition in a product: outgoing view fades and shifts away in ~300ms, incoming arrives in ~400ms with a 100ms delay, shared elements move ~400ms ease-in-out. Forward navigation travels left or up, back travels right or down.
- Product UI has no orchestrated page-load sequence: an app opens straight into the task. Load choreography belongs to Persuade and Experience pages.
- Mobile about 20% shorter than desktop. Feedback over 500ms feels laggy anywhere.

## Easing

- **Entering or reacting to the user**: strong ease-out. Default `cubic-bezier(0.23, 1, 0.32, 1)`; alternatives quart `(0.25, 1, 0.5, 1)`, quint `(0.22, 1, 0.36, 1)`, expo `(0.16, 1, 0.3, 1)`.
- **Moving something already on screen** (reorder, slide between positions): ease-in-out `cubic-bezier(0.77, 0, 0.175, 1)` or Material standard `(0.2, 0, 0, 1)`.
- **Leaving**: short ease-out or a quick ease-in (`cubic-bezier(0.3, 0, 1, 1)`) when it exits the screen entirely; keep it short either way so it never feels sluggish.
- **Drawers / sheets**: `cubic-bezier(0.32, 0.72, 0, 1)` around 400 to 500ms.
- **Linear** only for spinners, progress bars and continuous rotation.
- Built-in `ease` / `ease-in-out` are weak; use custom curves or springs.
- No bounce or elastic on utility UI (menus, dropdowns, toggles, settings, modals) and never on errors.
- More curves worth knowing: Material 3 emphasized `cubic-bezier(0.05, 0.7, 0.1, 1)` for important entrances, decelerate `(0, 0, 0, 1)`, playful back-out `(0.175, 0.885, 0.32, 1.275)` (playful contexts only). A bounce without JS: CSS `linear()` with generated stops.
- Overshoot budget by context: success 5 to 10%, feedback 2 to 5%, celebration 15 to 25%, errors and premium 0%. Past 25% it reads as broken.

### Springs

Use springs for anything interactive or interruptible (drag, gestures, layout changes, toggles that can be re-clicked). They keep velocity when interrupted; keyframes restart.

| Use | Setting (Motion / Framer) |
|---|---|
| Default UI | `{ type: "spring", duration: 0.4, bounce: 0 }` or stiffness 300 / damping 30 |
| Panels, cards, modals | stiffness 200 / damping 25, or duration 0.45 bounce 0 |
| Tooltips, popovers | stiffness 500 / damping 35 (fast, no overshoot) |
| Playful / celebration | duration 0.5, bounce 0.2 to 0.3 (stiffness 400 / damping 12) |
| Drag release | stiffness 200 / damping 20, keep velocity |

Keep bounce between 0 and 0.3; above that it looks broken.

Stiffness / damping feel, for tuning by hand: gentle 100 to 150 / 20 to 25, standard 250 to 350 / 18 to 24, bouncy 150 to 250 / 10 to 15. Damping ratio under 1 oscillates.

- Values that follow the pointer continuously (cursor followers, tilt, drag) use a spring-smoothed motion value (`useSpring`); discrete state changes use a spring transition. Never store pointer or scroll position in React state; use motion values (`useMotionValue`, `useTransform`) so nothing re-renders per frame.

## Patterns

- **Enter**: opacity 0 to 1 + translateY 8 to 16px to 0 (+ optional blur 4px to 0 for a softer premium feel). Exit smaller: translateY -4 to -8px, opacity 0.
- **Scale-in**: start at 0.95 to 0.98, never `scale(0)` (things do not grow from nothing).
- **Popover / dropdown**: scale 0.96 to 1 + opacity from the trigger (`transform-origin` = trigger side; Radix exposes `--radix-popover-content-transform-origin`). Modals stay centered.
- **Modal**: backdrop fades 150 to 200ms; panel scale 0.96 to 1 + opacity + translateY 8px, 200 to 300ms; content does not need its own stagger in product UI.
- **Toast**: slide in from its edge + fade, stack shifts with layout animation, dismiss toward the edge.
- **Press**: `transform: scale(0.97)` with `transition: transform 150ms var(--ease-out)`. By personality: corporate 0.97, premium 0.98 with a slight opacity dip, playful 0.95 with a small overshoot on release.
- **Hover is for pointers only**: wrap hover motion in `@media (hover: hover) and (pointer: fine)`, or touch screens keep a stuck hover after a tap.
- **Hover lift (cards)**: translateY -2px + a stronger shadow, 150 to 200ms. Animate the opacity of a pseudo-element that carries the bigger shadow, not `box-shadow` itself (it repaints). Image zoom 1.03 inside `overflow: hidden`. Do not put the same hover scale on every element in the view.
- **Icon swap** (copy to check): crossfade with scale 0.8 to 1 and blur 4px to 0, ~200ms.
- **Lists / stagger**: 30 to 80ms between items (lists 40 to 60ms, nav items 30 to 50ms), cap total under 500ms, only for lists that read as lists, once per view. Never block interaction during a stagger. Exits stagger in reverse or not at all.
- **Exit where you came in**: a toast that enters from the bottom leaves through the bottom; a drawer leaves through its own edge. Off-screen starts use the element's own size (`translateY(100%)`), not a pixel guess.
- **Delayed entrances** use `animation-fill-mode: backwards` (or `both`), or the element flashes at full opacity before its delay starts.
- **Crossfading two states** that overlap (label swap, icon morph): add `filter: blur(2px)` to the outgoing one for ~200ms to hide the seam. Keep blur off body text entrances; it slows reading. Use it for hero and modal moments only.
- **Reveals with clip-path**: image reveal `inset(0 0 100% 0)` to `inset(0)` around 600ms; an active-tab indicator can be a clipped copy of the tab list. Cheap and crisp.
- **Tooltips in a group**: the first one waits and animates; moving to a neighbour shows it instantly (no delay, 0ms transition).
- **Accordion / height**: animate `grid-template-rows: 0fr` to `1fr` (or `interpolate-size: allow-keywords` with `height: auto`) instead of height in px. Rotate the chevron in parallel.
- **Layout changes**: FLIP or the Motion `layout` prop for small, isolated shifts (one element, under ~300px of change, a handful of children); `layoutId` for shared-element morphs (card to detail), unique per mounted instance. Text inside a resizing container gets `layout="position"` so its reflow is not stretched. Avoid `layout` on huge subtrees.
- **AnimatePresence**: always set `mode`: `wait` for pages and modals, `popLayout` for lists, `sync` only for a deliberate overlap. Children need stable keys and an `exit`.
- **Page transitions**: View Transitions API (`document.startViewTransition`, cross-document `@view-transition { navigation: auto; }`) for navigation-level continuity, crossfade 200 to 300ms plus shared elements.
- **Skeletons**: shimmer sweep 1.2 to 2s linear with a 1.5 to 3s pause between sweeps, low contrast (base 6 to 10%, highlight +4 to 6% lightness), or a gentle opacity pulse. Swap to content with a short fade, no layout jump.
- **Numbers**: count up only for celebratory or summary numbers, 600 to 1000ms ease-out, tabular numerals, rounded values. Never animate numbers users scan repeatedly.
- **Scroll reveal**: once (`viewport: { once: true }`), small distance (16 to 24px), 400 to 600ms, triggered around 15 to 20% into view. Content must be visible without JavaScript. Do not reveal every section the same way.
- **Scroll-linked**: CSS `animation-timeline: view()` / `scroll()` (check `CSS.supports('animation-timeline', 'scroll()')`) with an IntersectionObserver fallback. Never `window.addEventListener('scroll')` driving styles. Prefer triggers that start a fixed-duration animation over scrubbing tied to scroll speed. Parallax under ~100px total (layer speeds fg 1.0, mid 0.5, bg 0.2), never on text, disabled on mobile and reduced motion.
- **Hold to confirm**: `clip-path: inset(0 100% 0 0)` to `inset(0 0 0 0)` over 1.5 to 2s linear while pressed; snap back in 200ms on release.
- **Drag to dismiss**: dismiss past ~120px of travel OR a flick faster than ~500px/s (velocity = distance / elapsed ms, ~0.11 px/ms), rubber-band (friction) past the bounds, use pointer capture, ignore extra touch points once a drag started.
- **Error shake**: 2 to 3 cycles of ±6 to 10px with decaying amplitude, 300 to 400ms, once. Pair with a text message.
- **Success**: check draws (stroke-dashoffset) 200 to 300ms after the container settles; milestone confetti under 1s and only for real milestones.

## Interruptibility

- Use CSS transitions or springs for anything users can re-trigger; `@keyframes` restart from zero and jank when spam-clicked.
- Entry without JS mount tricks: `@starting-style { opacity: 0; transform: translateY(8px); }`.
- Test by clicking rapidly and by reversing mid-animation; it should blend, not queue.
- A new state cancels the running micro-interaction and sets the final state explicitly. Never rely on `animationend` for correctness.
- Review in slow motion (DevTools animation panel at 10% or 25%) and the next day with fresh eyes.

## Performance

- Animate `transform` and `opacity` (compositor). `filter`, `clip-path` and `background-position` on small surfaces are fine. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`.
- Name properties: `transition: transform 200ms, opacity 200ms`; never `transition: all`.
- `will-change: transform` only right before and during an animation, on a handful of elements, never `will-change: all`.
- Blur: keep under ~8 to 12px, short, small areas; large or continuous `backdrop-filter` kills scrolling on mid-range phones.
- Never read layout (`getBoundingClientRect`, `offsetHeight`) and write styles in the same frame repeatedly; batch reads, then writes.
- Pause loops and canvases when off-screen (IntersectionObserver) or the tab is hidden (`visibilitychange`).
- For drag, set `element.style.transform` directly instead of updating CSS variables on a parent every frame.
- Budget: 60fps (16.7ms per frame), fewer than ~20 moving elements per viewport, 1 to 2 animated properties per element on mobile. Below ~50fps, simplify.
- Responsiveness beats smoothness: a smooth animation that delays input is worse than none.
- `will-change` on 0 to 3 elements is safe, 4 to 10 needs testing on a low-end phone, more means rethink; only for transform, opacity, filter, clip-path, mask.
- Paint-heavy properties (`box-shadow`, `filter`, `border-radius`) animate on 1 to 3 elements at most. Gradients: animate `background-position` or an overlay's opacity, never the color stops.
- Low-end devices (`navigator.deviceMemory <= 2`, else `hardwareConcurrency <= 4`): drop optional motion or shorten it to ~200ms.
- SSR (Next.js and similar): the first client render must match the server, so no `opacity: 0` baked into server HTML that waits for JS; touch `window`/`navigator` only after mount.

### Choosing a tool

| Need | Tool |
|---|---|
| Hover, press, simple enter/exit, toggles | CSS transitions, `@starting-style` |
| Repeating/predetermined sequences | CSS `@keyframes` or WAAPI (`el.animate`) |
| React enter/exit, layout, gestures, springs | Motion (`motion/react`) |
| Timeline choreography, pinning, scrubbing, SVG morphing | GSAP + ScrollTrigger |
| Route changes | View Transitions API |
| Vector illustrations, icons with character | Lottie / Rive |

One library per project; do not mix Motion and GSAP on the same elements, and do not mix `framer-motion` with `motion` imports.

## Reduced motion

`prefers-reduced-motion: reduce` means fewer and gentler, not zero:

- Remove: translation, scaling, parallax, zoom, auto-playing loops, scroll-jacking, large slides, spinning large elements. Smooth-scroll libraries do not start at all.
- Do not ship a global `* { animation-duration: 0.01ms !important }` kill switch as the whole answer: it also removes feedback people rely on. Replace motion, do not delete meaning.
- Keep: opacity crossfades (150 to 200ms), color changes, focus rings, progress indicators.
- Every animation ships with its reduced path in the same change.

```css
@media (prefers-reduced-motion: reduce) {
  .enter { transform: none; transition: opacity 150ms ease-out; }
  .parallax, .marquee { animation: none; }
}
```

```js
const reduce = useReducedMotion(); // motion/react
<motion.div initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} />
```

- Anything that loops or lasts over 5 seconds needs a pause control (WCAG 2.2.2).
- Nothing flashes more than 3 times per second.
- Never put critical information only in motion; all tasks must work with animation off.
- Native: iOS Reduce Motion becomes crossfades; Android "Remove animations" becomes instant or crossfade.

## Motion anti-patterns

- Same fade-up on every section; staggering two lists in one view. Thresholds that flag slop: the same hover scale on 3+ component types, 2+ staggered lists in one view, 4+ identical entrances.
- Motion on headings, body copy or nav by default.
- A motion dial above 4 in the brief but a page that visibly never moves: either ship a hero entrance, one reveal and real hover states, or lower the dial.
- Pulsing/breathing dots and glowing CTAs with no state to communicate.
- Bouncy springs on menus, toggles or modals; elastic easing on errors.
- `scale(0)` entrances; popovers growing from their center.
- Exit as long and dramatic as the entrance.
- Linear easing on movement; default `ease` everywhere.
- Animating layout properties; `transition: all`.
- Scroll listeners driving animations; `whileInView` that replays every time.
- Motion on keyboard shortcuts and other high-frequency actions.
- A custom cursor, magnetic buttons and parallax on a productivity tool.
- Shipping without a reduced-motion path.
