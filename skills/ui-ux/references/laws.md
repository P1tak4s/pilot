# UI/UX Laws

A short, opinionated set of laws that actually change decisions. Each one has a rule,
what to do in code, and the most common way it gets broken. Source list:
lawsofux.com (Jon Yablonski), Nielsen Norman Group, Don Norman, WCAG 2.2.
In reviews, cite findings as `law -> problem -> fix`.

## The 15 laws that matter most

### 1. Jakob's Law: users spend most of their time on other products
They expect yours to work the same way.
- Do: logo top-left links home, search top, cart/account top-right, settings under the avatar, standard icons (trash = delete, gear = settings), underlined or clearly colored links, native inputs (`<select>`, `<input type="date">`).
- Break it only when the new pattern is clearly better AND you teach it in place.
- Related: **Paradox of the Active User**. Nobody reads docs first. Put help inline (placeholder examples, empty states that show the next step), never in a separate manual.
- Common violation: custom scrollbars, hamburger menus on desktop, icon-only buttons with unique meanings.

### 2. Hick's Law: decision time grows with the number of choices
Formula: `RT = a + b * log2(n + 1)`. Time grows with the log of the choice count, so the
first extra options hurt most. It holds for options the user must compare. A sorted list
the user already knows how to search (countries, fonts) is not a Hick problem; scanning is.
- Do:
  - One primary button per view. Secondary actions are visually quieter (outline, text link).
  - Max 3 to 4 pricing tiers, one marked "recommended" and preselected.
  - Progressive disclosure: show the 20% of options used 80% of the time, collapse the rest under "More" or "Advanced".
  - Smart defaults: preselect the most common choice (country from locale, the plan most people pick).
  - Break one big decision into a few small sequential ones (wizard, one question per step on mobile).
  - Long lists (> ~10 items): add search/typeahead, group under headings, or show "Recent" first.
  - Highlight the recommended option so the user can skip comparing.
- Code:
  ```html
  <!-- one primary, one quiet secondary, the rest hidden -->
  <button class="btn-primary">Send invoice</button>
  <button class="btn-ghost">Save draft</button>
  <details><summary>More options</summary>...</details>
  ```
- Measure: time to first click and drop-off on the decision screen; if many users hover between options or leave, there are too many or they look too equal.
- Related: **Choice Overload**. Too many equal options cause no choice at all (the jam study: 24 jams drew more people, 6 jams sold ~10x more).
- Common violations: toolbars with 12 equal-weight buttons; forms asking everything up front; "Choose your plan" with 6 tiers and a comparison table of 40 rows; two equally loud buttons ("Save" and "Save and continue") side by side.
- Do not overdo it: hiding frequently used actions behind menus makes experts slower. Simplify for the majority, keep shortcuts for power users.

### 3. Fitts's Law: time to hit a target depends on its size and distance
- Do: touch targets at least **44x44 pt (iOS) / 48x48 dp (Android)**, WCAG 2.2 minimum 24x24 CSS px with spacing; primary action within thumb reach on mobile (bottom); make the whole row/card clickable, not only the text; label clicks focus their input; keep related actions close to what they act on.
- Screen edges and corners are "infinitely large" targets on desktop; use them for frequent actions.
- Common violation: tiny "x" close icons, destructive and primary buttons side by side with no gap.

### 4. Cognitive Load, Miller's Law and Chunking
Working memory holds a few items (about 4 chunks in practice; "7 +/- 2" is the popular version).
- Do: chunk long data (phone `+370 612 34567`, IBAN in groups of 4, card numbers); split long forms into steps or titled sections; show, do not make users remember (keep the previous step's choice visible, show the password rules while typing).
- Do NOT read Miller's Law as "menus must have 7 items". It is about memory, not about lists users can scan.
- Common violation: codes the user must copy from one screen to another, error messages that disappear before they are read.

### 5. Doherty Threshold: keep responses under ~400 ms
Nielsen's response limits: **0.1 s** feels instant, **1 s** keeps the flow of thought, **10 s** is the limit of attention.
- Do: optimistic UI for likes/toggles/saves; skeletons for content loads over ~300 ms; spinner over 1 s; progress bar with time or steps over ~10 s; disable and show state on submit buttons to prevent double clicks.
- Common violation: blank screen while fetching, a submit button that gives no feedback.

### 6. Gestalt grouping: Proximity, Common Region, Similarity, Uniform Connectedness
The eye groups things that are close, enclosed together, look alike, or are connected.
- Do: space BETWEEN groups larger than space INSIDE groups (e.g. label-to-input 4 to 8 px, field-to-field 16 to 24 px); use cards/borders only to separate genuinely different groups; same function = same style; links all look alike, buttons all look alike.
- Common violation: a label equidistant between two inputs, a clickable element styled like plain text, everything in its own card ("card soup").

### 7. Von Restorff Effect (Isolation): the item that differs is remembered
- Do: exactly one visually dominant primary action; use color + something else (weight, icon, position) because color alone fails for color-blind users; highlight the recommended plan.
- Related: **Selective Attention / banner blindness**. Anything that looks like an ad gets ignored. Do not style important info as a banner.
- Common violation: everything bold, everything red, three "primary" buttons.

### 8. Tesler's Law: complexity cannot be removed, only moved
Someone has to deal with it: the user or the system. Prefer the system.
- Do: autodetect (card type from number, city from postcode, timezone, language); derive values instead of asking; sensible defaults; pre-fill from what you already know.
- Do not oversimplify to the point where the user loses control; keep an override.
- Common violation: asking for country, then phone country code, then currency separately.

### 9. Postel's Law: be liberal in what you accept, strict in what you output
- Do: accept phone with spaces/dashes/+, emails with trailing spaces, dates in several formats, decimals with comma or dot; normalize silently; validate on blur, not on every keystroke; preserve input on error.
- Output: consistent, formatted, predictable.
- Common violation: "Invalid format" for a phone with a space, clearing the whole form after one error.

### 10. Peak-End Rule: people judge an experience by its peak and its end
- Do: invest in the success state (clear confirmation, what happens next, a moment of delight); make errors the least painful peak possible (human message, a way out, no data loss); good empty states and good "done" screens.
- Common violation: payment completes on a bare "OK" page; an error page that is a dead end.

### 11. Goal-Gradient Effect: effort increases closer to the goal
- Do: progress indicators in multi-step flows ("Step 2 of 3"); start progress above zero (account created = first step done); onboarding checklists with visible completion.
- Common violation: a 6-step wizard with no indication of length.

### 12. Zeigarnik Effect: unfinished tasks stay on the mind
- Do: show incomplete profile/setup as a gentle checklist; save drafts automatically and offer "continue where you left off".
- Do not weaponize it with fake urgency or nagging.

### 13. Serial Position Effect: first and last items are remembered best
- Do: put the most important nav items first and last; key info at the start and end of lists, emails and pages; in mobile tab bars, the most used items at the ends.
- Common violation: the main action buried in the middle of a long menu.

### 14. Aesthetic-Usability Effect: attractive looks are perceived as easier to use
Users forgive small usability issues in a product that looks polished, and judge a site's
credibility within ~50 ms of first sight, mostly on visual design.
- Do (polish that is cheap and pays off):
  - One spacing scale (4/8 px steps: 4, 8, 12, 16, 24, 32, 48, 64). No random 13 px gaps.
  - One type scale (e.g. 12/14/16/20/24/32), 2 font weights for most text, max 2 families.
  - Everything aligned to a grid; one left edge per column.
  - Limited palette: one brand/accent color, neutrals, plus semantic red/green/amber only for status.
  - Consistent radius, shadow and icon set (one icon library, one stroke width).
  - Real content and images in designs, not lorem ipsum, so the look survives real data.
- Code:
  ```css
  :root {
    --space-1: 4px; --space-2: 8px; --space-3: 16px; --space-4: 24px; --space-5: 32px;
    --text-sm: 14px; --text-base: 16px; --text-lg: 20px; --text-xl: 24px;
    --radius: 8px;
  }
  ```
- Danger: it hides real usability problems in testing. People rate a pretty prototype as "easy" even when they fail the task. Test with tasks and measure success rate and time, not opinions.
- Do not trade function for looks: low-contrast gray text, icon-only buttons and hidden labels look clean but fail accessibility (see Hard numbers).
- Common violations: mixed spacing and font sizes across screens; three shades of almost the same blue; default browser styles next to a custom design system; beautiful hero, broken form.

### 15. Pareto Principle: ~20% of features get ~80% of use
- Do: find the core flows (analytics, support tickets) and make them fastest and most visible; demote the rest to secondary menus.
- Common violation: equal visual weight for a rarely used export and the daily main action.

## Nielsen's 10 heuristics (compressed)

1. **Visibility of system status**: always show what is happening (loading, saved, sent).
2. **Match the real world**: user words, not internal jargon or DB field names.
3. **User control and freedom**: undo, cancel, back, close everywhere; prefer undo over "are you sure?".
4. **Consistency and standards**: same thing, same name, same look (see Jakob).
5. **Error prevention**: constraints, defaults, confirmation only for destructive and irreversible actions.
6. **Recognition over recall**: show options, recent items, examples.
7. **Flexibility and efficiency**: shortcuts, bulk actions, remembered preferences for experts.
8. **Aesthetic and minimalist design**: every extra element competes with the important ones.
9. **Help users recover from errors**: say what went wrong, why, and how to fix it, next to the field.
10. **Help and documentation**: contextual, searchable, task-oriented.

## Norman's interaction principles

- **Affordance + signifier**: things that can be clicked must look clickable (cursor, hover, shape, underline).
- **Feedback**: every action gets an immediate visible response.
- **Mapping**: controls placed and moving like their effect (slider right = more).
- **Constraints**: make wrong input impossible (disabled until valid, input masks, `min`/`max`).

## Hard numbers

| What | Value |
|---|---|
| Touch target | 44x44 pt iOS, 48x48 dp Android, WCAG 2.2 AA min 24x24 px |
| Text contrast | 4.5:1 normal, 3:1 large text (>= 24 px or 18.66 px bold) and UI parts |
| Body text | 16 px minimum on web (also prevents iOS input zoom) |
| Line length | 45 to 75 characters |
| Line height | 1.4 to 1.6 for body |
| Response time | 0.1 s instant, 0.4 s Doherty, 1 s flow, 10 s attention |
| Animation | 150 to 300 ms for UI transitions; respect `prefers-reduced-motion` |
| Choices | 3 to 4 plans/tiers; one primary action per view |

## Review checklist

Report each finding as `Law -> what is wrong (where) -> concrete fix`, ordered by severity.

- [ ] One clear primary action per screen? (Von Restorff, Hick)
- [ ] Familiar patterns and placements? (Jakob)
- [ ] Targets big enough and close to where the thumb/cursor is? (Fitts)
- [ ] Nothing the user must remember between screens? (Cognitive Load)
- [ ] Feedback within 100 ms, loading states, no double submit? (Doherty, Heuristic 1)
- [ ] Spacing groups related things; same function looks the same? (Gestalt)
- [ ] System does the work: defaults, autodetect, pre-fill? (Tesler)
- [ ] Forgiving input, errors next to fields, input preserved? (Postel, Heuristic 9)
- [ ] Undo/back/cancel available; confirm only destructive actions? (Heuristic 3, 5)
- [ ] Success and error states designed, not default? (Peak-End)
- [ ] Progress shown in multi-step flows? (Goal-Gradient)
- [ ] Most important items first or last? (Serial Position)
- [ ] Contrast, target sizes, focus states, reduced motion OK? (Hard numbers)
- [ ] Core 20% of tasks are the fastest path? (Pareto)

## Anti-patterns to refuse

Dark patterns break these laws on purpose: confirmshaming, hidden unsubscribe, pre-ticked paid add-ons, fake countdowns, roach-motel cancellation. Do not build them, even when asked to "use psychology"; offer the honest version of the same law instead.
