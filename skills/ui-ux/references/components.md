# Components, states and UX copy

## Every interactive control has all of its states

`default, hover, focus-visible, active/pressed, disabled, loading, error, success` (+ `selected` where it applies).
Shipping half of them is the most common reason UI feels unfinished.

- **Focus**: visible ring 2px+, 3:1 contrast, offset 2px, `:focus-visible` so mouse clicks stay clean. Never remove outlines without a replacement.
- **Hover**: only on `(hover: hover)` devices, and never the only way to reveal an action.
- **Active**: `transform: scale(0.97)` or a 1px translate, 100 to 160ms.
- **Disabled**: looks disabled (reduced contrast, `cursor: not-allowed`), uses the real `disabled` attribute, and explains why when the reason is not obvious (tooltip or helper text). Prefer enabling and validating over disabling a submit button with no explanation.
- **Loading**: the control keeps its size; label swaps to a spinner or "Saving…"; double submission blocked.

## Buttons

- Hierarchy: one primary per view, secondary as outline or tonal, tertiary as text. Destructive styled distinctly and kept away from the primary.
- Labels are verb + object, 1 to 3 words: "Create invoice", "Send", "Delete project". Never "Submit", "OK", "Yes/No" in dialogs.
- One label per intent across a page; do not mix "Get started", "Sign up", "Try free" for the same action.
- Height 40 to 48px on web (36px allowed in dense tools), icon buttons square with `aria-label`.
- The whole visible button is clickable; links look like links, buttons look like buttons.

## Forms

- Visible label above every input. Placeholders show an example format, never replace the label.
- Single column. Group related fields with a heading. Mark optional fields ("optional") rather than every required one, or vice versa, consistently.
- Correct `type`, `inputmode`, `autocomplete` and `name` so browsers and password managers help. Never block paste.
- State format requirements before the user types (password rules visible while typing).
- Validate on blur and on submit, not on every keystroke; clear an error as soon as it is fixed.
- Error message next to the field, in text + icon + color, linked with `aria-describedby`, announced with `aria-live`. Say what is wrong and how to fix it: "Enter a date after 1 Jan 2026", not "Invalid input".
- On submit failure, keep everything the user typed and move focus to the first invalid field; for long forms add an error summary with links.
- Accept liberal input and normalize (Postel): spaces in phone numbers and IBANs, comma or dot decimals, trailing whitespace in emails.
- Long forms: steps with a progress indicator, autosave drafts, warn before discarding unsaved changes.
- Mobile input height 44px+, font 16px+.

## Navigation

- Current location always visible (active nav state, page title, breadcrumbs from 3 levels deep).
- Desktop top nav 5 to 7 items, one line, 56 to 72px tall; mobile bottom nav 3 to 5 items with labels.
- Same place on every page; back restores scroll position and filters.
- Hamburger only on mobile; on desktop show the navigation.
- Do not mix tabs, sidebar and bottom nav at the same hierarchy level.

## Overlays

- Prefer inline or progressive disclosure; use a modal only when the task must interrupt or needs protected focus.
- Modal: `<dialog>` or an accessible primitive, focus trapped, Escape closes, focus returns to the trigger, background scroll locked, visible close button, backdrop 40 to 60% black.
- Destructive confirmations name the object and the consequence ("Delete 'Q3 report'? This cannot be undone.") and the button repeats the verb ("Delete report"). If the action can be undone, skip the confirm and offer Undo in a toast instead.
- Popovers and dropdowns open from their trigger (`transform-origin` at the trigger), close on outside click and Escape, are keyboard navigable.
- Tooltips: supplementary only, never the only place for essential info, appear on focus too, 300 to 500ms delay for the first one, instant for the next in the same group.
- Toasts: for transient outcomes only; 4 to 6s visible, pause on hover/focus, `aria-live="polite"`, include Undo where possible; errors that need action stay until dismissed.
- Bottom sheets on mobile instead of centered modals for menus and short forms.

## Tables and lists

- Left-align text, right-align numbers (tabular numerals), align headers with their data.
- Sticky header, sortable columns with `aria-sort`, row hover, clear selection state, bulk actions bar when rows are selected.
- Row height 40 to 48px (32px in a density mode). Zebra stripes or 1px dividers, not both.
- Long tables: pagination or virtualization (thousands of rows), filters that show what is active and how to clear them.
- On mobile, transform rows into cards that keep the key column first.
- Use a proven table library (TanStack Table, AG Grid) for sorting/filtering/virtualization instead of hand-rolling.

## Empty, loading, error, success

- **Empty** (first use): what will appear here, why it is useful, one primary action, optional example or template. Distinguish: first use, cleared, no search results ("No results for 'xyz'. Clear filters"), no permission, failed to load.
- **Loading**: skeleton with the final layout's shape for content over ~300ms; spinner only inside small controls; progress with steps or time for anything over ~10s; never fake progress.
- **Error**: what failed, why if known, and the way out (Retry, Go back, Contact). Keep the user's data. No raw error codes as the main message.
- **Success**: confirm the outcome and the next step ("Invoice sent to Ona. View invoice"). Routine success stays quiet (inline check, toast); milestone success may celebrate briefly.
- **Offline / slow**: say so, queue actions if possible, retry automatically with feedback.

## Cards

- Use cards for repeated, self-contained objects. Not as the default wrapper for every section.
- Whole card clickable when it has one destination (with a real link inside for accessibility); separate actions inside need their own visible buttons.
- Consistent padding (16 to 24px), radius from the system, either a border or a shadow, rarely both.

## Charts

- Pick by question: trend = line, comparison = bar, part of whole = stacked bar (pie/donut only for 2 to 5 parts), distribution = histogram, relationship = scatter.
- Title states the insight ("Revenue up 12% since June"), axis labels with units, direct labels over legends, tooltips on hover and focus, an accessible table alternative.
- Empty and error states for charts too. Aggregate or sample above ~1,000 points.

## Behaviour details

- Buttons: a label fits one line at desktop, three words at most; a wrapping CTA fails review. Disabled is 0.38 to 0.5 opacity plus the native `disabled` attribute, and read-only looks different from disabled.
- Forms: password fields get show/hide; never ask again for data entered earlier in the same flow; helper text answers the question the field raises, it does not restate the label.
- Search inputs debounce ~300ms; scroll and resize handlers throttle ~100ms. Virtualize lists from about 50 rich rows.
- Map errors to the UI: 400 shows field errors, 401 goes to sign-in, 403 explains the missing permission, 404 says what is gone, 429 says when to retry, 500 apologises and offers support. One failing widget never blanks the whole screen.
- Drag and swipe always have a single-pointer and keyboard alternative (WCAG 2.2), a visible hint, and a small movement threshold before they start.
- Sticky headers and banners must not cover the focused control: set `scroll-padding-top`.
- After a route change, move focus to the main region or announce the new title. Destructive actions (delete account, log out) sit apart from navigation.
- A nav destination that is unavailable says why instead of vanishing; tab badges clear once visited.
- Onboarding tours: 3 to 7 steps, a visible Skip, replayable from help; a dismissed tip stays dismissed.
- Delight: never on ordinary clicks, no sound without opt-in, never blocking, still pleasant on the 100th time.
- Quotes: at most 3 lines, real quote marks, name plus role plus company.
- Lists of more than ~5 items get structure (grouped columns, cards, tabs, accordion), not one long bullet list; spec tables cluster into 2 to 3 groups instead of a rule under every row.
- Native: Android uses a snackbar (not a toast), one FAB per screen, dialogs only for interrupting decisions. iOS never blocks the edge-swipe back gesture, and settings use grouped inset lists, not cards.

## UX copy

- Write from the user's side: name things by what people control, not how the system works ("Notifications", not "Webhook config").
- Same word for the same thing everywhere; keep a small glossary.
- Active voice, plain verbs, sentence case, no filler. Cut the first draft in half.
- Button text predicts the result; the resulting toast echoes it ("Publish" leads to "Published").
- Errors: no blame, no jokes on serious moments (money, deletion, privacy), no vague apologies.
- Loading text names the real operation ("Importing 248 contacts…").
- Links make sense out of context ("Download the 2026 price list", not "Click here").
- Numbers, dates and currency via `Intl` APIs and the user's locale; plurals through an i18n library, not `count + "s"`.
- Leave 30 to 40% extra room for translations; never concatenate translated fragments.
- Alt text describes the information in the image; decorative images get `alt=""`.
