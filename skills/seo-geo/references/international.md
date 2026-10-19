# International and multilingual

## Structure

- Prefer one domain with language folders (`/en/`, `/de/`) unless there is a strong reason for country
  domains. Subdomains work but split signals.
- Never redirect by IP or browser language without a choice; crawlers come mostly from the US and must
  reach every version. Offer a language switcher with plain links.
- `<html lang>` matches the page language.

## hreflang

- Every page in a set lists **every** alternate, **including itself**, and every alternate lists it
  back (full mesh, return tags mandatory). A missing self-reference or return tag can make Google
  ignore the set.
- hreflang URLs are the canonical URLs, absolute, same protocol, identical trailing slashes.
- One `x-default` per set (usually the language picker or the main market), also with return tags.
- Codes: language ISO 639-1 (`lt`, `en`, `de`, `ja`; not `eng` or `jp`), optional region ISO 3166-1
  alpha-2 (`en-GB`, not `en-UK`; `es-419` for Latin America is valid). Chinese needs a script or region
  (`zh-Hans`, `zh-Hant`, `zh-TW`).
- Method: HTML `<link rel="alternate" hreflang>` for small sets (under ~50 variants), XML sitemap with
  `xmlns:xhtml` for large ones, HTTP headers for PDFs. Pick one method per page type.
- Cross-domain sets need the tags on both domains.

## Translations

- Machine translation is acceptable when a fluent person reviews it and the page is genuinely
  localised. A page whose body is still in the source language behind a translated menu is a critical
  error; a wrong `lang` attribute is high.
- Localise, do not just translate: currency, units, phone format, address format, dates, legal texts
  (privacy law of the right jurisdiction), examples and search terms people use in that market.
- Expected length changes against English: German ~1.25 to 1.35x, French ~1.15 to 1.25x, Lithuanian
  ~1.0 to 1.15x, Japanese and Chinese ~0.7 to 0.9x. A translation far outside that range is suspect.
- Keep versions in step: a translation not updated within ~90 days of the source is outdated.

## Formats

- Numbers and dates follow the locale: `1 234,56 €` and `2026-10-19` (LT), `1.234,56 €` and
  `19.10.2026` (DE), `$1,234.56` and `10/19/2026` (US). A US-style number on a German page is a finding.
