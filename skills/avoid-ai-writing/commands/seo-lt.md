SEO + AI SEO auditas lietuviškoms svetainėms. VISADA pradėk nuo plano - parodyk ką ketini daryti ir lauk patvirtinimo PRIEŠ pradėdamas auditą.

## SVARBU: planas pirma, auditas paskui

**Niekada nepradėk audito be patvirtinimo.** Visada:
1. Surink pradinę informaciją (URL, verslo tipas)
2. Parodyk planą - ką tikrinsit, kokia apimtis, kiek laiko
3. Lauk „taip" arba pakeitimų
4. Tik tada vykdyk

---

## Naudok šiuos skillius kartu

**Tradicinis SEO:**
- `seo-audit` - techninis + on-page SEO
- `seo-technical` - robots.txt, sitemap, canonicals, Core Web Vitals
- `seo-local` - jei vietinis verslas (GBP, NAP, vietiniai raktažodžiai)
- `seo-content-auditor` - turinio kokybė ir E-E-A-T
- `seo-sxo` - kodėl puslapis nerankinuoja net jei techniškai tvarkingas (intent mismatch)

**AI SEO (GEO):**
- `seo-geo` - matomumas Google AI Overviews, ChatGPT, Perplexity, Bing Copilot
- `ai-seo` - AI paieškos optimizavimas

**Lietuviška copy:**
- `avoid-ai-writing` → `references/seo-copy.md` - title/meta taisyklės
- `avoid-ai-writing` → `references/lithuanian-patterns.md` - LT kalbos klaidos

**Gyvų duomenų šaltinis (jei prijungtas):**
- `seo-dataforseo` - realūs SERP duomenys, rakažodžių apimtys, konkurentai

---

## Argumentai

```
/seo-lt https://revmotors.lt          → tikrina live svetainę
/seo-lt https://revmotors.lt/paslauga → tikrina konkretų puslapį
/seo-lt                               → tikrina projektą iš failų
```

---

## 1 žingsnis - greita apžvalga ir PLANAS

Prieš darydamas bet ką - surink pradinę informaciją ir pateik planą patvirtinimui.

### 1a. Greita apžvalga (1-2 min)

Jei gautas URL - fetch'ink pagrindinį puslapį ir greitai nuskaityk:
- Verslo pavadinimas ir tipas
- Pagrindinė paslauga ir miestas
- Kalba (LT / EN / mišri)
- Akivaizdžios problemos (jei matosi iš karto)

Jei gautas projektas (failai) - perskaityk `package.json`, `next.config`, pagrindinio puslapio failą.

### 1b. Pateik PLANĄ patvirtinimui

Parodyk šį planą PRIEŠ pradėdamas auditą:

```
══════════════════════════════════════════════
📋 SEO-LT PLANAS: [URL arba projektas]
══════════════════════════════════════════════

🏢 Verslas:    [pavadinimas]
📍 Tipas:      [vietinis / e-comm / SaaS]
🌍 Miestas:    [Vilnius / Kaunas / visa LT]
🔧 Duomenys:   [WebFetch / failai / DataForSEO ✅ / DataForSEO ❌]

KĄ TIKRINSIU:
──────────────────────────────────────────────
[✓] Techninis SEO       - robots.txt, sitemap, schema, HTTPS
[✓] On-page             - title, meta, H1/H2, alt tekstai
[✓] Lietuviška copy     - AI šablonai, gramatika, brūkšniai
[✓] AI SEO (GEO)        - citabilumas, llms.txt, AI crawleriai
[✓] SXO                 - intent match, puslapio tipas vs SERP
[ ] Vietinis SEO        - tik jei vietinis verslas
[ ] DataForSEO duomenys - [neprijungta / prijungta]

APIMTIS:
  Puslapiai:   [pagrindinis / visi / nurodytas]
  Apytikslis laikas: ~[5-15] min

KO NEGALĖSIU PATIKRINTI BE PAPILDOMŲ ĮRANKIŲ:
  ⚠️  Realios pozicijos Google (reikia DataForSEO)
  ⚠️  Rakažodžių paieškų apimtys (reikia DataForSEO)
  ⚠️  Konkurentų lyginimas (reikia DataForSEO)
  ⚠️  JS-injected schema (reikia browser arba rich-results-test)

══════════════════════════════════════════════
Pradėti auditą? (taip / keisti apimtį / atšaukti)
══════════════════════════════════════════════
```

**LAUK ATSAKYMO.** Nepradėk audito be patvirtinimo.

Galimi atsakymai:
- `taip` → vykdyk visą planą
- `tik techninis` → daro tik techninį SEO
- `tik copy` → daro tik lietuviškos copy auditą
- `tik AI SEO` → daro tik AI SEO / GEO analizę
- `pridėk DataForSEO` → vartotojas prijungs ir grįš
- `atšaukti` → sustabdyk

---

## 2 žingsnis - techninis SEO

Naudok `seo-technical` skillio metodologiją. Tikrink:

### Indeksacija ir crawl
- [ ] robots.txt egzistuoja ir neblokuoja svarbių puslapių
- [ ] sitemap.xml egzistuoja, pateiktas Google Search Console
- [ ] Noindex tagų nėra ten, kur neturėtų būti
- [ ] Canonical tagai teisingi (ne duplicate content)
- [ ] HTTPS visur, ne HTTP

### Techniniai klausimai
- [ ] 404 puslapiai turi tinkamą pranešimą lietuviškai
- [ ] Redirect grandinės (<2 redirect'ai)
- [ ] Mobile-friendly
- [ ] Core Web Vitals (jei galima patikrinti)

### Struktūriniai duomenys (Schema)
- [ ] LocalBusiness schema (jei vietinis verslas)
- [ ] Organization schema
- [ ] BreadcrumbList navigacijoje
- [ ] Product/Service schema (jei paslauga)
- [ ] FAQPage schema (jei yra DUK)

**Pastaba:** `WebFetch` nemato JS-injected schema. Jei reikia tikslaus patikrinimo - naudok Google Rich Results Test: https://search.google.com/test/rich-results

---

## 3 žingsnis - on-page SEO (kiekvienas puslapis)

### Title tag - LIETUVIŠKA KOPIJA
Tikrink pagal `references/seo-copy.md` + šias taisykles:

| Kriterijus | Reikalavimas |
|---|---|
| Ilgis | 30-60 simbolių |
| Rakažodis | Pirmame žodyje arba frazėje |
| Struktūra | `[Paslauga] [Mieste] \| [Įmonė]` |
| Kalba | Lietuvių (ne angliška) |
| Tonas | Konkretus, ne AI šablonas |
| Unikalumas | Kiekvienas puslapis - skirtingas |

❌ Klaidos title tag'uose:
- AI šablonas: "Profesionalios ir kokybiškos paslaugos Jūsų komfortui"
- Per ilgas: >60 simbolių
- Be rakažodžio: "Pagrindinis puslapis | Įmonė"
- Angliška kalba lietuviškame puslapyje
- Ilgi brūkšniai (---) vietoje (-) arba (|)

### Meta description - LIETUVIŠKA KOPIJA
| Kriterijus | Reikalavimas |
|---|---|
| Ilgis | 120-160 simbolių |
| CTA | Turi būti: Skambinkite, Registruokitės, Sužinokite daugiau |
| Konkreti nauda | Kaina, laikas, faktas - ne tušti žodžiai |
| Rakažodis | Natūraliai įtrauktas |
| Tonas | Aktyvus, ne pasyvus |

❌ Klaidos meta description:
- "Mūsų įmonė teikia profesionalias paslaugas aukščiausios kokybės standartais" (AI, tušta)
- Be CTA
- Per trumpas (<80 simbolių) arba per ilgas (>165)
- Pasyvus balsas: "paslaugos yra teikiamos"

### H1 - PAGRINDINIS ANTRAŠTĖ
- Tik VIENAS H1 puslapyje
- Turi turėti pagrindinį rakažodį
- Žmogiškas, ne robotiškas
- Gali sutapti su title tag arba būti šiek tiek platesnis

### H2 / H3 - SKYRIAI
- H2 = skyrių pavadinimai su antriniais rakažodžiais
- Venk "Apie mus", "Mūsų paslaugos" - per bendri
- Geriau: "10 metų automobilių remonto patirtis Vilniuje"

### Nuotraukų alt tekstai
- Ne tušti, ne "image001.jpg"
- Aprašo kas pavaizduota + kontekstas
- Lietuvių kalba
- Pvz: `automobilių servisas vilniuje variklio remontas`

---

## 4 žingsnis - vietinis SEO (jei vietinis verslas)

Naudok `seo-local` skillio metodologiją. Tikrink:

### Vietiniai raktažodžiai puslapyje
- [ ] Miestas/regionas H1 arba pirmame paragrafe
- [ ] Adresas footer'yje (schema + plain text)
- [ ] Darbo valandos puslapyje
- [ ] Telefonas (click-to-call mobile)

### NAP nuoseklumas (Name, Address, Phone)
- Tiksliai tas pats adresas, pavadinimas, telefonas:
  - Svetainėje
  - Google Business Profile
  - Facebook
  - Direktoriuose (Aruodas.lt, 118.lt, Verslo žinios)

### Google Business Profile signalai
- [ ] Ar GBP profilis yra ir verifikuotas?
- [ ] Ar kategorija teisinga?
- [ ] Ar atsiliepimai yra ir atsakoma į juos?

### Vietinė schema - LocalBusiness
```json
{
  "@type": "LocalBusiness",
  "name": "...",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "...",
    "addressLocality": "Vilnius",
    "addressCountry": "LT"
  },
  "telephone": "+370...",
  "openingHours": "Mo-Fr 08:00-18:00"
}
```

---

## 5 žingsnis - turinio kokybė (E-E-A-T)

Naudok `seo-content-auditor` skillio metodologiją. Tikrink:

### Patirtis ir autoritetas (Experience, Expertise)
- [ ] Ar yra konkretūs faktai (metai, skaičiai, statistika)?
- [ ] Ar yra tikri atsiliepimai su vardais?
- [ ] Ar minima patirtis konkrečiai ("Dirbame nuo 2010 m.")?
- [ ] Ar tekstas parašytas kaip ekspertas, ne kaip AI?

### Pasitikėjimas (Trust)
- [ ] Kontaktai aiškiai matomi
- [ ] Fizinis adresas
- [ ] Licencijos / sertifikatai (jei taikoma)
- [ ] Grąžinimo / garantijos politika

### Turinio gylis
- [ ] Ar puslapis atsako į vartotojo klausimą pilnai?
- [ ] Ar yra dažni klausimai (FAQ)?
- [ ] Ar yra nuotraukos / video?

---

## 6 žingsnis - lietuviška copy kokybė

Papildomai patikrink visą matomą tekstą pagal `references/seo-copy.md` ir `references/lithuanian-patterns.md`:

### Greitasis patikrinimas
- [ ] Nėra AI šablonų antraštėse ("Šiuolaikiniame sparčiai besivystančiame...")
- [ ] Nėra trijų būdvardžių sąrašų ("greitas, patikimas, profesionalus")
- [ ] CTA mygtukai lietuviškai ir liepiamojoje nuosaką ("Registruokitės", ne "Registruojies")
- [ ] "Jūs" forma visur nuosekliai
- [ ] Brūkšniai: (-) arba (–), ne (---)
- [ ] Kabutės: „..." ne "..."
- [ ] Nėra angliškų kalkių

---

## 7 žingsnis - AI SEO / GEO matomumas

Naudok `seo-geo` skillio metodologiją. Tai **ypač svarbu 2025-2026** - AI paieška auga 527% per metus.

### Citabilumas (ar AI cituos šį puslapį?)

AI sistemoms (ChatGPT, Perplexity, Google AI Overviews) svarbu:

**1. Konkreti, citatai tinkama informacija:**
- [ ] Ar yra konkretūs faktai, skaičiai, datos? ("Dirbame nuo 2010 m.", "Per 24 val.", "Nuo 50 €")
- [ ] Ar yra aiškūs apibrėžimai / atsakymai į klausimus? ("Kas yra X?", "Kiek kainuoja Y?")
- [ ] Ar tekstas parašytas kaip autoritetingas ekspertas (E-E-A-T)?
- [ ] Ar nėra AI generuoto tušto teksto (kurį AI atpažįsta kaip nepatikimą)?

**2. Struktūrinis skaitomumas AI crawleriams:**
- [ ] Antraštės (H2/H3) atsako į klausimus: "Kiek kainuoja?", "Kaip veikia?"
- [ ] Trumpi, aiškūs paragrafai (≤3 sakiniai idealiai)
- [ ] Sąrašai ir lentelės (lengviau cituoti)
- [ ] FAQ sekcija su konkrečiais atsakymais

**3. AI crawlerių prieiga:**
- [ ] `robots.txt` neblokuoja: GPTBot, ClaudeBot, PerplexityBot
- [ ] Puslapis greitai įkraunamas (AI crawleriai neturi daug laiko)
- [ ] Turinys matomas be JavaScript (statinis HTML)

**4. llms.txt (naujas standartas):**
- [ ] Ar yra `/llms.txt` failas svetainėje?
  - Formatas: `# Įmonės pavadinimas\n> Trumpas aprašymas\n\n## Puslapiai\n- [pavadinimas](url): aprašymas`
  - Padeda AI sistemoms suprasti svetainę

**5. Brando žinomumas AI duomenų bazėse:**
- [ ] Ar įmonė minima Vikipedijoje / Wikidata?
- [ ] Ar yra Google Knowledge Panel?
- [ ] Ar yra straipsnių / recenzijų kituose šaltiniuose?

### Lietuviška AI SEO specifika

**Google AI Overviews lietuvių kalba:**
- AI Overviews vis dar ribotas lietuviškiems paieškoms - bet auga
- Lokalūs paieškos terminai ("servisas Vilniuje") dažniau rodo tradicinį SERP
- Ilgos uodegos klausimų formos ("kaip patikrinti") - AI Overviews auga

**Perplexity / ChatGPT:**
- Naudoja anglų kalbos šaltinius dažniau
- Lietuviški šaltiniai cituojami jei yra unikalios informacijos
- **Rekomendacija:** turėk bent vieną puslapį anglų kalba su pagrindiniais faktais apie įmonę

**Bing Copilot:**
- Stipriau veikia Lietuvoje nei Google AI Overviews
- NAP duomenys iš Bing Maps svarbu
- Schema markup labai svarbu

### Praktiniai AI SEO žingsniai (prioritetai)

```
AUKŠTAS PRIORITETAS:
1. Pašalink AI stiliaus tekstą - jis mažina citabilumą
2. Pridėk FAQ sekciją su konkrečiais atsakymais
3. Tikrink robots.txt - neblokuok GPTBot/ClaudeBot/PerplexityBot
4. Pridėk konkrečius faktus: metai, kainos, laikas

VIDUTINIS PRIORITETAS:
5. Sukurk /llms.txt failą
6. Struktūrizuok H2/H3 kaip klausimus
7. Pridėk Organization/LocalBusiness schema

ILGALAIKIS:
8. Kurk turinį kuris atsako į nišinius klausimus
9. Gaukite paminėjimų kituose šaltiniuose (ne tik backlinks)
```

---

## 8 žingsnis - SXO (kodėl nerankinuoja)

Naudok `seo-sxo` skillio metodologiją kai puslapis techniškai tvarkingas bet nerankinuoja.

Klausimas: **Ar puslapio tipas atitinka ką Google rodo šiam raktažodžiui?**

- Jei Google rodo produktų puslapius, o tavo puslapis yra blog'o straipsnis - nerankinuosi
- Jei Google rodo "Kaip?" straipsnius, o tavo puslapis yra pardavimų puslapis - nerankinuosi
- Sprendimas: pažiūrėk ką Google rodo TOP 5 rezultatuose - ir sukurk TOKĮ patį puslapio tipą

---

## 10 žingsnis - ataskaita

### Suvestinė

```
═══════════════════════════════════════════
🔍 SEO-LT ATASKAITA: [URL arba projektas]
Verslo tipas: [vietinis / e-comm / SaaS]
Tikrinta: [data]
═══════════════════════════════════════════

BENDRAS ĮVERTINIMAS: [●●●●○] 4/5

🔴 KRITINĖS PROBLEMOS ([N])   ← blokuoja rankinimą
🟡 SVARBŪS PATAISYMAI ([N])   ← turi būti ištaisyta
🟢 GERAI ([N])                ← veikia tinkamai
═══════════════════════════════════════════
```

### Kiekviena problema - šiuo formatu

```
🔴 [Kategorija] Problemos pavadinimas
─────────────────────────────────────
Puslapis:     /paslaugos
Dabartinis:   "Profesionalios automobilių remonto ir techninio aptarnavimo..."
Siūlomas:     "Automobilių servisas Vilniuje | RevMotors"
Priežastis:   Title tag per ilgas (87 simboliai > 60), AI stilius
Prioritetas:  AUKŠTAS - tiesiogiai veikia CTR Google paieškoje
```

### Ataskaitos skyriai pagal prioritetą

```
━━━ 🔴 KRITINĖS PROBLEMOS (taisyti pirma) ━━━
[problemos]

━━━ 🟡 SVARBŪS PATAISYMAI ━━━
[problemos]

━━━ 📊 TECHNINĖ BŪKLĖ ━━━
robots.txt:     ✅ / ❌
sitemap.xml:    ✅ / ❌
Schema:         ✅ Rasta / ⚠️ Nerasta / ❌ Klaidinga
HTTPS:          ✅ / ❌
Mobile:         ✅ / ⚠️ / ❌

━━━ 📝 ON-PAGE SUVESTINĖ ━━━
Puslapis          Title    Meta     H1      Schema
/                 ✅60     ✅145    ✅      LocalBiz
/paslaugos        ❌87     ⚠️95     ✅      -
/kontaktai        ✅45     ❌52     ⚠️      -

━━━ 🏠 VIETINIS SEO (jei taikoma) ━━━
NAP nuoseklumas:  ✅ / ❌
GBP:              ✅ / ❌ / nežinoma
Vietinė schema:   ✅ / ❌

━━━ ✍️  COPY KOKYBĖ ━━━
AI stiliaus klaidos: [N] rastos
Gramatikos klaidos:  [N] rastos

━━━ 🤖 AI SEO / GEO BŪKLĖ ━━━
robots.txt blokuoja AI crawlerius:  ✅ Ne / ❌ Taip
llms.txt egzistuoja:                ✅ / ❌ Nerasta
Citabilūs faktai tekste:            ✅ / ⚠️ Mažai / ❌ Nėra
FAQ sekcija:                        ✅ / ❌
Statinis HTML (ne tik JS):          ✅ / ⚠️
AI SEO prioritetas:                 🔴 Kritinis / 🟡 Vidutinis / 🟢 Gerai
```

### Veiksmų planas

```
PRIORITETAI (tradicinis SEO):
1. (Šiandien)    Ištaisyti /paslaugos title tag - per ilgas, blokuoja CTR
2. (Šią savaitę) Pridėti LocalBusiness schema - kritinė vietiniam SEO
3. (Šį mėnesį)   Perrašyti meta descriptions - per trumpos, be CTA

AI SEO PRIORITETAI:
4. (Šiandien)    Patikrinti robots.txt - ar neblokuoja GPTBot/ClaudeBot
5. (Šią savaitę) Pašalinti AI stiliaus tekstą - mažina citabilumą
6. (Šią savaitę) Pridėti FAQ sekciją su konkrečiais klausimais/atsakymais
7. (Šį mėnesį)   Sukurti /llms.txt failą
8. (Ilgalaikis)  Gauti paminėjimų kituose šaltiniuose
```

---

## Svarbus pastebėjimas dėl schema markup

`WebFetch` ir `curl` **nemato** JavaScript-injekcijų schema (Yoast, AIOSEO, RankMath).
Jei rodoma "schema nerasta" - patikrink rankiniu būdu:
→ https://search.google.com/test/rich-results

---

## Projektas / URL:
$ARGUMENTS
