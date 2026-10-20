Kalbai taikyk `lt-rasyba` skill'ą (ypač `references/ui-mikrotekstai.md` laiškų dalį). Jo taisyklės nugali šio failo kalbos patarimus.

Parašyk lietuvišką el. laišką verslui. Transakcinis (patvirtinimas, sąskaita, priminimai) arba rinkodaros (akcija, naujienlaiškis, reaktyvavimas).

## Naudok šias references
- `references/lithuanian-web-copy.md` - tonas ir stilius
- `references/linkeviciene-editing.md` - kalbos klaidos
- `references/lithuanian-patterns.md` - AI stilius vengtinas

---

## Argumentai

```
/rašyk-emailą užsakymo patvirtinimas, RevMotors, automobilių servisas
/rašyk-emailą akcija -20% padangoms, klientų sąrašas
/rašyk-emailą priminti klientą kad ateis laikas techninei apžiūrai
/rašyk-emailą sąskaita klientui Jonui Jonaičiui, 150€
```

---

## 1 žingsnis - nustatyk el. laiško tipą

### Transakciniai (automatiniai):
| Tipas | Kada siunčiamas |
|---|---|
| **Užsakymo patvirtinimas** | Klientas užsiregistravo paslaugai |
| **Priminimas** | X dienų prieš apsilankymą |
| **Sąskaita** | Po paslaugos |
| **Kvitas** | Po apmokėjimo |
| **Registracijos patvirtinimas** | Naujas vartotojas |
| **Slaptažodžio keitimas** | Saugumo pranešimas |

### Rinkodaros:
| Tipas | Tikslas |
|---|---|
| **Akcija** | Nuolaida, riboto laiko pasiūlymas |
| **Naujienlaiškis** | Naujienos, patarimai, turinys |
| **Reaktyvavimas** | Klientai kurie seniai nepirkę |
| **Padėka** | Po pirkimo, po atsiliepimo |
| **Sezoninis** | Žiema, vasara, šventės |

---

## 2 žingsnis - struktūra pagal tipą

### Transakcinis el. laiškas

```
TEMA: [Aiški, konkreti - ne AI šablonas]
     Gera: "Jūsų automobilis paruoštas - RevMotors"
     Gera: "Primename: diagnostika rytoj 10:00"
     Bloga: "Svarbi informacija dėl Jūsų užsakymo"

TURINYS:

[Sveikinimas - "Sveiki, [Vardas]" arba "Gerbiamas/-a [Vardas]"]

[PAGRINDINĖ ŽINUTĖ - 1-2 sakiniai, aiškiai kas įvyko]

[DETALĖS - lentelė arba sąrašas:]
  Paslauga: Variklio diagnostika
  Data: 2026-05-23, 10:00
  Adresas: Gedimino pr. 1, Vilnius
  Suma: 45 €

[CTA - vienas mygtukas arba nuoroda:]
  "Patvirtinti" / "Peržiūrėti sąskaitą" / "Gauti kelią"

[Pabaiga:]
  "Kilus klausimų - skambinkite +370 XXX XXXXX"
  "Ačiū, [Vardas] iš RevMotors"
```

### Rinkodaros el. laiškas

```
TEMA: [Intriguojanti, konkreti - turi sukelti norą atidaryti]
     Gera: "Padangų sezonas prasideda - -20% iki penktadienio"
     Gera: "Jūsų automobilis žiemos nesitiki - patikrinkite"
     Bloga: "Puiki galimybė jums ir jūsų automobiliui šią savaitę!"

PREVIEW TEKSTAS: [40-90 simbolių - matomas el. pašto sąraše]

TURINYS:

[ANTRAŠTĖ - 1 sakinys, drąsi]

[PROBLEMA arba PROGA - 1-2 sakiniai]

[PASIŪLYMAS - konkrečiai]
  "Padangų keitimas + balansavimas: 40 € (vietoj 50 €)"
  "Galioja iki: gegužės 31 d."

[SOCIALINIS ĮRODYMAS - jei yra]
  "Praėjusią žiemą pasinaudojo 340 klientų"

[CTA - vienas, ryškus]

[Pabaiga su kontaktais]
```

---

## 3 žingsnis - tono taisyklės

### Kreipiniai
- `Sveiki, [Vardas]` - šiltas, neformalus
- `Gerbiamas/-a [Vardas],` - oficialus (sąskaitos, juridiniai)
- `Sveiki,` - kai vardas nežinomas

### Kalbos forma - visada "Jūs"
- ✅ "Jūsų automobilis", "Jums siunčiame", "Registruokitės"
- ❌ "tavo automobilis", "tau siunčiame"

### Struktūra
- Trumpi paragrafai (2-3 sakiniai)
- Viena mintis = vienas paragrafas
- CTA mygtukas - liepiamoji nuosaka: "Peržiūrėti", "Patvirtinti", "Užsakyti"

### Ko nerašyti
- ❌ "Džiaugiamės galėdami pranešti..."
- ❌ "Laikomės įsipareigojimo teikti aukščiausios kokybės..."
- ❌ "Tikimės, kad ši žinutė Jus pasiekia geros sveikatos ir nuotaikos"
- ❌ Trys šauktukai iš eilės
- ❌ Per didelis tekstas - el. laiškas turi tilpti ekrane be slinkimo

---

## 4 žingsnis - pateik rezultatą

```
TEMA: [tema]
PREVIEW: [preview tekstas]

---

[El. laiško HTML arba Markdown turinys]

---

KOPIJA (plain text):
[Tekstinė versija be formatavimo]

TECHNINIAI DUOMENYS:
Tema: [X simbolių] [✅ ≤60 / ⚠️ per ilga]
Preview: [X simbolių] [✅ 40-90 / ⚠️ per ilgas]
Žodžių: [X]
Skaitymo laikas: ~[X] sek.
```

---

## Lietuviški el. pašto šablonai - pavyzdžiai

### Užsakymo patvirtinimas
**Tema:** Diagnostika patvirtinta - penktadienis 10:00 | RevMotors
**Turinys:**
Sveiki, Jonai.

Jūsų diagnostika patvirtinta.

📅 Data: penktadienis, gegužės 24 d., 10:00
📍 Adresas: Gedimino pr. 1, Vilnius
🔧 Paslauga: Variklio diagnostika

Automobilis bus paruoštas per 1-2 val. Skambinsime kai bus gatava.

Kilus klausimų: +370 600 00000

Iki ryto,
Marius iš RevMotors

---

### Akcija
**Tema:** Žiemos padangos: -20% šį savaitgalį
**Turinys:**
Sveiki,

Lapkritis - laikas keisti padangas. Ir šį savaitgalį - pigiau.

**Žiemos padangų keitimas + balansavimas: 40 € (vietoj 50 €)**

Vietos ribotos - šeštadienis ir sekmadienis.

[Registruotis →]

RevMotors, Gedimino pr. 1, Vilnius | +370 600 00000

---

## Kas parašyti:
$ARGUMENTS
