---
name: lt-rasyba
description: "Lietuviškas tekstas, kuris neskamba kaip vertimas iš anglų ar AI: rašymas, taisymas ir svetainių / programų auditas pagal VLKK normą, Linkevičienės, EK ir MII gaires bei gyvos žiniasklaidos korpusą. Naudok VISADA, kai rašai ar taisai lietuvišką tekstą vartotojui (svetainė, landing puslapis, UI, mygtukai, klaidų pranešimai, el. laiškai, reklama, straipsnis), kai kuri ar keiti svetainę, puslapį ar komponentus su lietuvišku tekstu, kai verti ar adaptuoji iš anglų kalbos, kai prašoma patikrinti, ištaisyti, „kad neatrodytų kaip AI“, „kad skambėtų lietuviškai“, arba audituoti svetainės, projekto ar i18n failų lietuvių kalbą."
---

# LT rašyba

Tikslas: lietuviškas tekstas, kurį redaktorius priimtų be taisymų, o skaitytojas nepagalvotų, kad jį vertė mašina.

Pagrindinė AI klaida lietuvių kalboje nėra žodžiai. Tai **angliškas sakinys su lietuviškais žodžiais**: veiksnys visada pirmas, naujiena pradžioje, „jūsų“ prieš kiekvieną daiktavardį, „yra“ ir pasyvas ten, kur lietuvis vartotų veiksmažodį, daiktavardžių grandinės vietoj veiksmo. Žodžius pakeisti lengva, o sakinį reikia sudėti iš naujo.

Antra klaida matoma tik svetainėse: **angliškas reklaminio puslapio žanras lietuviškais žodžiais**. Sakiniai taisyklingi, linteris tyli, bet antraštės ir kortelės suspaustos kaip angliški šūkiai: „Kvito nuotrauka virsta sąnauda“, „Sąskaita ten, kur esate“, „Be diegimo, be mokymų, be IT.“ Skaitytojas iš karto mato vertimą, o kartais nesupranta, kas ką daro. Tam skirtas skyrius „Svetainės puslapis“.

## Trys režimai

| Prašymas | Režimas | Kur toliau |
|---|---|---|
| „parašyk“, „sukurk tekstą“, mygtukai, laiškas | **Rašyti** | Rašymo metodas žemiau |
| svetainė, landing, puslapio sekcija, komponentai su tekstu | **Rašyti puslapį** | Rašymo metodas ir skyrius „Svetainės puslapis“ |
| pateiktas tekstas, „pataisyk“, „kad neskambėtų kaip AI“ | **Taisyti** | Taisymo eiga žemiau |
| projektas, katalogas, URL, „audituok svetainę“, i18n | **Audituoti** | Audito eiga žemiau |

## 0. Pirmiausia: kieno taisyklės

Eiliškumas, kai taisyklės kertasi:

1. **Projekto taisyklės.** Projekto šaknyje ieškok `.lt-rasyba.json`, `CLAUDE.md` ir atminties įrašų apie tekstą. Pavyzdys: Invly daugiskaitą daro per `ltPlural()` ir brūkšnio nevartoja net intervalams. Projekto sprendimas nugali numatytąjį, bet jei jis pažeidžia VLKK normą, vieną kartą apie tai pasakyk ir daryk, kaip nuspręsta.
2. **VLKK norma** ([NORMA]): Kalbos klaidų sąrašas, rašybos ir skyrybos taisyklės. Tai klaidos, ne skonio dalykas.
3. **Stilius** ([STILIUS], [PRAKTIKA]): Linkevičienė, EK „Rašykime aiškiai ir glaustai“, MII lokalizavimo patarimai, korpusas. Taikyk, kai tekstas tampa trumpesnis ir aiškesnis, o prasmė nepasikeičia.

Niekada nepateik stiliaus patarimo kaip normos. Jei nesi tikras, ar tai klaida, ieškok references/ ir nurodyk šaltinį. Jei šaltinio nėra, sakyk „rekomenduoju“, ne „klaida“.

## Rašymo metodas

### 1. Galvok lietuviškai, neversk

Nerašyk angliško sakinio mintyse ir neversk jo. Pirmiausia užsirašyk **faktus**: kas, ką, kiek, per kiek laiko, kiek kainuoja, kas iš to skaitytojui. Iš faktų dėliok lietuvišką sakinį. Jei faktų nėra, tekstas bus tuščias bet kuria kalba. Tada paklausk vartotojo, o ne pildyk būdvardžiais.

Jei šaltinis angliškas (šablonas, angliška svetainės versija, užsienio pavyzdys), daryk tą patį: išsirašyk iš jo faktus, originalą užverk ir rašyk iš faktų. Sakinys po sakinio neversk, net teisinio teksto: struktūrą perimk, sakinius sudėk iš naujo.

**Faktų disciplina.** Kiekvienas sakinys priklauso vienai iš trijų rūšių:

- **F, faktas apie verslą ar produktą.** Rašyk tik tai, kas pateikta. Nepridėk vietos, šalies, skaičių, markių, proceso detalių („registruotis galima bet kuriuo paros metu“), pažadų („tiksliai žinosite“, „paliksite pas mus“) ir priežasčių („Klientų daugėjo, todėl daugėjo ir boksų“).
- **I, ką faktas reiškia skaitytojui.** Tai galima ir reikia rašyti, nes būtent tai daro tekstą gyvą, o ne anketą. „Kainą suderiname prieš remontą“ → „Sąskaitoje nebus sumų, dėl kurių nesitarėme.“ „Senas detales grąžiname“ → „Pamatysite, ką pakeitėme.“ Išvada turi būti neginčijama: tokia, kurią verslas pasirašytų.
- **B, neginčijamos bendros žinios** apie temą, be skaičių ir be teiginių apie šį verslą: „Perdegusią lemputę ar nudilusią padangą pastebėsite ir patys.“ Jei abejoji, ar žinia teisinga, nerašyk. Bendra žinia niekada netampa teiginiu apie verslą: „VW grupei priklauso Audi“ (B) → „todėl taisome ir Audi“ (N, draudžiama).

Draudžiama tik N: naujas teiginys apie verslą, skaičius ar pažadas, kurio nėra faktuose ir kuris neišplaukia iš jų.

Paslėpti N dažnai slypi išvadose, kurios atrodo nekaltai:
- „Dabar dirbame Pramonės pr. 12“ leidžia manyti, kad servisas persikraustė. Rašyk „Esame Pramonės pr. 12“.
- „Per penkiolika metų“ kitais metais jau bus netiesa. Rašyk „Nuo 2011 m.“, ne santykinę trukmę.

Prašytą apimtį pasiek per I ir B, ne per N. Jei ir su jomis tekstas gerokai trumpesnis, atiduok jį ir įvardyk, kurių faktų trūksta.

### 2. Sakinio statyba (svarbiausia)

- **Žinoma pradžioje, naujiena gale** (tema → rema). Gyvoje žiniasklaidoje veiksniu prasideda tik ~30 % sakinių, ~45 % prasideda aplinkybe, papildiniu, naudininku ar veiksmažodžiu.
  - „Mes grąžinsime pinigus per 14 dienų.“ → „Pinigus grąžiname per 14 dienų.“
  - „Buhalteriai iš 40 įmonių jį jau naudoja.“ → „Jį jau naudoja buhalteriai iš 40 įmonių.“
  - „Mes paleidome naują funkciją praėjusią savaitę.“ → „Praėjusią savaitę paleidome naują funkciją.“
- **Asmenį rodo galūnė.** „Mes siūlome“ → „Siūlome“. „Jūs galite“ → „Galite“. Įvardis veiksnys lietuviškai reiškia akcentą („Rezultatus matote tik jūs“).
- **Veiksmažodis, ne daiktavardis.** „Atlikite sąskaitos apmokėjimą“ → „Apmokėkite sąskaitą“. „Kiek kainuos stogo uždengimas?“ → „Kiek kainuos uždengti stogą?“
- **„Yra“ dažniausiai nereikia.** „Laukas yra privalomas“ → „Laukas privalomas“. „Kaina yra 49 €“ → „Kaina 49 €“. „There is/are“ → konkretus veiksmažodis: „Yra nuolaida padangoms“ → „Padangoms taikoma nuolaida“.
- **Neapibrėžtam kiekiui kilmininkas** [NORMA]: „Jei kilo klausimai“ → „Jei kilo klausimų“. Po neiginio irgi kilmininkas: „jokių staigmenų“, „nepatvirtinote el. pašto“.
- **Pasyvas su veikėju yra anglų kalba.** „Užklausa bus peržiūrėta mūsų specialistų“ → „Užklausą peržiūrės specialistai“. Pasyvas be veikėjo tinka būsenai ir žurnalistikai („Skelbiama, kad…“, „Investuota 1,7 mln. eurų“, „Išsaugota“). Visiškai jo nedrausk.
- **Padalyvis ar pusdalyvis** [NORMA]: kai veikėjas tas pats, rašyk pusdalyvį. „Užpildžius formą, gausite“ → „Užpildę formą, gausite“.
- **Tikslas**: „Kad gauti nuolaidą“ → „Norėdami gauti nuolaidą“ [NORMA]. „Įrankis skirtas sąskaitų išrašymui“ → „...sąskaitoms išrašyti“.
- **„Leidžia jums“, „suteikia galimybę“ → tiesioginis veiksmas.** „Ši funkcija leidžia jums eksportuoti ataskaitas“ → „Ataskaitas galite eksportuoti“.
- **„Jūsų“ ir „savo“ tik kur būtina.** „Įveskite savo el. pašto adresą“ → „Įveskite el. pašto adresą“. „Jūsų slaptažodis neteisingas“ → „Slaptažodis neteisingas“. Kai veiksnys yra savininkas, rašyk „savo“, ne „jūsų“ („Apdrauskite savo gyvybę“).
- **Šaltinis ir veikėjas lietuviškomis formomis**: „X duomenimis“, „X teigimu“, „Pasak X,“, „X atlikta analizė“. Ne „Pagal X duomenis“, ne „analizė, kuri buvo atlikta X“.
- **Pažyminys prieš pažymimąjį**, derinamasis prieš nederinamąjį: „automatinis sąskaitų išrašymas“, „Malta kava“ (ne „Kava malta“).

### 3. Ritmas ir jungtys

- Sakinys vidutiniškai 13–15 žodžių. Maždaug kas penktas sakinys trumpas (iki 8 žodžių): „Skiriasi ne tik dienų skaičius.“ Po ilgo sakinio eina trumpas.
- Nekapok. Keturi 6 žodžių sakiniai iš eilės skamba sausai ir robotiškai. Susijusias mintis jungk „, o“, „todėl“, šalutiniu sakiniu ar pusdalyviu: „Kai taisant paaiškėja, kad reikia papildomų darbų, pirmiausia paskambiname.“
- Dažniausia lietuviška jungtis yra **„, o“** sakinio viduje. Toliau eina „tačiau“, „todėl“, „bet“, „taip pat“.
- „Be to,“ pasitaiko maždaug kartą per 80 sakinių, ne kiekvienoje pastraipoje. „Tuo tarpu“, „Svarbu pažymėti“, „Verta paminėti“ ~15 000 žodžių gyvo teksto korpuse nerasti nė karto.
- „Tačiau“ ir „Todėl“ sakinio pradžioje rašomi be kablelio po jų („Todėl rekomenduojame“, ne „Todėl, rekomenduojame“).
- Praleistą „yra“ žymėti brūkšniu neprivaloma, ir mes jo nežymime: „Kaina 49 €“, „Naujas standartas: 72 valandos.“

### 4. Žodžiai

- **Junglumas: ar veiksmas tinka veikėjui ir objektui?** Perskaityk kiekvieną veiksnio, tarinio ir papildinio trejetą atskirai. Blogai: „automobiliai apsilanko“ (apsilanko žmonės; gerai: „aptarnaujame automobilius“), „pažįstame remontą“ (remonto nepažinsi), „diagnozuojame savininkams“ (diagnozuojame automobilius), „pakeistas senas detales“ (pleonazmas: „senas detales“), „automobilis pasiruošęs“ (žmogus pasiruošęs, automobilis tvarkingas).
- Vienas dalykas turi vieną pavadinimą: jei pradėjai „akumuliatorius“, nerašyk toliau „baterija“.
- Konkretus faktas vietoj būdvardžio: „nuo 0,11 €/min.“, „sąskaitą išrašote per minutę“, ne „greitas, patogus ir inovatyvus“.
- Nevartok AI ir vertimo šablonų: „Gera žinia ta, kad“ (the good news is), „ne X, o Y“ kaip efekto triukas, „tai reiškia daugiau nei“, trijų veiksmažodžių ar būdvardžių virtinė kiekvienoje pastraipoje, raminantis sakinys pastraipos gale („važiuosite ramiau“, „galite būti ramūs“), „komanda“ vietoj „darbuotojų“ ar vardų.
- Nevartok AI ir vertimo žodyno: *sklandus, inovatyvus, holistinis, ekosistema, sprendimas* (produktui), *patirtis* (experience), *išnaudokite potencialą, pakelkite į kitą lygį, jūsų kelionė, pasinerkite, nedvejodami susisiekite, esame čia, kad padėtume, didžiuojamės, aukščiausios kokybės, žaidimo keitėjas, be galvos skausmo, vyšnia ant torto, jūsų patogumui*.
- Dažniausios normos klaidos (visas sąrašas `references/leksika-kalkes.md`): *pilnai* (→ visiškai), *pagrinde* (→ daugiausia), *tame tarpe* (→ iš jų, įskaitant), *sekantis* (→ kitas), *įtakoti* (→ lemti, paveikti; vengtina), *atitinka reikalavimams* (→ reikalavimus), *24 valandų bėgyje* (→ per 24 valandas), *gerame stovyje* (→ geros būklės), *pirmoje eilėje* (→ pirmiausia), *daugelyje atvejų* (→ daugeliu atvejų), *išstatyti sąskaitą* (→ išrašyti), *parsiduoda namas* (→ parduodamas), *dėka* priežasčiai, *kas liečia* (→ dėl), *o tuo pačiu* (→ o kartu), *kaip taisyklė* (→ paprastai).
- Neperkorektuok: *kuomet* yra šalutinis normos variantas, ne klaida; „pilnas vardas“ taisyklinga; „Be to,“ retkarčiais tinka.

### 5. Antraštės, UI, laiškai

- **Svetainės tekstui duok struktūrą**, jei jos neprašyta kitaip: H1, trumpos H2 antraštės kas 2–4 pastraipas, kontaktai ir veiksmas atskiroje dalyje. Keli tekstai viename atsakyme atskiriami antraštėmis.

- **Brūkšniai (vartotojo taisyklė, galioja visur).** Ilgojo brūkšnio (U+2014) nerašyk niekada: nei tekste, nei antraštėse, nei laiškuose, nei commit'uose ar pranešimuose vartotojui. Pusilgio „–“ kaip pauzės tarp žodžių irgi nerašyk: jis atrodo taip pat ir išduoda AI. Sakinį perrašyk taip, kad brūkšnio nereikėtų: taškas, kablelis, dvitaškis arba du sakiniai. „Remontas – per dieną“ → „Remontuojame per dieną.“ „–“ lieka tik skaičių intervalams („9–18 val.“, „3–5 d. d.“). Jei projektas draudžia ir tai (Invly), rašyk „9-18 val.“

- **Antraštės**: didžioji raidė tik pirmo žodžio ir tikrinių vardų. Jokio Title Case, jokio taško gale. Informatyvi antraštė geresnė už daiktavardžių grandinę: „Tvarkykite verslą be popierių“, ne „Efektyvus verslo procesų valdymo sprendimas“.
- **Mygtukai**: numatytoji forma yra **bendratis** („Registruotis“, „Rinktis planą“, „Išsaugoti“). Taip rašo Microsoft ir Android LT, o lietuviškose svetainėse bendratis vartojama 85 kartus iš 96. Bendratis neutrali kreipinio atžvilgiu. Liepiamoji nuosaka tinka instrukcijos sakinyje („Spustelėkite „Išsaugoti““) arba kai produktas jau nuosekliai taip rašo. Viename produkte mygtukams vartok vieną formą.
- **Kreipinys**: numatyta „jūs“. „Tu“ tik jei taip nuspręsta prekės ženklui. Formų nemaišyk (Wolt „Prisijunk, kad gautumėte“ yra klaida). Svetainėje, programoje ir masiniuose laiškuose rašyk mažąja „jūs“ (Microsoft LT gidas, Android). Didžioji „Jūs“ pagal VLKK neprivaloma. Ji tinka asmeniniame laiške konkrečiam žmogui, bet tada visame laiške. Jei projektas jau nuosekliai rašo „Jūs“, palik.
- **Klausimai** prasideda „Ar“: „Ar galiu atšaukti prenumeratą?“, ne „Galiu atšaukti prenumeratą?“.
- **Laiškai**: kreipinys šauksmininku ir tarp kablelių: „Laba diena, Jonai,“. Tekstas po jo prasideda mažąja raide. Jei šablone vardo linksniuoti negalima, vardo nedėk. Po „Pagarbiai“ ir „Su pagarba“ kablelio nėra.
- **Klaidos pranešimas** turi pasakyti, kas nepavyko ir ką daryti. „Kažkas nutiko ne taip“ ir „Oi!“ yra silpnas vertimas (ne normos klaida, bet nieko nepasako). Rašyk „Nepavyko išsaugoti sąskaitos. Patikrinkite ryšį ir bandykite dar kartą.“
- **Skaičiai**: „49 €“, „9,99 €“, „20 %“ (rinkodara) arba „20 proc.“ (žurnalistika), „1 000“, „2026-09-27“ arba „2026 m. rugsėjo 27 d.“, „14.30“ arba „14:30“, telefonas „+370 612 34 567“ arba „0 612 34567“ (nuo 2025 m. šalies prefiksas 0, ne 8). Skaičiaus ir daiktavardžio derinimas (CLDR, `Intl.PluralRules('lt')`): 1, 21 klientas; 2–9, 22 klientai; 0, 10–20, 30 klientų; trupmenos 1,5 kliento.
- **Skyryba**: kabutės „...“ (uždaromoji viršuje: “, ne "); kablelis prieš *kad, kuris, kai, jei, nes, o, bet, tačiau*.

### 6. Svetainės puslapis

Kai rašai puslapį ar jo sekciją, perskaityk `references/svetaines-tekstas.md` ir eik šia tvarka:

1. **Tekstas pirma, kodas paskui.** Visą puslapio tekstą surašyk paprastu tekstu (`tekstai.md` arba atsakyme) ir patikrink. Tik tada rašyk komponentus. Tekstas, rašomas tiesiai į kortelės `title` ir `description`, išeina angliško šablono vertimu.
2. **Papasakok klientui.** Kiekviena sekcija atsako į klausimą, kurį žmogus užduotų savininkui telefonu: ką darot, kaip tai vyksta, kiek kainuoja, o jei netiks, kaip pradėti. Atsakymą užrašyk pilnais sakiniais, kaip pasakytum.
3. **Trumpink tol, kol sakinys lieka sakiniu.** Veiksmažodžio ir veikėjo nebrauk. Kortelės antraštė yra arba etiketė („Kvitai“, „SMS priminimai“), arba pilnas sakinys („Kvitą užtenka nufotografuoti“). 3–5 žodžių šūkis be veikėjo yra angliškas žanras.
4. **Veikia žmogus arba programa, veiksmažodis tiesioginis.** Ne „nuotrauka virsta sąnauda“, o „nufotografuojate kvitą, o programa įrašo jį į sąnaudas“. Daiktai nevirsta, neatsiduria, nenugula, nepildosi.
5. **Trys testai kiekvienai antraštei, kortelei ir mygtukui:**
   - *Atgalinis vertimas.* Išversk eilutę į anglų kalbą žodis po žodžio. Jei išeina sklandus angliškas reklamos sakinys, tai kalkė: perrašyk iš fakto.
   - *Telefonas.* Ar savininkas taip pasakytų klientui telefonu?
   - *Nepažįstamasis.* Ar žmogus, nematęs produkto, iš vienos šios eilutės supras, kas ką daro?
6. **Šviežios akys.** Parašęs visą puslapį, vien tekstą atiduok atskiram agentui pagal `references/svetaines-tekstas.md` 7 skyriaus šabloną. Jo pažymėtas eilutes perrašyk pats, iš faktų.
7. **Maketas taikosi prie teksto.** Jei lietuviškas sakinys netelpa, keisk maketą, ne sakinį. Kai užduotis ar dizaino skill'as prašo „trumpo, drąsaus šūkio“, rašyk trumpiausią pilną sakinį, kuris išlaiko tris testus.

Nerašyk: „Be X, be Y, be Z.“, „Greita. Paprasta. Patikima.“, „Klausimas? Atsakome.“, „Mes X. Jūs Y.“, „lieka jūsų“, „ten, kur esate“, „su tuo, ką jau naudojate“, „nuo X iki Y“ kaip šūkio, „Kodėl verta rinktis mus“, „Pasiruošę pradėti?“, „Viskas, ko reikia“, „keliais paspaudimais“. Ką rašyti vietoj jų, parodo `references/svetaines-tekstas.md` 1 ir 6 skyriai.

### 7. Patikra prieš atiduodant

1. Paleisk linterį: `python3 <skill>/scripts/lt_lint.py -` (tekstą paduok per stdin) arba failui. Pataisyk visus 🔴 ir 🔵. 🟡 įvertink.
2. Perskaityk kiekvieną sakinį ir paklausk: ar 15min ar LRT redaktorius taip parašytų? Ar taip pasakytum telefonu klientui?
3. Pažiūrėk sakinių pradžias: jei 3 ar daugiau iš eilės prasideda veiksniu („Mes“, „Sistema“, „Jūs“), pertvarkyk bent vieną.
4. Suskaičiuok „jūsų“, „savo“, „yra“. Kiekvieną, kurį galima išbraukti, išbrauk.
5. **Faktų patikra sakinys po sakinio.** Prie kiekvieno sakinio mintyse pažymėk F, I, B arba N (žr. 1 skyrių). N sakinius išbrauk arba paversk klausimu vartotojui. Išsigalvoti faktai blogiau už bet kokią kalbos klaidą, bet sausa anketa be I sakinių irgi nėra geras tekstas.
6. **Junglumo patikra**: kiekviename sakinyje paklausk, ar šis veikėjas tikrai gali daryti šį veiksmą su šiuo objektu (žr. 4 skyrių).
7. Paskutinis sakinys: jei jis tik ramina ar apibendrina („Po jos važiuosite ramiau“), išbrauk. Tekstas baigiasi paskutiniu faktu arba veiksmu.
8. **Svetainės tekste** kiekvieną antraštę, kortelės antraštę ir mygtuką perleisk per tris 6 skyriaus testus. Linterio 🟡 `sablonas-*` radinius perrašyk, nepalik.

## Taisymo eiga (pateiktas tekstas)

1. Paleisk linterį tekstui.
2. Perskaityk pagal `references/vertimo-kalba.md` A dalies kontrolinį sąrašą (60 požymių su aptikimo užuominomis).
   Jei tai svetainės ar programos tekstas, perskaityk ir `references/svetaines-tekstas.md` ir kiekvieną antraštę, kortelę bei šūkį perleisk per tris testus (atgalinio vertimo, telefono, nepažįstamojo). Tokiame tekste daugiausia bėdų būna būtent antraštėse, ne pastraipose, o linteris jų nemato. Jei perrašant trūksta fakto, palik eilutę ir paklausk.
3. Grąžink:
   - **Pataisytas tekstas**, pilnas, paruoštas kopijuoti.
   - **Kas pakeista**: lentelė `Buvo | Dabar | Kodėl [NORMA/STILIUS] + šaltinis`. Rodyk tik prasmingus pakeitimus. Jei tokių daug, sugrupuok („7 kartus išbrauktas perteklinis „jūsų““).
   - Jei tekstas geras, taip ir pasakyk. Nekeisk dėl keitimo.
4. Išsaugok autoriaus balsą, terminus, prekės ženklų vardus ir faktus. Nekeisk tu į jūs, jei to neprašyta. Tokį neatitikimą pažymėk, bet netaisyk.

## Audito eiga (projektas, katalogas, URL)

**1. Mechaninis praėjimas.**
```bash
python3 <skill>/scripts/lt_lint.py <katalogas>              # kodas: tik vartotojui matomi string'ai ir JSX tekstas
python3 <skill>/scripts/lt_lint.py --crawl 30 https://x.lt  # gyva svetainė, to paties domeno puslapiai
python3 <skill>/scripts/lt_lint.py --json ... > radiniai.json
```
Linteris gerbia `.lt-rasyba.json` (`{"enable": [...], "disable": [...]}`). Jis pagauna rašybą, skyrybos techniką, DKKS klaidas ir AI žodyną. **Žodžių tvarkos ir logikos jis nepagauna.** Švari linterio išvestis dar nereiškia gero teksto.

**2. Skaitymas akimis.** Pirmenybė pagal poveikį: pagrindinio puslapio viršus (hero), mygtukai ir navigacija, kainodara, formos ir klaidų pranešimai, el. laiškų šablonai, DUK, teisiniai tekstai (juose tik normos klaidos, stiliaus nekeisk). Didelėje svetainėje ar kode imk reprezentatyvią imtį (5–10 puslapių ar failų). Kai kartojasi ta pati problema, pranešk apie ją kaip apie **sisteminę**, o ne 40 kartų po vieną. Antraštes, korteles ir šūkius tikrink trimis `references/svetaines-tekstas.md` testais: švarus linteris ir taisyklingi sakiniai dar nereiškia, kad puslapis neskamba kaip vertimas.

Kode ieškok teksto ten, kur jis gyvena: `messages/*.json`, `locales/`, `i18n/`, `src/**/*.tsx` string'ai, `emails/`, edge funkcijų vartotojui skirti pranešimai. Taisyk i18n faile, ne komponente. Dinaminio teksto (`{props}`) netaisyk, tik pažymėk.

**3. Ataskaita.** Formatas:
```
LT RAŠYBOS AUDITAS: <projektas / domenas>, <data>
Patikrinta: N puslapių / failų. Linteris: 🔴 X  🟡 Y  🔵 Z

Sisteminės problemos (svarbiausia, taisyti pirmiausia)
1. <problema>: kiek kartų, kur, vienas pavyzdys, taisymas, taisyklė/šaltinis

Radiniai pagal puslapį / failą
📄 <kelias arba URL>
  🔴 NORMA   DABAR: „…“   SIŪLAU: „…“   KODĖL: … [šaltinis]
  🟡 STILIUS DABAR: „…“   SIŪLAU: „…“   KODĖL: …

Kas gerai (palik, kaip yra)
```
Ataskaitą, jei ji ilga, įrašyk į `lt-auditas-<data>.md` projekto šaknyje arba į vietą, kurią nurodo vartotojas.

**4. Prieš taisant kodą** parodyk 3–5 pavyzdžius ir lauk patvirtinimo: ar tinka stilius, taisyti viską ar tik 🔴. Taisydamas keisk tik tekstą: ne raktus, ne `className`, ne kintamuosius, ne regex. Kode, kur brūkšnys reikalingas regex'e ar parseryje, rašyk escape'ą (`–`), kad masinis keitimas jo nesugadintų. Po taisymo vėl paleisk linterį ir projekto patikras (tsc, testus).

## References: ką skaityti ir kada

Nekrauk visko iš karto. Skaityk tai, ko reikia užduočiai.

| Failas | Kada |
|---|---|
| `references/sintakse-zodziu-tvarka.md` | Visada, kai rašai ar taisai ilgesnį tekstą. 18 skyrių: žodžių tvarka, tema ir rema, pasyvas, nominalizacija, įvardžiai, dalyviai, jungtukai, antraštės. |
| `references/svetaines-tekstas.md` | Visada, kai rašai, taisai ar audituoji svetainės puslapį: 9 angliško reklaminio žanro požymiai, metodas „pirma papasakok“, trys testai, angliško puslapio vietų atitikmenys, šviežių akių patikros šablonas. |
| `references/vertimo-kalba.md` | Taisymui ir auditui: 60 požymių kontrolinis sąrašas ir 10 pilnų perrašymų (hero, klaida, onboarding, laiškas, kainodara, DUK, 404, B2B laiškas). |
| `references/leksika-kalkes.md` | Kai abejoji žodžiu ar prielinksniu: ~300 KKS ir konsultacijų banko taisyklių, IT terminai, morfologija. |
| `references/rasyba-skyryba.md` | Skaičiai, datos, valiuta, kabutės, brūkšniai, didžiosios raidės, kableliai, sąrašai. |
| `references/ui-mikrotekstai.md` | Mygtukai, formos, klaidos, tušti ekranai, laiškai, slapukai, kreipinys, UI žodynėlis EN → LT, daugiskaitos formos (CLDR). |
| `references/korpusas.md` | Kai reikia įrodyti, kaip rašoma iš tikrųjų: 22 šablonai su citatomis iš 15min, Delfi, LRT, VŽ, Lrytas ir 19 įmonių svetainių, statistika. |

## Ko nedaryti

- Nerašyk pirma angliškai ir neversk.
- Nerašyk svetainės teksto tiesiai į komponentus. Pirma tekstas, tada kodas.
- Nespausk sakinio į šūkį, kad tilptų į maketą ar skambėtų „kaip Stripe“.
- Nekurk taisyklių, kurių nėra šaltiniuose. Neprisigalvok VLKK pozicijos.
- Neperkorektuok gyvos kalbos: pasyvas, „Be to“, „kuomet“, šnekamoji tu forma prekės ženklo balse gali būti tinkami.
- Nekeisk prasmės, faktų, teisinių formuluočių, citatų ir prekių ženklų pavadinimų.
- Nedėk šauktukų ir jaustukų, kurių nebuvo, ir nepridėk entuziazmo („Puiku!“, „Sveikiname!“), jei jo nebuvo prašyta.
- Nelinksniuok to, kas nelinksniuojama (užsienio vardai kabutėse: „Bloomberg“, „Hesburger“). Lietuviškus įmonių vardus kabutėse linksniuok („Regitros“, „Norfos“).
