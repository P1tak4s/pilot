# Kaip rašo gyvi lietuviai: empirinis korpusas (2026-09-27)

Tikslas: iš tikrų lietuviškų tekstų (žurnalistika, įmonių svetainės) išvesti šablonus, kuriais AI tekstas skirtųsi nuo pažodinio vertimo iš anglų kalbos. Visos citatos pažodinės, paimtos iš `curl -sL -A "Mozilla/5.0"` žalio HTML (ne WebFetch santraukų), sutrumpintos iki ~30 žodžių. Rašybos klaidos originaluose paliktos.

## 1. Metodas

- Data: 2026-09-27. Įrankiai: `curl` + Python regex ištraukimas (`<p>`, `<h1-h3>`, `<li>`, `<button>`, `<a class="btn">`), lrytas.lt tekstas ištrauktas iš puslapyje įdėto JSON (`<p>`). Rinkimo skriptai: `scripts/korpusas/fetch.py`, `scripts/korpusas/analyze.py` (žalias HTML į repo nededamas).
- Žurnalistika: **16 straipsnių** iš 5 leidinių (15min 4, Delfi 3, LRT 3, VŽ 3 (mokama siena, tik pirmos 2-5 pastraipos), Lrytas 3). Žanrai: valdžios naujienos, eismas, auto/degalai, verslas/ekonomika (komentaras), mokslas/sveikata, pranešimas spaudai (Norfa, Enefit), analitinis tekstas (Delfi „Rytų Europos pjūvis“). Iš viso **398 sakiniai, ~6 200 žodžių**.
- Antraštės: **120** antraščių iš 15min, Delfi, Lrytas, VŽ RSS ir LRT pagrindinio puslapio (be rusiškų ir angliškų).
- Įmonių svetainės: naudingą tekstą davė **19 puslapių**: Telia (2), Pigu, Wolt, Bolt (2), Ignitis, Maxima AČIŪ, CityBee, Omniva, Rimi „Apie“, Swedbank, Sodra, post.lt/privatiems, Vinted „Kaip tai veikia“, CVbankas, CVonline, Autoplius (tik mygtukai), lt.wikipedia (Vilnius, Telia). Rinkodaros imtis: **586 teksto vienetai, 708 sakiniai/frazės, ~8 500 žodžių**, iš jų 285 pilni pastraipų sakiniai.
- **Nepavyko**: senukai.lt (5,6 KB, blokuota/JS), revolut.com/lt-LT („Just a quick security check“), manopaskola.lt (16 B), vinted.lt/help (tik JS), maxima.lt/apie-maxima ir cvbankas.lt/apie-mus (be teksto), Swedbank kortelių puslapis (reikia prisijungti, liko tik `${Swedbank.Labels(...)}` šablonai), LRT verslo skiltis (tik nuorodos). VŽ straipsniai tik daliniai.
- Sakinio pradžios klasifikacija: automatinė (regex) + **rankinė peržiūra** 185 „daiktavardžiu prasidedančių“ žurnalistikos sakinių (dalis jų iš tikrųjų prasideda vietos aplinkybe arba papildiniu). Skaičiai apytiksliai, ±3 p. p.

## 2. Pagrindinės išvados su skaičiais

### 2.1 Kuo prasideda sakinys (žurnalistika, 398 sakiniai, po rankinės patikros)

| Sakinio pradžia | Kiek | % |
|---|---|---|
| Veiksnys daiktavardžiu / vardu („Vyriausybė siūlo...“) | 120 | 30 % |
| Aplinkybė: laikas, vieta, būdas, sąlyga, padalyvis („Šiuo metu“, „Lietuvoje“, „Pakeitus ženklą“) | 75 | 19 % |
| Jungtukas ar siejamasis žodis („Tačiau“, „Be to“, „Todėl“) | 65 | 16 % |
| Įvardis („Tai“, „Šis“, „Jie“) | 31 | 8 % |
| Veiksmažodis, tarinys, beasmenė forma pirmoje vietoje („Skiriasi“, „Nėra“, „Skelbiama“, „Matome“) | 34 | 9 % |
| Citata („„...“, – sako...“) | 29 | 7 % |
| Ne veiksnys, o papildinys ar naudininkas pirmoje vietoje („Lietuvai reikia“, „Panašaus modelio laikosi Vengrija“) | 19 | 5 % |
| Klausimas | 14 | 4 % |
| Pasak / Anot | 6 | 2 % |
| Skaičius | 5 | 1 % |

Išvada: tik ~30 % sakinių prasideda veiksniu daiktavardžiu. **Maždaug 45 % sakinių prasideda ne veiksniu** (aplinkybe, papildiniu, naudininku, veiksmažodžiu, beasmene forma). AI, verčiantis iš anglų, beveik visada deda veiksnį pirmą.

Sakinį pradedantys jungtukai (65): Tačiau 13, Taip pat 6, Be to 5, Todėl 5, Vis dėlto 4, Taigi 4, Kadangi 3, Tiesa 3, Be kita ko 2, Kartu 2, Tuo metu 2, O 2, Užuot 2, kiti po 1. Vadinasi, „Be to,“ sakinio pradžioje yra normalu, bet **vidutiniškai kartą per 80 sakinių**, ne kiekvienoje pastraipoje.

### 2.2 Sakinio ilgis

| | Žurnalistika | Rinkodara (pastraipų sakiniai) | Rinkodaros antraštės h1/h2 |
|---|---|---|---|
| Vienetų | 398 | 285 | 119 |
| Vidurkis, žodž. | 15,5 | 12,8 | 3,6 |
| Mediana | 14 | 12 | 3 |
| Kvartiliai | 10 / 14 / 20 | 7 / 12 / 17 | |
| Min / max | 3 / 42 | 3 / 41 | |
| ≤8 žodžių | 18 % | ~25 % | |
| >25 žodžių | 11 % | ~9 % | |

Ritmas: žurnalistikoje ilgas informacinis sakinys (20-30 žodžių su šalutiniais sakiniais) dažnai eina po trumpo teiginio (4-8 žodžiai). Delfi analitiniame tekste: „Skiriasi ne tik dienų skaičius.“ (5 žodžiai) po 30 žodžių sakinio.

### 2.3 Jungtukai ir sąsaja (dažnis 1 000 žodžių)

| | Žurnalistika | Rinkodara |
|---|---|---|
| „, o“ (gretinimas sakinio viduje) | **4,7** | 1,8 |
| tačiau / Tačiau | 4,9 | 0,4 |
| taip pat / Taip pat | 3,7 | 0,4 |
| todėl / Todėl | 2,7 | 1,0 |
| bet | 2,6 | 2,1 |
| Be to, | 0,8 | 0 |
| Vis dėlto | 0,6 | 0 |
| nes | 0,6 | 0,2 |
| kadangi | 0,6 | 0 |
| Taigi | 0,6 | 0 |
| „Tuo tarpu“ | **0** | **0** |
| „Svarbu pažymėti“, „Verta paminėti“ | **0** | **0** |

„, o“ yra dažniausia sąsaja. „Tuo tarpu“ ir „Svarbu pažymėti“ (tipiški AI) neaptikti nė karto 15 000 žodžių.

### 2.4 Įvardžiai, pasyvas, „yra“

- **jūsų/Jūsų**: žurnalistikoje 0,2 / 1 000 žodž. (1 kartas, LRT FAKTAI reklaminė eilutė), rinkodaroje 4,3. **savo**: 1,0 ir 5,6. **tavo/tau**: 0 ir 1,3.
- **„buvo + dalyvis“** žurnalistikoje yra (21 kartas, 3,0 / 1 000): „buvo nuspręsta“, „buvo išvengta“, „buvo užtverta“. Pasyvas nėra draudžiamas. Bet **nė karto** nerasta „kuris buvo atliktas X-o“ tipo sakinio; veikėjas reiškiamas kilmininku prieš dalyvį („mokslininkų atlikta analizė“).
- Bendraties/beasmenės -ma, -ta formos dažnos: „Skelbiama“, „Teigiama“, „Siūloma“, „Siekiama“, „Neatmetama“, „investuota“, „nenustatyta“.
- **„yra“**: 27 kartai per ~7 000 žodžių (3,9 / 1 000). Dažnai jungtis praleidžiama ir dedamas brūkšnys: „Naujas standartas – 72 valandos.“

### 2.5 Antraštės (120)

- Vidutiniškai **10,1 žodžio** (mediana 10, nuo 3 iki 16).
- Su dvitaškiu: **53 (44 %)**. Schema „Kalbėtojas: teiginys“ ~15 (12 %).
- Su kabutėmis „“: 22 (18 %), su brūkšniu „ – “: 26 (22 %), klausimai: 6 (5 %).
- **Taško gale: 0. Šauktukų: 0.** Didžiąja raide rašomas tik pirmas žodis ir tikriniai vardai (120/120; vienintelė abejotina vieta: VŽ „ES Reglamentas dėl trumpalaikės nuomos“).

### 2.6 Rinkodara ir UI

- Veiksmo mygtukai (be navigacijos daiktavardžių): **bendratis 85, liepiamoji nuosaka 11** (tu 7, jūs 4). Bendratis yra norma: „Rinktis planą“, „Užsisakyti naujienas“, „Atsisiųsti programėlę“.
- Kreipinys: tu forma (Telia, Wolt vartotojams, CityBee, Vinted, Pigu antraštė) ir jūs forma (Swedbank, Ignitis, Maxima, Bolt, Omniva, Sodra, CVbankas) pasiskirsto maždaug per pusę. Dažnai **abi formos maišomos toje pačioje svetainėje** (Telia: reklama „Įsigyk“, DUK „Rinkdamiesi „Telia“, gaunate“).
- „Jūsų“ didžiąja raide: Pigu, Maxima, Sodra, CityBee (teisiniuose), Ignitis (vienoje vietoje). Swedbank reklaminiame tekste mažąja, sisteminiuose pranešimuose didžiąja.

### 2.7 Skaičiai, valiuta, datos, skyryba

| | Žurnalistika | Rinkodara |
|---|---|---|
| procentai | „proc.“ 11, „%“ 2 (tik VŽ, be tarpo „65%“) | „%“ 18 (13 su tarpu „95 %“, 5 be tarpo „91%“), „proc.“ 1 |
| valiuta | „eurų“ 12, „Eur“ 7 (auto: „2,4 Eur/l“), „€“ 0 | „€“ 28 (po skaičiaus su tarpu „1499 €“), „eurų“ 0 |
| dideli skaičiai | „1,7 mln. eurų“, „2,3 tūkst.“, „1,188 mlrd. eurų“ | „1 088 €“ (tarpas tūkstančiams), „650 000 +“ |
| datos | „rugsėjo 24 d.“, „2025 m.“, „birželį“, „šeštadienį“, „2019-aisiais“; ISO **0** | ISO „2026-07-29“ **15 kartų**, „2021 03 23“ (Swedbank) |
| kabutės | tik „“ (81), tiesių " **0** | „“ 170, tiesių 2 |
| brūkšnys | „ – “ 91 kartą (13 / 1 000 žodž.) | „ – “ 70 |
| ilgasis brūkšnys (U+2014) | **0** | **0** |

## 3. Šablonai: kaip rašo lietuviai (su citatomis) ir kaip tą patį parašo AI

Kiekvienam šablonui: tikros citatos su šaltiniu ir AI antipavyzdys (pažodinis vertimas iš anglų, sukurtas šiam palyginimui, ne rastas).

**Š1. Aplinkybė pradžioje, nauja informacija sakinio gale.**
- „Šiuo metu šalyje veikia 159 „Norfa“ parduotuvės.“ ([15min, Norfa](https://www.15min.lt/naujiena/bendroves/duris-atveria-atnaujinta-norfa-663-2770594))
- „Per mėnesį dujų kainos Europoje kone padvigubėjo ir pasiekė aukščiausią lygį nuo 2022 m. pabaigos“ ([VŽ, EK](https://www.vz.lt/energetika/2026/09/26/ek-ispeja-apie-galima-energetikos-krize-skatina-svarstyti-paklausos-ribojima-590579))
- „Rugpjūtį „Ifo“ eksporto lūkesčių indeksas šoktelėjo nuo –2,8 iki 9,6 punkto“ ([Lrytas, Vokietija](http://www.lrytas.lt/verslas/rinkos-pulsas/2026/09/27/news/vokietija-bunda-po-keleriu-metu-sastingio-pramoneje-pasirode-pirmieji-ryskesni-atsigavimo-zenklai-44125337/))
- AI: „159 „Norfa“ parduotuvės šiuo metu veikia visoje šalyje.“ / „Ifo eksporto lūkesčių indeksas rugpjūčio mėnesį šoktelėjo...“

**Š2. Papildinys pirmoje vietoje, veiksnys (naujiena) gale.** Žinoma informacija eina pirma, net jei tai papildinys.
- „Chemijos pramonę slegia išaugusios energijos ir žaliavų kainos bei Kinijos konkurencija.“ (Lrytas, Vokietija)
- „Panašaus modelio laikosi Vengrija.“ ([Delfi, krizė](https://www.delfi.lt/projektai/rytu-europos-pjuvis/jei-rytoj-istiktu-krize-kiek-dienu-europa-pasirengusi-isgyventi-120309247))
- „Geriausias galimybes turės elektronikos, optikos, elektros įrangos ir kitų technologinių komponentų gamintojai.“ (Lrytas, Vokietija)
- AI: „Vengrija taip pat laikosi panašaus modelio.“ / „Išaugusios energijos ir žaliavų kainos bei konkurencija iš Kinijos daro spaudimą chemijos pramonei.“

**Š3. Beasmenė -ma/-ta forma vietoj „Buvo pranešta“, „Yra rekomenduojama“.**
- „Skelbiama, kad šliužai bus naikinami atrinktuose plotuose“ ([Delfi, šliužai](https://www.delfi.lt/grynas/gamta/vilnius-kovos-su-invaziniais-sliuzais-skelbia-kur-ir-kaip-jie-bus-naikinami-120310619))
- „Į parduotuvės modernizavimą investuota 1,7 mln. eurų, joje dirbs 34 darbuotojai.“ (15min, Norfa)
- „Riebesnės mišrios mitybos grupėje reikšmingų pokyčių nenustatyta.“ ([Lrytas, mityba](http://www.lrytas.lt/it/laboratorija/2026/09/27/news/geros-zinios-senjorams-toks-mitybos-pokytis-biologini-amziu-per-4-savaites-gali-sumazinti-net-4-metais-44102166/))
- AI: „Yra skelbiama, kad šliužai bus naikinami.“ / „Buvo investuota 1,7 mln. eurų suma.“ / „Nebuvo nustatyta jokių reikšmingų pokyčių.“

**Š4. Šaltinis įnagininku: „X teigimu“, „X duomenimis“, „X skaičiavimu“.**
- „VRM skaičiavimu, tam reikėtų iki 20 tūkst. eurų „Regitros“ informacinių sistemų pritaikymui“ ([LRT, Regitra](https://www.lrt.lt/naujienos/eismas/7/3064112/vyriausybe-nemano-kad-regitra-turetu-priminti-apie-technines-apziuros-galiojimo-pabaiga))
- „Nes, LEA duomenimis, kitąmet benzino kaina dėl akcizų didinimo kils 4,3 proc“ ([15min, dyzelinas](https://www.15min.lt/naujiena/autorinka/dyzelino-kainos-rekordas-2-4-eur-dar-ne-pabaiga-1636-2770224))
- „Panaikinus teisinį neapibrėžtumą, B. Vėsaitės teigimu, bus sudarytos aiškios sąlygos ateities investicijoms Lietuvoje.“ ([Delfi, Seimas](https://www.delfi.lt/naujienos/lietuvoje/seimas-svarstys-ar-panaikinti-draudima-gaminti-tabako-produktu-dizaina-imituojancias-prekes-120310674))
- Korpuse tokių formų 11, „Pagal X duomenis“ **0**.
- AI: „Pagal VRM skaičiavimus, ...“ / „Remiantis LEA pateiktais duomenimis, ...“ / „Kaip teigia B. Vėsaitė, ...“

**Š5. „Pasak X,“ / „Anot X,“ sakinio pradžioje.**
- „Pasak institucijų, iki grėsmės pradžios buvo likę per mažai laiko.“ (Delfi, krizė)
- „Anot jo, taip būtų siekiama išvengti ne tik baudų...“ (LRT, Regitra)
- „Anot Vilniaus miesto savivaldybės, pirmiausia teritorijos bus šienaujamos, žolė išvežama“ (Delfi, šliužai)
- AI: „Pagal jį, ...“ / „Remiantis institucijomis, ...“ / „Kaip nurodė institucijos, ...“ (pastaroji galima, bet sunkesnė).

**Š6. Tiesioginė kalba: „„...“, – sako X.“** Kabutė, kablelis, brūkšnys, veiksmažodis, tada vardas. Dažnai esamasis laikas net apie praeitį.
- „„...Juos galima užpilti druska“, – rašo Vilniaus miesto savivaldybė.“ (Delfi, šliužai)
- „„...Pagal tai mes ir turime atlikinėti darbus...“, – aiškina Alytaus savivaldybės administracijos direktorius Gintaras Rakaitis.“ ([LRT, Alytus](https://www.lrt.lt/naujienos/eismas/7/3057025/alytuje-vienu-metu-remontuojama-desimtys-gatviu-gyventojai-skundziasi-spustimis))
- Veiksmažodžiai po citatos: rašo 4, sako 4, teigė 2, svarstė 2, po 1: teigia, pastebi, neslepia, aiškina, kalba, pasakoja, akcentuoja, piktinosi, sakė, tvirtino, komentavo, abejojo, informavo. Žodis „pareiškė“ neaptiktas.
- AI: „G. Rakaitis sakė: „...““ / „„...“ [ilgasis brūkšnys U+2014] aiškino G. Rakaitis.“ (anglų tvarka ir skyryba).

**Š7. Pareigos prieš vardą, antrą kartą inicialas.**
- „Bendrovės viešojo įkrovimo tinklo verslo valdymo vadovas Paulius Bartaševičius sako“, vėliau „– sako P. Bartaševičius.“ ([15min, Enefit](https://www.15min.lt/naujiena/autorinka/skelbia-naujiena-elektromobiliu-vairuotojams-kas-keiciasi-1636-2770122))
- „AB „Via Lietuva“ Komunikacijos skyriaus projektų vadovas Vytenis Radžiūnas“, vėliau „V. Radžiūnas“, „Kelininkų atstovas“ ([Lrytas, eismas](http://www.lrytas.lt/auto/saugus-eismas/2026/09/27/news/-visi-pikti-pypsina-vieni-kitiems-judriame-kelyje-vairuotojai-nesuprato-naujos-tvarkos-44156985/))
- AI: „Paulius Bartaševičius, bendrovės viešojo įkrovimo tinklo vadovas, teigia...“ (priedėlis po vardo) arba vardas be inicialo antrą kartą („Bartaševičius sako“).

**Š8. „Tai“ kaip anaforinė jungtis sakinio pradžioje.**
- „Tai 10,18 proc. daugiau nei 2024 m., kai bendrovės pardavimai sudarė 1,078 mlrd. eurų.“ (15min, Norfa)
- „Tai šią savaitę Ministrų kabinetas nusprendė posėdžio metu.“ (LRT, Regitra; „tai“ čia papildinys)
- „Tai reiškia, kad „evakuacinis krepšys“ nebūtinai yra galutinis pasirengimo tikslas.“ (Delfi, krizė)
- AI: „Šis skaičius atspindi 10,18 proc. augimą, palyginti su 2024 m.“ / „Šis sprendimas buvo priimtas Ministrų kabineto posėdžio metu šią savaitę.“

**Š9. Naudininkas pirmoje vietoje: kam reikia, kam tai reiškia.**
- „Lietuvai reikia kilti vertės grandine“ (Lrytas, Vokietija)
- „Lietuvos įmonėms tai reiškia, kad ruoštis reikia dabar“ (Lrytas, Vokietija)
- „Dalyviams nereikėjo skaičiuoti kalorijų“ (Lrytas, mityba)
- AI: „Lietuva turi poreikį kilti vertės grandine.“ / „Tai reiškia Lietuvos įmonėms, kad jos turi ruoštis dabar.“ / „Dalyviai neturėjo skaičiuoti savo kalorijų.“

**Š10. Padalyvis sakinio pradžioje sąlygai ir laikui.**
- „Pakeitus įstatymą pagrindiniu nusikaltimo požymiu taptų laisvanoriško sutikimo nebuvimas“ ([15min, Vyriausybė](https://www.15min.lt/naujiena/aktualu/lietuva/vyriausybe-siulo-pataisose-atsisakyti-vaiku-sutikimo-koncepcijos-seksualiniu-nusikaltimu-bylose-56-2772454))
- „Nuvykus į vietą paaiškėjo, kad situacija iš tiesų keista“ (Lrytas, eismas)
- „Įsigaliojus Europos reglamentui dėl trumpalaikės nuomos duomenų ir dalijimosi jais, ...“ ([VŽ, nuoma](https://www.vz.lt/mano-verslas/2026/09/23/es-reglamentas-del-trumpalaikes-nuomos-ka-reikia-zinoti-seimininkams-ir-sveciams-590438), aprašas)
- AI: „Po to, kai įstatymas bus pakeistas, ...“ / „Kai mes atvykome į vietą, tapo aišku, kad...“
- Pastaba: vertimuose padalyvio veikėjas nesutampa. Bolt: „Įdiegę šią fukciją, galime kelionės metu pastebėti...“ ([Bolt rides](https://bolt.eu/lt-lt/rides/)): funkciją įdiegia keleivis, o „galime“ Bolt.

**Š11. Gretinimas „, o“ viename sakinyje.**
- „Chronologinis amžius skaičiuojamas nuo gimimo, o biologinis šiuo atveju buvo apskaičiuotas pagal sveikatos matavimus.“ (Lrytas, mityba)
- „Vokietijos ekonomika antrąjį ketvirtį augo 0,3 proc., o eksportas per ketvirtį padidėjo 2 procentais.“ (Lrytas, Vokietija)
- „Elektromobilių skaičius Lietuvoje nuosekliai auga, o kartu didėja ir poreikis patogiems įkrovimo sprendimams.“ (15min, Enefit)
- AI: „Chronologinis amžius skaičiuojamas nuo gimimo. Tuo tarpu biologinis amžius...“ / „..., kai tuo tarpu eksportas...“

**Š12. Sakinį pradedančių jungtukų saikas: dažniausiai „Tačiau“.**
- „Tačiau perspėjimo sistema savaime nereiškia, kad žmonės žinos, ką daryti.“ (Delfi, krizė)
- „Be to, ministerija atkreipia dėmesį, kad „Regitra“ nevykdo techninės apžiūros“ (LRT, Regitra)
- „Vis dėlto bendra kryptis panaši“ (Delfi, krizė)
- AI: kiekviena pastraipa su „Be to,“, „Taip pat verta paminėti, kad“, „Svarbu pažymėti, kad“, „Galiausiai,“ (korpuse „Svarbu pažymėti“ ir „Verta paminėti“ **0**).

**Š13. Trumpas sakinys kaip ritmo kirtis.**
- „Skiriasi ne tik dienų skaičius.“ (Delfi, krizė)
- „Suomija taiko dar platesnį požiūrį.“ (Delfi, krizė)
- „Rezultatas priklausė nuo pasirinkto skaičiavimo varianto.“ (Lrytas, mityba)
- 18 % žurnalistikos sakinių turi ≤8 žodžius. Veiksmažodis dažnai pirmas („Skiriasi“).
- AI: „Svarbu pabrėžti, kad skirtumai neapsiriboja vien tik dienų skaičiumi.“

**Š14. Brūkšnys vietoj „yra“ (vardinis tarinys).**
- „Naujas standartas – 72 valandos.“ (Delfi, krizė, aprašas)
- „Benzino kainų vidurkis – 2,021 Eur.“ (15min, dyzelinas)
- „Biologinis ir chronologinis amžius – ne tas pats.“ (Lrytas, mityba)
- AI: „Naujasis standartas yra 72 valandų laikotarpis.“ / „Biologinis ir chronologinis amžius nėra tas pats dalykas.“

**Š15. Klausimas kaip perėjimas analitiniame tekste.**
- „Ką mokslininkai pakeitė žmonių lėkštėse?“ (Lrytas, mityba)
- „Kiek kainuoja degalai šią savaitę?“ (15min, dyzelinas)
- „O jeigu žmonės apskritai neišgirsta perspėjimo?“ (Delfi, krizė, tarpinė antraštė)
- AI: „Pažvelkime atidžiau, kokius pokyčius mokslininkai atliko.“ / „Šiame straipsnyje aptarsime degalų kainas.“

**Š16. Veikėjas kilmininku + dalyvis prieš daiktavardį (ne „kuris buvo atliktas X“).**
- „Australijos mokslininkų atlikta analizė parodė būtent tokio dydžio skirtumą“ (Lrytas, mityba)
- „Šias pataisas parengė praėjusiais metais sudaryta darbo grupė“ (15min, Vyriausybė)
- „UAB „Slaptojo pirkėjo tyrimai“ atlikto didžiųjų mažmeninės prekybos centrų aptarnavimo kokybės tyrimo metu“ ([Rimi, apie](https://www.rimi.lt/apie-rimi))
- AI: „Analizė, kuri buvo atlikta Australijos mokslininkų, parodė...“ (korpuse „kuris buvo + dalyvis“ **0**).

**Š17. Santykinis laikas be perteklinės datos.**
- „Tai šią savaitę Ministrų kabinetas nusprendė posėdžio metu.“ (LRT, Regitra)
- „Seimas birželį nutarė imtis pluošto Baudžiamojo kodekso pakeitimų“ (15min, Vyriausybė)
- „„...“, – rašo D. Jorgensenas laiške, kurį šeštadienį matė „Bloomberg“.“ (VŽ, EK)
- AI: „2026 m. rugsėjo 24 d., ketvirtadienį, Vyriausybė priėmė sprendimą“ / „Neseniai buvo priimtas sprendimas“.

**Š18. Rinkodara: nauda veiksmažodžiais, trumpais imperatyvais, be „mūsų produktas suteikia galimybę“.**
- „Stebėk duomenų likučius, apmokėk sąskaitas ir valdyk paslaugas vienoje programėlėje“ ([Telia](https://www.telia.lt/))
- „Rask arti esantį automobilį, atrakink jį tiesiog telefonu, keliauk kur nori Baltijos šalyse, palik kur patogu.“ ([CityBee](https://www.citybee.lt/lt/))
- „Mokėk tik už nuomos laiką ir nuvažiuotus kilometrus - kitkuo pasirūpinsime mes ;)“ (CityBee)
- AI: „Mūsų inovatyvi programėlė suteikia jums galimybę sklandžiai stebėti savo duomenų likučius ir efektyviai valdyti jūsų paslaugas.“

**Š19. Konkretus faktas ar skaičius vietoj būdvardžių.**
- „Nesunaudoti GB niekur nedings“ ir toliau „likutį automatiškai perkeliame į kitą mėnesį“ ([Telia, mobilusis ryšys](https://www.telia.lt/privatiems/mobilusis-rysys))
- „Vos nuo 0,11 €/min.!“ (CityBee)
- „Apsimoka! Net 6 mėn. – 0,00 €“ ([Ignitis](https://ignitis.lt/lt))
- AI: „Mėgaukitės lanksčiais, patogiais ir inovatyviais sprendimais, pritaikytais būtent jūsų poreikiams.“

**Š20. Mygtukas bendratimi: veiksmas + objektas.**
- Telia: „Rinktis planą“, „Užsisakyti televizijos planą“, „Perkelti numerį į Telia“; Bolt: „Atsisiųsti programėlę „Bolt““, „Užsiregistruoti vairuoti“; Ignitis: „Užsisakyti naujienas“; Autoplius: „Dėti skelbimą“; Sodra: „Išsaugoti nuostatas“.
- Santykis 85 : 11 bendraties naudai. Liepiamoji rasta: Wolt „Pradėkite dabar“, „Sužinokite daugiau“ (ir „Atrask Wolt Market“), CityBee „Sužinok kainas“, Vinted „Pradėk dabar“, Sodra „Prisijunkite“.
- AI: „Užsisakykite dabar!“, „Sužinokite daugiau čia“, „Pradėkite savo kelionę“.

**Š21. „savo“, kai veiksnys yra savininkas; „jūsų“, tik kai veikia kitas.**
- „Apdrauskite savo gyvybę“ ([Swedbank](https://www.swedbank.lt/private))
- „Supaprastinkite savo įmonės kelionių išlaidas su „Bolt for Business“ Lietuvoje.“ (Bolt rides)
- „Padedame auginti jūsų verslą“ ([Wolt](https://wolt.com/lt/ltu)): veikia „mes“, todėl „jūsų“ taisyklinga.
- AI: „Apdrauskite jūsų gyvybę“ / „Valdykite jūsų paslaugas“ (anglų *your*).
- Žurnalistikoje įvardžių beveik nėra: „jūsų“ 1 kartas per 6 000 žodžių.

**Š22. Antraštė: esamasis laikas arba dalyvis be „buvo“, dvitaškis, sakinio raidynas.**
- „Vyriausybė siūlo pataisose atsisakyti vaikų sutikimo koncepcijos seksualinių nusikaltimų bylose“ (15min)
- „Jungtinėje Karalystėje dėl įtarimų rengus teroro aktą sulaikyti penki asmenys“ (15min RSS)
- „Budanovas: Rusijos retorika tampa vis agresyvesnė“ (Delfi RSS)
- AI: „Vyriausybės Pasiūlymas Dėl Vaikų Sutikimo Koncepcijos Atsisakymo“ / „Penki asmenys buvo sulaikyti Jungtinėje Karalystėje.“

## 4. Antraštės: sintaksė praktikoje

| Tipas | Pavyzdys (tikras) | Šaltinis |
|---|---|---|
| Veiksnys + esamasis laikas | „EK įspėja apie galimą energetikos krizę, skatina svarstyti dujų paklausos ribojimą“ | VŽ |
| Būsimasis laikas | „Seimas svarstys, ar panaikinti draudimą gaminti tabako produktų dizainą imituojančias prekes“ | Delfi |
| Dalyvis be „buvo“, aplinkybė pradžioje | „Per avariją Alytuje sužalotos dvi merginos“ | 15min |
| Kalbėtojas: teiginys | „JAV iždo sekretorius: pastangos izoliuoti Iraną jau duoda vaisių“ | 15min |
| Šaltinio žymė: | „Šaltiniai: UK skaitmeninį banką „Monzo“ nori pirkti brazilų „Nubank““ | VŽ |
| Citata kabutėse + paaiškinimas | „„Visi pikti, pypsina vieni kitiems“: judriame kelyje vairuotojai nesuprato naujos tvarkos“ | Lrytas |
| Brūkšnys vietoj veiksmažodžio | „Per Rusijos atakas Ukrainoje žuvo 14, sužeisti 57 žmonės, Odesos srityje – masinis smūgis“ | VŽ |
| Klausimas | „Jei rytoj ištiktų krizė: kiek dienų Europa pasirengusi išgyventi?“ | Delfi |
| Nuomonė: Autorius. Antraštė | „V. Romeika. Kai DI gamina triukšmą, sąskaitą apmoka vadovybė“ | VŽ |
| Paslaugų žurnalistika | „ES Reglamentas dėl trumpalaikės nuomos: ką reikia žinoti šeimininkams ir svečiams“ | VŽ |
| Vardininkinė (retesnė) | „UEFA Tautų lygos rungtynės Kaune: Lietuva – Azerbaidžanas“ | LRT |
| Populiarus „masalas“ (Lrytas, 15min pramogos) | „Neįtikėtina, kas nutiko Lenkijoje: tiesioginio eterio metu – šokiruojanti avarija“ | 15min |

Taisyklės iš imties: sakinio raidynas (ne Title Case), be taško gale, 8-14 žodžių, dvitaškis skaido temą ir naujieną, pavardė su inicialu („D. Trumpas“, „S. Lavrovas“) arba be jo („Budanovas:“).

Svetainių antraštės (h1/h2, vid. 3,6 žodžio): vardininkinės („Mobilusis ryšys, internetas ir televizija“, Telia), superlatyvas („Greičiausias mobilusis ryšys Lietuvoje“, Telia), sakinys („Nesunaudoti GB niekur nedings“, Telia), klausimas („Kodėl verta rinktis Telia?“), sąlyginis šūkis („Kam vairuoti, jei yra „Bolt““, Bolt), bendratinė („Parduoti paprasta“, Vinted). Šauktukas h1/h2 gale: 14 iš 119, klausimas 4, taškas 3. DUK skyrius visur vadinamas „Dažniausiai užduodami klausimai“ (Telia, Bolt, Sodra).

## 5. Rinkodaros ir UI praktika

| Svetainė | Kreipinys | Mygtukai | Tikri pavyzdžiai |
|---|---|---|---|
| [Telia](https://www.telia.lt/) | tu (reklama), jūs (DUK) | bendratis | „Įsigyk naująjį iPhone jau dabar!“; mygt. „Rinktis planą“; DUK „Rinkdamiesi „Telia“, gaunate:“ |
| [Pigu](https://pigu.lt/lt/) | tu antraštėje, Jūs (didž.) SEO tekste | bendratis | h1 „Pigu.lt – internetinė parduotuvė tavo kasdieniams pirkiniams“; „Rekomenduojame Jums“; mygt. „Prisijungti“, „Ne, ačiū“ |
| [Wolt](https://wolt.com/lt/ltu) | tu vartotojui, jūs verslui, maišoma | liepiamoji (tu ir jūs) | „Mėgaukis nemokamu pristatymu iš restoranų ir parduotuvių tavo mieste.“; „Prisijunk, kad gautumėte išsaugoti adresus“; „Pakoreguok užsakymą“ ir „Pakoreguokite užsakymą“ |
| [Bolt](https://bolt.eu/lt-lt/) | jūs (mažąja) | bendratis | „Išsikvieskite automobilį vos per kelias minutes.“; mygt. „Atsisiųsti „Bolt““, „Važiuoti“ |
| [Ignitis](https://ignitis.lt/lt) | jūs („Jūsų“ ir „jūsų“) | bendratis + „Noriu paklausti“ | „Pasiūlymai pritaikyti Jūsų poreikiams“ ir „energijos jūsų namuose naudojančius įrenginius“ |
| [Swedbank](https://www.swedbank.lt/private) | jūs (reklamoje mažąja, sistemoje „Jums“) | bendratis | „Mokykitės investavimo taip, kaip jums patogu“; „Siūlome Jums naudotis naršyklėmis“; „Atlikti testą“ |
| [Maxima AČIŪ](https://www.maxima.lt/aciu) | Jūs (didž.) | daiktavardis/bendratis, DIDŽIOSIOS | „1 % sugrįš į Jūsų AČIŪ kortelę po kiekvieno apsipirkimo.“; „PRISIJUNGTI“, „REGISTRUOTIS“ |
| [CityBee](https://www.citybee.lt/lt/) | tu (reklama), Jūsų (privatumas) | liepiamoji tu | „Tau tereikia mobiliosios programėlės.“; „Sužinok kainas“, „Atsisiųsk programėlę“ |
| [Omniva](https://www.omniva.lt/) | jūs (mažąja) | daiktavardis + „Siųskite“ | „Sutaupykite laiko sekdami ir tvarkydami visas siuntas vienoje vietoje.“ |
| [Vinted](https://www.vinted.lt/how_it_works) | tu | bendratis + liep. tu | h1 „1. Įkelk nemokamai“, „2. Parduok ir išsiųsk“, „3. Gauk pinigus“; „Įkelti prekę“, „Pradėk dabar“ |
| [Sodra](https://www.sodra.lt/) | jūs, „Jūsų“ | bendratis | „Jei esate pateikę prašymą nutraukti pensijų kaupimą, savo turto vertę galėsite sužinoti...“; „Priimti“, „Atmesti“ |
| [post.lt](https://www.post.lt/lt/privatiems) | Jūs (oficialiai) | bendratis | „Gerbiamas kliente, pateikdamas duomenis ir dokumentus, Jūs patvirtinate, kad:“; „Ruošti sąskaitą“ |
| [CVbankas](https://www.cvbankas.lt/) | jūs | daiktavardis | h1 „Ieškokite darbo tarp 8 762 pasiūlymų“ |
| [Autoplius](https://autoplius.lt/) | (nėra teksto) | bendratis | „Dėti skelbimą“, „Spręsti testą“, „Nemokamas vertinimas“ |

Išvados:
1. Mygtukai: **bendratis** („Rinktis planą“), net kai tekstas aplink kreipiasi tu arba jūs forma.
2. Tu forma būdinga platformoms jauniems vartotojams (Vinted, CityBee, Telia reklama, Wolt), jūs forma bankams, energetikai, valstybei, paštui.
3. „Jūsų“ didžiąja raide lieka teisiniuose, bankiniuose, oficialiuose tekstuose (post.lt, Sodra, Maxima, Pigu SEO). Reklamoje dažniau mažąja (Bolt, Omniva, Swedbank reklama).
4. Privalumai rašomi veiksmažodžiais ir konkrečiais skaičiais: „Apmokėk sąskaitas“, „nuo 0,11 €/min.“, „Nesunaudoti GB niekur nedings“.
5. Pasyvo rinkodaroje beveik nėra (buvo+dalyvis 0,4 / 1 000 žodž.), vyrauja „mes“ forma: „likutį automatiškai perkeliame“, „pasirūpinsime mes“.

## 6. Skaičiai, datos, valiuta praktikoje

- **Procentai**: žurnalistika „10,18 proc.“, „0,3 proc.“, „14 proc.“ (15min, Lrytas, LRT); kartais „2 procentais“ sakinio gale (Lrytas). VŽ rašo „65%“ be tarpo. Rinkodara „95 %“ (Telia, su tarpu), „-40 %“ (Telia), „91%“ (Wolt), „1 %“ (Maxima).
- **Valiuta**: žurnalistika žodžiu „1,7 mln. eurų“, „apie 80 tūkst. eurų“, „3 tūkst. 800 eurų“ (Delfi, citata); automobilių tema „2,4 Eur/l“, „2,021 Eur“ (15min). Rinkodara simbolis po skaičiaus su tarpu: „nuo 62,46 €/mėn. arba 1499 €“ (Telia), „1 088 €“; išimtis „0€ pristatymo mokestis“ (Wolt). CityBee „2 EUR nuolaidų kuponas“, post.lt „10 Eur“.
- **Datos**: žurnalistika „rugsėjo 24 d.“, „gruodžio 3 d.“, „2026 m. balandžio 27 d.“, „2025 m. kovą“, „2019-aisiais“, „šeštadienį“, „praėjusį ketvirtadienį“; ISO formato 0. Rinkodara ISO „2026-07-29“ (Telia), „Pasiūlymas galioja iki 2026-09-30.“ (Swedbank), „Nuo 2021 03 23“ (Swedbank), „Nuo rugsėjo 23 d.“ (CityBee naujiena).
- **Laikas**: „nuo 8 iki 19 val.“ (post.lt), „08:00-22:00“ (Pigu), „(8–22 val.)“ (Maxima).
- **Dešimtainis kablelis** visur („2,3 tūkst.“, „6,6 °C“), tūkstančiai tarpu („8 762 pasiūlymų“, „1 088 €“) arba sutrumpinimu („2,41 mlrd. eurų“).
- **Intervalai**: „trims–septynioms dienoms“, „3,5–4,1 metų“ (brūkšnys be tarpų), „rugsėjo 21-23 d.“ (15min, brūkšnelis).
- **Kabutės**: tik „“. Įmonių vardai kabutėse ir linksniuojami: „Regitrą“, „Regitros“, „Norfos“, „AB „Via Lietuva““. Užsienio vardai kabutėse nelinksniuojami: „Hesburger“, „Bloomberg“.
- **Brūkšnys** „ – “ su tarpais: 13 kartų per 1 000 žodžių žurnalistikoje (citatos įvedimas, praleistas „yra“, patikslinimas). **Ilgojo brūkšnio (U+2014) nė vieno** visame korpuse.

## 7. Ko lietuviai nedaro (arba daro tik vertimuose)

Nerasta 16 žurnalistikos straipsnių ir 19 svetainių (~15 000 žodžių):
- „Šiuolaikiniame pasaulyje“, „Mes esame čia, kad...“, „Svarbu pažymėti“, „Verta paminėti“, „Tuo tarpu“, „išnaudokite potencialą“: **0**.
- „kuris buvo + dalyvis“ (sakinys su „by“ pasyvu): **0**.
- Ilgasis brūkšnys (U+2014): **0**. Tiesios kabutės žurnalistikoje: **0**. Title Case antraštėse: **0** (1 abejotinas).
- Taškas antraštės gale: **0 iš 120**.

„Vertimo kalba realybėje“: pasitaiko tarptautinių platformų, korporatyvinių vertybių puslapių ir pranešimų spaudai tekstuose:
- Bolt (verstas): „Mūsų lengvai naudojama pavėžėjimo paslauga sujungia jus su aukščiausius įvertinimus turinčiais vairuotojais Lietuvoje“; „Esame įsipareigoję mažinti savo poveikį aplinkai“; „Kai keliaujate naudodamiesi „Bolt“ paslaugomis Lietuvoje, niekada nesate vieni.“ ([Bolt rides](https://bolt.eu/lt-lt/rides/)). Pastebimas SEO „Lietuvoje“ kartojimas kiekviename sakinyje.
- Wolt (verstas): „Padedame auginti jūsų verslą, padėdami tūkstančiams žmonių jį atrasti.“; „Tikra pagalba iš tikrų žmonių“; „Kai jūs uždirbate, mes uždirbame.“; „100 % rizikos neturintis sprendimas“; tu ir jūs viename mygtuke „Prisijunk, kad gautumėte išsaugoti adresus“ ([Wolt](https://wolt.com/lt/ltu)).
- Omniva (verstas, sulūžęs): „Pasaulis siunta pasiekiamas“; „Viena siunta – džiaugsmo dvigubai!“ ([Omniva](https://www.omniva.lt/)).
- Enefit pranešimas spaudai (citata 15min): „visa patirtis turi būti sklandi“; „Elektromobiliai palaipsniui tampa platesnės energetikos ekosistemos dalimi.“; „kurti papildomą vertę vartotojams“ ([15min, Enefit](https://www.15min.lt/naujiena/autorinka/skelbia-naujiena-elektromobiliu-vairuotojams-kas-keiciasi-1636-2770122)).
- Rimi vertybės: „Atliepiame pirkėjų lūkesčius ir poreikius visų apsipirkimų metu.“; „Kuriame pasitikėjimą siūlydami personalizuotus sprendimus“ ([Rimi](https://www.rimi.lt/apie-rimi)).
- Telia tinklaraštis, trijų būdvardžių sąrašas: „vartotojai šiandien susiduria su išskirtine gausa kokybiškų, inovatyvių ir išraiškingų pasirinkimų“ ([Telia](https://www.telia.lt/)).
- Pigu SEO: „paprastas, sklandus apsipirkimo procesas“; „„Pirk pigiau internetu“ nėra tik skambūs žodžiai“ ([Pigu](https://pigu.lt/lt/)).
- Maxima: „Jūsų patogumui sukūrėme MAXIMOS mobiliąją programėlę“ (*for your convenience*); „leidžianti klientui pilnai kontroliuoti savo pasirinkimą“ („pilnai“ vietoj „visiškai“); aprašyme rašybos klaida „Jūms“ ([Maxima](https://www.maxima.lt/aciu)).
- CityBee naujiena: „Vyšnia ant torto:“ (*cherry on top*); „daugelis susimąsto kaip išnaudoti paskutinio vasaros mėnesio teikiamus privalumus“ ([CityBee](https://www.citybee.lt/lt/)).
- CVonline h1: „Su mumis rasite savo svajonių darbą!“ ([CVonline](https://www.cvonline.lt/lt)).

Įdomu: redakcinėje žurnalistikoje „sklandžiai“ vartojama natūraliai tik neiginyje: „jis pripažino, kad darbai vyko ne visai sklandžiai“ (Lrytas, eismas). „Sprendimas“ žurnalistikoje reiškia valdžios sprendimą, rinkodaroje produktą („įkrovimo sprendimams“, „Sprendimai miestams“). AI žodynas (patirtis, sprendimai, ekosistema, sklandus, išnaudoti) koncentruojasi pranešimuose spaudai ir verstose platformose, ne redaktorių rašytame tekste.

## 8. Santrauka skill'ui (7 svarbiausios taisyklės)

1. Nepradėk kiekvieno sakinio veiksniu: gyvoje žurnalistikoje taip prasideda tik ~30 % sakinių, ~45 % prasideda aplinkybe, papildiniu, naudininku ar veiksmažodžiu. Žinoma informacija pradžioje, naujiena gale.
2. Agentą ir šaltinį reikšk lietuviškomis formomis: „X teigimu“, „X duomenimis“, „Pasak X,“, „X-ų atlikta analizė“, beasmenė „Skelbiama, kad“. Ne „Pagal X“, ne „kuris buvo atliktas X“.
3. Sąsajai naudok „, o“ ir „tačiau“; sakinio pradžios jungtukai saikingai (16 % sakinių, dažniausiai „Tačiau“). „Tuo tarpu“, „Svarbu pažymėti“, „Verta paminėti“ korpuse 0.
4. Ritmas: vidurkis ~15 žodžių žurnalistikoje, ~13 rinkodaroje, 18 % sakinių ≤8 žodžių. Trumpas teiginys po ilgo sakinio.
5. „jūsų“ žurnalistikoje beveik nėra (0,2 / 1 000 žodž.). Rinkodaroje „savo“, kai veiksnys yra savininkas. Mygtukai bendratimi (85 : 11).
6. Antraštė: sakinio raidynas, be taško, ~10 žodžių, dvitaškis tarp temos ir naujienos, esamasis laikas arba dalyvis be „buvo“.
7. Formatai: žurnalistikoje „proc.“, „mln. eurų“, „rugsėjo 24 d.“; rinkodaroje „%“ ir „€“ po skaičiaus su tarpu. Kabutės tik „“, brūkšnys „ – “, ilgojo brūkšnio lietuviškame tekste nėra.

## 9. Šaltiniai (nuskaityti 2026-09-27)

Žurnalistika:
1. https://www.15min.lt/naujiena/bendroves/duris-atveria-atnaujinta-norfa-663-2770594
2. https://www.15min.lt/naujiena/aktualu/lietuva/vyriausybe-siulo-pataisose-atsisakyti-vaiku-sutikimo-koncepcijos-seksualiniu-nusikaltimu-bylose-56-2772454
3. https://www.15min.lt/naujiena/autorinka/dyzelino-kainos-rekordas-2-4-eur-dar-ne-pabaiga-1636-2770224
4. https://www.15min.lt/naujiena/autorinka/skelbia-naujiena-elektromobiliu-vairuotojams-kas-keiciasi-1636-2770122
5. https://www.delfi.lt/grynas/gamta/vilnius-kovos-su-invaziniais-sliuzais-skelbia-kur-ir-kaip-jie-bus-naikinami-120310619
6. https://www.delfi.lt/naujienos/lietuvoje/seimas-svarstys-ar-panaikinti-draudima-gaminti-tabako-produktu-dizaina-imituojancias-prekes-120310674
7. https://www.delfi.lt/projektai/rytu-europos-pjuvis/jei-rytoj-istiktu-krize-kiek-dienu-europa-pasirengusi-isgyventi-120309247
8. https://www.lrt.lt/naujienos/eismas/7/3064112/vyriausybe-nemano-kad-regitra-turetu-priminti-apie-technines-apziuros-galiojimo-pabaiga
9. https://www.lrt.lt/naujienos/eismas/7/3057025/alytuje-vienu-metu-remontuojama-desimtys-gatviu-gyventojai-skundziasi-spustimis
10. https://www.lrt.lt/naujienos/lietuvoje/2/3054353/po-drono-incidento-pasipyle-skeptiku-melai-prabilo-apie-aktorius-ir-net-lietuviska-drona
11. https://www.vz.lt/energetika/2026/09/26/ek-ispeja-apie-galima-energetikos-krize-skatina-svarstyti-paklausos-ribojima-590579 (dalinis)
12. https://www.vz.lt/mano-verslas/2026/09/23/es-reglamentas-del-trumpalaikes-nuomos-ka-reikia-zinoti-seimininkams-ir-sveciams-590438 (dalinis)
13. https://www.vz.lt/mano-verslas/2026/09/26/ziniasklaida-hesburger-ruosiasi-debiutui-italijoje-590563 (dalinis)
14. http://www.lrytas.lt/verslas/rinkos-pulsas/2026/09/27/news/vokietija-bunda-po-keleriu-metu-sastingio-pramoneje-pasirode-pirmieji-ryskesni-atsigavimo-zenklai-44125337/
15. http://www.lrytas.lt/auto/saugus-eismas/2026/09/27/news/-visi-pikti-pypsina-vieni-kitiems-judriame-kelyje-vairuotojai-nesuprato-naujos-tvarkos-44156985/
16. http://www.lrytas.lt/it/laboratorija/2026/09/27/news/geros-zinios-senjorams-toks-mitybos-pokytis-biologini-amziu-per-4-savaites-gali-sumazinti-net-4-metais-44102166/

Antraštės: https://www.15min.lt/rss, https://feed.delfi.lt/v2/channel/global?format=rss, https://www.vz.lt/rss, https://www.lrytas.lt/rss, https://www.lrt.lt/ (h3).

Įmonių ir kiti puslapiai: https://www.telia.lt/, https://www.telia.lt/privatiems/mobilusis-rysys, https://pigu.lt/lt/, https://wolt.com/lt/ltu, https://bolt.eu/lt-lt/, https://bolt.eu/lt-lt/rides/, https://ignitis.lt/lt, https://www.maxima.lt/aciu, https://www.citybee.lt/lt/, https://www.omniva.lt/, https://www.rimi.lt/apie-rimi, https://www.swedbank.lt/private, https://www.sodra.lt/, https://www.post.lt/lt/privatiems, https://www.vinted.lt/how_it_works, https://www.cvbankas.lt/, https://www.cvonline.lt/lt, https://autoplius.lt/, https://lt.wikipedia.org/wiki/Vilnius, https://lt.wikipedia.org/wiki/Telia_Lietuva.

Nepasiekta: https://www.senukai.lt/, https://www.revolut.com/lt-LT/, https://www.manopaskola.lt/, https://www.vinted.lt/help, https://www.maxima.lt/apie-maxima, https://www.cvbankas.lt/apie-mus, https://www.swedbank.lt/private/cards/debit/debitcard (tik prisijungus), https://www.lrt.lt/naujienos/verslas (tik nuorodos).
