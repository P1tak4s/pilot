# UI mikrotekstai, kreipinys, tonas ir svetainės struktūriniai tekstai (LT)

Surinkta 2026-09-27. Šaltinių žymės lentelėse:

- **MS** – Microsoft Lithuanian Localization Style Guide (PDF, 46 psl.), skyrius nurodomas.
- **V#** – VLKK konsultacijų banko įrašas (numeris = URL id, pvz. V2708 = vlkk.lt/konsultacijos/2708-...).
- **VLKK-N60** – VLKK 1997-06-19 nutarimas Nr. 60 (Rašybos ir skyrybos nuostatos), p. 2.7.1, cituota pagal Pajėdienė 2017 ir savivaldybių atmintines.
- **RŠ** – „Programų lietuvinimo kokybės vertinimo el. paslaugos naudojimo aprašas“ (VU, raštija.lt, 2021), klaidų sąrašas.
- **A** – Android (AOSP) oficialios LT sistemos eilutės, `core/res/res/values-lt/strings.xml`.
- **CLDR** – Unicode CLDR `plurals.xml` ir `Intl` (Node) lt-LT formatai.
- **R: svetainė** – rinkos praktika, tikras tekstas, paimtas `curl` 2026-09-27. Tai empirinė norma, ne VLKK.
- **K** – korpuso tyrimas `korpusas-gyvas-tekstas.md` (19 įmonių puslapių, 586 teksto vienetai).
- **(rekomendacija)** – mano sprendimas, šaltinio teiginiu nelaikyti.

---

## 1. Sprendimai

### 1.1. Kreipinys: jūs ar tu

**Ką sako šaltiniai**

- MS 4.1.11: „Always use the second-person plural (jūs) to address the user. Normally, the pronoun „jūs“ itself won't be needed, but if it's used, make it lowercase.“
- MS 5.3 (Copilot paruošti raginimai): „Use an informal tone of voice and form of address“, pavyzdžiai „Sudaryk idėjų...“, „Pasiūlyk naują failo įžangą“. Tai vienintelė MS vieta, kur leidžiamas „tu“: tekstas, kurį naudotojas siunčia mašinai, o ne mašina naudotojui.
- MS 2.1: „The general style should be clear, friendly, and concise. Use language that resembles everyday conversation.“ Draugiškumas pasiekiamas trumpumu, ne „tu“ forma.
- Android (A) visur „jūs“ be įvardžio: „Bandykite dar kartą“, „Įjunkite darbo profilį“, „Galite tai bet kada pakeisti nustatymuose“.
- Rinka (K): tu ir jūs pasiskirsto maždaug per pusę. Tu: Telia reklama („Įsigyk naująjį iPhone jau dabar!“, „Mokėk dalimis“), Vinted („Bandyk dar kartą po...“, „Suderink su juo naują paėmimo datą“), Luminor („Tapk klientu“, 404: „Gal neteisingai įvedei adresą?“), Wolt vartotojams („Mėgaukis nemokamu pristatymu“). Jūs: Swedbank, SEB, Bolt, Lietuvos paštas, Sodra, epaslaugos.lt, Wolt verslui („Padedame auginti jūsų verslą“).
- Rinka dažnai maišo formas toje pačioje svetainėje (K): Telia reklama „tu“, DUK „Rinkdamiesi „Telia“, gaunate“; Luminor mygtukai „Tapk klientu“, slapukų juosta „jūsų naršymo patirtį“. Blogiausias rastas atvejis viename mygtuke: Wolt „Prisijunk, kad gautumėte išsaugoti adresus“.
- RŠ klaida Nr. 22 „Stiliaus nevienodumas“: „valdiklius paaiškinančiose etiketėse vienur dominuoja vienoks kreipinys į vartotoją, kitur kitoks“. Tai laikoma lokalizavimo klaida.

**Sprendimas skill'ui (rekomendacija)**

1. Numatytoji forma: **jūs** (daugiskaitos 2 asmuo), įvardį praleisti, kai veiksmažodžio galūnė jau rodo asmenį. Pagrindimas: MS, Android, bankai, valstybė; B2B ir SaaS rinkoje tai saugi forma, niekam neatrodo įžūli.
2. **tu** tik tada, kai prekės ženklo balso gairės aiškiai to reikalauja (jaunimo, laisvalaikio, bendruomenės produktai: Vinted, Wolt vartotojams, Telia reklama). Sprendžia užsakovas, ne rašytojas.
3. **Viena forma visame produkte**: UI, klaidos, laiškai, DUK, slapukų juosta. Maišymas yra klaida (RŠ 22), net jei rinkoje dažnas.
4. Išimtis tikrinant: jei produktas jau vartoja „tu“ nuosekliai, nekeisti į „jūs“, tik suvienodinti likučius.

### 1.2. „Jūs“ didžioji raidė

**Ką sako šaltiniai**

- VLKK-N60 p. 2.7.1: „Didžiąja raide **gali būti** rašomi žodžiai, kuriais mandagiai, su pagarba kreipiamasi į kitą asmenį (laiškuose, sveikinimuose, kvietimuose, prašymuose ir pan.), pvz.: Jūs, Tamsta, Pone; Tu, Pats, Sveikas, Bičiuli, Drauge, Gerbiamasis, Brangusis.“ Tai **stilistinė, patariamoji** rašyba, ne privaloma (Pajėdienė, „Bendrinė kalba“ 90, 2017: „vertinama kaip patariamoji rašyba“).
- Ta pati Pajėdienė 2017 cituoja Girčienę ir Kupčinskaitę-Ryklienę (2005): reklamoje galimi trys būdai „tu, Jūs ir jūs“, t. y. mažoji „jūs“ yra neutralioji daugiskaita, kai kreipiamasi į neapibrėžtą auditoriją.
- VLKK V10910 pavyzdyje laiškui vienam asmeniui: „Gerb. Jonai, sveikiname Jus gimimo dienos proga.“ (didžioji).
- MS 4.1.11: UI tekste **mažoji** („make it lowercase“).
- Android (A): mažoji („Patraukite viską, kas užstoja jūsų veidą.“).
- Rinka (K): didžiąja Pigu („Rekomenduojame Jums“), Maxima, Sodra, SEB („Jūsų“, „Jums“); mažąja Bolt, Wolt, Luminor, Lietuvos paštas (dažniausiai). Swedbank reklamoje mažąja, sisteminiuose pranešimuose didžiąja.

**Sprendimas skill'ui (rekomendacija)**

- **Svetainė, programa, UI, klaidų pranešimai, masiniai laiškai, naujienlaiškiai: mažoji „jūs“.** Tekstas skirtas neapibrėžtam skaitytojui, ne konkrečiam asmeniui; taip daro MS ir Android.
- **Asmeninis laiškas konkrečiam žmogui** (atsakymas klientui, pasiūlymas, sąskaitos lydraštis su vardu): „Jūs“ didžiąja leidžiama ir įprasta (VLKK-N60). Jei pasirinkta, laikytis visame laiške: Jūs, Jūsų, Jums, Jus.
- Nemaišyti viename tekste. Audite didžiosios „Jūs“ UI tekste nežymėti kaip klaidos, tik kaip nenuoseklumą, jei kitur mažoji.
- Įvardį dažniausiai galima išmesti visai (MS 4.1.11), tada klausimas nekyla: „Jūsų užsakymas išsiųstas“ → „Užsakymas išsiųstas“.

### 1.3. Mygtukai ir komandos: bendratis ar liepiamoji nuosaka

**Ką sako šaltiniai**

- MS komandų ir mygtukų pavyzdžiai visur bendratimi: „Įrašyti viską“ (4.1.3, 4.1.7), „Konvertuoti „Excel“ į PDF“, „Atšaukti“, „Įrašyti“, „Skambinti“ (3.1). Instrukcijose, kurios nurodo, ką daryti, liepiamoji: „Spustelėkite mygtuką Įrašyti.“ (4.1.9), „Pasirinkite asmens vardą“.
- MS 4.1.12: patarimuose (ToolTips) bendratis be taško: „Įrašyti ir uždaryti segmentą“.
- RŠ klaida Nr. 16: „meniu komandoje vietoje veiksmažodinės vartojama daiktavardinė“ ir „lango pavadinime vietoje daiktavardinės formos vartojama veiksmažodinė“ yra klaidos. Taigi komanda = veiksmažodis, lango pavadinimas = daiktavardis.
- Android (A): mygtukai bendratimi: „Atšaukti“, „Ištrinti“, „Leisti“, „Atmesti“, „Kopijuoti“, „Bendrinti“, „Praleisti“, „Įjungti“, „Išsaugoti“, „Atnaujinti“, „Sutikti“. Išimtys: „Gerai“ (OK), „Atlikta“ (Done), „Supratau“ (Got it), „Ne, ačiū“, „Sužinokite daugiau“ (Learn more, liepiamoji).
- Rinka (K): veiksmo mygtukai **bendratis 85, liepiamoji 11** (tu 7, jūs 4). Pavyzdžiai: Bolt „Atsisiųsti programėlę „Bolt““, „Užsiregistruoti vairuoti“, „Siųsti daiktą“, „Žiūrėti viską“; Pigu „Prisijungti“, „Registruotis“, „Įjungti Pigu PLUS kainas“; SEB „Priimti slapukus“, „Sužinoti daugiau“; Vinted „Įkelti prekę“, „Rodyti daugiau“; epaslaugos „Pateikti užklausą“. Liepiamoji: SEB „Prisijunkite“, „Užsakykite kortelę savo vaikui“, Swedbank „Tapkite klientu“, Wolt „Pradėkite dabar“, „Atrask Wolt Market“, Luminor „Tapk klientu“, „Sužinok daugiau“.

**Sprendimas skill'ui (rekomendacija)**

- **Mygtukai, meniu komandos, nuorodos-veiksmai: bendratis.** „Registruotis“, „Pirkti“, „Išsaugoti“, „Tęsti“, „Atsisiųsti ataskaitą“. Pagrindimas: MS, Android ir rinkos dauguma (85:11); bendratis neutrali kreipinio atžvilgiu, todėl nereikia rinktis tarp „Registruokis“ ir „Registruokitės“ ir nekyla nenuoseklumo rizika.
- **Liepiamoji tik sakiniuose**: instrukcijose, pagalbiniuose tekstuose, klaidose („Patikrinkite el. pašto adresą“), rinkodaros antraštėse, kur tai sakinys, ne mygtukas.
- Viename ekrane ar mygtukų grupėje formos vienodos (RŠ 16). Ne „Atšaukti“ šalia „Patvirtinkite“.
- Stabilios išimtys, kurios nėra bendratis ir yra priimtinos: „Gerai“, „Atlikta“, „Ne, ačiū“, „Supratau“ (A). „Sužinokite daugiau“ Android ir rinkoje paplitęs, bet pagal taisyklę geriau „Sužinoti daugiau“ (SEB, Bolt) (rekomendacija).
- Mygtuke veiksmažodis + objektas, kai veiksmas nėra akivaizdus: „Ištrinti sąskaitą“, ne tik „Ištrinti“ (K: „Rinktis planą“, „Atsisiųsti programėlę“).

### 1.4. Lyčiai neutrali kalba

- MS 3.1: vietoj vyriškos giminės dalyvio naudoti veiksmažodį: „Patvirtinkite, kad perskaitėte sąlygas“, ne „Patvirtinkite, kad esate perskaitęs sąlygas“.
- MS 3.1: apibendrinant daugiskaita („visi asmenys“, „naudotojai“, „kolegos“); vietoj „ponios ir ponai“ – „gerbiamieji“; galima „-(ės)“ priesaga („Tyrimo dalyviai (-ės)“).
- MS 3.1: pareigų, statusų pavadinimai bendra prasme vyriškąja gimine („klientas“, „darbuotojas“) yra norma.
- MS 4.1.7: beasmenėse būsenose bevardė giminė: „Modified“ → „Modifikuota“.
- **Sprendimas (rekomendacija):** UI tekste neleisti kreipinio su gimininiu dalyviu ar būdvardžiu („Esate prisijungęs“, „Ar esate tikras?“, „Sveikas sugrįžęs!“). Perrašyti veiksmažodžiu arba beasmene forma: „Prisijungėte“, „Ar tikrai norite...?“, „Sveiki sugrįžę“ tik jei „jūs“ (daugiskaita tinka abiem lytims). Brūkšnelių „pasiruošęs(-usi)“ vengti, jie sunkina skaitymą.

### 1.5. Tonas

- MS 2: „Warm and relaxed... Crisp and clear... Ready to lend a hand“; 2.1.3 vengti per formalių posakių: „priimti sprendimą“ → „nuspręsti“, „suteikti pagalbą“ → „padėti“, „taip pat“ → „ir, irgi“.
- MS 2.1.4: nevesti pažodžiui; sakinį galima skaidyti, epitetus išmesti.
- MS 4.1.13: „avoid padding and drowning the user in a sea of words“; „Norėdami gauti daugiau informacijos, žr.“ → „Daugiau informacijos rasite...“.
- MS 4.1.15: lietuvių kalboje veiksmažodinės konstrukcijos natūralesnės už daiktavardines.
- MS 4.1.6: lietuviškai sakinio nepradėti jungtuku (angl. „And“, „But“ pradžioje); „tačiau“ sakinio pradžioje, „bet“ po kablelio.
- MS 4.1.3 ir 4.1.11: savybinius įvardžius praleisti. RŠ klaida Nr. 15 „Perteklinis tekstas“: „žodžiai Jūsų, Savo, Aš („Išjunkite Savo kompiuterį“)“.
- RŠ klaida Nr. 32: jaustukas, netinkamas lokalei, yra klaida.
- Rinka (K): šauktukas h1/h2 gale 14 iš 119 antraščių; žurnalistikoje „jūsų“ beveik nėra (0,2 / 1 000 žodžių), rinkodaroje 4,3.
- **Sprendimas (rekomendacija):** vienas šauktukas ekrane daugiausia, ir tik tikram pasiekimui (pirmas užsakymas, apmokėta). Nenaudoti „Oi!“, „Ups!“, „Valio!“, „Puiku!“ klaidose ir rutininiuose veiksmuose. Emoji UI tekste ir dalykiniuose laiškuose ne; rinkodaros socialiniuose tinkluose pagal prekės ženklą. „Sveikiname!“ tinka tik tikram įvykiui (registracija baigta, planas įsigytas), ne kiekvienam išsaugojimui.

### 1.6. Terminų politika

- MS 1.1: normatyvinis šaltinis vlkk.lt; informaciniai: terminai.vlkk.lt, Dagienė, Grigas, Jevsikova „Enciklopedinis kompiuterijos žodynas“ (2008), Žalkauskas (2003), ims.mii.lt ALKŽ, raštija.lt.
- MS 2.1.2: „App“ → „programa“ (trumpiau nei „taikomoji programa“), „Website“ → „svetainė“.
- VLKK žargonas nevartotinas: „seivinti“ (V2708), „daunlaudinti“ (V669), „akauntas“ (V8223), „linkas“ (V1626), „e-mailas“ (V830), „brauseris“ (V447), „niusleteris“ (V1901).
- Rinka „programėlė“ mobiliai programai (SEB „Mobilioji programėlė“, Bolt, Wolt, Vinted). VLKK V9373 teikia „mobilioji programa“, bet V14250 „per programėlę „Wolt““ vertina kaip taisyklingą sakinį, žodžio nekritikuoja. **(rekomendacija):** „programėlė“ vartotojų tekstuose tinka, „programa“ dalykiniuose.
- Santrumpos (MS 4.1.2, RŠ 18): prie angliškos santrumpos pridėti pažymimąjį žodį: „URL adresas“, „HTTPS protokolas“, „PIN kodas“ (A: „Netinkamas PIN kodas“); CAPTCHA → „saugos kodas“ (RŠ 18).
- Produktų ir svetimi pavadinimai sakinyje kabutėse „...“: „Konvertuoti „Excel“ į PDF“ (MS 4.1.12), Bolt „Atsisiųsti programėlę „Bolt““. UI elementų pavadinimai sakinyje be kabučių: „Spustelėkite Įrašyti.“ (MS 4.1.12). Kabutės tik lietuviškos „ “ (RŠ 26).

---

## 2. UI žodynėlis EN → LT

Stulpelis „Šaltinis“: kas patvirtina. Kur keli variantai, pirmas yra rekomenduojamas skill'ui.

### 2.1. Veiksmai (mygtukai, komandos)

| EN | LT | Šaltinis / pastaba |
|---|---|---|
| OK | Gerai | A |
| Cancel | Atšaukti | A, MS 2.2.4 |
| Save | Išsaugoti (dokumentų rengyklėse: Įrašyti) | V2708: abu taisyklingi; A „Išsaugoti“; MS „Įrašyti“; RŠ 3 laiko „išsaugoti“ taisytinu į „įrašyti“ |
| Save all | Įrašyti viską | MS 4.1.3 |
| Delete | Ištrinti | A |
| Remove | Pašalinti | A („Privati erdvė pašalinta“), V3206 |
| Edit | Redaguoti | (rekomendacija) |
| Done | Atlikta / Baigti | A „Atlikta“ |
| Continue | Tęsti | MS 2.2.1 („Ar norite tęsti?“), A |
| Next | Toliau | (rekomendacija) |
| Back | Grįžti / Atgal | MS 2.2.4 „grįžti“ |
| Close | Uždaryti | R: Lietuvos paštas, Pigu |
| Skip | Praleisti | A |
| Retry / Try again | Bandyti dar kartą (mygtukas); Bandykite dar kartą. (sakinys) | A, MS 2.2.1 |
| Undo | Anuliuoti | A; RŠ 34: ne „atstatyti“ |
| Confirm | Patvirtinti | MS 2.2.4 („patvirtinti“) |
| Accept | Sutikti / Priimti | A „Sutikti“; R: SEB „Priimti slapukus“ |
| Decline / Deny | Atmesti | A |
| Allow | Leisti | A |
| Don't allow | Neleisti | (rekomendacija) |
| Not now / No thanks | Ne dabar / Ne, ačiū | A „Ne, ačiū“; R: Pigu |
| Got it | Supratau | A |
| Learn more | Sužinoti daugiau | R: SEB, Bolt; A „Sužinokite daugiau“ |
| Show more | Rodyti daugiau | R: Vinted, Luminor |
| See all | Žiūrėti viską | R: Bolt |
| Search | Ieškoti | A, R: Pigu, Lietuvos paštas |
| Copy | Kopijuoti | A |
| Paste | Įklijuoti | A |
| Share | Bendrinti | A |
| Send | Siųsti | R: Lietuvos paštas „Siųsti siuntą“ |
| Submit | Pateikti | R: epaslaugos „Pateikti užklausą“ |
| Upload | Įkelti | V111, V112 (dar „nusiųsti“, „išsiųsti“); R: Vinted „Įkelti prekę“ |
| Download | Atsisiųsti / Parsisiųsti | V669; R: Bolt „Atsisiųsti“, Wolt „Parsisiųsti“ |
| Choose file | Pasirinkti failą | A |
| Update | Atnaujinti | A |
| Turn on / off | Įjungti / Išjungti | A |
| Sign in / Log in | Prisijungti | V1126; R: Swedbank, Pigu, epaslaugos |
| Sign out / Log out | Atsijungti | V1655 |
| Sign up / Register | Registruotis / Užsiregistruoti | V4518; R: Pigu „Registruotis“, Bolt „Užsiregistruoti vairuoti“ |
| Create account | Sukurti paskyrą | V8223 („paskyra“); (rekomendacija) forma |
| Forgot password? | Pamiršote slaptažodį? | (rekomendacija); RŠ aprašas: „Atkurti slaptažodį“ |
| Reset password | Atkurti slaptažodį | RŠ aprašas (mygtukas) |
| Become a customer | Tapti klientu | R: SEB meniu „Tapti klientu“ (Swedbank „Tapkite klientu“) |
| Buy | Pirkti | R: Lietuvos paštas, Telia „Pirkti iPhone 18 Pro“ |
| Add to cart | Į krepšelį / Įdėti į krepšelį | (rekomendacija) |
| Checkout | Apmokėti / Pereiti prie apmokėjimo | V3557: „apmokėti“ tinka su galininku („apmokėti sąskaitą“), ne „apmokėti už“; (rekomendacija) |
| Order | Užsakyti | V3614 („užsisakyti iš ko“); R: SEB „Užsakykite kortelę“ |
| Subscribe | Prenumeruoti | R: Lietuvos paštas |
| Subscribe (newsletter) | Užsisakyti naujienlaiškį / naujienas | V1901 („naujienlaiškis“); K: „Užsisakyti naujienas“ |
| Unsubscribe | Atsisakyti prenumeratos | (rekomendacija) |
| Start free trial | Išbandyti nemokamai | (rekomendacija) |
| Get started | Pradėti | R: Bolt „Pradėti“ |
| Contact us | Susisiekti / Rašykite mums | R: Lietuvos paštas „Rašykite mums“, „Susisiekite“ |
| Report | Pranešti | A |
| Manage cookies | Valdyti slapukus / Slapukų nustatymai | R: Wolt „Valdyti slapukus“, Lietuvos paštas „Slapukų nustatymai“ |
| Accept all cookies | Priimti visus slapukus / Priimti slapukus | R: SEB |
| Only necessary | Tik būtinieji slapukai | R: SEB |
| Skip to content | Pereiti prie turinio | R: Vinted, SEB „Pereiti į pagrindinį turinį“ |

### 2.2. Daiktai, skiltys, būsenos

| EN | LT | Šaltinis / pastaba |
|---|---|---|
| Account | Paskyra | V8223 (ne „akauntas“, ne „sąskaita“) |
| My account | Mano paskyra | R: Pigu |
| Profile | Profilis | V9002 |
| Settings | Nustatymai | A („Nustatymai“) |
| Preferences | Nuostatos | V1944 („nuostatos“ = principai); MS „parametrai“ Windows kontekste; (rekomendacija) SaaS: „Nustatymai“ |
| Password | Slaptažodis | V11233, V2144 |
| Username / login | Naudotojo vardas / Prisijungimo vardas | V3291 („registracijos vardas“ terminas); (rekomendacija) UI: „Prisijungimo vardas“ |
| Email | El. paštas | V830; VLKK sutrumpinimai: „el. (e.) elektroninis (el. paštas, e. paštas)“; R: CVbankas lauko žymė „El. paštas“ |
| Email address | El. pašto adresas | RŠ aprašas |
| Email (message) | El. laiškas | V830 |
| User | Naudotojas | V9002 („naudotojo profilis“), MS 3.1 („naudotojai“); Bolt „naudotojai“ |
| Customer | Klientas | MS 3.1 |
| App | Programėlė / Programa | MS 2.1.2 „programa“; V9373 „mobilioji programa“; R: SEB, Bolt, Wolt, Vinted „programėlė“ |
| Website | Svetainė | MS 2.1.2 |
| Browser | Naršyklė | V447 |
| Link | Nuoroda | V1626 |
| Cookies | Slapukai | V7214 |
| Newsletter | Naujienlaiškis | V1901 |
| Cart / Basket | Krepšelis / Prekių krepšelis | R: Pigu „Prekių krepšelis“ |
| Orders | Užsakymai | R: Pigu |
| Wishlist / Favorites | Patikusios prekės / Mėgstamiausi | R: Pigu „Patikusios prekės“ |
| Discount codes | Nuolaidų kodai | R: Pigu |
| Discount | Nuolaida | V7580 („nuolaida kam“: „15 proc. nuolaidą baldams“) |
| Sale / Promotions | Akcijos / Išpardavimas | R: Telia „Akcijos“, Pigu „Akcijos“ |
| Free shipping | Nemokamas pristatymas | R: Pigu „NEMOKAMAS PRISTATYMAS“ |
| Delivery | Pristatymas | R: Pigu, Bolt |
| Returns | Grąžinimas | R: Pigu |
| Payment | Apmokėjimas / Mokėjimas | R: Pigu „Apmokėjimas“ (skiltis) |
| Invoice | Sąskaita faktūra | R: Lietuvos paštas „Sąskaitų faktūrų išrašymas“ |
| Plan / Pricing | Planai / Kainos | R: Telia „Planai“, Swedbank „Sužinoti draudimo kainą“ |
| Subscription | Prenumerata | V2372 |
| Free trial | Bandomasis laikotarpis / Nemokamas bandomasis laikotarpis | V2461 („bandomasis“ vietoj „pilotinis“); junginys (rekomendacija) |
| Free | Nemokamai / Nemokamas | V7384 (kirčiavimas nemókamai) |
| FAQ | DUK / Dažniausiai užduodami klausimai | R: Lietuvos paštas „DUK“; K: Telia, Bolt, Sodra |
| Help | Pagalba | R: Bolt, Vinted |
| Contacts | Kontaktai | R: Swedbank, Telia |
| Privacy policy | Privatumo politika | R: Pigu, epaslaugos |
| Terms / T&C | Taisyklės / Naudojimosi sąlygos | R: Pigu „Pirkimo–pardavimo taisyklės“; (rekomendacija) |
| Careers | Karjera | R: Lietuvos paštas, Pigu |
| Search placeholder | Ieškoti prekių / Paslaugų paieška | R: Vinted, epaslaugos |
| Notifications | Pranešimai | R: epaslaugos |
| Required | Privalomas / Būtina užpildyti. | MS 5.5.2 („That can't be blank“ → „Būtina užpildyti.“) |
| Optional | Neprivalomas | (rekomendacija) |
| Loading… | Įkeliama… | A; MS 4.1.15 (bevardės giminės neveikiamasis dalyvis) |
| Saved | Išsaugota | MS 4.1.7 (bevardė giminė: „Modifikuota“) |
| Error | Klaida | A |
| No results | Nėra rezultatų / Nieko nerasta | A „Nėra atitikčių“ |
| Unknown | Nežinoma | A |
| Checked / unchecked | Pažymėta / Nepažymėta | A |
| Incorrect password | Neteisingas slaptažodis. | A |
| Dashboard | Apžvalga / Valdymo skydas | (rekomendacija) |
| Upload (noun) | Įkėlimas | V111 |
| Uninstall | Pašalinti programą | V3206 |
| Shortcut | Nuoroda / Šaukinys | V2849 |
| Toolbar | Mygtukų juosta / Parankinė | V2080 |
| Pilot project | Bandomasis projektas | V2461 |

### 2.3. Datos, laikas, skaičiai, pinigai

| Elementas | LT forma | Šaltinis |
|---|---|---|
| Trumpoji data | 2026-09-27 | MS 4.1.12, CLDR `Intl` lt-LT |
| Ilgoji data | 2026 m. rugsėjo 27 d. | CLDR `Intl` lt-LT; RŠ 69 (mėnuo kilmininku, „m.“, „d.“) |
| Laikas | 24 val., 10:55 (arba 10.55) | RŠ 64, 65 |
| Dešimtainis skirtukas | kablelis: 3,14 | RŠ 71 |
| Tūkstančių skirtukas | tarpas (jungiamasis): 1 234 567,89 | RŠ 72, CLDR |
| Valiuta | 1 234,50 € (CLDR) arba 5,70 Eur (Swedbank) | CLDR `Intl`; R: Telia „45,33 €“, Swedbank „5,70 Eur“ |
| Procentai su PVM | 10 % PVM (ne „PVM 10%“) | V2502 |
| Intervalas | 700–800 (brūkšnys be tarpų) | MS 4.1.12 |
| Numerio ženklas | Nr. (ne No, ne #) | RŠ 30 |
| Versija | 9.1 versija | MS 5.2 |
| Laikas liko | Liko 3 d. | MS 5.5.2 („%u days remaining“ → „Liko %u d.“) |
| Skaitiklis | Dalyvių: 12 | MS 5.5.2 („|0 participants“ → „Dalyvių: |0“) |
| Kaina per mėnesį | 49,95 € per mėnesį / 62,46 €/mėn. | R: Telia (abu variantai) |

---

## 3. Daugiskaita pagal skaičių (CLDR, ICU)

CLDR `plurals.xml`, lokalė `lt` (patikrinta ir `Intl.PluralRules('lt')`):

| Kategorija | Taisyklė | Skaičiai | Forma (daiktavardis) | Pavyzdys |
|---|---|---|---|---|
| one | n % 10 = 1 and n % 100 != 11..19 | 1, 21, 31, 101, 1001 | vienaskaitos vardininkas | 1 elementas, 21 elementas |
| few | n % 10 = 2..9 and n % 100 != 11..19 | 2–9, 22–29, 102 | daugiskaitos vardininkas | 2 elementai, 25 elementai |
| many | f != 0 (trupmena) | 0,1; 1,5; 10,1 | vienaskaitos kilmininkas (gramatika, rekomendacija) | 1,5 elemento |
| other | visa kita | 0, 10–20, 30, 100, 111 | daugiskaitos kilmininkas | 0 elementų, 11 elementų, 100 elementų |

`Intl` patikra: 0 other, 1 one, 2 few, 5 few, 9 few, 10 other, 11 other, 19 other, 20 other, 21 one, 22 few, 101 one, 111 other, 1.5 many.

ICU šablonas:

```
{count, plural,
  one {# elementas}
  few {# elementai}
  many {# elemento}
  other {# elementų}}
```

- Klaida: „2 kortelių“, „10 lentelės“ (RŠ 85). Klaida: vienas „elementai“ visiems skaičiams.
- Derinys su veiksmažodžiu irgi keičiasi: „Pasirinktas 1 failas“, „Pasirinkti 3 failai“, „Pasirinkta 10 failų“ (other forma dažnai derinama su bevarde gimine) (rekomendacija, pagal gramatiką).
- Jei ICU nėra, MS išeitis: dvitaškis „Failų: 5“, santrumpa „Liko 3 d.“ (MS 5.5.2).
- Kintamieji sakinyje: MS 5.5.2 įspėja dėl linksnio („Jūsų {doctype} parengtas“ → „Jūsų dokumentas ({doctype}) parengtas“). Kintamąjį atskirti dvitaškiu, skliaustais ar pažymimuoju žodžiu. Taip pat su vardais: „Sveiki, {vardas}“ vardininkas yra klaida kreipinyje (žr. 4.9).
- Invly projekte tam yra `ltPlural()` (atminties įrašas), skill'as turėtų siūlyti jį, ne rankinį `if`.

---

## 4. Šablonai pagal mikroteksto tipą (Blogai → Gerai)

### 4.1. Mygtukai / CTA

| Blogai | Gerai | Kodėl |
|---|---|---|
| Registruokitės dabar! | Registruotis | bendratis, be šauktuko (1.3) |
| Spauskite čia | Atsisiųsti ataskaitą | veiksmas + objektas; MS 3.2: ne „spustelėkite“, o bendras veiksmažodis |
| Pateikite | Pateikti užklausą | bendratis (R: epaslaugos) |
| Seivinti / Išsaugokite | Išsaugoti | V2708, bendratis |
| Prisijunk, kad gautumėte... | Prisijunkite, kad galėtumėte... | nemaišyti tu ir jūs (R: Wolt klaida) |
| Taip / Ne (patvirtinimo dialoge) | Ištrinti / Atšaukti | mygtukas pasako veiksmą (rekomendacija) |
| Sužinokite daugiau → | Sužinoti daugiau | vienoda mygtukų forma (R: SEB, Bolt) |
| Gauti savo nemokamą bandomąjį laikotarpį | Išbandyti nemokamai | MS 4.1.11: savybinis įvardis nereikalingas; trumpiau |

### 4.2. Formos: žymės, vietos rezervavimo tekstas, pagalbinis tekstas

- Žymė daiktavardžiu, be dvitaškio ir be taško: „El. paštas“, „Slaptažodis“, „Vardas“, „Pavardė“ (R: CVbankas; RŠ aprašas „Vardas; Pavardė; El. pašto adresas; Slaptažodis“).
- Vietos rezervavimo tekstas: pavyzdys arba trumpa užuomina, ne žymės pakaitalas. R: Lietuvos paštas „pvz. v.pavardenis@mymail.com“, „Pvz. +3706 8612345“, „Įveskite siuntos numerį“; Wolt „Įvesti pristatymo adresą“. Rekomendacija: „pvz.“ su tašku, po jo kablelis pagal VLKK santrumpas („pvz., jonas@imone.lt“).
- Pasirinkimo sąrašo pradinė reikšmė: „Pasirinkite“ (R: Lietuvos paštas, CVbankas).
- Privalomi laukai: žvaigždutė ir paaiškinimas viršuje („Pažymėti * laukai privalomi“) arba žymėti neprivalomus „(neprivaloma)“ (rekomendacija). MS 4.1.5: skliausteliuose ne sakinys rašomas mažąja raide: „Telefonas (neprivaloma)“.
- Pagalbinis tekstas sakiniu su tašku: „Slaptažodis turi būti bent 8 simbolių.“ (rekomendacija).

| Blogai | Gerai |
|---|---|
| Jūsų el. pašto adresas: | El. paštas |
| Įveskite jūsų vardą čia | Vardas |
| E-mail | El. paštas (V830) |
| Username | Prisijungimo vardas |
| Pasirinkite... (skliaustuose „Pasirinktinai“) | Telefonas (neprivaloma) |

### 4.3. Klaidų pranešimai

Struktūra (MS 2.2.1, 5.5.2): **kas nutiko. ką daryti.** Du trumpi sakiniai, kiekvienas su tašku (MS 4.1.12: klaidos visada baigiasi tašku arba klaustuku). Pabrėžiamas žodis („nepavyko“, „nepakanka“, „nėra“) MS rekomenduoja dėti sakinio gale: „Failo rasti nepavyko.“, „Atminties nepakanka.“, „Nurodytas kelias nepasiekiamas.“

MS standartinės frazės (5.5.2):

| EN | LT |
|---|---|
| Could not / Failed to ... | ... nepavyko. („[2] panaikinti nepavyko.“) |
| Cannot find ... | ... rasti nepavyko. |
| Not enough memory | Atminties nepakanka. |
| ... is not available | ... negalimas / nėra / nepasiekiamas. |
| The password isn't correct, so try again. | Slaptažodis neteisingas. Pabandykite dar kartą. |
| This product key didn't work. Check it and try again. | Šis produkto kodas neveikia. Patikrinkite ir bandykite dar kartą. |

Android (A) daro tą patį, tik „Nepavyko“ pradžioje: „Nepavyko prisijungti prie serverio.“, „Nepavyko susisiekti su serveriu. Vėliau bandykite dar kartą.“, „Per daug bandymų. Vėliau bandykite dar kartą.“

Rinkoje (R): Swedbank „Dokumento įkelti nepavyko. Priežastis gali būti dėl lėto interneto ryšio arba tinklo sutrikimų. Pabandykite vėliau dar kartą.“; Bolt „Nepavyko nuskaityti pasirinkto failo. Pabandykite dar kartą.“; epaslaugos „Pabandykite dar kartą. Jei problema kartojasi, grįžkite į pradžios puslapį.“

**„Something went wrong“.** Faktai: MS vertime „Something bad happened!“ → „Kažkas ne taip!“ (2.2.2); Android „Something went wrong. Try again.“ → „Kažkas nepavyko. Bandykite dar kartą.“; Bolt „Kažkas ne taip. Pabandykite vėliau.“ Taigi kalkė rinkoje ir net MS/Google vertimuose yra. **(rekomendacija):** skill'e vertinti kaip silpną, ne kaip klaidą; siūlyti konkretų variantą, jei priežastis žinoma, arba neutralų „Įvyko klaida. Bandykite dar kartą.“ (R: Swedbank, epaslaugos, Telia) / „Nepavyko išsaugoti. Bandykite dar kartą.“

| Blogai | Gerai | Kodėl |
|---|---|---|
| Oi! Kažkas nutiko ne taip :( | Nepavyko išsaugoti pakeitimų. Bandykite dar kartą. | be jaustuko, konkretu (RŠ 32) |
| Serverio klaida! Bandykite darkart veliau. (R: Pigu) | Serverio klaida. Bandykite vėliau. | šauktukas, „darkart“, „veliau“ be ė |
| Jūs įvedėte neteisingą slaptažodį! | Slaptažodis neteisingas. Bandykite dar kartą. | be kaltinimo (MS 2.2.1) |
| Klaida: laukas negali būti tuščias | Būtina užpildyti. | MS 5.5.2 |
| Nepavyko rasti vartotojo su šiuo el. paštu | Paskyros su šiuo el. pašto adresu nėra. Patikrinkite adresą arba užsiregistruokite. | kas + ką daryti |
| Įvyko netikėta klaida, prašome susisiekti su administratoriumi | Įvyko klaida. Jei kartosis, parašykite mums: pagalba@... | „prašome“ nereikia, konkretus kanalas |
| Validacijos klaida (R: epaslaugos) | Patikrinkite pažymėtus laukus. | žargonas → veiksmas |

### 4.4. Tušti ekranai

Struktūra (rekomendacija): kas čia bus + pirmas veiksmas.

| Blogai | Gerai |
|---|---|
| Jūs dar neturite jokių sąskaitų :( | Sąskaitų dar nėra. Sukurkite pirmąją, ir ji atsiras čia. |
| Nėra duomenų | Šį mėnesį išlaidų dar nėra. |
| Oops, čia tuščia! | Nieko nerasta. Pabandykite kitą paieškos žodį. |

### 4.5. Įkėlimo ir vykdymo būsenos

MS 4.1.15: anglų gerundis (-ing) → bevardės giminės esamojo laiko neveikiamasis dalyvis: „Installing“ → „Diegiama“. Android: „Įkeliama...“, „Ištrinama bendrinama saugykla…“.

| Blogai | Gerai |
|---|---|
| Kraunasi... | Įkeliama… |
| Vyksta išsaugojimas | Išsaugoma… |
| Siunčiame jūsų laišką | Siunčiama… |
| Palaukite kol mes apdorojame | Apdorojama. Tai gali užtrukti kelias minutes. |

### 4.6. Sėkmės pranešimai

MS 4.1.7: bevardė giminė, kai veikėjas nenurodytas („Modifikuota“). MS 2.2.1: „All ready to go“ → „Viskas paruošta“.

| Blogai | Gerai |
|---|---|
| Sėkmingai išsaugota! | Išsaugota |
| Jūsų užsakymas buvo sėkmingai pateiktas! | Užsakymas pateiktas. Patvirtinimą išsiuntėme el. paštu. |
| Puiku! Viskas atlikta! | Viskas paruošta |
| Sveikiname! Jūsų profilis atnaujintas! | Profilis atnaujintas |

„Sėkmingai“ dažniausiai perteklinis: jei nepavyktų, būtų klaidos pranešimas (rekomendacija). Pasyvas su „buvo“ („buvo išsiųstas“) keičiamas trumpąja forma „išsiųstas“ (rekomendacija, dera su MS 4.1.15 paprastu laiku).

### 4.7. Patvirtinimo dialogai

MS 2.2.1: „Would you like to continue?“ → „Ar norite tęsti?“. MS 2.2.2: pasekmė aiškiai: „Jei dabar paleisite iš naujo, tiek jūs, tiek kiti... gali prarasti neįrašytą darbą.“ MS 4.1.10: dialogo pavadinimas daiktavardžiu arba klausimu.

| Blogai | Gerai |
|---|---|
| Ar esate tikras? [Taip] [Ne] | Ištrinti sąskaitą Nr. 12? Šio veiksmo atšaukti negalėsite. [Ištrinti] [Atšaukti] |
| Ar tikrai norite ištrinti šį elementą? | Ištrinti 3 failus? Jie bus pašalinti visam laikui. |
| Palikti grupę? (RŠ pavyzdys: dviprasmiška) | Išeiti iš grupės? |

„Ar tikrai norite...?“ taisyklinga ir neutrali lyties atžvilgiu, bet ilgesnė; „Ar esate tikras?“ blogai dėl giminės (1.4).

### 4.8. Patarimai (tooltips), parinktys, antraštės

- Patarimas be taško, bendratimi: „Įrašyti ir uždaryti segmentą“ (MS 4.1.12).
- Žymimieji laukeliai ir radijo mygtukai niekada su tašku (MS 4.1.12).
- Lentelių stulpelių antraštės didžiąja raide, be skyrybos (MS 4.1.5).
- Po dvitaškio sakinys tęsiamas mažąja raide (MS 4.1.5).
- Frazės antraštėje didžioji tik pirmo žodžio, ne kiekvieno (MS 4.1.5; RŠ 24). Blogai: „Slapukų Nustatymai“ (R: Vinted). Gerai: „Slapukų nustatymai“.
- Komanda, atverianti dialogą, su daugtaškiu „Išsaugoti kaip…“ (MS 4.1.12).

### 4.9. El. laiškai

**Pasisveikinimas**

- „Laba diena“ yra neutralioji norma (vardininkas); „Labą dieną“ šalutinis variantas, tinka publicistikoje ir šnekamojoje kalboje (V3940).
- „Gera diena“ sveikinantis nėra klaida, bet „dirbtinoka“ (V8094).
- „Sveiki visi“ yra šnekamosios kalbos pasakymas; dalykinėje kalboje rašyti vien „Sveiki“ arba visą kreipinį („Sveiki, gerbiamieji“) (V16091).
- Kreipinys skiriamas kableliais, taip pat po pasisveikinimo žodžio: „Laba diena, mieli klausytojai,...“, „Labas, Martynai,...“ (V8306).
- Kreipinys šauksmininku, ne vardininku: „Birute, jus kviečia direktorius“, ne „Birutė,...“ (V1518). Tai reiškia: „Laba diena, Jonai,“ / „Sveiki, Rūta,“ (moteriškas vardas su -a šauksmininke nesikeičia), „Gerb. inspektoriau,“.
- Tekstas po kreipinio eilutės pradedamas **mažąja** raide: „Gerb. Jonai, / sveikiname Jus gimimo dienos proga.“ (V10910).
- Pagarbos žodis: oficialiai teiktinesnis „Gerbiamasis pirmininke“, bet „Gerbiamas pirmininke“ irgi taisyklinga (V3521); „Mieli kolegos“ ir „brangus drauge“ nėra klaidos (V3521).
- Masinis laiškas be vardo: MS 3.1 „Gerbiamieji“ vietoj „Ponios ir ponai“.

**Kintamojo spąstai (rekomendacija):** „Sveiki, {first_name},“ su vardu vardininku yra V1518 klaida („Sveiki, Jonas,“). Arba generuoti šauksmininką, arba rinktis formą be vardo („Laba diena,“).

**Atsisveikinimas**

- „Su pagarba“ ir „Pagarbiai“ yra lygiaverčiai; „su pagarba“ iškilmingesnis, „pagarbiai“ paprastesnis (V2024).
- **Po „Pagarbiai“, „Su pagarba“ jokio skyrybos ženklo nededama** (V2024). Angliškas kablelis „Pagarbiai,“ yra kalkė.
- „Su linkėjimais“, „Su draugiškais linkėjimais“ taisyklinga (V3790).
- „Geros dienos“ kaip palinkėjimas laiško pabaigoje: šaltinio nerasta; gramatiškai tai kilmininkas su numanomu „linkiu“, rinkoje paplitęs (rekomendacija: tinka neformaliems laiškams).

| Blogai | Gerai |
|---|---|
| Sveiki Jonas, | Laba diena, Jonai, |
| Labas, Jonai! Norėjome... | Laba diena, Jonai, / norėjome... |
| Sveiki visi, | Sveiki, / Laba diena, |
| Pagarbiai, / Jonas | Pagarbiai / Jonas Jonaitis |
| Geriausi linkėjimai, | Su linkėjimais |
| Ačiū už jūsų laiką ir tikiuosi išgirsti iš jūsų greitai | Lauksiu atsakymo. |

**Tema ir preheader (rekomendacija, šaltinių nerasta).** Tema: konkretus daiktas ir skaičius, be šauktukų ir didžiųjų raidžių („Sąskaita Nr. 1024 už rugsėjį“, „Užsakymas Nr. 5561 išsiųstas“). Preheader: tęsia temą, nekartoja jos, iki ~90 simbolių, be „Peržiūrėti naršyklėje“. Didžiąja „Jūs“ temoje nerašyti, jei laiškas masinis (1.2).

### 4.10. Slapukų juosta

VLKK: „slapukai“ (V7214). Rinka:

- SEB: mygtukai „Priimti slapukus“, „Tik būtinieji slapukai“; kategorijos „Privalomieji slapukai“, „Statistikos slapukai“, „Rinkodaros slapukai“; tekstas „Slapukų nustatymus galite valdyti žemiau.“
- epaslaugos: „Būtinieji slapukai“, „Analitiniai slapukai“, nuoroda „Slapukų tvarkymas“.
- Lietuvos paštas: mygtukas „SUTINKU“, nuoroda „Slapukų nustatymai“.
- Wolt: „Valdyti slapukus“; Pigu: „Valdyti slapukų pasirinkimus“.
- Luminor: „Mes naudojame slapukus siekdami pagerinti jūsų naršymo patirtį. Sutikite ir pasidalinkite slapukais su mumis!“ (šauktukas ir „pasidalinkite slapukais“ yra rinkodarinė kalkė; kaip neigiamas pavyzdys).

Šablonas (rekomendacija):

> Naudojame slapukus, kad svetainė veiktų ir galėtume matyti, kaip ja naudojamasi. Rinkodaros slapukus įjungsime tik jums sutikus.
> [Priimti visus] [Tik būtinieji] [Nustatymai]

| Blogai | Gerai |
|---|---|
| Šis tinklalapis naudoja sausainėlius, kad pagerintų jūsų patirtį! | Naudojame slapukus, kad svetainė veiktų. |
| Priimti viską! | Priimti visus |
| Cookies nustatymai | Slapukų nustatymai |

### 4.11. Naujienlaiškio registracija

- „Naujienlaiškis“ (V1901), ne „niusleteris“. Mygtukas „Užsisakyti“ / „Prenumeruoti“ (R: Lietuvos paštas „Prenumeruoti“; K: „Užsisakyti naujienas“).
- Sutikimo tekstas pirmuoju asmeniu R: Pigu „Noriu tapti Pigu PLUS nariu ir sutinku gauti ... pasiūlymus“ (per ilgas, bet forma tinkama žymimajam laukeliui).

| Blogai | Gerai |
|---|---|
| Užsiregistruokite į mūsų niusleterį ir gaukite naujausias naujienas! | Kartą per mėnesį: naujos funkcijos ir patarimai. [El. paštas] [Užsisakyti] |
| Aš sutinku su privatumo politika | Sutinku su privatumo politika |

### 4.12. 404 puslapis

Rinka (R):
- SEB: „Puslapis nepasiekiamas. Patikrinkite nuorodą ir pamėginkite dar kartą, arba nueikite į pagrindinį puslapį ir reikiamos informacijos ieškokite naudodamiesi meniu.“ Mygtukas „Eiti į pradinį puslapį“.
- Swedbank: „Puslapis nepasiekiamas. Patikrinkite, ar teisingai įvedėte interneto adresą.“ Nuoroda „Pradinis puslapis“.
- Lietuvos paštas: „Prašomas puslapis nerastas.“
- Bolt: „Nepavyko rasti puslapio.“
- Luminor (tu): „Regis, šio puslapio nėra. Gal neteisingai įvedei adresą?“

Šablonas (rekomendacija): „Puslapis nerastas“ (antraštė) + „Gali būti, kad nuoroda pasenusi arba adresas įvestas su klaida.“ + [Grįžti į pradžią] [Ieškoti].

| Blogai | Gerai |
|---|---|
| Oi! 404! Atrodo, kad pasiklydote! | Puslapis nerastas |
| Klaida 404: puslapis neegzistuoja | Tokio puslapio nėra. Patikrinkite adresą. |

### 4.13. Kainodara ir nuolaidos

- Kaina: „49,95 € per mėnesį“ arba „62,46 €/mėn.“ (R: Telia abu). Kablelis dešimtainėje dalyje, tarpas prieš €, tarpas tūkstančiuose (RŠ 71, 72; CLDR).
- PVM: „10 % PVM“, ne „PVM 10%“ (V2502). „be PVM“ / „su PVM“ rašoma prie kainos (rekomendacija: B2B rodyti „be PVM“ aiškiai, B2C kainos su PVM pagal vartotojų teisę; teisinės pusės šiame tyrime netikrinta).
- Nuolaida: „nuolaida kam“ taisyklinga („15 proc. nuolaida visiems baldams“) (V7580). Rinka: „iki -70%“ (Pigu), „Akcijos“.
- „Nemokamai“ kirčiuojama šaknyje: nemókamai (V7384).
- Mėnesio / metų perjungiklis: „Kas mėnesį“ / „Kasmet“ (rekomendacija).
- Planų pavadinimai: Telia „MIDI planą“ (didžiosios, kaip prekės pavadinimas). Rekomendacija: plano pavadinimą rašyti kaip tikrinį („Pro planas“), žodį „planas“ mažąja.

| Blogai | Gerai |
|---|---|
| €49.99/mo | 49,99 €/mėn. |
| Kaina: 1,234.50 EUR + PVM 21% | 1 234,50 € be PVM (21 % PVM) |
| Gauk 20% OFF! | –20 % / 20 % nuolaida |
| Pradėkite savo nemokamą 14 dienų bandomąjį laikotarpį šiandien! | 14 dienų nemokamai. Kortelės nereikia. |

### 4.14. Pranešimai su kintamaisiais

MS 5.5.2: prieš verčiant išsiaiškinti, kas įstatoma; kintamasis vardininku sakinyje sukels linksnio klaidą.

| Blogai | Gerai |
|---|---|
| {user} pakvietė jus į {project} | {user} pakvietė jus į projektą „{project}“ |
| Jūsų {doctype} parengtas | Jūsų dokumentas ({doctype}) parengtas (MS) |
| Liko {n} dienų | {n, plural, one {Liko # diena} few {Liko # dienos} other {Liko # dienų}} arba „Liko {n} d.“ (MS) |

---

## 5. Rinkos pavyzdžių lentelė

Visi tekstai paimti `curl` 2026-09-27 iš pagrindinių puslapių ir juose įterptų JS vertimų. Revolut ir Senukai grąžino apsaugos (Cloudflare) puslapį, jų tekstų negauta.

| Svetainė | Kreipinys | Mygtukų forma | Tikri tekstai |
|---|---|---|---|
| [Swedbank](https://www.swedbank.lt/private) | jūs (reklamoje „jums“ mažąja, kitur „Jūsų“) | mišri: „Prisijungti“, „Tapkite klientu“ | „Įvyko klaida. Bandykite dar kartą.“; „Dokumento įkelti nepavyko... Pabandykite vėliau dar kartą.“; 404 „Puslapis nepasiekiamas.“ |
| [SEB](https://www.seb.lt/privatiems) | jūs, „Jūsų/Jums“ didžiąja | mišri: „Priimti slapukus“, „Sužinoti daugiau“, bet „Prisijunkite“, „Užsakykite kortelę savo vaikui“ | „Tik būtinieji slapukai“; 404 „Patikrinkite nuorodą ir pamėginkite dar kartą“ |
| [Luminor](https://www.luminor.lt/lt/privatiems) | tu (UI), jūs (slapukai) | liepiamoji tu: „Tapk klientu“, „Palygink mokėjimo korteles“, „Sužinok daugiau“ | 404 „Regis, šio puslapio nėra. Gal neteisingai įvedei adresą?“; neišverstas aria „Leave this field blank“ |
| [Lietuvos paštas](https://www.post.lt) | jūs, dažniausiai mažąja | bendratis: „Pirkti“, „Siųsti siuntą“, „Prenumeruoti“, „Ieškoti“; „Sutinku“ | placeholder „pvz. v.pavardenis@mymail.com“; 404 „Prašomas puslapis nerastas.“ |
| [Telia](https://www.telia.lt) | tu reklamoje, jūs DUK | bendratis mygtukuose („Pirkti iPhone 18 Pro“, K: „Rinktis planą“), liepiamoji reklamos sakiniuose („Mokėk dalimis“, „Užsisakyk MIDI planą“) | „Atsiprašome, dėl techninių kliūčių puslapis laikinai neveikia. Pabandykite perkrauti puslapį.“; „62,46 €/mėn.“ |
| [Pigu](https://www.pigu.lt) | mišri: „tavo kasdieniams pirkiniams“, „Pirk“ + „Jau turite paskyrą? Prisijunkite“, „Jums“ | bendratis: „Prisijungti“, „Registruotis“, „Įjungti Pigu PLUS kainas“, „Ne, ačiū“ | „Prekių krepšelis“, „Nuolaidų kodai“, „Patikusios prekės“; JS klaida „Serverio klaida! Bandykite darkart veliau.“ |
| [Bolt](https://bolt.eu/lt-lt/) | jūs mažąja | bendratis: „Atsisiųsti programėlę „Bolt““, „Užsiregistruoti vairuoti“, „Siųsti daiktą“, „Pradėti“ | „Deja, įvyko klaida. Patikrinkite informaciją ir bandykite dar kartą.“; „Kažkas ne taip. Pabandykite vėliau.“; „Nepavyko rasti puslapio.“ |
| [Wolt](https://wolt.com/lt/ltu) | tu vartotojams, jūs verslui, maišoma | mišri: „Sužinokite daugiau“, „Pradėkite dabar“, „Atrask Wolt Market“, „Pakoreguok užsakymą“ ir „Pakoreguokite užsakymą“ | „Prisijunk, kad gautumėte išsaugoti adresus“ (maišymo klaida); „Nepavyko nustatyti tavo buvimo vietos“ |
| [Vinted](https://www.vinted.lt) | tu | bendratis: „Įkelti prekę“, „Rodyti daugiau“, „Registruotis / Prisijungti“ | „Bandyk dar kartą po...“; „Suderink su juo naują paėmimo datą“; „Slapukų Nustatymai“ (didžiosios klaida); ARIA „pažymėjo 4 nariai / 15 narių“ (teisinga daugiskaita) |
| [Elektroniniai valdžios vartai](https://www.epaslaugos.lt) | jūs | bendratis: „Pateikti užklausą“, „Prisijungti“ | „Įvyko klaida. Bandykite vėliau.“; „Nepavyko pateikti atsiliepimo. Bandykite dar kartą.“; „Validacijos klaida“ |
| [CVbankas](https://www.cvbankas.lt) | jūs | bendratis: „Registuotis“ (rašybos klaida) | placeholder „El. paštas“, „Slaptažodis“, „Pasirinkite“ |
| Android (AOSP LT) | jūs mažąja | bendratis + „Gerai“, „Atlikta“ | „Kažkas nepavyko. Bandykite dar kartą.“; „Išsaugoti“; „Įkeliama...“ |

Apibendrinimas iš K (19 puslapių): mygtukai bendratimi 85, liepiamąja 11; tu ir jūs maždaug per pusę; formų maišymas vienoje svetainėje dažnas.

---

## 6. Audito kontrolinis sąrašas skill'ui (rekomendacija)

1. Viena kreipinio forma (tu ar jūs) visame tekste ir produkte.
2. „jūs“ UI ir masiniuose tekstuose mažąja; „Jūs“ tik asmeniniame laiške, nuosekliai.
3. Mygtukai bendratimi, viena forma grupėje; liepiamoji tik sakiniuose.
4. Nėra gimininių dalyvių kreipinyje („esate tikras“, „prisijungęs“).
5. Nėra perteklinių „jūsų“, „savo“ (RŠ 15, MS 4.1.11).
6. Klaida = kas nutiko + ką daryti, su tašku, be šauktuko, be „Oi“.
7. Būsenos bevarde gimine: „Išsaugota“, „Įkeliama…“.
8. Daugiskaita pagal CLDR (one/few/many/other), ne vienas „-ai“.
9. Skaičiai: kablelis, tarpas tūkstančiuose, „10 % PVM“, „€/mėn.“, data 2026-09-27.
10. Laiške: kreipinys šauksmininku, tekstas po kreipinio mažąja, po „Pagarbiai“ be kablelio.
11. Antraštėse didžioji tik pirmo žodžio; kabutės „ “; ilgojo brūkšnio lietuviškai nėra (MS 4.1.12: „The em dash isn't used in Lithuanian.“).
12. Žargonas: seivinti, daunlaudinti, akauntas, linkas, e-mailas, brauseris, niusleteris → žr. žodynėlį.

---

## 7. Šaltiniai (visi tikrinti 2026-09-27)

**Pasiekti ir perskaityti**

- Microsoft Lithuanian Localization Style Guide (PDF), https://aka.ms/lithuanian-styleguide → https://download.microsoft.com/download/7/4/6/74633d8a-e88f-4ad1-954b-b9cce823fd3b/lit-ltu-StyleGuide.pdf (visas tekstas, 46 psl.)
- VLKK konsultacijų bankas, https://vlkk.lt/konsultacijos/ : 7214 (slapukas), 2708 (save), 669 (download), 111 ir 112 (upload), 1126 (log on), 1655 (log off), 8223 (account), 3291 (login), 830 (e-mail), 1626 (link), 447 (browser), 1901 (naujienlaiškis), 9003 ir 9373 (aplikacija), 14250 (per programėlę), 9002 (profilis), 1944 (nuostatos), 2121 (atšaukti), 2461 (bandomasis), 3206 (uninstall), 4518 (registruotis), 3557 (apmokėti), 7384 (nemokamai), 2502 (PVM), 7580 (nuolaida kam), 3940 ir 8094 (laba diena), 16091 (sveiki visi), 2024 (pagarbiai), 3790 (su linkėjimais), 1518 (kreipinys vardininku), 8306 (kreipinio skyryba), 10910 (mažoji po kreipinio), 3521 (gerbiamasis)
- VLKK sutrumpinimai, https://www.vlkk.lt/aktualiausios-temos/rasyba/sutrumpinimai
- J. Pajėdienė, „Lietuviškas rašto diskursas: adresatą nurodantys participiniai įvardžiai“, Bendrinė kalba 90 (2017), http://www.bendrinekalba.lt/Straipsniai/90/Pajediene_BK_90_straipsnis.pdf (cituoja VLKK 1997 nutarimo Nr. 60 p. 2.7.1 ir e-seimas suvestinę redakciją https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/TAIS.41265/qkELNFgtVx)
- Pagėgių savivaldybė, „Didžiųjų raidžių rašymas pavadinimuose“ (tas pats p. 2.7.1 tekstas), https://www.pagegiai.lt/2025/04/14/didziuju-raidziu-rasymas-pavadinimuose/
- „Programų lietuvinimo kokybės vertinimo el. paslaugos naudojimo aprašas“, VU, 2021, https://xn--ratija-ckb.lt/wp-content/uploads/2021/07/Kokybes-paslaugos-naudojimo-aprasas.pdf
- Unicode CLDR plurals.xml, https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/plurals.xml
- Android AOSP LT eilutės, https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/main/core/res/res/values-lt/strings.xml (ir `values/strings.xml` palyginimui)
- Svetainės (curl): swedbank.lt/private, seb.lt/privatiems, luminor.lt/lt/privatiems, post.lt, telia.lt, pigu.lt, bolt.eu/lt-lt, wolt.com/lt/ltu, vinted.lt, epaslaugos.lt, cvbankas.lt; 404: seb.lt, swedbank.lt, post.lt, luminor.lt
- Korpuso tyrimas `references/korpusas.md` (bendratis 85 : liepiamoji 11; tu/jūs per pusę)

**Nepasiekti arba nerasta**

- Apple: viešo LT stiliaus gido nėra. Apple lokalizacijos žodynėliai (glossaries) prieinami tik su Apple Developer paskyra; applelocalization.com turi LT (iOS) eilutes, bet jo API šiame tyrime grąžino tuščius rezultatus, todėl Apple formų nepateikiu.
- Google: viešo LT stiliaus gido nerasta (Google developer style guide tik EN, Material LT gairių nėra). Vietoj to naudotos Android AOSP LT eilutės kaip Google praktika.
- VLKK konsultacijos konkrečiai apie mygtukų formą (bendratis ar liepiamoji) nerasta; sprendimas remiasi MS, Android ir rinka.
- VLKK konsultacijos apie „Something went wrong“, „trial“, „checkout“, „dashboard“, laiško temos eilutę ir preheader nerasta; ten pažymėta (rekomendacija).
- VLKK 1997 nutarimo Nr. 60 pirminio teksto e-seimas neatsidariau; p. 2.7.1 formuluotė imta iš dviejų nepriklausomų citatų (Pajėdienė 2017, Pagėgių sav. 2025), jos sutampa.
- Revolut LT ir Senukai: apsauga nuo robotų, tekstų negauta.
- terminai.vlkk.lt (Terminų bankas) tiesiogiai neužklaustas; terminai imti per VLKK konsultacijas, kurios cituoja Terminų banką ir Enciklopedinį kompiuterijos žodyną.
