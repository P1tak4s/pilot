# Lithuanian sites

## Language and copy

- Titles, meta descriptions and page copy are written in Lithuanian by a fluent writer, not
  translated from English. Read every string aloud; literal translations ("Sužinokite daugiau apie
  mūsų sprendimus") are the most common weakness.
- Title pattern for services: `[Paslauga] [mieste] | [Įmonė]`, for example
  `Automobilių servisas Vilniuje | Įmonė`, about 30 to 60 characters.
- Meta description about 120 to 160 characters with a clear action: Skambinkite, Registruokitės,
  Gaukite pasiūlymą.
- Lithuanian quotation marks „...“. No em dash; the en dash only for ranges (9–18 val.).
- Use the forms people search: city names in the locative (Vilniuje, Kaune, Klaipėdoje) as well as
  the nominative, and both with and without diacritics where people type both (many search without
  ą, č, ę, ė, į, š, ų, ū, ž).

## URLs

- Slugs in Lithuanian, transliterated to ASCII: `automobiliu-servisas-vilniuje` (ą→a, č→c, ę/ė→e,
  į→i, š→s, ų/ū→u, ž→z). UTF-8 slugs work for Google but break when shared and copied.
- Language folders on multilingual sites: `/` or `/lt/` for Lithuanian, `/en/` for English, with
  hreflang `lt` and `en`.

## Schema fields for Lithuanian businesses

- `PostalAddress`: `streetAddress` ("Gedimino pr. 1"), `addressLocality` ("Vilnius"), `postalCode`
  ("01103"; Lithuanian codes are 5 digits, often written with the `LT-` prefix; use the same form as the
  Business Profile), `addressCountry` "LT".
- `telephone` in international format: `+370 5 123 4567` or `+370 612 34567`.
- `legalName` (UAB ..., MB ...), `vatID` (`LT` + 9 or 12 digits, only if VAT-registered), and the
  company code as `identifier` (`{"@type": "PropertyValue", "propertyID": "Įmonės kodas", "value":
  "123456789"}`) or `taxID`.
- `openingHoursSpecification` with 24-hour times; `priceRange` in euros ("€€" or "nuo 30 €").
- `sameAs`: rekvizitai.lt company page, Wikidata, LinkedIn, Facebook, Google Business Profile.

## Local directories and citations

- Google Business Profile first, then Apple Maps and Bing Places.
- Lithuanian business directories: rekvizitai.lt, 1588.lt, info.lt, 118.lt, and the
  industry's own (for example autoplius.lt and aruodas.lt for their sectors). Same name, address and
  phone everywhere.
- Reviews: Google first; Facebook recommendations and industry portals next.

## AI search in Lithuania

- AI Overviews and AI Mode availability for Lithuanian queries changes; check before promising
  anything. ChatGPT search, Perplexity and Copilot are widely used and lean on Bing's index, so register
  in Bing Webmaster Tools and use IndexNow.
- Answer engines often answer Lithuanian questions from English sources. One English page with the
  core company facts (what, where, since when, contacts, identifiers) helps entity recognition.
- A Wikidata item for the company (with the company code as an identifier) is a strong, cheap signal.

## Competitor checks

- Competitors are the domains that rank in the top 5 to 10 for the core Lithuanian queries in the
  target city, not the ones the client names. Compare page types, content depth, schema, reviews and
  GBP completeness.
- Scraping Google results directly is against its terms and gets blocked; use Search Console, a SERP
  API or manual checks.
