---
name: seo-geo
description: One skill for search visibility, classic and AI. Use it to audit, plan or fix SEO and GEO/AEO for any site: crawling and indexing, Core Web Vitals, on-page and content (intent, E-E-A-T, briefs, clusters, internal links), schema/JSON-LD, AI search citations (Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Gemini, Copilot, Claude), AI crawlers and robots.txt, llms.txt, entity and brand signals, agent readiness (Is Agentic score), local SEO and Google Business Profile, hreflang and translations, programmatic pages, backlinks, measurement (GSC, GA4, CrUX), and Lithuanian sites. Replaces separate seo-*, geo-*, aeo, ai-seo, schema and llms.txt skills.
---

# SEO + GEO

Get pages found, understood, ranked and cited, by search engines and by AI answer engines.
This file is the operating manual; detail lives in `references/`. Load only what the step needs.

| Need | Load |
|---|---|
| Crawl, index, canonicals, redirects, JS rendering, robots, sitemaps, CWV, images | `references/technical.md` |
| Search intent, E-E-A-T, titles and meta, briefs, clusters, internal links, comparison pages | `references/content.md` |
| JSON-LD: what to mark up, required fields, what Google no longer shows | `references/schema.md` |
| AI search: citable passages, AI crawlers, llms.txt, entity and brand, platforms, tracking | `references/ai-search.md` |
| Google Business Profile, reviews, NAP, location pages | `references/local.md` |
| hreflang, translations, locale formats | `references/international.md` |
| Programmatic and template pages at scale | `references/programmatic.md` |
| Agent readiness: run Is Agentic (free API/CLI), read its checks, fix them | `references/agent-readiness.md` |
| Audit workflow, scoring, priorities, backlinks, measurement APIs, regression watch | `references/audit.md` |
| Lithuanian sites: language, titles, schema fields, directories, AI search in LT | `references/lithuania.md` |

## Five rules that override everything else

1. **Plan before an audit.** Gather the URL and business type, show what will be checked and how deep, and wait for a yes before crawling or writing a report. A one-page question needs no plan.
2. **Evidence, not folklore.** Every finding cites what was seen (URL, raw HTML, status code, tool output). Third-party statistics are labelled as claims with their source and year, never stated as fact.
3. **Never invent.** No fabricated reviews, ratings, prices, awards, authors or schema values. Markup describes only what is visible on the page.
4. **Raw HTML is the truth.** Check what `curl` returns. AI crawlers do not run JavaScript, and Google treats JS-injected canonicals, robots and schema as unreliable. Critical tags live in server HTML.
5. **People first.** Content is written for the reader's task; search and AI visibility follow from being the clearest, most specific, best-evidenced answer. No keyword stuffing, no doorway pages, no unedited AI text.

## Workflow

1. **Scope.** Site type (local service, e-commerce, SaaS, publisher, agency), market and language, goal (traffic, leads, citations), and what exists (GSC, GA4, GBP access).
2. **Plan and confirm** (rule 1). Offer narrower options: technical only, content only, AI search only, local only.
3. **Get the quick external read first** for a public site: the Is Agentic report (`curl -s "https://is-agentic.com/api/v1/report?url=https://SITE"`, free, no key) gives an agent-readiness score with evidence; PageSpeed Insights gives field CWV. Quote both with their dates.
4. **Check in this order**, stopping to fix blockers first: indexability (robots, noindex, canonical, status codes) → rendering (raw HTML) → speed (CWV field data) → on-page → content and intent → schema → AI search readiness → local → off-page.
5. **Report** findings as `priority | where | evidence | fix`, Critical first (see `audit.md`), with a short plan: this week, this month, this quarter.
6. **Fix** with the smallest change that removes the problem, then re-check the raw HTML or tool output. Never claim a fix that was not verified.

## Numbers to know by heart

| Topic | Value |
|---|---|
| Core Web Vitals (field, 75th percentile) | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (poor: > 4s, > 500ms, > 0.25). FID is gone since March 2024 |
| TTFB | under 800ms |
| Title | about 50 to 60 characters, topic and intent first, brand last |
| Meta description | about 120 to 160 characters, earns the click, no ranking effect |
| Headings | exactly one H1, no skipped levels |
| Click depth | important pages within 3 clicks of the home page |
| Redirects | one hop, 301 for permanent moves, no chains |
| Sitemap | max 50,000 URLs or 50MB per file, only 200, indexable, canonical URLs; Google ignores priority and changefreq |
| URL | lowercase, hyphens, no dates, under ~75 characters |
| Alt text | 10 to 125 characters describing the image; decorative images `alt=""` |
| Images | content > 200KB warn, hero > 300KB warn, > 500 to 700KB critical; LCP image never lazy, `fetchpriority="high"` |
| Citable passage | answer in the first 40 to 60 words of a section; self-contained blocks of roughly 50 to 200 words |
| Location or programmatic pages | 30+ needs a review, 50+ needs a written justification; at least 40 to 60% unique content per page |

## Output contract

- Findings first, ranked by impact, each with evidence and an exact fix (tag, value, file).
- Separate classic search, AI search and local where they differ.
- End with what was not checked and why (no GSC access, JS-only site, rate limits).
- Never use em dashes in copy written for a site.
