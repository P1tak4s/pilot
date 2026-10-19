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
- Bigger distance and bigger elements need slightly more time; a 20px badge and a full-screen panel must not share one duration.
- Mobile about 20% shorter than desktop. Feedback over 500ms feels laggy anywhere.

## Easing

- **Entering or reacting to the user**: strong ease-out. Default `cubic-bezier(0.23, 1, 0.32, 1)`; alternatives quart `(0.25, 1, 0.5, 1)`, quint `(0.22, 1, 0.36, 1)`, expo `(0.16, 1, 0.3, 1)`.
- **Moving something already on screen** (reorder, slide between positions): ease-in-out `cubic-bezier(0.77, 0, 0.175, 1)` or Material standard `(0.2, 0, 0, 1)`.
- **Leaving**: short ease-out or a quick ease-in (`cubic-bezier(0.3, 0, 1, 1)`) when it exits the screen entirely; keep it short either way so it never feels sluggish.
- **Drawers / sheets**: `cubic-bezier(0.32, 0.72, 0, 1)` around 400 to 500ms.
- **Linear** only for spinners, progress bars and continuous rotation.
- Built-in `ease` / `ease-in-out` are weak; use custom curves or springs.
- No bounce or elastic on utility UI (menus, dropdowns, toggles, settings, modals) and never on errors.

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

## Patterns

- **Enter**: opacity 0 to 1 + translateY 8 to 16px to 0 (+ optional blur 4px to 0 for a softer premium feel). Exit smaller: translateY -4 to -8px, opacity 0.
- **Scale-in**: start at 0.95 to 0.98, never `scale(0)` (things do not grow from nothing).
- **Popover / dropdown**: scale 0.96 to 1 + opacity from the trigger (`transform-origin` = trigger side; Radix exposes `--radix-popover-content-transform-origin`). Modals stay centered.
- **Modal**: backdrop fades 150 to 200ms; panel scale 0.96 to 1 + opacity + translateY 8px, 200 to 300ms; content does not need its own stagger in product UI.
- **Toast**: slide in from its edge + fade, stack shifts with layout animation, dismiss toward the edge.
- **Press**: `transform: scale(0.97)` with `transition: transform 150ms var(--ease-out)`.
- **Hover lift (cards)**: translateY -2px + shadow change 150 to 200ms. Image zoom 1.03 inside `overflow: hidden`. Do not put the same hover scale on every element in the view.
- **Icon swap** (copy to check): crossfade with scale 0.8 to 1 and blur 4px to 0, ~200ms.
- **Lists / stagger**: 30 to 80ms between items, cap total under 500ms, only for lists that read as lists, once per view. Never block interaction during a stagger.
- **Accordion / height**: animate `grid-template-rows: 0fr` to `1fr` (or `interpolate-size: allow-keywords` with `height: auto`) instead of height in px. Rotate the chevron in parallel.
- **Layout changes**: FLIP or the Motion `layout` prop for small, isolated shifts; `layoutId` for shared-element morphs (card to detail). Avoid `layout` on huge subtrees.
- **Page transitions**: View Transitions API (`document.startViewTransition`, cross-document `@view-transition { navigation: auto; }`) for navigation-level continuity, crossfade 200 to 300ms plus shared elements.
- **Skeletons**: shimmer sweep 1.2 to 2s linear, low contrast (base 6 to 10%, highlight +4 to 6% lightness), or a gentle opacity pulse. Swap to content with a short fade, no layout jump.
- **Numbers**: count up only for celebratory or summary numbers, 600 to 1000ms ease-out, tabular numerals, rounded values. Never animate numbers users scan repeatedly.
- **Scroll reveal**: once (`viewport: { once: true }`), small distance (16 to 24px), 400 to 600ms, triggered around 15 to 20% into view. Content must be visible without JavaScript. Do not reveal every section the same way.
- **Scroll-linked**: CSS `animation-timeline: view()` / `scroll()` with an IntersectionObserver fallback. Never `window.addEventListener('scroll')` driving styles. Parallax under ~100px total, never on text, disabled on mobile and reduced motion.
- **Hold to confirm**: `clip-path: inset(0 100% 0 0)` to `inset(0 0 0 0)` over 1.5 to 2s linear while pressed; snap back in 200ms on release.
- **Drag to dismiss**: dismiss on distance OR velocity (a fast flick), rubber-band past the bounds, use pointer capture.
- **Error shake**: 3 cycles of ±6 to 10px, 300 to 400ms, once. Pair with a text message.
- **Success**: check draws (stroke-dashoffset) 200 to 300ms after the container settles; milestone confetti under 1s and only for real milestones.

## Interruptibility

- Use CSS transitions or springs for anything users can re-trigger; `@keyframes` restart from zero and jank when spam-clicked.
- Entry without JS mount tricks: `@starting-style { opacity: 0; transform: translateY(8px); }`.
- Test by clicking rapidly and by reversing mid-animation; it should blend, not queue.
- Review in slow motion (DevTools animation panel at 10% or 25%) and the next day with fresh eyes.

## Performance

- Animate `transform` and `opacity` (compositor). `filter`, `clip-path` and `background-position` on small surfaces are fine. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`.
- Name properties: `transition: transform 200ms, opacity 200ms`; never `transition: all`.
- `will-change: transform` only right before and during an animation, on a handful of elements, never `will-change: all`.
- Blur: keep under ~8 to 12px, short, small areas; large or continuous `backdrop-filter` kills scrolling on mid-range phones.
- Never read layout (`getBoundingClientRect`, `offsetHeight`) and write styles in the same frame repeatedly; batch reads, then writes.
- Pause loops and canvases when off-screen (IntersectionObserver) or the tab is hidden (`visibilitychange`).
- For drag, set `element.style.transform` directly instead of updating CSS variables on a parent every frame.
- Budget: 60fps (16.7ms per frame), fewer than ~20 moving elements per viewport, 1 to 2 animated properties per element on mobile.

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

- Remove: translation, scaling, parallax, zoom, auto-playing loops, scroll-jacking, large slides, spinning large elements.
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

- Same fade-up on every section; staggering two lists in one view.
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
