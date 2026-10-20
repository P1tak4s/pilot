Sugeneruok JSON-LD schema.org structured data lietuviškam verslui. Įdiek tiesiai į projektą arba grąžink kaip kodą.

## Argumentai

```
/schema-lt https://revmotors.lt       → analizuoja svetainę, generuoja schema
/schema-lt                            → analizuoja projektą iš failų
/schema-lt lokalBusiness              → generuoja tik LocalBusiness schema
/schema-lt faq                        → generuoja tik FAQPage schema
```

---

## 1 žingsnis - nustatyk verslo tipą ir surinki duomenis

### Jei gautas URL - fetch'ink ir ištrauk:
- Verslo pavadinimas (tiksliai kaip rašoma)
- Adresas (gatvė, miestas, šalis)
- Telefonas (su +370)
- El. paštas
- Darbo valandos
- Pagrindinės paslaugos
- Nuotraukos URL (jei matoma)
- Atsiliepimai / įvertinimas (jei matoma)
- Socialiniai tinklai (Facebook, Instagram, LinkedIn)

### Jei gautas projektas - ieškoti failuose:
- Footer komponentas (adresas, telefonas)
- Contact puslapis
- About/Apie mus puslapis
- `next.config.js` ar `metadata` - SEO duomenys

### Verslo tipo nustatymas:
| Raktažodžiai | Schema tipas |
|---|---|
| servisas, remontas, dirbtuvė | AutoRepair → LocalBusiness |
| restoranas, kavinė, baras | Restaurant → FoodEstablishment |
| advokatai, teisininkai | LegalService → LocalBusiness |
| gydytojas, klinika, odontologas | MedicalClinic → LocalBusiness |
| kirpykla, grožio salonas | BeautySalon → LocalBusiness |
| parduotuvė, shop | Store → LocalBusiness |
| statybos, renovacija | HomeAndConstructionBusiness |
| kita | LocalBusiness (bazinis) |

---

## 2 žingsnis - sugeneruok schemas

### A. LocalBusiness (PRIVALOMA kiekvienai svetainei)

```json
{
  "@context": "https://schema.org",
  "@type": "[AutoRepair|Restaurant|LegalService|...]",
  "name": "[Verslo pavadinimas]",
  "description": "[1-2 sakiniai apie verslą - ne AI stilius]",
  "url": "[https://svetaine.lt]",
  "telephone": "[+370XXXXXXXX]",
  "email": "[info@svetaine.lt]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Gatvė ir numeris]",
    "addressLocality": "[Miestas]",
    "postalCode": "[LT-XXXXX]",
    "addressCountry": "LT"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[platuma]",
    "longitude": "[ilguma]"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "18:00"
    }
  ],
  "image": "[https://svetaine.lt/nuotrauka.jpg]",
  "priceRange": "€€",
  "sameAs": [
    "[https://www.facebook.com/verslas]",
    "[https://www.google.com/maps?cid=...]"
  ]
}
```

### B. Organization (papildoma - jei ne vietinis verslas)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Verslo pavadinimas]",
  "url": "[https://svetaine.lt]",
  "logo": "[https://svetaine.lt/logo.png]",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "[+370XXXXXXXX]",
    "contactType": "customer service",
    "availableLanguage": "Lithuanian"
  }
}
```

### C. BreadcrumbList (navigacija - visoms svetainėms)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Pradžia",
      "item": "https://svetaine.lt"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Skyriaus pavadinimas]",
      "item": "https://svetaine.lt/skyrius"
    }
  ]
}
```

### D. Service (jei yra paslaugų puslapis)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "[Paslauga]",
  "provider": {
    "@type": "LocalBusiness",
    "name": "[Verslo pavadinimas]"
  },
  "areaServed": {
    "@type": "City",
    "name": "[Vilnius/Kaunas/...]"
  },
  "description": "[Paslauga aprašymas]"
}
```

### E. FAQPage (jei yra DUK puslapis ar sekcija)

Ištrauk klausimus ir atsakymus iš puslapio ir sugeneruok:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Klausimas?]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Atsakymas]"
      }
    }
  ]
}
```

### F. Review/AggregateRating (jei yra atsiliepimai)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Verslo pavadinimas]",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127",
    "bestRating": "5"
  }
}
```

---

## 3 žingsnis - įdiek į projektą

### Next.js (App Router - `app/layout.tsx` arba `app/page.tsx`):

```tsx
export const metadata = {
  // ...kiti metadata
};

// Pridėk prieš </body>:
const structuredData = {
  // schema objektas
};

// Komponente:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

### Next.js (Pages Router - `pages/_document.tsx`):

```tsx
import Script from 'next/script';

<Script
  id="schema-local-business"
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

### HTML svetainė:

```html
<script type="application/ld+json">
{
  // schema JSON
}
</script>
```

### WordPress:

Pridėk į `functions.php`:
```php
function add_schema_markup() {
    $schema = json_encode([/* schema */]);
    echo "<script type='application/ld+json'>{$schema}</script>";
}
add_action('wp_head', 'add_schema_markup');
```

---

## 4 žingsnis - patikrinimas

Po įdiegimo patikrink:
→ **Google Rich Results Test:** https://search.google.com/test/rich-results
→ **Schema Markup Validator:** https://validator.schema.org/

Dažnos klaidos:
- ❌ Trūksta `@context` arba `@type`
- ❌ Telefono formatas be `+370`
- ❌ Adresas ne `PostalAddress` tipas
- ❌ `openingHours` angliškai (`Mo-Fr`) o ne `OpeningHoursSpecification`

---

## Ataskaita

```
✅ Schema sugeneruota: [verslo pavadinimas]

Sukurtos schemas:
  ✅ LocalBusiness (AutoRepair)  → <head> arba layout.tsx
  ✅ BreadcrumbList              → kiekvienas puslapis
  ✅ FAQPage                     → /duk puslapis
  ✅ AggregateRating             → rodo žvaigždes Google rezultatuose

Patikrink:
  → https://search.google.com/test/rich-results?url=[URL]

Trūkstami duomenys (užpildyk rankiniu būdu):
  ⚠️  GPS koordinatės (latitude/longitude)
  ⚠️  Logo URL
```

## Projektas:
$ARGUMENTS
