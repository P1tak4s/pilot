# Direction

How to choose what a surface should look and feel like before writing CSS.

## Read the brief

Collect six signals, most of them are already in the request or the repo:

1. **Page kind**: landing, app screen, dashboard, docs, portfolio, store, form flow.
2. **Vibe words** the user used ("clean", "bold", "playful", "like Linear").
3. **References**: named products, URLs, screenshots. Study their structure, not just their colors.
4. **Audience and scene**: who, on what device, in what light, under what stress. A nurse at 3am and a designer on a 5K monitor need different things.
5. **Existing brand assets**: logo, colors, fonts, tokens, current site.
6. **Quiet constraints**: accessibility requirements, public sector, regulated (finance, health), children, trust-first commerce. Constraints beat taste every time.

State a one-line design read before building, for example:
`Operate surface, accounting SMB owners on laptops, calm and trustworthy, existing Tailwind tokens, restrained palette, motion 3/10.`

## Three dials

Set them explicitly; they stop everything from drifting to the same middle.

| Dial | 1-3 | 4-7 | 8-10 |
|---|---|---|---|
| **Variance** (layout boldness) | symmetric 12-col grid, predictable | offsets, mixed aspect ratios, some overlap | fractional columns (2fr 1fr 1fr), big empty zones, broken grid |
| **Motion** | hover/press feedback only | CSS transitions, one entrance moment, small cascades | scroll-driven choreography, pinning, kinetic type |
| **Density** | gallery: huge whitespace, py-32+ sections | normal app/marketing | cockpit: tight padding, 1px rules instead of cards, mono numerals |

Presets (variance / motion / density):

| Product | Dials | Notes |
|---|---|---|
| SaaS landing | 7 / 5 / 4 | one product visual that is real (screenshot or live component) |
| SaaS app / admin | 3 / 3 / 6 | speed and consistency over personality |
| Data dashboard | 2 / 2 / 8 | no decorative motion, tabular numerals, 1px dividers |
| Fintech, health, gov, legal | 3 / 2 / 5 | trust first; Inter/system sans is fine here; AAA contrast for key copy |
| E-commerce | 5 / 4 / 5 | product photography carries the brand; fast filters; sticky add-to-cart on mobile |
| Premium consumer brand | 7 / 6 / 3 | rotate palette families; avoid the beige-brass default |
| Agency / creative studio | 9 / 8 / 3 | kinetic type and pinning allowed; still keep content readable |
| Designer portfolio | 8 / 7 / 3 | the work leads; chrome stays quiet |
| Developer portfolio / docs | 5 / 3 / 5 | mono accents earned by real code |
| Editorial / blog | 5 / 3 / 3 | serif body is fine; measure 60-70ch |
| Kids / games / playful | 7 / 8 / 4 | bouncy springs and bigger overshoot are allowed here only |

Redesign that preserves identity: keep variance and density, motion +1 at most.
Full overhaul: variance +2, motion +2, density follows content.

## Find the visual world

The fastest route to a generic page is to start from the category ("fintech = navy + blue").
Instead:

1. Name the **category default** and its **cliché opposite**. Keep both out of the shortlist.
2. List 5 to 7 concrete things from the audience's own world: tools, materials, places, documents, rituals. A bakery has flour sacks, proofing baskets, chalk boards, receipt paper; a logistics tool has pallets, labels, route maps, barcode type.
3. Pick the one that best expresses the product's mechanism. Derive palette, type and one signature element from it.
4. Commit to ONE signature move (an unusual grid, a typographic treatment, a custom illustration language, one motion moment). Keep everything else quiet. Busy is louder, not bolder.
5. Memory test: what would a visitor describe an hour later? If the answer is a mood ("clean, modern"), the concept is not committed yet.

When the subject is vague, choose a concrete subject, audience and single job yourself and say so.

If the user names a style ("make it brutalist", "riso", "bento"), or you need a fast starting point,
pick the closest entry in `styles-catalog.md`, then adapt it to the brand and this file's rules.

### Before showing a new visual direction

- Capture product truth first: who uses it, the one job, what evidence exists, what must not be invented. At most 3 questions per round, and none about taste.
- Explore wide: sketch several systems across at least three different material families before narrowing; if most candidates share one family, keep digging. Always also offer the category standard played straight as a fallback, without recommending it.
- Skeleton test: strip the copy. If the bare structure does not say what each section is and why it matters, the boldness is only in font size.
- The direction contract includes a first-viewport line: what sits where, at what scale, and where the primary action is.
- For a new surface or a redesign, get one explicit approval of the direction before writing code.
- Operate test: a person fluent in the category trusts the product UI at first sight. Strangeness without purpose (ornate buttons, display fonts in labels) fails it.
- Experience pages (portfolios, studios, launches, award-level sites) follow `experience.md`.

## Use an existing design system when it fits

If the brief or codebase names one, install the official package and use its components. Do not
recreate it with custom CSS, and never mix two systems in one tree.

| Context | System |
|---|---|
| Microsoft / enterprise | Fluent UI |
| Android / Google-like | Material 3 |
| IBM-style analytics | Carbon |
| Shopify admin apps | Polaris |
| Atlassian ecosystem | Atlaskit |
| Developer tools | Primer |
| UK public sector | GOV.UK Frontend |
| US public sector | USWDS |
| React product with own look | Radix Primitives / shadcn/ui (restyle it; never ship the default theme untouched) |
| Apple platforms | SwiftUI + HIG (Liquid Glass is Apple-only; web imitations must be labeled approximations) |

## Redesign rules

- Detect the mode first: greenfield, preserve (evolve the current look) or overhaul (new visual world).
- Audit before changing: tokens, IA, content blocks, patterns to keep, SEO baseline (titles, headings, slugs, structured data).
- Never change silently: URL slugs, primary nav labels, form field names and order, logo, legal and cookie text, analytics event IDs.
- Levers in order of impact per effort: typography, spacing and rhythm, color, motion, hero composition, full block replacement.

## Pacing a long page (Persuade)

- Hero: headline (2 lines max on desktop, 3-8 words ideal), one supporting sentence (20 words max), one primary + at most one secondary CTA, one real visual. Fits the first viewport. No logo walls, pricing or bullet lists inside the hero.
- Each following section: headline 8 words or fewer, one paragraph 25 words or fewer, one visual or one action.
- Use at least 4 different layout families across 8 sections; never more than 2 image/text zigzags in a row.
- Alternate dense and quiet sections; end on a real close (CTA, contact, next step), not a fade-out.
- Classic order that works: hero, proof (logos/metrics that are real), problem, how it works, features as outcomes, social proof, pricing, FAQ, final CTA.

## Platform conventions (native)

- **iOS**: SF Pro / system font, 17pt body, 44pt targets, tab bar with 2 to 5 items, large titles, sheets and swipe-back. Honor Dynamic Type and Reduce Motion.
- **Android**: Material 3 roles, 48dp targets with 8dp gaps, navigation bar on compact width, rail or drawer on expanded, predictive back. Honor font scale and "Remove animations".
- Never port one platform's controls to the other (iOS switches on Android, Material FAB on iOS).
