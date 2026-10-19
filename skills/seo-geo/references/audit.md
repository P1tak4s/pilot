# Audits, priorities and measurement

## Running an audit

1. Scope and plan, confirmed by the person (see SKILL.md rule 1).
2. Crawl politely: at most a few hundred pages, a few requests at a time, about a second between
   requests, 30s timeout, respect robots.txt. On HTTP 429, back off and report partial results, naming
   what was not checked.
3. Check in order: indexability, rendering, speed, on-page, content and intent, schema, AI search,
   local, off-page.
4. Write the report: summary with the 3 to 5 changes that matter most, then findings by priority.

## Priorities

| Priority | Meaning | When |
|---|---|---|
| Critical | blocks indexing or causes penalties (noindex on key pages, robots block, broken canonicals, site-wide 5xx, manual action, hacked content) | now |
| High | large measurable loss (wrong intent on key pages, CWV poor, missing titles, cannibalisation, AI search bots blocked) | within a week |
| Medium | clear improvement (internal links, schema gaps, thin pages, image weight) | within a month |
| Low | polish | backlog |

A health score helps compare over time. Suggested weights: technical 22, content 23, on-page 20,
schema 10, Core Web Vitals 10, AI search readiness 10, images 5. Report it next to the findings,
never instead of them.

## Off-page and backlinks

- Quality over count: links from relevant, real sites with traffic. Referring domains matter more than
  total links.
- A natural profile: mostly branded and URL anchors (exact-match keyword anchors above ~15% look
  manipulative), a mix of follow and nofollow, no single domain providing a large share.
- Toxic signals: link networks, mass directory links, pages with thousands of outbound links, sudden
  spikes. Disavow only after a manual action or clear negative SEO.
- Digital PR, original data, tools and genuinely useful resources earn links and AI mentions at the
  same time.

## Measurement

- **Google Search Console**: queries, pages, CTR, position; index coverage; CWV; manual actions. Data
  lags 2 to 3 days and goes back ~16 months; the API returns up to 25,000 rows per request. URL
  Inspection is limited to about 2,000 calls per site per day.
- **GA4**: organic and AI-referral sessions and conversions. Consent mode limits what is counted in
  the EU; check it before comparing years.
- **CrUX / PageSpeed Insights**: field CWV per URL or origin.
- **Bing Webmaster Tools**: Bing and, indirectly, ChatGPT search and Copilot visibility.
- KPIs at baseline, 3, 6 and 12 months: clicks, impressions, top-10 keywords, conversions from
  organic, AI citations on the tracked question set.

## Watching for regressions

After releases, compare key pages against a saved baseline:

- **Critical, fix now**: noindex added, canonical removed or changed, title or H1 removed, schema
  removed, status code changed to an error, robots.txt blocking new paths.
- **Warning, fix within a week**: CWV worse by more than 20%, performance score down 10+ points,
  heading or title rewritten beyond recognition, internal links removed.
