#!/usr/bin/env python3
"""lt_lint: pirmas, mechaninis lietuviško teksto patikrinimas.

Randa tai, ką patikimai pagauna reguliariosios išraiškos: DKKS klaidas,
kalkes, rašybos ir skyrybos techniką (kabutės, brūkšniai, tarpai, skaičiai),
AI/vertimo kalbos žymes. Žodžių tvarkos ir sakinio logikos NEPAGAUNA, tam
yra skill'o 2 žingsnis (skaitymas akimis pagal references/).

Naudojimas:
  lt_lint.py failas.md katalogas/ https://svetaine.lt   # bet koks mišinys
  lt_lint.py --crawl 20 https://svetaine.lt             # iki 20 to paties domeno puslapių
  echo "tekstas" | lt_lint.py -                         # stdin
  lt_lint.py --json ...                                 # mašinai
  lt_lint.py --test                                     # savitikra
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.error
import urllib.request

UA = "Mozilla/5.0 (lt-rasyba)"

LT_CHARS = re.compile(r"[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]")
LT_WORDS = re.compile(r"\b(ir|kad|yra|su|per|nuo|iki|arba|mes|kaip|kai|bet|tik|dar|nes|jog|o|tel|val|kaina|sveiki|dirbame|galite|mums)\b", re.I)
EN_WORDS = re.compile(r"\b(the|and|to|of|is|are|you|your|for|with|this|that|we|our|it|in|on|be|can|will|not|or)\b", re.I)
LT_ENDINGS = re.compile(r"[a-z]{2,}(ame|ate|ite|iais|ams|oms|ių|mis|uose|ose|ėje|oje)\b", re.I)

TEXT_EXT = {".md", ".mdx", ".txt", ".html", ".htm", ".tsx", ".jsx", ".ts", ".js",
            ".json", ".vue", ".svelte", ".astro", ".php", ".liquid", ".yml", ".yaml", ".po"}
SKIP_DIRS = {"node_modules", ".git", ".next", "dist", "build", "out", ".turbo", ".vercel",
             "coverage", ".cache", "vendor", "__pycache__", ".venv", "ios", "android", "Pods"}
SKIP_FILE = re.compile(r"(\.test\.|\.spec\.|\.stories\.|\.d\.ts$|\.min\.|lock|generated|\.config\.)")

# (id, lygis, regex, pasiūlymas). Lygiai: K = norma pažeista (VLKK/DKKS/rašyba),
# S = AI/vertimo stilius, T = techninė rašyba. Regex taikomas vienai eilutei.
I = re.I
L, U = "a-ząčęėįšųūž", "A-ZĄČĘĖĮŠŲŪŽ"
RULES = [
    # --- DKKS / leksika: norma ---
    ("pilnai", "K", re.compile(r"\bpilnai\b", I), "visiškai, visai, iki galo"),
    ("pilnas-visas", "S", re.compile(r"\bpiln(as|a|ą|o|ai|os|ų|ame|oje)\s+(sąraš|kain|informacij|versij|funkcionalum|paket)", I), "visas / išsamus („pilnas“ tinka tik reikšme „nesutrumpintas“)"),
    ("pagrinde", "K", re.compile(r"\bpagrinde\b(?!\s+(yra|glūdi))", I), "daugiausia, iš esmės, svarbiausia"),
    ("tame-tarpe", "K", re.compile(r"\btame\s+tarpe\b", I), "tarp jų, iš jų, įskaitant"),
    ("tuo-paciu", "K", re.compile(r"\b(o|ir)\s+tuo\s+pačiu\b", I), "o kartu, ir kartu, ir taip (KB 4194, 4748)"),
    ("sekantis", "K", re.compile(r"\bsekan(tis|ti|čio|čios|tį|čią|tys|čiais|čiu|čia|čiame|čioje)\b", I), "kitas, toliau nurodytas"),
    ("itakoti", "S", re.compile(r"\bįtako(ti|ja|jo|s|tų)\b", I), "lemti, paveikti, daryti įtaką (VLKK: vertinimas nevienodas, saugiau keisti)"),
    ("pakankamai-labai", "S", re.compile(r"\bpakankamai\s+(greit|ger|pigi|daug|paprast|aukšt)", I), "gana, visai (jei reiškia „gana“)"),
    ("dėka", "S", re.compile(r"\bdėka\b", I), "„dėka“ tik asmenims ir geram rezultatui; kitur „dėl“, „įdiegus...“ (KB 683)"),
    ("kas-liecia", "K", re.compile(r"\bkas\s+liečia\b", I), "dėl, o dėl, kalbant apie"),
    ("kuomet", "S", re.compile(r"\bkuomet\b", I), "kai"),
    ("tuo-atveju-jei", "S", re.compile(r"\btuo\s+atveju,?\s+jei(gu)?\b", I), "jei"),
    ("eile-pirmoje", "K", re.compile(r"\bpirmoje\s+eilėje\b", I), "pirmiausia, visų pirma"),
    ("atlikti-mokejima", "S", re.compile(r"\batlik(ti|ite|site)\s+mokėjim", I), "sumokėti, apmokėti"),
    ("pateikti-uzsakyma", "S", re.compile(r"\bpateik(ti|ite)\s+užsakym", I), "užsakyti"),
    ("reikalinga-yra", "S", re.compile(r"\b(būtina|reikalinga|galima|svarbu)\s+yra\b", I), "be „yra“"),
    ("vietininkas-priezastis", "K", re.compile(r"\b(ko|to|šio|kurio|jo|jų)\s+(rezultate|pasekmėje|pasėkoje|įtakoje|poveikyje)\b|\bpasėkoje\b", I), "dėl to, todėl (KKS 3.6.4)"),
    ("eileje-atveju", "K", re.compile(r"\beilėje\s+atvejų\b", I), "dažnai, neretai (KKS 3.6.5)"),
    ("daugelyje-atveju", "K", re.compile(r"\bdaugelyje\s+atvejų\b", I), "daugeliu atvejų (KKS 3.6.5)"),
    ("stovyje", "K", re.compile(r"\b(gerame|puikiame|blogame|idealiame|naujame)\s+stovyje\b|\baukštame\s+lygyje\b|\bpilnoje\s+sudėtyje\b", I), "geros būklės, aukšto lygio, visi (KKS 3.6)"),
    ("jeigu-tai", "S", re.compile(r"\bjei(gu)?\s+tai\s+(yra\s+)?įmanoma\b", I), "jei galite, jei įmanoma"),
    ("uztikrinti-kad", "S", re.compile(r"\bužtikrin(ti|ame|sime|a)\b", I), "konkretus veiksmažodis (tikriname, garantuojame, prižiūrime)"),
    ("suteikti-galimybe", "S", re.compile(r"\bsuteik(ia|ti|sime|iame)\s+(jums\s+)?galimyb", I), "leidžia / tiesiog veiksmažodis"),
    ("leidzia-jums", "S", re.compile(r"\bleidžia\s+jums\b", I), "tiesioginis veiksmažodis („Galite ...“)"),
    # --- AI / vertimo kalbos žymės: stilius ---
    ("ai-siuolaikiniame", "S", re.compile(r"šiuolaikiniame\s+(sparčiai\s+)?(besivystančiame|kintančiame|pasaulyje)", I), "išbraukti, pradėti nuo fakto"),
    ("ai-skaitmeniniame-amziuje", "S", re.compile(r"\bskaitmeninės?\s+(eros|amžiuje|erdvėje)\b|\bskaitmeniniame\s+amžiuje\b", I), "išbraukti"),
    ("ai-verta-pamineti", "S", re.compile(r"\b(verta\s+paminėti|svarbu\s+pažymėti|svarbu\s+paminėti|reikia\s+pabrėžti)\b", I), "pasakyti tiesiai"),
    ("ai-vaidmuo", "S", re.compile(r"\b(vaidina|atlieka)\s+(svarbų|esminį|lemiamą|pagrindinį)\s+vaidmenį\b", I), "yra svarbus / konkrečiai kuo"),
    ("ai-sklandus", "S", re.compile(r"\bsklandž(iai|ų|ią|ios|us|i)\b", I), "be trikdžių, paprastai, konkrečiai"),
    ("ai-inovatyvus", "S", re.compile(r"\b(inovatyv|novatorišk|pažangiausi|holistin|transformacin|revoliucin)\w*", I), "konkretus faktas"),
    ("ai-potencialas", "S", re.compile(r"\b(atskleiskite|išlaisvinkite|išnaudokite)\s+(visą\s+)?(savo\s+)?potencial", I), "ką konkrečiai gaus"),
    ("ai-kitas-lygis", "S", re.compile(r"\b(į|kitą)\s+(kitą|naują)\s+lygį\b|\bkitu\s+lygiu\b", I), "konkretus rezultatas"),
    ("ai-kelione", "S", re.compile(r"\b(jūsų|savo)\s+kelion(ė|ę|ėje)\b", I), "procesas / konkrečiai"),
    ("ai-pasinerkite", "S", re.compile(r"\bpasinerk(ite|ime|i)\b|\bpasinerti\s+į\b", I), "susipažinkite, pažiūrėkite"),
    ("ai-nedvejodami", "S", re.compile(r"\bnedvejodami\b|\bnesivaržykite\b", I), "tiesiog: „Rašykite / Skambinkite“"),
    ("ai-cia-kad-padetume", "S", re.compile(r"\besame\s+čia,?\s+kad\b", I), "išbraukti"),
    ("ai-galvos-skausmo", "S", re.compile(r"\bbe\s+galvos\s+skausmo\b", I), "be rūpesčių, paprastai"),
    ("ai-zaidimo", "S", re.compile(r"\bžaidimo\s+(keitėj|taisykles\s+keičia)", I), "konkrečiai kas pasikeičia"),
    ("ai-kazkas-nutiko", "S", re.compile(r"\bkažkas\s+(nutiko|įvyko)\s+ne\s+taip\b|\bkažkas\s+nepavyko\b", I), "Nepavyko [ką]. [Ką daryti].", ),
    ("ai-oi", "S", re.compile(r"^\s*(Oi|Oops|Ups)[!,.]", I), "be jaustuko: „Nepavyko ...“"),
    ("ai-apibendrinant", "S", re.compile(r"^\s*(Apibendrinant|Galų gale|Šiame kontekste|Žvelgiant į ateitį)\b", I), "išbraukti arba konkreti išvada"),
    ("ai-be-to-pradzia", "S", re.compile(r"(^|[.!?]\s+)(Be to|Tuo tarpu|Iš esmės|Be abejo),", I), "dažnai nereikia, sujunk mintis kitaip"),
    ("ai-ne-tik-bet-ir", "S", re.compile(r"\bne\s+tik\b[^.]{3,60}\bbet\s+ir\b", I), "patikrink, ar ne šablonas; dažnai užtenka vieno teiginio"),
    ("ai-aukščiausios", "S", re.compile(r"\baukščiausios\s+kokybės\b|\bprofesionali\s+komanda\b|\bindividualus\s+požiūris\b", I), "įrodymas: skaičius, terminas, garantija"),
    ("ai-gera-zinia", "S", re.compile(r"\b(gera|bloga)\s+(žinia|naujiena)\s+ta,?\s+kad\b|\breiškia\s+daugiau\s+nei\b", I), "kalkė (the good news is): pasakyk faktą tiesiai"),
    ("ai-ramina", "S", re.compile(r"\b(važiuosite|miegosite|būsite)\s+ramiau\b|\bgalite\s+būti\s+ramūs\b|\bbe\s+jokio\s+streso\b", I), "raminantis štampas: išbraukti"),
    ("ai-mes-didziuojames", "S", re.compile(r"\b(didžiuojamės|esame\s+įsipareigoję|mūsų\s+misija\s+yra)\b", I), "faktas vietoj deklaracijos"),
    # --- svetainės šablono kalkės: angliško landing puslapio vietos, išverstos pažodžiui (references/svetaines-tekstas.md) ---
    ("sablonas-kodel-mus", "S", re.compile(r"\bkodėl\s+(verta\s+)?(rinktis|pasirinkti|rinkitės)\s+(būtent\s+)?(mus|mūsų)\b", I), "Why choose us: antraštėje parašyk patį skirtumą faktu („Kainą pasakome prieš darbą“)"),
    ("sablonas-pasiruose", "S", re.compile(r"\bpasiruoš(ę|usi|ęs)\s+(pradėti|išbandyti|augti|pokyčiams)\b", I), "Ready to get started?: parašyk, kas bus paspaudus („Paskambinkite, kainą pasakysime iš karto“)"),
    ("sablonas-pradekite-siandien", "S", re.compile(r"\bpradėk(ite)?\s+(jau\s+)?(šiandien|dabar)\b|\bsusisiekite\s+(su\s+mumis\s+)?(jau\s+)?šiandien\b|\bnedelskite\b", I), "Get started today: konkretus veiksmas ir kas po jo"),
    ("sablonas-viskas-ko-reikia", "S", re.compile(r"\bvisk(as|ą),?\s+ko\s+(jums\s+|tau\s+)?reikia\b|\bviskas\s+vienoje\s+(vietoje|platformoje|sistemoje)\b", I), "Everything you need / all in one place: išvardyk, kas būtent"),
    ("sablonas-sukurta", "S", re.compile(r"(^|[.!?]\s+)Sukurt(a|as|i)\s+(jūsų|jums|šiuolaikin\w+|augan\w+|specialiai|tiems|tam)\b", I), "Built for…: „Skirta kirpykloms“ arba pasakyk, ką su ja daro"),
    ("sablonas-poreikiai", "S", re.compile(r"\b(pritaikyt\w+|atitinkan\w+|prisitaikan\w+)\s+(prie\s+)?(jūsų\s+|tavo\s+|kiekvieno\s+\w+\s+|individuali\w+\s+)?poreiki\w+|\bpagal\s+(jūsų\s+|tavo\s+)?(individuali\w+\s+)?poreiki\w+", I), "tailored to your needs: pasakyk, ką galima pasirinkti ar pakeisti"),
    ("sablonas-patenkinti-klientai", "S", re.compile(r"\b(patenkint|laiming)\w+\s+(klient|naudotoj|pirkėj)\w+|\bpatikim(as|i|ą|u)\s+partner\w+", I), "happy customers / trusted partner: skaičius be būdvardžio arba tikras atsiliepimas"),
    ("sablonas-be-pasleptu", "S", re.compile(r"\b(jokių\s+)?paslėptų\s+mokesčių\b|\bbe\s+jokių\s+įsipareigojimų\b|\bnereikia\s+kreditinės\s+kortelės\b|\bkreditinės\s+kortelės\s+nereikia\b", I), "no hidden fees / no credit card: „Kaina galutinė“, „Kortelės duomenų neprašome“, „Atsisakyti galite bet kada“"),
    ("sablonas-laika-ir-pinigus", "S", re.compile(r"\b(su)?taup\w+\s+(savo\s+)?(laik\w+\s+ir\s+pinig\w+|brang\w+\s+laik\w+)|\bsu(si)?telk\w+\s+(dėmesį\s+)?į\s+tai,\s+kas\b", I), "save time and money / focus on what matters: kiek minučių, eurų, ko nebereikės daryti"),
    ("sablonas-trys-zodziai", "S", re.compile(rf"(?:(?<=^)|(?<=[.!?]\s))[{U}][{L}]+\.\s+[{U}][{L}]+\.\s+[{U}][{L}]+[.!]"), "„Greita. Paprasta. Patikima.“ yra angliškas ritmas: parašyk vieną sakinį su veiksmažodžiu"),
    ("sablonas-mes-jus", "S", re.compile(r"(^|[.!?]\s+)Mes\s[^.!?]{2,45}[.,]\s+(o\s+)?[Jj]ūs\s", ), "„Mes X. Jūs Y.“ antitezė (We…, you…): pasakyk tiesiai, ką padarote"),
    ("sablonas-atraskite", "S", re.compile(r"\b(atrask(ite)?|mėgauk(itės|is)|patirkite)\b", I), "discover / enjoy / experience: „pažiūrėkite“, „išbandykite“ arba tiesiog faktas"),
    ("sablonas-prisijunkite-prie", "S", re.compile(r"\bprisijunk(ite)?\s+prie\s+[^.!?]{0,50}(klientų|naudotojų|įmonių|bendruomenės)\b", I), "Join 500+ customers: „Programą naudoja 500 kirpyklų“"),
    ("sablonas-paspaudimais", "S", re.compile(r"\b(vos\s+)?(keliais|vienu|dviem|trimis)\s+(paspaudimais|paspaudimu|spustelėjimais|spustelėjimu|mygtuko\s+paspaudimu)\b", I), "in a few clicks: pasakyk, kiek tai trunka arba ką reikia padaryti"),
    ("sablonas-sprendimas", "S", re.compile(r"\bsprendim(as|ai|ą|us|ų|ais|u)\s+(jūsų\s+|tavo\s+|kiekvienam\s+)?(verslui|įmonei|įmonėms|namams|poreikiui|poreikiams)\b|\b(verslo|IT|DI|apskaitos|logistikos|skaitmenini\w+|individual\w+|išman\w+|kompleksini\w+)\s+sprendim\w+", I), "solution: pavadink daiktą (programa, paslauga, įrankis, sistema)"),
    ("sablonas-patirtis", "S", re.compile(r"\b(naršymo|apsipirkimo|klientų|kliento|vartotojo|naudotojo|sklandi\w*|nauj\w+|geriausi\w+|nepamirštam\w+)\s+patirt(is|į|ies|imi|ys)\b", I), "experience: lietuviškai „patirtis“ yra sukauptas patyrimas; pasakyk, kas patogu"),
    ("sablonas-padeda-jums", "S", re.compile(r"\bpad(eda|ės|ėsime|edame)\s+(jums|tau)\b|\besame\s+pasiruošę\s+(padėti|atsakyti)\b|\bleiskite\s+mums\b", I), "helps you / let us: tiesioginis veiksmažodis („sutaupysite“, „sutvarkome“)"),
    ("sablonas-kaip-tai-veikia", "S", re.compile(r"\bkaip\s+tai\s+veikia\b", I), "How it works: „Kaip veikia“, „Kaip dirbame“, „Kaip užsisakyti“"),
    ("sablonas-komanda", "S", re.compile(r"\bmūsų\s+(\w+\s+)?(komanda|ekspertai|specialistų\s+komanda)\b", I), "our team: kas tie žmonės (meistrai, buhalterės, vardai) arba tiesiog „dirbame“"),
    ("sablonas-be-be-be", "S", re.compile(r"\bbe\s+\w+(\s+\w+)?[,.]\s+be\s+\w+(\s+\w+)?[,.]\s+(ir\s+|o\s+)?be\s+\w+|\bjokių\s+\w+[.,]\s+jokių\s+\w+", I), "No X. No Y. No Z.: vienas sakinys su veiksmažodžiu („Diegti nieko nereikia, o atsisakyti galite bet kada“)"),
    ("sablonas-klausimas-nuotrupa", "S", re.compile(rf"(?:(?<=^)|(?<=[.!?]\s))(?:[{U}][{L}]+|Reikia\s+[{L}]+)\?\s+[{U}][{L}]+(ome|ame|ime|kite|sime)\b"), "Question? We answer.: „Jei kyla klausimų, atsakome per…“"),
    ("sablonas-lieka-jusu", "S", re.compile(r"\b(lieka|liks|išlieka)\s+(jūsų|tavo)\s*([.,!]|$)|\bnesate\s+susiet\w+", I), "stays yours / not locked in: „priklauso jums“, „bet kada galite išsikelti“"),
    ("sablonas-ten-kur", "S", re.compile(r"\bten,\s+kur\s+(esate|esi|jūs|jums|tu|dirbate|jų\s+reikia)\b|\bsu\s+tuo,\s+ką\s+(jau\s+)?(naudojate|turite)\b|\btai,\s+kas\s+(iš\s+tikrųjų\s+|tikrai\s+)?(svarbu|svarbiausia)\b", I), "wherever you are / what you already use / what matters: pavadink vietą ar daiktą („telefone“, „su jūsų parduotuve ir banku“)"),
    ("sablonas-virsta", "S", re.compile(r"\b(virsta|pavirsta|paverčia(me)?|paversk(ite)?)\b|\b(pati|pats|patys|pačios)\s+(atsiduria|nugula|susidėlioja|susitvarko)\b|\b(atsiduria|nugula)\s+(pajamose|sąnaudose|jūsų|kalendoriuje|diske)\b", I), "turns into / lands in: daiktai nevirsta; kas veikia ir ką padaro („programa įrašo į sąnaudas“)"),
    ("sablonas-nuo-iki", "S", re.compile(rf"^\s*(#+\s*)?Nuo\s+[{L}][^.!?\d]{{2,35}}\s+iki\s+[^.!?\d]{{3,35}}[.!]?\s*$|\b(du|trys|keturi|penki|\d)\s+žingsni\w+\s+iki\b", I), "From X to Y / N steps to Y: veiksmažodžiai arba „Kaip…“ antraštė"),
    ("vertimas-savo", "S", re.compile(r"\b(įveskite|pasirinkite|patikrinkite|atnaujinkite|pakeiskite|nurodykite)\s+savo\b", I), "dažniausiai „savo“ perteklinis"),
    ("vertimas-jusu-jusu", "S", re.compile(r"\bjūsų\b[^.!?]{0,60}\bjūsų\b", I), "per daug „jūsų“; paprastai užtenka vieno arba nė vieno"),
    ("vertimas-tai-yra", "S", re.compile(r"(^|[.!?]\s+)Tai\s+yra\s+(svarbu|būtina|puiku|lengva|paprasta)", I), "„Svarbu...“ / perrašyk"),
    ("vertimas-vienas-is", "S", re.compile(r"\bvienas\s+iš\s+(geriausių|didžiausių|pirmaujančių|populiariausių)\b", I), "konkretus faktas (reitingas, skaičius)"),
    ("vertimas-pasyvas", "S", re.compile(r"\b(yra|bus|buvo)\s+(teikiam|atliekam|siunčiam|vykdom|užtikrinam|naudojam|apdorojam|atlikt|išsiųst|pateikt|įvykdyt|sukurt)\w*", I), "veikiamoji rūšis: „teikiame, išsiųsime“"),
    ("vertimas-kuris-yra", "S", re.compile(r"\b(kuris|kuri|kurie|kurios)\s+yra\s+\w+(as|a|i|os)\b", I), "dažnai užtenka pažyminio be „kuris yra“"),
    ("vertimas-siekiant", "S", re.compile(r"\bsiekiant\s+\w+(ti)\b", I), "„kad ...“ arba „norėdami ...“ arba išbraukti"),
    # --- technika: rašyba, skyryba ---
    ("endash", "T", re.compile("\u2013"), "projekto taisyklė: jokių brūkšnių, net intervaluose (įjungiama .lt-rasyba.json)"),
    ("emdash", "K", re.compile("\u2014"), "ilgasis brūkšnys draudžiamas: perrašyk sakinį (taškas, kablelis, dvitaškis)"),
    ("hyphen-as-dash", "T", re.compile(r"(?<=[^\W\d_])\s-\s(?=[^\W\d_])"), "brūkšnelis ne pauzė: perrašyk sakinį be brūkšnio"),
    ("dash-pause", "S", re.compile("(?<=\\S)\\s\u2013\\s(?=\\S)"), "brūkšnys kaip pauzė atrodo kaip AI: perrašyk (taškas, kablelis, dvitaškis)"),
    ("straight-quotes", "T", re.compile(r'(?<![=\w])"[^"<>{}=]{2,80}"(?![:\w])'), "lietuviškos kabutės „...“"),
    ("mixed-quotes", "T", re.compile(r'„[^“”"\n]{1,80}"'), "uždaromoji kabutė “ (viršuje), ne \""),
    ("english-quotes", "T", re.compile(r"“[^”„]{1,80}”"), "lietuviškos kabutės „...“ (atidaromos apačioje)"),
    ("eur-no-space", "T", re.compile(r"\d[\d.,]*€|€\s?\d(?:[\d.,]*\d)?"), "„10 €“ (skaičius, tarpas, ženklas po skaičiaus)"),
    ("pct-no-space", "T", re.compile(r"\d%"), "„10 %“ arba „10 proc.“"),
    ("decimal-point", "T", re.compile(r"(?<![\d.])\d{1,6}\.\d{1,2}\s?(€|Eur|EUR|proc|%)|€\s?\d{1,6}\.\d{2}\b"), "dešimtainis kablelis: „9,99 €“"),
    ("thousands-comma", "T", re.compile(r"\b[1-9]\d{0,2},\d00\b(?![,\d])|\b\d{1,3},\d{3},\d{3}\b"), "tūkstančiai skiriami tarpu: „1 000“ (kablelis lietuviškai yra dešimtainis)"),
    ("date-us", "T", re.compile(r"\b(0?[1-9]|1[0-2])/(0?[1-9]|[12]\d|3[01])/(20\d\d)\b"), "2026-09-27 arba 2026 m. rugsėjo 27 d."),
    ("time-ampm", "T", re.compile(r"\b\d{1,2}(:\d\d)?\s?(am|pm|AM|PM)\b"), "24 val. formatas: 14.30 arba 14:30"),
    ("ty-no-space", "T", re.compile(rf"\b[tT]\.(?:y|t)\.|\b(?:el|e)\.(?=[{L}])|\b[eE]-(?:pašt|valdž|versl|sveikat|parduotuv|bank|paraš)\w*"), "„t. y.“, „el. paštas“, „el. laiškas“"),
    ("double-space", "T", re.compile(r"\S  +\S"), "vienas tarpas"),
    ("space-before-punct", "T", re.compile(r"[^\W\d_]\s+[,.;:!?](?!\S*\d)"), "be tarpo prieš skyrybos ženklą"),
    ("excl-many", "S", re.compile(r"!{2,}|!\s[^.!?]{0,80}!"), "šauktukų perteklius"),
    # --- skyryba (regex iš research/regex-kandidatai.md, patikrinti rx_test.py) ---
    ("kad-no-comma", "K", re.compile(rf"(?<![,;:(–\u2014\-])(?<!\bir)(?<!\bar)(?<!\bbei)(?<!\bnei)(?<!\barba)(?<!\bnors)(?<!\bjuolab)(?<!\blabiau)(?<!\bypač)(?<!\bbūtent)(?<!\bnebent)(?<!\bjau)(?<!\btiek)(?<!\bkaip)(?<!\bužtat)(?<!\bnet)(?<!\btik)(?<!\bTik)(?<!\btai)(?<!\by\.)(?<=[{L}]) kad\b(?! ir\b)"), "kablelis prieš „kad“ (išskyrus „ir kad“, „juolab kad“ ir pan.)"),
    ("nes-no-comma", "K", re.compile(rf"(?<=[{L}0-9]) nes\b"), "kablelis prieš „nes“"),
    ("jog-no-comma", "K", re.compile(rf"(?<=[{L}]) jog\b"), "kablelis prieš „jog“"),
    ("o-bet-no-comma", "K", re.compile(rf"(?<=[{L}0-9]) (?:o|tačiau)\b(?! (?:ne)?gi\b)|(?<=[{L}0-9]) bet\b(?! (?:kas|ko|kam|ką|kuo|kada|kaip|kieno|kiek\w*|kok(?:s|ia|io|į|ią|ie|ios|iam|iai|iu|iems|ioms|iuose|iose|iais|iomis|ių|iuos|ias)|kur|kur(?:s|į|i\w*))\b)(?! ir\b)"), "kablelis prieš „o“, „bet“, „tačiau“"),
    ("kuris-no-comma", "S", re.compile(rf"(?<![,;:(–])(?<!\bsu)(?<!\bbe)(?<!\bper)(?<!\bprie)(?<!\bapie)(?<!\bdėl)(?<!\biš)(?<!\bį)(?<!\buž)(?<!\bnuo)(?<!\bpo)(?<!\bpagal)(?<!\blink)(?<!\biki)(?<!\btarp)(?<!\bant)(?<!\bir)(?<!\bar)(?<!\bbei)(?<!\barba)(?<!\bnei)(?<!\bkad)(?<!\bnors)(?<!\bBet)(?<!\bKad)(?<!\btas)(?<!\bta)(?<!\bto)(?<!\btą)(?<!\btie)(?<!\btos)(?<!\btų)(?<!\btai)(?<!\bbet)(?<!\bkai)(?<!\bKai)(?<!\bkada)(?<!\bKada)(?<!\bnežinia)(?<=[{L}]) (?:kuris|kuri|kurį|kurio|kurie|kurios|kuriuos|kurias|kurių|kuriam|kuriai|kuriems|kurioms|kuriame|kurioje|kuriuose|kuriose|kuriuo|kuria|kuriais|kuriomis)\b"), "užuomina: šalutinis sakinys paprastai skiriamas kableliu"),
    ("ty-comma", "K", re.compile(r"\b[tT]\. y\.,"), "po „t. y.“ kablelio nėra"),
    ("o-taip-pat", "K", re.compile(r"\bo taip pat\b", I), "„taip pat“ arba „ir“"),
    ("tame-skaiciuje", "K", re.compile(r"\btame skaičiuje\b", I), "iš jų, įskaitant"),
    ("no-space-after-comma", "T", re.compile(rf"(?<=[{L}{U}]),(?=[{L}{U}])"), "tarpas po kablelio"),
    ("double-period", "T", re.compile(r"(?<![.])\.\.(?![.])"), "vienas taškas (santrumpos taškas atstoja sakinio tašką)"),
    ("multi-punct", "S", re.compile(r"[!?]{2,}"), "vienas ženklas"),
    ("date-slash", "T", re.compile(r"\b\d{4}/\d{2}/\d{2}\b|\b\d{4}/\d{4}\b"), "2026-09-27; metų intervalas 2025–2026 m."),
    ("date-dmy", "T", re.compile(r"\b\d{2}\.\d{2}\.\d{4}\b"), "2026-09-27 (metai pirmi)"),
    ("year-nospace", "T", re.compile(r"\b\d{4}m\.|\b\d{1,2}d\.(?=\s|$)"), "„2026 m.“, „27 d.“ su tarpu"),
    ("unit-nospace", "T", re.compile(r"\d(?:kg|km|val\.|min\.|Eur\b|EUR\b|mln\.|tūkst\.|proc\.)"), "tarpas tarp skaičiaus ir matavimo vieneto"),
    ("sym-before", "T", re.compile(r"[$£](?=\s?\d)"), "simbolis po skaičiaus su tarpu"),
    ("degree-nospace", "T", re.compile(r"\d°[CF]"), "„5 °C“"),
    ("ord-3", "K", re.compile(r"\b(?:\d*[02-9])?3-(?=[aoąuų])"), "„3-iasis“, „23-iąją“"),
    ("ord-english", "T", re.compile(r"\b\d+(?:st|nd|rd|th)\b"), "„21-asis“"),
    ("roman-ending", "T", re.compile(r"\b[IVXLCM]+-(?:as|asis|a|oji|ieji|ioji)\b"), "prie romėniškų skaitmenų galūnės nerašomos: „XX a.“"),
    ("amp", "S", re.compile(r"(?<=\s)&(?=\s)"), "„ir“ (išskyrus užsienio prekių ženklus)"),
    ("slash-abbr", "T", re.compile(r"\b(?:a/s|a/k|p/d|l/d)\b"), "„a. s.“, „a. k.“"),
    ("phone-hyphen", "T", re.compile(r"(?:\+370|(?<![\d:.,-])[08])[ ()\d]{0,12}?-\d{2}"), "„+370 612 34 567“ (tarpai, ne brūkšneliai)"),
    ("phone-prefix8", "T", re.compile(r"(?i:tel\.?|mob\.?|telefonas|skambinkite)[:\s]*8 ?\(?[1-9]\d{0,2}\)? ?\d{2,3} ?\d{2,5}\b"), "nuo 2025 m. šalies prefiksas 0: „0 612 34567“ arba „+370 612 34567“"),
    ("nr-nodot", "T", re.compile(r"\bNr(?![.\w])"), "„Nr.“"),
    ("val-nodot", "T", re.compile(r"\d\s?val(?![.\w])"), "„val.“"),
    ("su-pagarba-comma", "T", re.compile(r"^(?:Su pagarba|Pagarbiai),\s*$"), "be kablelio"),
    ("heading-period", "T", re.compile(r"^#{1,6}\s+.*[^.\s]\.\s*$"), "antraštės gale taško nėra"),
    ("month-capital", "T", re.compile(rf"(?<=[{L},] )(?:Sausio|Vasario|Kovo|Balandžio|Gegužės|Birželio|Liepos|Rugpjūčio|Rugsėjo|Spalio|Lapkričio|Gruodžio|Sausis|Vasaris|Kovas|Balandis|Gegužė|Birželis|Liepa|Rugpjūtis|Rugsėjis|Spalis|Lapkritis|Gruodis)\b(?! \d+-)"), "mėnesiai mažąja raide"),
    ("weekday-capital", "T", re.compile(rf"(?<=[{L},] )(?:Pirmadien|Antradien|Trečiadien|Ketvirtadien|Penktadien|Šeštadien|Sekmadien)\w*"), "savaitės dienos mažąja raide"),
    ("title-case", "T", None, "antraštėse didžioji raidė tik pirmo žodžio ir tikrinių vardų"),
]

OFF_BY_DEFAULT = {"endash"}  # norma leidžia –, bet kai kurie projektai (Invly) jo nenori

HEADING = re.compile(r"^\s*(#{1,6}\s+|<h[1-6][^>]*>)(.+?)(</h[1-6]>)?\s*$", I)
SMALL = {"ir", "bei", "su", "be", "į", "iš", "per", "už", "ar", "o", "bet", "nuo", "iki", "po", "prie", "dėl", "apie", "kad"}


def title_case(line):
    m = HEADING.match(line)
    if not m:
        return None
    words = [w for w in re.findall(r"[^\W\d_]+", re.sub(r"<[^>]+>", "", m.group(2))) if w.lower() not in SMALL]
    if len(words) < 3:
        return None
    caps = sum(1 for w in words[1:] if w[0].isupper() and not w.isupper())
    # ponytail: tikriniai vardai sukelia klaidingų teigiamų; 60 % riba juos dažniausiai praleidžia
    return m.group(2) if caps >= 2 and caps / (len(words) - 1) >= 0.6 else None


def is_lithuanian(s):
    if LT_CHARS.search(s):
        return True
    if EN_WORDS.search(s):
        return False
    return bool(LT_WORDS.search(s) or LT_ENDINGS.search(s))


# --- teksto ištraukimas ---
def html_to_lines(raw):
    raw = re.sub(r"(?is)<(script|style|noscript|svg|template)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?is)<!--.*?-->", "", raw)  # React įterpia <!-- --> tarp teksto dalių: tarpas duotų „21:00 .“
    meta = re.findall(r'(?is)<(?:title)[^>]*>(.*?)</title>|<meta[^>]+(?:name|property)=["\'](?:description|og:title|og:description)["\'][^>]+content=["\']([^"\']+)', raw)
    head = [html.unescape(a or b).strip() for a, b in meta if (a or b).strip()]
    raw = re.sub(r"(?i)<h([1-6])[^>]*>", lambda m: "\n" + "#" * int(m.group(1)) + " ", raw)
    raw = re.sub(r"(?i)</?(p|div|li|br|tr|td|th|section|article|header|footer|button|a|label|option|h[1-6])\b[^>]*>", "\n", raw)
    raw = re.sub(r"(?i)</?(strong|b|em|i|span|mark|u|small|sup|sub|code)\b[^>]*>", "", raw)  # eilutės viduje: tarpas duotų „diametrą ,“
    txt = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    lines = [re.sub(r"[ \t ]+", " ", l).strip() for l in txt.splitlines()]
    return [("meta", l) for l in head] + [(None, l) for l in lines if l]


STR_LIT = re.compile(r'"((?:[^"\\\n]|\\.){3,})"|\'((?:[^\'\\\n]|\\.){3,})\'|`((?:[^`\\]|\\.){3,}?)`|>([^<>{}\n]{3,})<')


CODEISH = re.compile(r"&&|\|\||\?\?|=>|===?|!==?|\s[?:]\s\w+\.|\(\w+\.\w+|;\s*$")


def code_to_lines(src):
    """Iš kodo ištraukia tik žmonėms skirtas eilutes (string'ai, JSX tekstas), su eilutės nr."""
    out = []
    for n, line in enumerate(src.splitlines(), 1):
        if re.match(r"\s*(import|export\s+\*|//|/\*|\*)", line):
            continue
        for m in STR_LIT.finditer(line):
            s = re.sub(r"\$\{[^}]*\}", "X", next(g for g in m.groups() if g is not None)).strip()
            # ponytail: Tailwind/CSS klasės = mažosios ASCII su - arba :, jas praleidžiam
            if CODEISH.search(s):  # tarp dviejų string'ų pagautas kodas: `'a' ? b : (c ?? '`
                continue
            if " " in s and not (re.fullmatch(r"[a-z0-9\-:/.#\[\]_ ]+", s) and re.search(r"[-:]", s)):
                out.append((n, s))
    return out


def fetch(url):
    """Grąžina (turinio tipas, tekstas). macOS python.org Python neturi CA sertifikatų, tada curl."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.headers.get("Content-Type", ""), r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")
    except urllib.error.URLError as e:
        if "CERTIFICATE" not in str(e):
            raise
        out = subprocess.run(["curl", "-sL", "-A", UA, "-w", "\n%{content_type}", url],
                             capture_output=True, text=True, timeout=30, check=True).stdout
        body, _, ctype = out.rpartition("\n")
        return ctype, body


def load(target):
    """Grąžina [(šaltinis, eilutės_nr, tekstas)]."""
    if target == "-":
        return [("stdin", i, l) for i, l in enumerate(sys.stdin.read().splitlines(), 1)]
    if re.match(r"https?://", target):
        _, raw = fetch(target)
        return [(target, tag or i, l) for i, (tag, l) in enumerate(html_to_lines(raw), 1)]
    ext = os.path.splitext(target)[1].lower()
    with open(target, encoding="utf-8", errors="replace") as f:
        src = f.read()
    if ext in {".html", ".htm"}:
        return [(target, i, l) for i, (_, l) in enumerate(html_to_lines(src), 1)]
    if ext in {".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte", ".astro", ".json", ".php"}:
        return [(target, n, s) for n, s in code_to_lines(src)]
    out, fence = [], False
    for i, l in enumerate(src.splitlines(), 1):
        if l.lstrip().startswith(("```", "~~~")):  # kodo blokai nėra tekstas skaitytojui
            fence = not fence
        elif not fence:
            out.append((target, i, re.sub(r"`[^`]*`", "KODAS", l)))
    return out


def walk(path):
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in files:
            if os.path.splitext(fn)[1].lower() in TEXT_EXT and not SKIP_FILE.search(fn):
                yield os.path.join(root, fn)


def crawl(start, limit):
    host = urllib.parse.urlparse(start).netloc
    seen, pages, queue = set(), [], [start]
    while queue and len(pages) < limit:
        url = queue.pop(0).split("#")[0]
        if url in seen:
            continue
        seen.add(url)
        try:
            ctype, raw = fetch(url)
            if "html" not in ctype:
                continue
        except Exception:
            continue
        pages.append(url)  # limitas skaičiuoja tik HTML puslapius, ne šriftus ar paveikslėlius
        for href in re.findall(r'href=["\']([^"\'#]+)', raw):
            u = urllib.parse.urljoin(url, href)
            if urllib.parse.urlparse(u).netloc == host and not re.search(r"\.(jpe?g|png|gif|avif|ico|pdf|svg|webp|css|js|json|xml|txt|zip|woff2?|ttf|otf|mp4|webm)(\?|$)|/_next/", u, I):
                queue.append(u)
    return pages


def project_config(start):
    """Ieško .lt-rasyba.json aukštyn nuo tikrinamo kelio. Projekto taisyklės nugali numatytąsias."""
    d = os.path.abspath(start if os.path.isdir(start) else os.path.dirname(start) or ".")
    while True:
        f = os.path.join(d, ".lt-rasyba.json")
        if os.path.isfile(f):
            with open(f, encoding="utf-8") as fh:
                return json.load(fh)
        if os.path.dirname(d) == d:
            return {}
        d = os.path.dirname(d)


def active_rules(cfg):
    on = (set(r[0] for r in RULES) - OFF_BY_DEFAULT | set(cfg.get("enable", []))) - set(cfg.get("disable", []))
    return [r for r in RULES if r[0] in on]


def lint_line(text, rules=None):
    hits = []
    for rid, lvl, rx, fix in rules or active_rules({}):
        if rid == "title-case":
            t = title_case(text)
            if t:
                hits.append((rid, lvl, t, fix))
            continue
        for m in rx.finditer(text):
            h = (rid, lvl, m.group(0).strip(), fix)
            if h not in hits:
                hits.append(h)
    return hits


def run(targets, crawl_n=0, only_lt=True, cfg=None):
    local = next((t for t in targets if not re.match(r"https?://|-$", t)), None)
    cfg = cfg if cfg is not None else (project_config(local) if local else {})
    rules = active_rules(cfg)
    files = []
    for t in targets:
        if re.match(r"https?://", t) and crawl_n:
            files += crawl(t, crawl_n)
        elif os.path.isdir(t):
            files += list(walk(t))
        else:
            files.append(t)
    results, read = [], 0
    for f in files:
        try:
            lines = load(f)
        except Exception as e:
            print(f"! {f}: {e}", file=sys.stderr)
            continue
        read += 1
        seen = set()
        for src, n, text in lines:
            if only_lt and not is_lithuanian(text):
                continue
            if text in seen:  # meniu ir poraštės kartojasi kiekviename puslapyje
                continue
            seen.add(text)
            for rid, lvl, match, fix in lint_line(text, rules):
                results.append({"src": src, "line": n, "rule": rid, "level": lvl,
                                "match": match, "fix": fix, "text": text[:200]})
    if not read:
        sys.exit("Nepavyko nuskaityti nė vieno šaltinio.")
    return results


LEVEL = {"K": "🔴 norma", "S": "🟡 AI/vertimas", "T": "🔵 technika"}


def report(results):
    if not results:
        print("Mechaninių radinių nėra. Tai NEREIŠKIA, kad tekstas geras: žodžių tvarką ir logiką tikrink akimis.")
        return
    by = {}
    for r in results:
        by.setdefault(r["src"], []).append(r)
    for src, rs in by.items():
        print(f"\n━━ {src} ({len(rs)})")
        for r in sorted(rs, key=lambda r: ("KST".index(r["level"]), str(r["line"]))):
            print(f"  {LEVEL[r['level']]:<14} {str(r['line']):>5}  [{r['rule']}] „{r['match']}“ → {r['fix']}")
            print(f"  {'':<21}{r['text']}")
    counts = {k: sum(1 for r in results if r["level"] == k) for k in "KST"}
    print(f"\nIš viso: {len(results)}  (🔴 {counts['K']}  🟡 {counts['S']}  🔵 {counts['T']})")


def selftest():
    must_hit = {
        "pilnai": "Sistema pilnai paruošta darbui.",
        "tame-tarpe": "Visi klientai, tame tarpe ir verslas.",
        "sekantis": "Sekantis žingsnis yra registracija.",
        "emdash": "Greitai \u2014 ir be rūpesčių.",
        "hyphen-as-dash": "Kaina - tik dešimt eurų.",
        "dash-pause": "Remontas \u2013 per vieną dieną.",
        "eur-no-space": "Kaina 10€ per mėnesį.",
        "pct-no-space": "Nuolaida 20% visiems.",
        "straight-quotes": 'Paspauskite "Tęsti" mygtuką.',
        "vertimas-savo": "Įveskite savo el. pašto adresą.",
        "vertimas-pasyvas": "Paslaugos yra teikiamos visoje Lietuvoje.",
        "ai-kazkas-nutiko": "Kažkas nutiko ne taip, bandykite vėliau.",
        "ty-no-space": "Visi, t.y. kiekvienas klientas.",
        "mixed-quotes": 'Spauskite „Tęsti" mygtuką.',
        "decimal-point": "Kaina tik 9.99 € per mėnesį.",
        "kad-no-comma": "Norime kad būtumėte patenkinti.",
        "title-case": "## Mūsų Paslaugos Jūsų Verslui",
        "itakoti": "Tai įtakoja kainą.",
        "ai-gera-zinia": "Gera žinia ta, kad viską galima patikrinti.",
        "tuo-paciu": "Mokate mažiau, o tuo pačiu gaunate daugiau.",
        "stovyje": "Parduodamas automobilis puikiame stovyje.",
        "sablonas-kodel-mus": "Kodėl verta rinktis mus?",
        "sablonas-pasiruose": "Pasiruošę pradėti?",
        "sablonas-pradekite-siandien": "Pradėkite jau šiandien ir pamatysite skirtumą.",
        "sablonas-viskas-ko-reikia": "Viskas, ko reikia jūsų salonui.",
        "sablonas-sukurta": "Sukurta šiuolaikiniams grožio salonams.",
        "sablonas-poreikiai": "Valymo planas, pritaikytas jūsų poreikiams.",
        "sablonas-patenkinti-klientai": "Daugiau nei 500 patenkintų klientų.",
        "sablonas-be-pasleptu": "Jokių paslėptų mokesčių.",
        "sablonas-laika-ir-pinigus": "Sutaupykite laiko ir pinigų.",
        "sablonas-trys-zodziai": "Greita. Paprasta. Patikima.",
        "sablonas-mes-jus": "Mes randame klientus. Jūs parduodate.",
        "sablonas-atraskite": "Atraskite naują tvarkos lygį.",
        "sablonas-prisijunkite-prie": "Prisijunkite prie 500 salonų bendruomenės.",
        "sablonas-paspaudimais": "Rezervuokite vos keliais paspaudimais.",
        "sablonas-sprendimas": "Išmanus sprendimas jūsų verslui.",
        "sablonas-patirtis": "Geresnė klientų patirtis.",
        "sablonas-padeda-jums": "Programa padeda jums valdyti laiką.",
        "sablonas-kaip-tai-veikia": "Kaip tai veikia",
        "sablonas-komanda": "Mūsų profesionali komanda pasirūpins viskuo.",
        "sablonas-be-be-be": "Be diegimo, be mokymų, be IT.",
        "sablonas-klausimas-nuotrupa": "Klausimas? Atsakome per 24 val. darbo dienomis.",
        "sablonas-lieka-jusu": "Visi duomenys lieka jūsų.",
        "sablonas-ten-kur": "Sąskaita ten, kur esate",
        "sablonas-virsta": "Kvito nuotrauka virsta sąnauda",
        "sablonas-nuo-iki": "Nuo pirmo laiško iki susitikimo.",
    }
    must_miss = [
        "Kaina 10 € per mėnesį, darbo laikas 9\u201318 val.",
        "Norime, kad būtumėte patenkinti.",
        "Įveskite el. pašto adresą.",
        "Visi, t. y. kiekvienas klientas.",
        "## Mūsų paslaugos verslui",
        "Tik kad veiktų ir kad būtų pigu.",
        "Persiųskite sąskaitą su tuo pačiu numeriu.",
        "Patikrinkite einamųjų metų sąskaitas.",
        "Tuo pačiu metu kova už klientą stiprėja.",
        "Sąskaitą išrašome per 5 minutes, o pinigus gaunate per 2 dienas.",
        "Atvažiuojame su savo priemonėmis. Kainą pasakome iš anksto. Raktus galite palikti kaimynams.",
        "Kaip dirbame",
        "Programą naudoja 500 kirpyklų.",
        "Teismo sprendimas įsigaliojo, o verslui tai reiškia naujas taisykles.",
        "Buhalterė turi 12 metų patirties.",
        "Valome butus, namus ir biurus Kaune.",
        "Jums nieko ruošti nereikia.",
        "Ø12 strypo metras sveria 0,888 kg, o Ø16 strypo metras sveria 1,578 kg.",
        "Dirbame nuo 8 iki 18 val., be pietų pertraukos.",
        "Nuo pirmadienio iki penktadienio atsakome per 4 valandas.",
        "Turite klausimų? Paskambinkite.",
        "Duomenys priklauso jums, o kopija lieka jūsų diske.",
        "Nufotografuojate kvitą, o programa pati įrašo jį į sąnaudas.",
        "Kainuoja be PVM 29 €, be to, pirmas mėnuo nemokamas.",
    ]
    ok = True
    for rid, s in must_hit.items():
        if rid not in {h[0] for h in lint_line(s)}:
            print(f"FAIL: {rid} nepagavo: {s}")
            ok = False
    for s in must_miss:
        hits = lint_line(s)
        if hits:
            print(f"FAIL: klaidingas teigiamas {[h[0] for h in hits]}: {s}")
            ok = False
    inv = active_rules({"enable": ["endash"], "disable": ["hyphen-as-dash"]})
    assert {h[0] for h in lint_line("Kaina \u2013 10 €.", inv)} == {"dash-pause", "endash"} and not lint_line("Kaina - 10 €.", inv)
    assert [h[2] for h in lint_line("Tik €6 ir €6.")] == ["€6"]
    assert is_lithuanian("Sveiki, čia mes") and not is_lithuanian("Hello world, this is fine")
    assert is_lithuanian("Skubame nes laukiate.") and not is_lithuanian("Getting Started Guide for you")
    assert not lint_line("Bet kuriuo metu galite atšaukti.")
    assert [h[0] for h in lint_line("Pigu bet kokybiška.")] == ["o-bet-no-comma"]
    assert not lint_line("Tinka bet kokio dydžio įmonei ir bet kuriai veiklai.")
    assert not lint_line("Atvažiuojame bet kurioje Lietuvos vietoje, bet kuriuo metu.")
    assert not lint_line("Darbo laikas I-VII 8:00-21:00.")
    assert [h[0] for h in lint_line("Skambinkite 8 612-34567.")] == ["phone-hyphen"]
    assert not [l for _, l in html_to_lines("<p>I-VII 8:00-21:00<!-- -->. Atvažiuojame</p>") if " ." in l]
    assert not lint_line("Kai kurie klientai moka kas mėnesį. Kada kurį dokumentą naudoti?")
    assert [h[0] for h in lint_line("Kaina 1,000 eurų.")] == ["thousands-comma"]
    assert not [l for _, l in html_to_lines("<p>pagal <strong>diametrą</strong>, o sumas</p>") if " ," in l]
    assert code_to_lines("c = `${base} ${ok ? a : ''} ${cls}`") == [(1, "X X X")]
    assert code_to_lines("const t = cond ? 'Taip' : (o.desc ?? 'Ne');") == []
    assert code_to_lines('<Button>Registruotis dabar</Button>\nconst x = "Įveskite el. paštą";') == [(1, "Registruotis dabar"), (2, "Įveskite el. paštą")]
    print("OK" if ok else "Yra klaidų")
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("targets", nargs="*")
    ap.add_argument("--crawl", type=int, default=0, help="kiek to paties domeno puslapių aplankyti nuo URL")
    ap.add_argument("--all", action="store_true", help="tikrinti ir eilutes, kurios neatrodo lietuviškos")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--config", help="kelias iki .lt-rasyba.json (numatyta: ieškoma aukštyn nuo tikrinamo kelio)")
    a = ap.parse_args()
    if a.test:
        sys.exit(0 if selftest() else 1)
    if not a.targets:
        ap.error("nurodyk failą, katalogą, URL arba -")
    cfg = None
    if a.config:
        with open(a.config, encoding="utf-8") as fh:
            cfg = json.load(fh)
    res = run(a.targets, a.crawl, not a.all, cfg)
    if a.json:
        json.dump(res, sys.stdout, ensure_ascii=False, indent=1)
    else:
        report(res)


if __name__ == "__main__":
    main()
