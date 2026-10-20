> ⚠️ PASENĘS (2026-09-27). Lietuvių kalbai naudok `lt-rasyba` skill'ą (~/.claude/skills/lt-rasyba). Šiame faile yra patvirtintų klaidų (pvz. „jokie staigmenai“, „išsamus → pilnas“, kablelis po „t. y.“). Palikta tik istorijai.

# Lithuanian AI Writing Patterns - Reference

Lithuanian AI text has the same structural problems as English AI text, but also has language-specific tells from mistranslated patterns and unnatural calques from English.

## Word Replacement Table

| AI žodis / frazė | Pakeisti į |
|---|---|
| pasitelkti | naudoti |
| išnaudoti (resursus) | naudoti |
| stiprus (sprendimas) | patikimas / geras |
| sklandus | paprastas / lengvas |
| supaprastinti | pagerinti / pagreitinti |
| pažangus | naujas / modernus |
| novatoriškas | naujas / kitoks |
| esminis | svarbus / pagrindinis |
| gyvybiškai svarbus | būtinas / reikalingas |
| išsamus | pilnas / visas |
| skatinti | padėti / remti / plėtoti |
| įgalinti | leisti / padėti |
| pagerinti | tobulinti (only if not redundant) |
| prisidėti | duoti / teikti |
| atspindėti platesnę | rodyti / liudyti |
| liudija apie | parodo / įrodo |
| atlieka svarbų vaidmenį | yra svarbus / daro didelę įtaką |
| ekosistema | sistema / aplinka |
| kraštovaizdis (perkeltine prasme) | sritis / rinka / laukas |
| paradigma | modelis / požiūris / sistema |
| sinergia | bendradarbiavimas / derinys |
| tarpdisciplininis | (nurodyti konkrečias disciplinas) |
| holistinis | visapusiškas / bendras |
| transformacinis | keičiantis / lemiantis |
| inovatyvus sprendimas | naujas / kitoks sprendimas |
| dinamiškas | aktyvus / kintantis |
| pažangūs įrankiai | nauji įrankiai |
| šiuolaikinis iššūkis | dabartinis / konkretus iššūkis |

## Structural Patterns to Avoid

### Template openings (AI calques from English)
- "Šiuolaikiniame sparčiai besivystančiame X pasaulyje..." ("In today's rapidly evolving X world...")
- "Skaitmeninių technologijų eroje..." ("In the era of digital technologies...")
- "Kai naviguojame per X..." (mistranslated "as we navigate through X")
- "X niekada nebuvo svarbiau nei dabar" ("X has never been more important than now")
- "Svarbu pažymėti, kad..." ("It is important to note that...")

### Hollow phrases
- "Verta paminėti, kad..." → delete or state directly
- "Svarbu atkreipti dėmesį į tai, kad..." → delete or state directly
- "Reikia pabrėžti, kad..." → state the point without the frame
- "Iš esmės" (overused as a filler) → cut or rephrase
- "Apskritai" (overused as a summary word) → cut

### AI transition words (overused)
- "Be to," / "Be to, verta paminėti,"
- "Tuo tarpu,"
- "Vis dėlto,"
- "Dėl to,"
- "Apibendrinant,"
- "Galų gale,"
- "Šiame kontekste,"

### Significance inflation
- "vaidina svarbų vaidmenį"
- "daro esminę įtaką"
- "liudija apie įsipareigojimą"
- "paliko neišdildomą pėdsaką"
- "atspindi platesnes tendencijas"

### Copula avoidance (Lithuanian-specific)
AI in Lithuanian avoids "yra" (is/are) with substitutes:
- "veikia kaip" (acts as)
- "funkcionuoja kaip" (functions as)
- "tarnauja kaip" (serves as)
- "pasireiškia kaip" (manifests as)
Fix: use "yra" or restructure.

### Formulaic challenges section
- "Nepaisant šių pasiekimų, X susiduria su iššūkiais..."
- "Nors padaryta didelė pažanga..."
- "Žvelgiant į ateitį, yra galimybių..."

### Generic conclusions
- "Ateitis atrodo perspektyvi..."
- "Laikas parodys..."
- "Tai tik pradžia..."
- "Galimybės yra beribės"
- "Judant į priekį..."

### Vague Lithuanian attributions
- "ekspertai teigia"
- "tyrėjai mano"
- "kai kurių kritikų nuomone"
- "šiuolaikiniai mokslininkai mano"
Fix: name the source or cut the claim.

## Grammar & Style Issues Specific to Lithuanian AI Text

### Unnatural noun strings (English calques)
AI translates English noun-noun compounds directly, creating unnatural Lithuanian:
- ❌ "skaitmenizacijos transformacijos iššūkiai" (digitalization transformation challenges)
- ✅ "iššūkiai, susiję su skaitmenizacija"

### Over-nominalization
AI overuses abstract nouns where a verb would be more natural:
- ❌ "šių procesų optimizavimo vykdymas" (the execution of the optimization of these processes)
- ✅ "šie procesai optimizuojami" / "optimizuojame šiuos procesus"

### Passive voice overuse
AI uses passive to sound formal:
- ❌ "buvo padaryta išvada, kad" (a conclusion was reached that)
- ✅ "padarėme išvadą, kad" / "išvada: X"

### Comma splice from English rhythm
AI places commas following English rhythm, not Lithuanian grammar rules.

### Loan word inflation
AI prefers English loan words over native Lithuanian equivalents:
- ❌ implementuoti → ✅ įgyvendinti / diegti
- ❌ optimizuoti (when plain alternatives exist) → ✅ pagerinti / supaprastinti
- ❌ finalizuoti → ✅ užbaigti / patvirtinti
- ❌ prezentacija → ✅ pristatymas
- ❌ kontentas → ✅ turinys
- ❌ featureai → ✅ funkcijos / galimybės

## Formatting Patterns to Avoid (same as English)

- Brūkšnys (-) vietoj kablelio arba atskirų sakinių
- Kiekvieno žodžio sudrąsinimas (bold)
- Emojai kaip skyrių antraštės: ✅ Kas veikia / ❌ Kas neveikia
- Visų žodžių rašymas didžiosiomis antraštėse: "Šiuolaikiniai Iššūkiai Ir Galimybės"

## Second-Pass Check (Lithuanian)

After rewriting Lithuanian text, scan for:
1. Words from the replacement table surviving
2. Sentences starting with "Be to,", "Tuo tarpu,", "Apibendrinant,"
3. Phrase "verta paminėti" or "svarbu pažymėti"
4. Any sentence ending in "...pabrėžiant X svarbą"
5. Passive constructions where an active verb is more natural
6. English calque noun strings
7. Generic conclusion sentences about the future
