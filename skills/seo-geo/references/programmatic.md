# Programmatic pages

Template pages generated from data: locations, integrations, comparisons, glossaries, product
variants, translations. They work when each page answers a real query with data the template alone
cannot fake.

## Gates

- Each page has a reason to exist: a query with demand and data that differs page to page (local
  prices, real specs, real reviews, real availability). Swapping a variable in the same text is not a
  page.
- At least 40% of the words on a page are unique to it (unique words / total words), and no more
  than ~60% shared boilerplate. Under 30% unique is a hard stop.
- Under ~300 words of useful content: review before publishing, or noindex.
- 100+ pages without a content review is a warning; 500+ without a written justification is a hard
  stop. Better 100 strong pages than 10,000 thin ones.
- Publish in batches of 50 to 100, read a 5 to 10% sample by hand, then watch indexing and traffic for
  2 to 4 weeks before the next batch.

## Build

- Subfolders, not subdomains (`/integrations/slack/`, `/service/vilnius/`).
- Separate sitemaps per page type, so index coverage shows per template.
- Internal links between related pages and from a hub; no orphans.
- Noindex the variants that have no unique value; canonical near-duplicates to the main page.
- Watch for cannibalisation: two templates targeting the same intent compete.
- Titles and H1s are templated but vary meaningfully; schema per page reflects its own data.
