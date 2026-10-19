# Structured data (JSON-LD)

## Rules

- JSON-LD in the server HTML, not injected by JS: Google may process injected markup late, and AI
  crawlers never see it. Tools that add schema in the browser (some CMS plugins) need checking with
  the Rich Results Test, not `curl`.
- Mark up only what the page visibly shows. Values (price, rating, hours, address) match the visible
  text exactly. Markup for hidden content is a policy violation.
- `"@context": "https://schema.org"`, the most specific type that fits, absolute URLs, ISO 8601 dates,
  no placeholder text.
- Several entities on one page go in one `@graph`, with `@id`s linking them (Organization, WebSite,
  WebPage, the main entity).
- One consistent Organization per domain, with the same name, logo and `sameAs` everywhere.
- Never fabricate `AggregateRating` or `Review`. Ratings come from real, visible reviews; self-serving
  reviews of your own business are not eligible for stars.
- Validate with the Rich Results Test and the Schema.org validator after every change.

## What still earns a rich result (check Google's docs before promising one)

- Product (with Offer, price, availability, shipping and return policy), merchant listings.
- Review snippets and AggregateRating on eligible types.
- Article (headline, image, author, datePublished, dateModified).
- BreadcrumbList (only when breadcrumbs are visible).
- LocalBusiness (feeds the knowledge panel together with the Business Profile).
- Organization (logo, name, contact, sameAs), Event, JobPosting, Recipe, VideoObject, Dataset,
  SoftwareApplication, Course where they apply. Use `QAPage` for genuine user Q&A.

## What no longer pays for most sites

- **HowTo** rich results were removed in 2023. Do not add HowTo for SERP features.
- **FAQPage** rich results were narrowed to well-known government and health sites in 2023 and are
  reported retired since. Keep existing FAQ markup if the Q&A is visible; do not add it to win
  snippets. It can still help machines parse a real FAQ.
- Several niche types were retired in 2025 (for example ClaimReview, EstimatedSalary, VehicleListing,
  SpecialAnnouncement). Check Google's current list before using an unusual type.

## Core patterns

**Organization** (site-wide): `name`, `legalName`, `url`, `logo`, `sameAs` (Wikidata, Wikipedia,
LinkedIn, social profiles, business registers), `contactPoint`, `address`, `foundingDate`, `founder`,
`knowsAbout`, and where relevant `vatID`, `taxID`, `identifier`.

**LocalBusiness** (or a specific subtype such as `AutoRepair`, `Dentist`, `LegalService`): required
`name` and `address` (`PostalAddress` with `streetAddress`, `addressLocality`, `postalCode`,
`addressCountry`). Add `telephone` in international format, `openingHoursSpecification` (24-hour
times), `geo` (at least 5 decimals), `url`, `priceRange` (short), `image`, `sameAs`. The address
matches the Google Business Profile character for character.

**Product**: `name`, `image`, `description`, `sku` or `gtin`, `brand`, `offers` (`price` as a number,
`priceCurrency` ISO 4217, `availability` as a full `https://schema.org/InStock` URL,
`shippingDetails`, `hasMerchantReturnPolicy` with `returnPolicyCountry`), real `aggregateRating`.

**Article / BlogPosting**: `headline`, `image`, `author` (a Person with `url` and `sameAs`, or an
Organization), `publisher`, `datePublished`, `dateModified` (honest; it is a freshness signal).

**Person** (authors, founders): `name`, `jobTitle`, `worksFor`, `sameAs` (LinkedIn, ORCID, profile
pages). AI systems cross-check bylines against these profiles.

**WebSite**: `name`, `url`; a `SearchAction` only if site search really works.
