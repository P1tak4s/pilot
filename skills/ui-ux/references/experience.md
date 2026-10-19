# Experience pages: award-level sites

For portfolios, studios, launches and brand pieces where the site itself is the work (the Awwwards
Site of the Day bar). Product UI rules still apply to anything people operate; this file overrides
durations, type scale and layout rhythm for the showcase parts only.

## Concept before code

- Write three concepts, pick one, and keep a one-paragraph concept card: the idea, the single driver
  (what changes as you scroll), palette, type pair, motion language. Everything on the page serves it.
- A concept usually has one **driver**: a single value (scroll progress or the current chapter) that
  moves the WebGL scene, the DOM transforms and a page-wide ink class together. A page may pin it.
- Decide the idle state on purpose: either a slow drift at rest (1 to 3%, lagged pointer, paused
  off-screen, zero under reduced motion) or a still page as a written decision.
- The first frame after the loader is the best frame of the site. Pick initial states for contrast.

## Stack and the one-clock rule

- Next.js by default, Astro for mostly static showcases, or the project's own stack. GSAP +
  ScrollTrigger for timelines, Lenis for smooth scroll, a light WebGL layer (OGL or three) only when
  the concept needs it.
- One clock: smooth scroll, ScrollTrigger, WebGL and idle loops all tick from `gsap.ticker`. No scroll
  listeners, no private rAF loops.
- Lenis around `lerp: 0.1`, `touchMultiplier: 1.2`, anchors on. It never starts under reduced motion.

## Loader and transitions

- The loader tracks real work (fonts and critical images), shows for at least ~1.1s and at most ~2.6s,
  and is hidden, not removed. Its last frame is the hero's first frame; a counter can live on as UI.
- Page transitions: a clip-path iris from the click point (`circle(0)` to `circle(150%)`, ~0.9s
  `expo.inOut` each way), with the leave animation running in parallel with the fetch.
- Shared-element transition: clone the clicked thumbnail and grow it to the case hero's rect (~1s);
  the hero must start at exactly that rect.

## Motion at experience scale

- Durations are longer than product UI: line reveals 1.0 to 1.3s (stagger 60 to 100ms), image reveals
  1.2 to 1.6s, curtains 0.8 to 1.1s, scrubs smoothed 0.5 to 1s. Split text: lines ~1.2s, words ~1.1s,
  characters ~0.9s, and the text stays real DOM.
- Easing set: `expo.out` for entrances, `power3.out` for small UI, `expo.inOut` for curtains and
  transitions, `back.out(1.6)` rarely. Register custom curves once.
- One hover treatment per role: primary CTA fills from the pointer side (circle clip-path 0 to 150%,
  ~0.6s in, ~0.5s out; keyboard focus and touch press get the same fill), project links reveal media,
  nav links roll letters (±105% translate, ~0.5s, ~20ms per letter) or draw an underline (0 to 100%
  over ~0.45s), inline links stay underlined at rest, arrows nudge 4 to 6px.
- Pinned scenes: `start: 'top top'`, `pin: true`, `invalidateOnRefresh: true`, ends like `+=250%` with
  `scrub: 1`. A sticky stage (section ~190svh, stage `position: sticky` 100svh; ~150svh on phones) is
  cheaper than a pin and preferred.

## Type and layout

- Display type may go past product limits: `clamp(4rem, 1.2rem + 14vw, 16rem)`, caps at line-height
  0.82 to 0.95, tracking to about -0.045em at mega sizes, a small negative optical margin on the first
  letter. Size big words by their container (`cqi`) and keep them on one line on mobile
  (`white-space: nowrap`); a 4-letter word at 26vw breaks mid-word otherwise.
- The scale jumps (mega to body) instead of following a 1.25 ratio.
- 12-column grid with 2 to 3 strong vertical lines; 3 to 4 vertical spacing moods (tight, normal,
  generous, full viewport).
- Section families, each at most once per page: poster, index list, asymmetric pair, gallery wall,
  filmstrip, sticky narrative, statement, data, full-bleed, footer finale.
- When the background changes, a page-wide ink variable flips all text with it. Check the end state
  of every page, including the 404.

## WebGL

- One shared canvas, device pixel ratio capped at 2, `antialias: false`, plane segments 32 or fewer,
  noise at 5 octaves or fewer, images up to ~2000px. Keep the real `<img>` in the DOM for SEO and LCP.
  Pause when the tab is hidden or the canvas is off-screen.
- Every GL section has a designed static fallback (no WebGL, reduced motion); text over GL sits on a
  DOM scrim.

## Content and pages

- Required: home, at least one inner page type, a designed 404, and a case page per project (title,
  meta, hero, context, idea, craft in 3 to 5 captioned frames, outcome, next project).
- Every invented item is flagged as a placeholder. Never invent awards, metrics or logos. Use
  procedural covers or real photo contact sheets instead of fake screenshots built from divs; credit
  photographers in a colophon.
- Decorative copies of text live outside headings with `aria-hidden` (a shadow inside `<h1>` reads
  the name twice). The native cursor stays visible; a follower only adds to it.

## Budgets and judging

- Mobile LCP under 2.5s, CLS under 0.05, INP under 200ms, JS under ~300KB gzipped, page under ~3MB,
  at most 4 font files with 2 preloaded.
- Fail the build on: missing lang, title, description or viewport, more or less than one h1, no main,
  missing alt or accessible names, clickable divs, leftover placeholder text.
- Ship with an OG image (1200x630), SVG favicon plus 32px PNG and 180px apple-touch icon, JSON-LD,
  sitemap and robots. Deploy only after the person confirms.
- Judge like the jury: Design 40, Usability 30, Creativity 20, Content 10. Every score starts at 6 and
  moves only with cited evidence. Use a fresh critic each pass that has not seen the design doc, and
  end each pass by removing one accessory.
