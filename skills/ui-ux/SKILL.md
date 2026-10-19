---
name: ui-ux
description: One complete UI/UX and motion design skill for any interface work. Use it to design, build, redesign, polish or review web and mobile UI (landing pages, SaaS apps, dashboards, forms, onboarding, e-commerce, portfolios, native iOS/Android screens). Covers design direction, typography, color, layout, components and states, UX copy, motion and animation (durations, easing, springs, reduced motion, performance), UX laws (Jakob, Hick, Fitts, Doherty, Gestalt, Tesler, Postel, Peak-End), accessibility numbers, AI-slop tells to avoid, and a scored review method. Also covers award-level experience sites (scroll storytelling, GSAP, Lenis, WebGL, page transitions). Replaces separate taste, impeccable, ui-ux-pro-max, motion and awwwards skills.
---

# UI/UX

One skill for the whole job: decide the direction, build to a quality floor, add motion
with a purpose, then verify. This file is the operating manual. Detailed rules live in
`references/`; load only the file the current step needs.

| Need | Load |
|---|---|
| Pick a direction, product-type presets, redesign rules | `references/direction.md` |
| 67 ready visual styles (brutalism, bento, editorial, retro, glass, riso...) as starting points | `references/styles-catalog.md` |
| Fonts, scale, line length, numerals | `references/typography.md` |
| Palette strategy, OKLCH, contrast, dark mode | `references/color.md` |
| Spacing, grids, responsive, mobile/native, safe areas | `references/layout.md` |
| States, forms, nav, modals, tables, empty/loading/error, UX copy | `references/components.md` |
| Animation: when, durations, easing, springs, patterns, perf, a11y | `references/motion.md` |
| Award-level portfolio, studio or launch sites: concept, GSAP/Lenis/WebGL, loaders, transitions, display type | `references/experience.md` |
| Micro-details that make UI feel expensive, icons, images, depth | `references/polish.md` |
| What makes UI look machine-made, and what to do instead | `references/anti-slop.md` |
| UX laws, Nielsen heuristics, Norman principles | `references/laws.md` |
| Scored critique, personas, hardening, pre-ship checklist | `references/review.md` |

## Five rules that override everything else

1. **The brief wins.** A font, palette, era or reference the user names is followed exactly, even if this skill would choose differently. Taste is for the gaps the brief leaves open.
2. **Refinement keeps, redesign replaces.** Refinement preserves identity, copy, IA, URLs, form field names and analytics IDs. Redesign changes the visual world but never the product truth. Never polish the look you were asked to replace.
3. **Match the codebase.** Existing tokens, components, icon set, motion library and conventions come first. Do not add a second design system, icon family or animation library.
4. **Every element has a job.** If you cannot say in one sentence why a section, color, effect or animation exists, remove it.
5. **Never invent product truth.** Prices, customers, metrics, testimonials, logos and capabilities are real or clearly marked placeholders. Demo data may be synthetic but must look realistic and be labeled.

## Workflow

### 1. Read before you design
- Read the existing design doc / tokens / theme file / one representative screen.
- Name the **surface mode**, because it decides almost every later choice:
  - **Persuade** (landing, pricing, campaign): visitor must understand and act within seconds.
  - **Operate** (app, dashboard, settings, admin): speed, scanability, density, zero surprise.
  - **Read** (docs, blog, changelog): comprehension and wayfinding.
  - **Experience** (portfolio, launch, brand piece): the work itself leads.
- Ask at most one round of 1 to 3 questions, only for things that genuinely change the result (audience, the one job of the page, what must not change). Otherwise state your assumptions and go.

### 2. Commit to a direction (new surfaces and redesigns)
Write a five-line contract before code, and keep it as a comment in the main file:
```
THESIS:   what the product does, in one sentence, and what the first screen must prove
AUDIENCE: who, where, under what light/device/stress
WORLD:    the visual world drawn from the subject's own materials (not the category default)
SIGNATURE: the ONE bold move; everything else stays quiet
SYSTEM:   type pair, color strategy + accent, radius system, spacing base, motion personality
```
Details and per-product presets: `references/direction.md`.

### 3. Build to the floor (never announced, always shipped)
- Semantic HTML, visible focus ring on every interactive element, keyboard reachable, labels on inputs, `aria-label` on icon buttons.
- Text contrast 4.5:1 (large text and UI parts 3:1), body text 16px+, touch targets 44px+ (24px absolute minimum with spacing).
- All states exist: default, hover, focus-visible, active, disabled, loading, empty, error, success.
- Responsive from 360px to 1440px+, no horizontal scroll, `min-h-dvh` not `100vh`, safe-area insets on mobile.
- Spacing, type, color, radius and shadow come from tokens. No magic numbers.
- Motion: transform and opacity only, ~150 to 300ms in product UI, reduced-motion path written in the same commit.
- Real content shapes: long names, empty lists, 1,000 rows, slow network, errors.

### 4. Verify in a bounded loop
- Look at the result at mobile (375px) and desktop (1440px) widths, in light and dark if both exist. Screenshot when tools allow; otherwise read computed values.
- Run the pre-ship checklist (`references/review.md`). Fix the batch, check once more, stop. Two rounds is the ceiling; endless polishing is a smell.
- For reviews of existing UI, score with the method in `references/review.md` and report `severity | where | problem | fix`, most severe first.

## Numbers to know by heart

| Topic | Value |
|---|---|
| Body text | 16px web minimum (prevents iOS input zoom), 17pt iOS, 14-16sp Android |
| Line length | 45 to 75 characters (65ch is a good default); data tables may run wider |
| Line height | body 1.5 to 1.7, headings 1.05 to 1.25 |
| Type scale | 1.125 to 1.2 ratio for product UI, 1.25 to 1.333 for marketing |
| Spacing | 4px base; steps 4, 8, 12, 16, 24, 32, 48, 64, 96 |
| Grouping | inside a group 4 to 12px, between groups 24 to 48px, between sections 64 to 160px |
| Contrast | 4.5:1 text, 3:1 large text (24px or 18.66px bold), icons, borders of inputs, focus rings |
| Touch target | 44x44pt iOS, 48x48dp Android, 8px between targets |
| Response | 100ms feels instant, 400ms keeps flow (Doherty), 1s needs indicator, 10s needs progress + cancel |
| Motion | micro 100-150ms, UI 150-300ms, overlays 200-400ms, focal marketing moments up to 800ms |
| Easing | enter `cubic-bezier(0.23, 1, 0.32, 1)`, move `cubic-bezier(0.77, 0, 0.175, 1)`, never linear for movement |
| Press | `scale(0.97)` on `:active`, 100 to 160ms |
| Stagger | 30 to 80ms per item, whole sequence under 500ms |
| Choices | 3 to 4 plans, one primary action per view, 5 or fewer top-level nav items on mobile |
| Web vitals | LCP < 2.5s, INP < 200ms, CLS < 0.1 |

## Ten tells that make UI look AI-made (full list: `references/anti-slop.md`)

1. Purple/blue gradient hero, gradient text, glowing orbs, neon outer glows.
2. Three identical icon + title + text feature cards in a row as the page structure.
3. Centered hero over a dark gradient with no real visual, plus a "trusted by" logo row inside it.
4. Inter or another default sans as the display face on a brand page; or the reflex "cream background + high-contrast serif + terracotta" look.
5. Eyebrow labels and "01 / 02 / 03" numbers above every section.
6. Emoji or random glyphs as icons; mixed icon families.
7. Fake dashboards built from divs, fake-precise numbers (99.97%, 4.1x) and "John Doe" testimonials.
8. Cards inside cards, colored left-border callouts, everything in a soft-shadowed rounded box.
9. Every section fades up on scroll the same way; pulsing dots; bouncy springs on menus.
10. Filler copy: "Elevate", "Seamless", "Unleash", "Next-gen", "Revolutionize".

## Output contract

- When you build: ship working code first, then at most 5 lines on the direction chosen and anything the user must decide.
- When you review: findings table (`P0-P3 | location | law/rule | fix with exact values`), then a one-line verdict. No essay.
- Never use em dashes in UI copy; prefer periods, commas or colons.
