# Svetainės tekstas, kurį parašė žmogus

Skaityk visada, kai rašai ar taisai puslapį: hero, korteles, „kaip veikia“, kainas, DUK, kvietimą veikti. Taip pat tada, kai lietuvišką tekstą dedi į komponentus (JSX, HTML, i18n failus).

Kiti references failai moko sakinio: žodžių tvarkos, linksnių, „jūsų“ ir „yra“ pertekliaus. Šis failas apie kitą bėdą. Tekstas gali neturėti nė vienos tų klaidų ir vis tiek skambėti kaip pažodinis vertimas, nes iš anglų kalbos atėjo ne žodžiai, o pats **reklaminio puslapio žanras**.

## 1. Kodėl puslapis išeina „verstas“, nors klaidų nėra

Angliškas landing puslapis rašomas telegrafiškai: antraštė be veikėjo, kortelė su trijų žodžių „naudos antrašte“, daiktas, kuris pats kažkuo „virsta“, trigubas „No X. No Y. No Z.“. Anglų kalbai tai tinka: žodžiai trumpi, nekaitomi, daiktavardis lengvai tampa veiksmažodžiu. Lietuviškai tas pats suspaudimas duoda eilutes, kurias reikia šifruoti. Linteris jų nemato, nes kiekvienas žodis taisyklingas.

Pavyzdžiai iš mūsų pačių svetainių (2026-10). Visi praėjo linterį ir ankstesnes šio skill'o patikras:

| Buvo svetainėje | Angliškas sakinys, kuris girdisi | Kaip pasakytų žmogus |
|---|---|---|
| Kvito nuotrauka virsta sąnauda | Receipt photo turns into an expense | Nufotografuojate kvitą, o programa pati įrašo jį į sąnaudas |
| Apmokėta sąskaita pati atsiduria pajamose | A paid invoice lands in your income | Kai klientas sumoka, sąskaitos sumą programa įrašo į pajamas |
| Sąskaita ten, kur esate | Invoicing wherever you are | Sąskaitą išrašysite ir iš telefono |
| Jungiasi su tuo, ką jau naudojate | Connects with what you already use | Ką galima prijungti (ir išvardyti: parduotuvė, bankas, diskas) |
| Kiekvienas mėnuo be programos kainuoja dar vieną vakarą prie lentelių | Every month without it costs you another evening in spreadsheets | Mėnesio pabaigoje nebereikės vakaro praleisti prie lentelių |
| Be diegimo, be mokymų, be IT. | No setup. No training. No IT. | Diegti nieko nereikia, mokytis taip pat: užsiregistruojate ir rašote pirmą sąskaitą |
| Tiesioginė įtaka funkcijų prioritetams | Direct influence on feature priorities | Kurią funkciją kurti toliau, sprendžiame pagal jūsų prašymus |
| Tiesioginis ryšys su komanda | A direct line to the team | Rašote tiesiai tiems, kas kuria programą |
| Klausimas? Atsakome per 24 val. Reikia funkcijos? Pasiūlykite. | Got a question? We reply in 24h. Need a feature? Suggest it. | Į klausimus atsakome per 24 valandas darbo dienomis. Jei trūksta funkcijos, parašykite |
| Laikotarpis jau suskaičiuotas | Your period, already calculated | Mėnesio pajamas, išlaidas ir PVM matote jau suskaičiuotus |
| Trys žingsniai iki pirmos sąskaitos | Three steps to your first invoice | Kaip išrašyti pirmą sąskaitą |
| Visi duomenys lieka jūsų | All your data stays yours | Duomenys priklauso jums, bet kada galite juos išsikelti |
| tad su programa nesate susieti | so you are never locked in | todėl bet kada galite pereiti kitur |
| Pažiūrėkite, kaip pildosi jūsų savaitė | Watch your week fill up | Parodysime, kaip tai veiktų jūsų įmonėje |
| Nuo pirmo laiško iki susitikimo. | From first email to booked meeting. | Parašome pirmą laišką ir sutariame susitikimą |
| Mes randame klientus. Jūs parduodate. | We find the customers. You sell. | Surandame įmones, kurioms verta rašyti, ir sutariame susitikimą |
| MB ir UAB augančiam verslui. | For growing companies. | Mažosioms bendrijoms ir UAB |
| Be banko kortelės. Be ilgalaikių sutarčių. Atšaukite bet kuriuo metu. | No credit card. No long-term contracts. Cancel anytime. | Kortelės duomenų neprašome, ilgalaikės sutarties nereikia, o atsisakyti galite bet kada |

Dešinė skiltis ilgesnė. Tai normalu: lietuviškas sakinys su veikėju ir veiksmažodžiu užima daugiau vietos nei angliškas šūkis, užtat jį supranti iš pirmo karto.

## 2. Devyni požymiai

Kiekvienas atskirai nėra klaida. Kai puslapyje jų daug, skaitytojas mato vertimą.

**1. Negyvas veiksnys su perkeltiniu veiksmažodžiu.** Daiktas „virsta“, „atsiduria“, „nugula“, „keliauja“, „uždaro“, „pildosi“, „gimsta“, „kainuoja vakarą“. Angliškai `turns into`, `lands in`, `flows`. Lietuviškai veikia žmogus arba programa, o veiksmažodis tiesioginis: *įrašo, išsiunčia, suskaičiuoja, parodo, primena*. Patikra: ar veiksmažodis vartojamas tiesiogine reikšme? Jei ne, keisk. „Programa pati suskaičiuoja PVM“ tinka, „PVM susiskaičiuoja pats“ ne.

**2. Daiktavardinė nuotrupa ten, kur reikia sakinio.** „Tiesioginė įtaka funkcijų prioritetams“, „Asmeninė pagalba pradedant“, „Atsakymas į klausimus per 24 val.“ Paklausk: kas ką daro? Jei eilutėje atsakymo nėra, rašyk sakinį su veiksmažodžiu ir asmeniu: „Padedame susikelti duomenis“. Paprasti pavadinimai nėra nuotrupos: „Kainos“, „Kvitai“, „Banko išrašai“, „Dažniausiai užduodami klausimai“.

**3. Suspausta „naudos antraštė“ kortelėje.** Kortelės antraštė lietuviškai yra arba **etiketė** (1–3 žodžiai, daikto ar darbo pavadinimas: „Kvitai“, „SMS priminimai“), arba **pilnas sakinys** („Kvitą užtenka nufotografuoti“). Tarpinis variantas, 3–5 žodžių šūkis be aiškaus veikėjo („Kvito nuotrauka virsta sąnauda“, „Sąskaita ten, kur esate“), yra angliškas žanras. Jei maketas reikalauja labai trumpos antraštės, rašyk etiketę, o mintį pasakyk sakiniu po ja.

**4. Trigubos anaforos ir vieno žodžio sakiniai.** „Be X, be Y, be Z.“, „Jokių X. Jokių Y.“, „Greita. Paprasta. Patikima.“ Rašyk vieną sakinį su jungtukais: „Diegti nieko nereikia, o atsisakyti galite bet kada.“

**5. Klausimas-nuotrupa su atsakymu.** „Klausimas? Atsakome.“, „Reikia funkcijos? Pasiūlykite.“ Rašyk „Jei…, …“ sakinį. Pilnas klausimas su veiksmažodžiu lieka natūralus: „Turite klausimų? Paskambinkite.“

**6. „Lieka jūsų“, „ten, kur“, „tai, ką“.** „Duomenys lieka jūsų“, „žmogus lieka jūsų“, „ten, kur esate“, „su tuo, ką jau naudojate“, „tai, kas svarbiausia“. Angliškai `stays yours`, `wherever you are`, `what you already use`. Pavadink daiktą ar vietą: „telefone“, „su jūsų parduotuve ir banku“, „duomenys priklauso jums“.

**7. „Nuo X iki Y“ ir „N žingsniai iki Y“.** „Nuo pirmo laiško iki susitikimo“, „Trys žingsniai iki pirmos sąskaitos“. Rašyk veiksmažodžiais arba antrašte „Kaip…“: „Kaip išrašyti pirmą sąskaitą“.

**8. Elipsė, po kurios neaišku, kas kam.** „MB ir UAB augančiam verslui“, „Lietuvių kalba, be vertimo“, „Viskas jau surinkta“. Jei eilutę reikia skaityti du kartus, ji per daug suspausta. Grąžink žodžius, kuriuos išmetei.

**9. Šūkis-antitezė.** „Mes X. Jūs Y.“, „Mažiau X, daugiau Y“, „Jūs žinote ką, mes žinome kaip“. Pasakyk, ką darote ir ką žmogus gauna.

## 3. Metodas: pirma papasakok, tada trumpink

1. **Tekstas pirma, kodas paskui.** Prieš rašydamas komponentus, visą puslapio tekstą surašyk paprastu tekstu (faile `tekstai.md` projekte arba atsakyme): sekcija, antraštė, pastraipos, mygtukai. Kol tekstas nepatikrintas, JSX nerašyk. Kai tekstą rašai tiesiai į kortelę, galvoji langeliais (`title`, `description`), o tuščią langelį užpildo angliškas šablonas.
2. **Papasakok klientui.** Įsivaizduok, kad savininkas telefonu atsako žmogui, kuris apie įmonę girdi pirmą kartą: „Ką jūs darot?“, „Kaip tai vyksta?“, „Kiek kainuoja?“, „O jei netiks?“, „Kaip pradėti?“. Kiekvieną atsakymą užrašyk pilnais sakiniais, kaip pasakytum. Tai juodraštis, o klausimai yra puslapio sekcijos.
3. **Trumpink tol, kol sakinys lieka sakiniu.** Antraštė yra trumpiausias pilnas sakinys iš atsakymo arba paprasta etiketė. Veiksmažodžio ir veikėjo nebrauk.
4. **Kiekvienai antraštei, kortelei ir mygtukui taikyk tris testus** (4 skyrius).
5. **Duok perskaityti šviežiomis akimis** (7 skyrius), kai rašai visą puslapį.
6. **Tik tada kodas.** Jei lietuviškas sakinys į maketą netelpa, keisk maketą: platesnė kortelė, mažiau kortelių, antraštė per dvi eilutes. Sakinio dėl maketo nekarpyk.

H1 turi atsakyti, kas tai ir kam, arba pasakyti vieną konkretų dalyką su skaičiumi. Perskaitęs vien H1, žmogus turi suprasti, ką įmonė daro. „Butų, namų ir biurų valymas Kaune“ ir „Sąskaita per 60 sekundžių“ tinka. „Švara, kuria galite pasitikėti“ ne.

Lietuviškas tekstas maždaug penktadaliu ilgesnis už anglišką. Vietą planuok iš anksto.

## 4. Trys testai

**Atgalinio vertimo testas.** Išversk eilutę į anglų kalbą žodis po žodžio, ta pačia tvarka. Jei išeina sklandus angliškas reklamos sakinys („Receipt photo turns into an expense“), eilutė yra kalkė: perrašyk ją iš fakto. Geras lietuviškas sakinys, verčiamas pažodžiui, angliškai skamba kreivai („Photograph receipt, and program itself writes it into expenses“), nes jame dirba galūnės, priešdėliai ir žodžių tvarka.

**Telefono testas.** Ar savininkas taip pasakytų klientui telefonu? „Kvito nuotrauka virsta sąnauda“ nepasakytų niekas. „Nufotografuojat kvitą, ir jis iškart atsiranda sąnaudose“ pasakytų.

**Nepažįstamojo testas.** Perskaityk eilutę atskirai nuo puslapio. Ar žmogus, kuris produkto nematė, pasakys, kas ką daro? Jei reikia spėlioti, eilutė nesuprantama, kad ir kokia graži.

## 5. Iš ko matyti, kad rašė lietuvis

Šių priemonių anglų kalba neturi. Jei puslapyje nėra nė vienos, jis greičiausiai išverstas.

- Veikėjas yra skaitytojas, asmenį rodo galūnė: „Nufotografuojate kvitą“, „Įkeliate failą“, „Pasirenkate laiką“.
- Priešdėliai neša prasmę: „atsivežame priemones“, „persiunčiame buhalterei“, „susitvarkote patys“, „nebereikės perrašinėti“, „tereikia nuotraukos“.
- Naudininkas vietoj „jūs turite“: „Jums nieko ruošti nereikia“, „Buhalterei nebereikės skambinti“.
- Beasmeniai sakiniai: „Užtenka nuotraukos“, „Galima mokėti dalimis“, „Atsisakyti galima bet kada“.
- „Pats, pati“ prie veikėjo: „programa pati suskaičiuoja“, „klientas pats išsirenka laiką“.
- Šalutinis sakinys vietoj daiktavardžio: „Kai klientas sumoka, …“, ne „Po apmokėjimo…“.
- Jungtys sakinio viduje: „, o“, „, ir“, „todėl“, „tad“.

Neperlenk: „juk“, „gi“, „na“ svetainėje beveik netinka, liaudiško tono nekurk. Tikslas yra normali dalykinė šneka, kokia įmonės vadovas kalba su klientu.

## 6. Angliško puslapio vietos ir ką ten rašo lietuviai

| Vieta (EN) | Pažodinis vertimas | Lietuviškai |
|---|---|---|
| Features | Funkcijos, Galimybės | „Ką programa daro“, „Paslaugos“, „Ką valome“ |
| How it works | Kaip tai veikia | „Kaip veikia“, „Kaip dirbame“, „Kaip užsisakyti“ |
| Why choose us | Kodėl verta rinktis mus | Pats skirtumas antraštėje: „Kainą pasakome prieš darbą“ |
| Trusted by 500+ companies | Mumis pasitiki 500+ įmonių | „Programą naudoja 500 kirpyklų“ (tik jei tai faktas) |
| What our customers say | Ką sako mūsų klientai | „Atsiliepimai“, „Ką mano klientai“ |
| Pricing | Kainodara | „Kainos“ |
| FAQ | DUK | „Dažniausiai užduodami klausimai“, „Dažni klausimai“ |
| Get started | Pradėti, Pradėkite šiandien | Kas įvyks: „Išbandyti 30 dienų nemokamai“, „Gauti kainą“, „Registruotis vizitui“ |
| Learn more | Sužinokite daugiau | „Plačiau“, arba kur veda: „Visos paslaugos ir kainos“ |
| Book a demo | Užsisakyti demo | „Parodysime per 20 minučių“, „Susitarti dėl pokalbio“ |
| Contact us | Susisiekite su mumis | „Kontaktai“, „Parašykite“, „Skambinti“ |
| Ready to get started? | Pasiruošę pradėti? | „Paskambinkite, kainą pasakysime iš karto“ |
| Everything you need to… | Viskas, ko reikia… | Išvardyk, kas būtent |
| Built for busy teams | Sukurta užimtoms komandoms | „Skirta kirpykloms ir grožio salonams“ |
| No credit card required | Nereikia kreditinės kortelės | „Kortelės duomenų neprašome“ |
| Cancel anytime | Atšaukite bet kada | „Atsisakyti galite bet kada“ |
| No hidden fees | Jokių paslėptų mokesčių | „Kaina galutinė“ |
| Save time and money | Taupykite laiką ir pinigus | Kiek minučių, kiek eurų, ko nebereikės daryti |
| Tailored to your needs | Pritaikyta jūsų poreikiams | Ką galima pasirinkti ar pakeisti |
| in just a few clicks | vos keliais paspaudimais | Kiek tai trunka arba ką reikia padaryti: „per minutę“, „įrašę įmonės kodą“ |

Taip rašo lietuviškos svetainės (nuskaityta 2026-10-10 ir `korpusas.md`):

- „Sąskaita per 60 sekundžių“, „Sąskaitų atpažinimas per 30 sek.“, „Turite klausimų?“ (b1.lt)
- „Ieškokite darbo tarp 8 561 pasiūlymų“ (CVbankas)
- „Gydytojai, kurie jūsų laukia“, „Rinkitės paslaugą“ (manodaktaras.lt)
- „Mokėkite tik už tas dienas, kai būnate užsienyje“ (Tele2), „Nesunaudoti GB niekur nedings“ (Telia)
- „Išbandyti 30 dienų nemokamai“, „Atsiliepimai“ (Rivile), „Ką mano mūsų klientai“ (iv.lt)
- „Sekti siuntą“ (Venipak), „Dėti skelbimą“ (Autoplius)

O taip atrodo išverstos (tos pačios dienos imtis). Tai rodo, kad vertimo kalbos pilna ir gyvose svetainėse, todėl „taip rašo kiti“ nėra argumentas:

- „Mes puikiai tinkame tavo verslui“, „Sklandžiai pradėkite el. prekybos veiklą“ (Sąskaita123)
- „Tu vadovauji – DI kuria.“, „Pasirink planą, atitinkantį tavo poreikius“ (Hostinger)
- „Sklandus siuntų judėjimas be jokių geografinių barjerų“ (Venipak)
- „Efektyvus, tikslus ir nuolat tobulėjantis sprendimas jūsų apskaitai.“ (b1.lt)

## 7. Šviežių akių patikra

Savo teksto kalkių autorius nemato, nes žino, ką norėjo pasakyti. Kai parašei visą puslapį ir turi Agent įrankį, vien tekstą (be užduoties, be faktų, be kodo) atiduok atskiram agentui:

```
Esi lietuviškų tekstų redaktorius. Žemiau svetainės tekstas, eilutė po eilutės. Produkto nežinai.
Perskaityk <skill>/references/svetaines-tekstas.md 2 ir 4 skyrius.
Kiekvienai eilutei atlik tris testus: atgalinio vertimo, telefono, nepažįstamojo.
Grąžink tik eilutes, kurios neišlaiko bent vieno testo:
eilutė | kuris testas | ką supratai (arba „nesupratau“) | angliškas sakinys, kuris girdisi
Neperrašinėk ir negirk. Jei eilutė gera, jos neminėk.
```

Pažymėtas eilutes perrašai pats, iš faktų. Redaktorius faktų nežino, todėl jo perrašymai juos iškreiptų. Jei Agent įrankio nėra, tuos pačius testus atlik pats, eilutę po eilutės, perskaitęs tekstą nuo galo į pradžią.

Trumpam tekstui (mygtukas, vienas pranešimas, viena sekcija) atskiro agento nereikia, užtenka trijų testų.

## 8. Ta pati sekcija dviem būdais

Faktai: kvitą galima nufotografuoti telefonu, programa atpažįsta tiekėją, sumą ir PVM; banko išrašas sutikrinamas su sąskaitomis; i.SAF failas paruošiamas buhalterei.

**Angliškas žanras lietuviškais žodžiais:**

> ## Viskas jau surinkta
> **Kvito nuotrauka virsta sąnauda**
> Tiekėjas ir PVM atpažįstami automatiškai.
> **Išrašas sutikrinamas su sąskaitomis**
> Kuri sąskaita apmokėta, matote iš karto.
> **i.SAF be skaičiavimo**
> Failas paruoštas buhalterei.

**Kaip parašytų žmogus:**

> ## Ko mėnesio pabaigoje nebereikės daryti
> **Kvitai**
> Nufotografuojate kvitą telefonu, o tiekėją, sumą ir PVM programa įrašo pati.
> **Banko išrašas**
> Įkeliate išrašą ir matote, kurios sąskaitos apmokėtos, o kurių klientams dar reikia priminti.
> **i.SAF**
> Failą buhalterei programa paruošia iš tų pačių sąskaitų, tad nieko perrašinėti nereikia.

Kas pasikeitė: antraštė pasako, apie ką sekcija; kortelių antraštės tapo etiketėmis; kiekviename sakinyje aišku, kas ką daro; veiksmažodžiai tiesioginiai (*nufotografuojate, įrašo, įkeliate, paruošia*).

## Šaltiniai

- Mūsų svetainių tekstai, 2026-10-10 (1 skyriaus lentelė): pavyzdžiai, kuriuos naudotojas įvardijo kaip „beveik pažodžiui išverstus iš anglų“.
- b1.lt, cvbankas.lt, manodaktaras.lt, tele2.lt, rivile.lt, iv.lt, venipak.lt, saskaita123.lt, hostinger.lt: antraštės ir mygtukai nuskaityti 2026-10-10.
- `references/korpusas.md` 5 ir 7 skyriai (Telia, Autoplius, verstų platformų pavyzdžiai).
- Sakinio lygio taisyklės, kuriomis remiasi 5 skyrius: `references/sintakse-zodziu-tvarka.md` §3, §4, §6.
