# Review, scoring and pre-ship checks

## How to run a review

1. **Specificity first**: could an unrelated product use this layout, copy and palette unchanged? Answer before checking details.
2. **Walk 2 to 3 personas** relevant to the surface and note the exact elements that fail them:
   - impatient power user (keyboard, speed, bulk actions);
   - confused first-timer (jargon, missing guidance, unclear next step);
   - screen-reader and keyboard-only user (labels, focus order, announcements);
   - distracted one-handed mobile user (thumb reach, target size, interruptions);
   - stress tester (long names, 1,000 rows, slow network, double clicks).
3. **Score** (below).
4. **Report** as a table, most severe first:

| Sev | Where | Problem | Rule | Fix (exact values) |
|---|---|---|---|---|
| P1 | Checkout, "Pay" button | 32px tall, beside "Cancel" with 4px gap | Fitts, touch target | 48px height, 16px gap, Cancel as text link |

Severity: **P0** blocks a task or loses data; **P1** major, users would contact support; **P2** minor, workaround exists; **P3** polish.

For motion-specific reviews use `Before | After | Why` rows with exact durations and curves.

## Scores

**Nielsen heuristics** (see `laws.md`): 0 to 4 each, total out of 40. 36+ excellent, 28 to 35 good, 20 to 27 acceptable, 12 to 19 poor, under 12 critical. Mark n/a where a heuristic cannot apply and rescale.

**Technical audit**, 0 to 4 each, total out of 20: accessibility, performance, theming (tokens, dark mode), responsive, implementation integrity (states, no hard-coded values). 18+ excellent, 14 to 17 good, 10 to 13 acceptable, under 10 poor.

**Cognitive load**: count failures of single focus, chunking (4 or fewer per group), grouping, hierarchy, one decision at a time, 4 or fewer visible choices at a decision point, no memory across screens, progressive disclosure. 0 to 1 low, 2 to 3 moderate, 4+ high.

## Review discipline

- Judge the design yourself before running any detector or linter, so tool output does not anchor the verdict.
- Severity tie-breaker: would a user contact support about this? Then it is at least P1.
- Personas by surface: landing (first-timer, skeptic, mobile user), dashboard (power user, analyst), e-commerce (mobile user, skeptic, first-timer), onboarding (first-timer, mobile user), forms and wizards (first-timer, analyst, mobile user). Pass marks: the power user finishes the core task in under 60s; the first-timer knows the first action within 5s; the mobile user has primary actions in thumb reach with 44pt targets on a slow connection.
- Screenshots count only when valid: let entrance motion settle, capture from the top, open each file and reject blank, black or wrong-section shots. Native screens come from the simulator or emulator, also in dark mode and at large text (iOS Dynamic Type, Android font scale 1.3).
- Test on one real iPhone and one cheap Android before calling mobile done; simulators hide gesture and performance problems.
- Re-read every visible string before shipping: broken grammar, unclear references and invented wordplay become plain sentences.
- At the finish, record the system as built (DESIGN.md): overview, colors, typography, layout, elevation, shapes, components, do's and don'ts. A value used once is not a token. Never record a shortcut you took as a rule.

## Pre-ship checklist

**Direction**
- [ ] Design read and five-line contract stated; brief constraints honored.
- [ ] One signature move; everything else quiet; specificity test passes.
- [ ] One theme, one accent, one radius system, one icon family, one motion library.

**Layout and type**
- [ ] Hero fits the viewport; headline 2 lines max on desktop; one primary CTA visible without scrolling.
- [ ] Spacing from the scale; groups separated by space; no cards in cards.
- [ ] Body 16px+, measure under 75ch, headings balanced, tabular numerals on data.
- [ ] At most one eyebrow per three sections; no repeated layout family back to back.

**Color and accessibility**
- [ ] Contrast 4.5:1 text, 3:1 large text, icons, input borders and focus.
- [ ] Color never the only signal; text over images has a scrim.
- [ ] Keyboard: everything reachable, visible focus, logical order, Escape closes overlays, focus returns to trigger.
- [ ] Inputs labeled, icon buttons have `aria-label`, images have alt, landmarks and one `h1`.
- [ ] Works at 200% zoom and with the largest system text size.
- [ ] Dark mode checked separately (if supported).

**States and content**
- [ ] Default, hover, focus, active, disabled, loading, empty, error, success all exist.
- [ ] Forms keep input on error, show errors next to fields, block double submit.
- [ ] Real or clearly marked placeholder content; no fake metrics, no lorem ipsum.
- [ ] Copy: verb + object buttons, one label per intent, no filler words, no em dashes.

**Motion**
- [ ] Each animation has a stated purpose; none on keyboard or high-frequency actions.
- [ ] Transform/opacity only, named properties, durations from the table, exits shorter.
- [ ] Popovers grow from their trigger; nothing scales from 0; no bounce on utility UI.
- [ ] Reduced-motion path written; loops pause off-screen and have a pause control if over 5s.

**Responsive and performance**
- [ ] Checked at 375px and 1440px (and landscape phone); no horizontal scroll; `dvh` not `vh`.
- [ ] Touch targets 44px+, primary action in thumb reach on mobile, safe areas respected.
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1; images sized with `aspect-ratio`; fonts preloaded and subset.
- [ ] No console errors, unused imports or `any` left from the build.

- Headings run h1 to h6 without skipping a level; a skip-to-content link comes first.

## Hardening inputs

Try: 100+ character names, emoji, RTL text, CJK, Lithuanian diacritics, empty strings, 0 and negative numbers, 1,000+ list items, offline, 3G throttling, rapid double submit, forced API 500, expired session, every empty state.

## Bounded verification

Batch inspection (desktop + mobile together), fix the batch, one confirming round, stop.
If a third round seems necessary, the direction is wrong, not the details: go back to the contract.
