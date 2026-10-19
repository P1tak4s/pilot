# AI search (GEO / AEO)

Being cited by Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Gemini, Copilot and
Claude. Most of it is good SEO done precisely; a few things are specific.

## What Google says, and what that means

- AI Overviews and AI Mode use the normal index: a page must be indexed and eligible for a snippet.
  There is no separate AI index and no special markup that buys inclusion.
- Google advises against writing for "chunking" or making AI-only versions of pages. Write clear pages
  for people; structure helps machines as a side effect.
- AI Mode and AI Overviews often cite different URLs for the same query: track them separately.

## Citable content

- **Answer first.** Each section opens with a direct, self-contained answer in its first 40 to 60
  words ("X is ...", "It costs ...", "Do this: ..."), then the detail.
- **Self-contained passages** of roughly 50 to 200 words: name the subject instead of "it", do not
  start with "But" or "However", include at least one specific fact.
- **Specific and sourced**: exact numbers with units, dates and named sources; link primary sources.
  Original data, first-hand tests and expert quotes are what answer engines prefer to quote.
- **Structure that maps to questions**: question-shaped H2/H3s, short paragraphs (2 to 4 sentences),
  tables for comparisons, numbered steps for procedures, a short summary near the top.
- **Fresh and dated**: visible published and last-reviewed dates, version numbers for software,
  statistics refreshed at least quarterly on fast topics.
- **Avoid**: keyword stuffing, superlatives without numbers ("the best"), vague "many people say",
  fake listicles, and padding before the answer.
- Studies circulate with lift figures (for example, adding statistics or quotations raising citation
  rates in a 2024 Princeton study). Treat such numbers as directional claims, not guarantees.

## AI crawlers and robots.txt

Decide per bot; search and training are different crawlers.

| Bot | Owner | Purpose |
|---|---|---|
| OAI-SearchBot | OpenAI | ChatGPT search results. Blocking it removes you from ChatGPT search |
| ChatGPT-User | OpenAI | fetches a page when a user asks |
| GPTBot | OpenAI | model training |
| ClaudeBot / Claude-User / Claude-SearchBot | Anthropic | training / user fetches / search |
| PerplexityBot, Perplexity-User | Perplexity | search index / user fetches |
| Google-Extended | Google | a token for Gemini training and grounding; does not affect Google Search or AI Overviews |
| Applebot-Extended | Apple | training opt-out token |
| Bingbot | Microsoft | Bing index, which also feeds Copilot and ChatGPT search |
| CCBot, Bytespider | Common Crawl, ByteDance | training only |

- To be cited, allow the search and user-fetch bots. Blocking training bots is a separate business
  choice and does not remove you from AI search.
- A specific `User-agent` block replaces the `*` rules for that bot; check both.
- Also check for `noai` meta tags, `X-Robots-Tag` per bot, and CDN or firewall bot blocking
  (Cloudflare's AI bot setting blocks more than robots.txt says).
- These crawlers do not run JS: the answer text and JSON-LD must be in the raw HTML.

## llms.txt

- A Markdown file at `/llms.txt`: `# Site name`, a `> one-line summary`, then sections of
  `- [Title](url): what it is` links, and an optional `## Optional` section. `llms-full.txt` may hold
  the full text. Keep it small and current.
- Status: a community proposal. Google has said it does not use it, and no major answer engine has
  confirmed using it for ranking or citations. It is cheap and helps agents and IDE tools that read it,
  so add it, but never sell it as a ranking factor.
- Serving Markdown versions of pages (`Accept: text/markdown` or `.md` URLs) helps browsing agents;
  same caveat.

## Entity and brand

- Answer engines lean on entities they can verify. Make the brand one consistent entity:
  Organization schema with `sameAs` to Wikidata, Wikipedia (if notable), LinkedIn, business registers
  and social profiles; the same name, address and description everywhere.
- A Wikidata item with complete properties (official website, founding date, industry, country,
  identifiers) is one of the cheapest strong signals. Wikipedia only when the brand is genuinely
  notable.
- Mentions matter, linked or not: industry press, Reddit and forum threads, YouTube, review sites,
  comparison articles. Several 2025 studies found brand mentions correlate more with AI visibility than
  backlinks do (correlation, not proof).
- Authors: Person schema with `sameAs` to real profiles; consistent bylines.

## Platform differences (they change; re-check yearly)

- **Google AI Overviews / AI Mode**: the Google index and Business Profile; strong classic SEO is the
  prerequisite.
- **ChatGPT search**: largely Bing's index plus OpenAI's own crawl. Bing Webmaster Tools and IndexNow
  matter; allow OAI-SearchBot.
- **Perplexity**: its own index plus others; leans on community sources (Reddit, forums) and cites
  many sources per answer.
- **Gemini**: Google index, YouTube and the Knowledge Graph.
- **Copilot**: Bing.
- **Claude**: web search with a preference for primary, dated sources.
- Overlap between engines is low: being cited by one does not imply the others.

## Measuring AI visibility

- There is no official citation report. Build a fixed list of 20 to 50 real questions customers ask,
  run them on each engine weekly or monthly, and log: date, engine, query, cited (yes/no), which URL,
  position, which competitors were cited.
- Track for at least 4 weeks per engine before drawing conclusions; answers vary run to run.
- In GA4, segment referral traffic from chatgpt.com, perplexity.ai, gemini.google.com,
  copilot.microsoft.com, claude.ai. In GSC, AI Overview and AI Mode clicks are folded into web search.
- After unblocking a bot, expect weeks, not days, before citations change.
