# Agent readiness (Is Agentic)

How well AI agents (browsing assistants, answer engines, coding agents) can discover, read and use a
site. Check it with [Is Agentic](https://is-agentic.com), a free scanner run by Ora, and fix what it
finds. It complements the AI search checks in `ai-search.md`: those are about being cited, these
are about being usable by an agent at all.

## Run the check

```sh
# Latest completed report as JSON (read-only, no key, does not start a scan)
curl -s "https://is-agentic.com/api/v1/report?url=https://example.com" | jq '{score, score_breakdown, issues: [.issues[] | {id, tier, result, details, recommendation}]}'

# Retrieve, or start a scan when none exists
npx is-agentic example.com --json
```

- The human report is `https://is-agentic.com/scan/<domain>`; asking it for `text/markdown` returns a
  compact Markdown version. An MCP server is at `https://is-agentic.com/mcp`.
- After shipping fixes, rescan (browser report page or CLI) and quote the new score with its
  `scanned_at` time. A report is a snapshot of one public URL, not a guarantee.
- Read `issues`: each has `id`, `tier` (essential or recommended), `result` (failed or partial),
  `details` (the evidence) and `recommendation`. Fix failed Essential checks first.

## Scoring

- Essential checks share 80 points, Recommended 20, emerging signals add up to 5 bonus points.
- Checks that do not apply (no API, no OAuth, no MCP, no shop) are excluded, not failed.
- A site can declare its type (docs/content, business, app, commerce) with an
  `is-agentic-site-type` declaration; otherwise it is inferred.

## Essential checks and their fixes

| Check (`id`) | Pass when | Fix |
|---|---|---|
| Content without JavaScript (`content-no-js`) | raw HTML carries real content (500+ characters on the home page, an H1) | SSR or prerender; never an empty shell |
| Agent-friendly 404s (`agent-friendly-404`) | an unknown path returns HTTP 404, and a request with `Accept: text/markdown` gets a Markdown error body | keep the real 404 status; add a short Markdown 404 with links home and to search |
| Markdown negotiation (`markdown-negotiation-vary`) | the home page answers `Accept: text/markdown` with Markdown and sends `Vary: Accept` | serve a `.md` twin of each key page when the Accept header asks for it (server or CDN rule), with `Vary: Accept` so caches keep both |
| Correct HTTP behaviour | real status codes, no soft 404s, no redirect chains, robots.txt reachable | see `technical.md` |
| Identity metadata | canonical URL, `<html lang>`, Open Graph (`og:title`, `og:description`, `og:image`, `og:type`) | add all of them to every indexable page |
| Usable controls and structure | real links and buttons, labelled inputs, one H1 and a sane heading outline | semantic HTML |

## Recommended checks seen in reports

| Check (`id`) | Fix |
|---|---|
| JSON-LD present (`json-ld`) | the identity type that fits the site (Organization, LocalBusiness, SoftwareApplication) in server HTML |
| Organization completeness (`org-schema-completeness`) | Organization with `contactPoint` (email or phone and `contactType`) and `sameAs` |
| Agent instructions (`agent-instruction`) | a "When to use" section in `/llms.txt` saying in plain words when an agent should send users here and what it can do |
| Sitemap (`sitemap`) | valid `/sitemap.xml` with accurate `lastmod`, referenced in robots.txt |
| Trust anchors (`trust-anchors`) | real `/about`, `/contact` and `/privacy` pages, 500+ characters each |
| Metadata completeness (`metadata-completeness`) | canonical, `lang`, `og:image`, `og:type` on the home page |
| Brand discoverability (`brand-search-accuracy`) | the own domain ranks first for the brand name alone: consistent name, Organization schema, Wikidata, Business Profile |

Sites with an API, OAuth, GraphQL, MCP server, developer portal or shop get extra checks (OpenAPI
description, `/.well-known/api-catalog` per RFC 9727, MCP server card, machine-readable pricing,
commerce feeds). Add those only when the product really offers the interface.

## Order of work

1. Content in raw HTML and correct status codes.
2. Identity metadata, JSON-LD Organization, trust pages.
3. Markdown negotiation and the Markdown 404.
4. `/llms.txt` with a "When to use" section, sitemap.
5. Interface-specific checks if the site has an API, MCP server or shop.
6. Rescan and record the score in the audit report.
