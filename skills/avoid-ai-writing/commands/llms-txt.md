Sukurk `/llms.txt` failą svetainei. Šis failas padeda AI sistemoms (ChatGPT, Perplexity, Claude, Bing Copilot) suprasti svetainę ir ją cituoti paieškos atsakymuose.

## Kas yra llms.txt

`/llms.txt` - naujas standartas (2024+) analogiškas `robots.txt`, bet skirtas AI crawleriams.
AI sistemos jį skaito norėdamos suprasti: kas esi, ką darai, kokie svarbiausi puslapiai.

Šaltinis: https://llmstxt.org

---

## Argumentai

```
/llms-txt https://revmotors.lt    → analizuoja svetainę, generuoja llms.txt
/llms-txt                         → analizuoja projektą iš failų
```

---

## 1 žingsnis - surink informaciją

Fetch'ink arba nuskaityk projektą ir ištrauk:

**Privaloma:**
- Verslo pavadinimas
- Viena sakinys kas tai yra ir ką daro
- Pagrindiniai puslapiai su trumpu aprašymu
- Kontaktai

**Papildoma (jei yra):**
- Paslaugų sąrašas su URL
- FAQ/DUK URL
- Blog/Naujienos URL
- Kainodara URL

---

## 2 žingsnis - sugeneruok llms.txt

Formatas pagal llmstxt.org standartą:

```markdown
# [Verslo pavadinimas]

> [Vienas sakinys - kas tai yra ir ką daro. Konkrečiai, ne AI stilius.]

[Papildomas kontekstas - 2-3 sakiniai apie verslą, vietą, patirtį]

## Paslaugos

- [Paslauga 1](https://svetaine.lt/paslauga-1): [Trumpas aprašymas]
- [Paslauga 2](https://svetaine.lt/paslauga-2): [Trumpas aprašymas]
- [Paslauga 3](https://svetaine.lt/paslauga-3): [Trumpas aprašymas]

## Informacija

- [Apie mus](https://svetaine.lt/apie): [Trumpas aprašymas]
- [Kainodara](https://svetaine.lt/kainos): [Trumpas aprašymas]
- [DUK](https://svetaine.lt/duk): [Trumpas aprašymas]
- [Kontaktai](https://svetaine.lt/kontaktai): [Adresas, telefonas, darbo laikas]

## Kontaktai

- Adresas: [Gatvė, Miestas, Lietuva]
- Telefonas: [+370XXXXXXXX]
- El. paštas: [info@svetaine.lt]
- Darbo laikas: [Pirm-Penkt 8:00-18:00]
```

---

## 3 žingsnis - papildomai sukurk llms-full.txt

Ilgesnė versija su pilnu turiniu AI sistemoms kurios nori daugiau konteksto:

```markdown
# [Verslo pavadinimas] - Išsamus aprašymas

> [Verslo aprašymas]

## Kas mes esame

[2-4 sakiniai apie įmonę: kada įkurta, koks tikslas, kas išskiria]

## Paslaugos

### [Paslauga 1]
[3-5 sakiniai aprašymas. Kaina jei žinoma. Trukmė.]

### [Paslauga 2]
[3-5 sakiniai aprašymas.]

## Dažni klausimai

**[Klausimas 1?]**
[Atsakymas]

**[Klausimas 2?]**
[Atsakymas]

**[Klausimas 3?]**
[Atsakymas]

## Kontaktai ir lokacija

- Adresas: [visas adresas]
- Telefonas: [+370...]
- Darbo laikas: [detaliai]
- Google Maps: [nuoroda]
```

---

## 4 žingsnis - įdiek į projektą

### Next.js (App Router):

Sukurk `public/llms.txt` failą - automatiškai pasiekiamas `/llms.txt`

### Next.js (su dinaminiu generavimu):

Sukurk `app/llms.txt/route.ts`:

```typescript
export async function GET() {
  const content = `# RevMotors

> Automobilių servisas Vilniuje nuo 2010 m. Remontuojame per dieną.

## Paslaugos

- [Variklio remontas](/variklio-remontas): Visų markių variklio diagnostika ir remontas
- [Techninė apžiūra](/technine-apziura): Paruošiame automobilį techninei apžiūrai
- [Padangų keitimas](/padangu-keitimas): Vasarinių ir žieminių padangų keitimas

## Kontaktai

- Adresas: Gedimino pr. 1, Vilnius
- Telefonas: +37060000000
- Darbo laikas: Pirm-Penkt 8:00-18:00, Šeštadienis 9:00-14:00
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

### HTML svetainė:

Tiesiog įkelk `llms.txt` failą į serverio šakninį katalogą.

---

## 5 žingsnis - patikrink

```bash
curl https://tavosvetaine.lt/llms.txt
```

Turi grąžinti tekstą, ne 404.

---

## Copywriting taisyklės llms.txt tekstui

Šis tekstas yra skirtas AI skaitymui - bet turi būti tikslus ir žmogiškas:

- ✅ Konkretūs faktai: "Dirbame nuo 2010 m.", "Aptarnaujame per 24 val."
- ✅ Tikslios kainos jei galima: "Diagnostika nuo 30 €"
- ✅ Tikslus adresas su miestu
- ❌ Ne AI stilius: "Teikiame profesionalias paslaugas aukščiausios kokybės..."
- ❌ Ne tušti teiginiai: "Esame geriausi savo srityje"
- ❌ Ne per ilgas: llms.txt turi būti glaustus (ne >50KB)

---

## Ataskaita

```
✅ llms.txt sugeneruotas

Failai:
  public/llms.txt        → pagrindinis (trumpas)
  public/llms-full.txt   → išsamus (su DUK ir aprašymais)

Pasiekiami:
  https://[svetaine.lt]/llms.txt
  https://[svetaine.lt]/llms-full.txt

Patikrink:
  curl https://[svetaine.lt]/llms.txt
```

## Projektas:
$ARGUMENTS
