# lt-rasyba

Claude Code skill'as, kuris rašo, taiso ir audituoja lietuviškus tekstus taip, kad jie neskambėtų kaip vertimas iš anglų kalbos ar AI.

Dauguma AI klaidų lietuvių kalboje slypi ne žodžiuose, o sakinio sandaroje. AI rašo angliškus sakinius lietuviškais žodžiais: veiksnį deda pirmą, o naujieną į pradžią, prieš kiekvieną daiktavardį prideda „jūsų“, vartoja pasyvą su veikėju ir daiktavardžių grandines. Todėl skill'as pirmiausia moko žodžių tvarkos ir sakinio logikos, o tik paskui žodžių.

Svetainėse yra ir antra bėda: angliško reklaminio puslapio žanras lietuviškais žodžiais („Kvito nuotrauka virsta sąnauda“, „Be diegimo, be mokymų, be IT.“). Sakiniai taisyklingi, bet skaitytojas mato vertimą. Tam skirtas `references/svetaines-tekstas.md`: tekstas rašomas pirma kodo, kaip pasakojimas klientui, o kiekviena antraštė tikrinama atgalinio vertimo, telefono ir nepažįstamojo testais.

## Kas viduje

| Failas | Turinys |
|---|---|
| `SKILL.md` | Rašymo metodas, taisymo ir audito eiga, sprendimai UI tekstams |
| `references/sintakse-zodziu-tvarka.md` | Žodžių tvarka, tema ir rema, pasyvas, nominalizacija, įvardžiai, dalyviai, jungtukai, antraštės |
| `references/svetaines-tekstas.md` | Svetainės puslapio tekstas: 9 angliško žanro požymiai, metodas, trys testai, puslapio vietų atitikmenys |
| `references/vertimo-kalba.md` | 60 vertimo kalbos požymių ir 10 pilnų perrašymų |
| `references/leksika-kalkes.md` | ~300 taisyklių iš VLKK Kalbos klaidų sąrašo ir konsultacijų banko, IT terminai, morfologija |
| `references/rasyba-skyryba.md` | Rašybos (2022) ir skyrybos (2019) taisyklės, pritaikytos internetui |
| `references/ui-mikrotekstai.md` | Mygtukai, formos, klaidų pranešimai, laiškai, kreipinys, UI žodynėlis |
| `references/korpusas.md` | Kaip iš tikrųjų rašo 15min, Delfi, LRT, VŽ, Lrytas ir 19 įmonių svetainių: statistika ir 22 šablonai su citatomis |
| `scripts/lt_lint.py` | Mechaninis tikrinimas be priklausomybių: failai, katalogai, gyvos svetainės |
| `scripts/korpusas/` | Korpuso rinkimo ir analizės skriptai, kad tyrimą būtų galima pakartoti |

## Šaltiniai

- VLKK: Kalbos klaidų sąrašas (buvęs DKKS), Kalbos konsultacijų bankas, Lietuvių kalbos rašybos taisyklės (2022, su 2022-05-26 pakeitimais), Lietuvių kalbos skyrybos taisyklės (2019), „Lietuvių kalbos skyryba“ (2020)
- N. Linkevičienė, „Redagavimo pradmenys“ (VU, 2013)
- Europos Komisija, „Rašykime aiškiai ir glaustai“
- VU MII, „Patarimai programinės įrangos vertėjui“
- Microsoft Lithuanian Style Guide
- Visuotinė lietuvių enciklopedija: „žodžių tvarka“, „aktualioji sakinio skaida“
- Terminų bankas (terminai.vlkk.lt)
- Gyvas korpusas: 16 straipsnių, 120 antraščių, 19 įmonių puslapių (2026-09-27)

Kiekviena taisyklė pažymėta: **[NORMA]** reiškia VLKK klaidą, **[STILIUS]** redagavimo rekomendaciją, **[PRAKTIKA]** redaktoriaus praktiką be tiesioginio šaltinio.

## Diegimas

```sh
git clone git@github.com:P1tak4s/lt-rasyba.git ~/dev/lt-rasyba
~/dev/lt-rasyba/install.sh   # symlink į ~/.claude/skills/lt-rasyba ir savitikra
```

## Linteris

```sh
python3 scripts/lt_lint.py tekstas.md src/ messages/lt.json
python3 scripts/lt_lint.py --crawl 30 https://svetaine.lt
echo "Įveskite savo el.paštą" | python3 scripts/lt_lint.py -
python3 scripts/lt_lint.py --json ... > radiniai.json
python3 scripts/lt_lint.py --test
```

Radinių lygiai: 🔴 VLKK normos pažeidimas, 🟡 AI ar vertimo kalbos žymė, 🔵 techninė rašyba.

Linteris žodžių tvarkos ir logikos nepagauna. Tam skirtas skill'o skaitymo etapas.

### Projekto taisyklės

`.lt-rasyba.json` projekto šaknyje:

```json
{ "enable": ["endash"], "disable": ["hyphen-as-dash"] }
```

Šis pavyzdys skirtas projektui, kuris sąmoningai nevartoja brūkšnio `–`, tik brūkšnelį `-`. Taisyklių pavadinimai rodomi linterio išvestyje laužtiniuose skliaustuose.
