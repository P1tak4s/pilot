# Technical SEO

Technical SEO lets a page compete; content wins. Fix anything that blocks crawling or indexing
before anything else.

## Crawl and index

- `robots.txt` controls crawling, not indexing. A blocked URL can still be indexed from links; use
  `noindex` (meta or `X-Robots-Tag`) to keep it out, and do not block it in robots.txt at the same time
  or the noindex is never seen.
- Look for a blanket `User-agent: * / Disallow: /` left from staging, and for `noindex` on live pages.
- Canonical: self-referencing on every indexable page, absolute https URL, never pointing at a
  noindexed, redirected or non-200 page, never combined with `noindex`.
- One host: pick https and www or non-www, 301 everything else to it.
- Status codes: moved permanently 301 (or 308), removed for good 410 or 301 to the closest
  equivalent, temporary 302 only when it really is temporary. One redirect hop; flag chains and loops.
- Soft 404s (a 200 page that says "not found") are reported as errors; return a real 404.
- Filter, sort and tracking parameters: canonical to the base URL or keep them uncrawlable. Tag and
  thin archive pages: noindex, or give them real content.
- Crawl budget only matters past roughly 10,000 URLs; below that, fix quality, not budget.
- Pagination: plain crawlable `<a href>` links between pages; Google ignores `rel=prev/next`.
- Orphan pages (no internal link in) are invisible in practice. Every indexable page gets at least one.

## JavaScript and rendering

- Put title, meta description, canonical, meta robots, hreflang and JSON-LD in the server HTML.
- If JS changes the canonical, Google may use either one; a `noindex` in raw HTML may be honoured
  even if JS removes it. Only 200 pages are rendered.
- AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and others) fetch HTML and do not run
  JS. A client-rendered page with an empty body is invisible to them. Use SSR, SSG or prerendering.
- Check with `curl -sL URL | grep -i '<title\|canonical\|robots\|ld+json'`, not with a browser.
- Real links are `<a href>`, real buttons are `<button>`, inputs have labels: this helps crawlers,
  assistive tech and browsing agents alike. No `<div onclick>` navigation.

## Sitemaps

- XML sitemap at a known path, referenced in robots.txt (`Sitemap: https://...`).
- Only canonical, indexable, 200, https URLs. No redirects, no noindexed pages.
- At most 50,000 URLs or 50MB uncompressed per file; above that, a sitemap index. Split by page type
  for large sites so coverage problems show per type.
- `lastmod` is used only when it is accurate. Identical lastmod on every URL is a sign it is fake.
  Google ignores `priority` and `changefreq`.
- Before reporting "no sitemap", check `/sitemap.xml`, `/sitemap_index.xml` and robots.txt.
- IndexNow notifies Bing, Yandex, Naver and Seznam (and through Bing, ChatGPT search), not Google.

## Core Web Vitals

- Judge on field data (CrUX, 75th percentile), lab data (Lighthouse) only to debug.
- LCP ≤ 2.5s good, > 4s poor. Break it down: TTFB (target < 800ms) + resource load delay + load time
  + render delay. The usual fixes: server or CDN caching, preload or `fetchpriority="high"` on the LCP
  image, no lazy-loading above the fold, fewer render-blocking resources.
- INP ≤ 200ms good, > 500ms poor. Long tasks, heavy hydration and third-party scripts are the causes.
- CLS ≤ 0.1 good, > 0.25 poor. Width and height (or aspect-ratio) on media, reserved space for ads and
  embeds, `font-display` with metric-matched fallbacks.
- CWV are a tie-breaker between pages of similar quality; they rarely rescue weak content.

## Images

- Modern formats with a fallback: `<picture>` with AVIF, then WebP, then JPEG; width and height on
  the `<img>`.
- Size budgets: content images warn above 200KB, hero images above 300KB, anything above 500 to 700KB
  is critical; thumbnails above 200KB are critical.
- The LCP image is never `loading="lazy"`; give it `fetchpriority="high"`. Others: `loading="lazy"`
  and `decoding="async"`. Do not flag "not lazy-loaded" when a JS lazy loader is in use.
- Alt text describes the image in 10 to 125 characters, not a filename or keyword list; decorative
  images get `alt=""`.
- Descriptive file names (`red-trail-shoes.webp`), and an image sitemap for image-led sites.

## Mobile and HTTPS

- Mobile-first indexing: the mobile page is the page. Same content, links and structured data as
  desktop; viewport meta present.
- HTTPS everywhere, no mixed content, HSTS once stable.
- Tap targets around 48px with spacing on mobile (24px is the WCAG floor).
