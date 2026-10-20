import json,re,statistics as st,collections as C
NEWS="0d47fca48c 370b947881 3d3c10b191 50d7d306c8 557a4ff8cf 646b362870 7858a3e474 7a3df6df19 7cc710a44c 877304903f bf49be50c9 d35a7c3037 dffc067cd4 e4eda9c488 f6f267dd81 f9b25ea2b4".split()
MKT="6a3065e424 b0e2ce04f2 6f0b594ff8 f9a5b3b90c c2bac9df77 60463d9653 6108737171 7ea1088fe7 d765522f58 53b96d719e a21dc5658a 94462e2b06 9f3b1aa76d 7f24340315".split()
BAD=re.compile(r"prenumerat|Premium|slapuk|Visos teisės|redakcij|naujienlaišk|Registrų centras|Įm\. kodas|programėlę$|Reikia pagalbos|Išsaugoti straipsnį|padovanoti|Konfidencialumą|tinklalaid|Mėgaukitės|Atsisiųskite mobil|UAB „Lrytas“|\$\{|Internet Explorer|Интернет|браузер|Swedbank Internet|It is not|Instead, we|lrtfaktai|\[\[ge:|\\u[0-9a-fA-F]{4}|\":|\{\"|\"\}",re.I)
def paras(ids,tags):
    out=[]
    for i in ids:
        r=json.load(open(f"raw/{i}.json")); seen=set()
        for t,x in r["items"]:
            if t in tags and len(x)>25 and not BAD.search(x) and x not in seen:
                seen.add(x); out.append((r["url"],x))
    return out
ABBR=r"(?:m|d|proc|mln|mlrd|tūkst|g|val|pvz|kt|soc|vyr|sk|el|pr|Nr|t|y|min|km|vnt|a|mėn|ES|st|p|l)"
def sents(p):
    p=re.sub(r"\s+"," ",p)
    # protect initials like "D. Jorgensenas", "P. Bartaševičius"
    p=re.sub(r"\b([A-ZĄČĘĖĮŠŲŪŽ])\. (?=[A-ZĄČĘĖĮŠŲŪŽ])",r"\1§ ",p)
    p=re.sub(r"\b("+ABBR+r")\. ",r"\1§ ",p)
    parts=re.split(r"(?<=[.!?…])\s+(?=[„\"A-ZĄČĘĖĮŠŲŪŽ0-9])",p)
    return [s.replace("§",".").strip() for s in parts if len(s.split())>=3]
CONN=["Tačiau","Be to","Taip pat","Vis dėlto","Todėl","Taigi","Kartu","Tiesa","Be kita ko","O ","Bet","Kita vertus","Kitaip tariant","Tuo metu","Tuo pat metu","Maža to","Dar","Vadinasi","Kadangi","Nors","Jei","Jeigu","Kai ","Užuot","Nesvarbu","Tad"]
ADV_PREP=r"^(Per|Po|Nuo|Iki|Į|Ties|Prie|Pagal|Dėl|Su|Šiuo metu|Šiemet|Kitąmet|Pastaraisiais|Praėjusį|Rugpjūtį|Liepą|Kovą|Birželį|Rudenį|Vėliau|Dabar|Kasdien|Kitais metais|Pereinamuoju|Evakuacijos|Krizės metu|Visoje|Vienoje|Kai kuriose|Kai kur|Lietuvoje|Latvijoje|Čekijoje|Rumunijoje|Suomijoje|Bulgarijoje|Vokietijoje|Mieste|Materoje|Kelyje|Toje|Tame|Šiame|Šioje|Europoje|Visuose|Kitose|Užsakę|Apsipirkimo|Įdiegę|Naudodami|Nuvykus|Pakeitus|Panaikinus|Pasikeitus|Nustačius|Prasidėjus|Įsigaliojus|Įgyvendinant|Lyginant|Apdraudę|Rinkdamiesi|Rūpindamiesi|Prieš|Užuot|Kiekvienas|Vidutiniškai|\d{4} m\.|\d{4}[–-]\d{4} m\.|\d{4} metų|Nuo)\b"
ATTR=r"^(Pasak|Anot|Kaip|BNS rašė|Skelbiama|Teigiama|Pažymima|Primenama|LRT\.lt primena|Informuojame|Atkreipiame)"
IMPERS=r"^(Siūloma|Skelbiama|Teigiama|Siekiama|Pažymima|Primenama|Planuojama|Numatyta|Norima|Rekomenduojama|Galima|Verta|Svarbu|Reikia|Neatmetama|Nežinoma)\b"
def cls(s):
    if re.match(r"^„[^“]{1,40}“ ",s) and not re.search(r"“,? – ",s[:60]): return "daiktavardis / vardas (veiksnys arba papildinys)"
    if s.startswith(("„","\"")): return "citata"
    if re.match(IMPERS,s): return "beasmenė (-ma/-ta, galima, verta)"
    if re.match(r"^(Pasak|Anot)\b",s): return "šaltinio aplinkybė (Pasak/Anot)"
    for c in CONN:
        if s.startswith(c): return "jungtukas / siejamasis žodis"
    if re.match(ADV_PREP,s): return "aplinkybė (laikas, vieta, būdas, sąlyga)"
    if re.match(r"^(Kas|Ką|Kiek|Kodėl|Kaip|Kur|Kada|Ar|Kokį|Kokias|Kokių|Kokiu)\b",s): return "klausimas"
    if re.match(r"^(Tai|Šis|Ši|Šie|Šios|Šias|Šio|Jis|Ji|Jie|Jos|Jam|Jiems|Jį|Juos|Jose|Mes|Mūsų|Jūs|Tu|Tau|Jums)\b",s): return "įvardis (Tai, Šis, Jis, Mes...)"
    if re.match(r"^\d",s): return "skaičius / data"
    if re.match(r"^[A-ZĄČĘĖĮŠŲŪŽ]\w*(k|kite|kime|kis|kitės|kimės)\b",s) and not re.match(r"^(Kiek|Tik|Kitąmet|Visuomet|Kaip)\b",s): return "liepiamoji nuosaka (Užsisakyk/-ite)"
    if re.match(r"^[A-ZĄČĘĖĮŠŲŪŽ]\w*(ti|tis)\b",s): return "bendratis"
    if re.match(r"^[A-ZĄČĘĖĮŠŲŪŽ]\w*(ome|ame|ime|ate|ite|au|iu|ėme|ojame|ėjo|ojo|ė|o|ia|a|us|usi|ę|ęs|usios|tų|ėtų|ytų|otų)\b",s) and re.match(r"^(Siūlome|Kuriame|Atliepiame|Rūpinamės|Įkvepiame|Padedame|Galime|Siekiame|Esame|Turime|Matome|Pastebime|Informuojame|Atkreipiame|Dedame|Atsiprašome|Kviečiame|Rekomenduojame|Užtikriname|Išplėtėme|Laukite|Veikia|Tereikia|Reikia|Užpylus|Nuvykus|Kalbinta|Apsilankykite|Kaupkite|Sutaupykite|Parsisiųskite|Ieškai|Skiriasi|Svarbiau|Pusiau|Dalyviams)\b",s): return "veiksmažodis sakinio pradžioje"

    if re.match(r"^[a-ząčęėįšųūž]",s): return "kita (mažoji raidė)"
    return "daiktavardis / vardas (veiksnys arba papildinys)"
def report(name,ps):
    ss=[(u,s) for u,p in ps for s in sents(p)]
    L=[len(s.split()) for u,s in ss]
    print(f"\n=== {name}: {len(ps)} pastraipų, {len(ss)} sakinių")
    print(f"ilgis žodž.: vidurkis {st.mean(L):.1f}, mediana {st.median(L)}, min {min(L)}, max {max(L)}, kvartiliai {st.quantiles(L,n=4)}")
    b=C.Counter(); 
    for x in L: b["<=8" if x<=8 else "9-15" if x<=15 else "16-25" if x<=25 else "26-40" if x<=40 else ">40"]+=1
    print("ilgio grupės:",dict(b))
    c=C.Counter(cls(s) for u,s in ss)
    for k,v in c.most_common(): print(f"  {k}: {v} ({100*v/len(ss):.0f}%)")
    return ss
news=report("ŽURNALISTIKA",paras(NEWS,("p",)))
mkt=report("ĮMONIŲ SVETAINĖS",paras(MKT,("p","li","h2","h3")))
json.dump({"news":news,"mkt":mkt},open("sentences.json","w"),ensure_ascii=False)
def cnt(ss,pats):
    txt=" "+" ".join(s for u,s in ss)+" "
    w=len(txt.split())
    return {p:len(re.findall(p,txt)) for p in pats},w
pats=[r"\bTačiau\b",r"\btačiau\b",r"\bTodėl\b",r"\btodėl\b",r", o\b",r"\bBe to,",r"\bTaip pat\b",r"\btaip pat\b",r"\bVis dėlto\b",r"\bnes\b",r"\bbet\b",r"\bkadangi\b|\bKadangi\b",r"\bTaigi\b",r"\bTiesa,",r"\bbe kita ko\b|\bBe kita ko\b",r"\bjūsų\b|\bJūsų\b",r"\bsavo\b",r"\btavo\b",r"\bJūsų\b",r"\bJums\b|\bJus\b",r"\bbuvo \w+(tas|ta|ti|tos|tai)\b",r"\byra \w+(tas|ta|ti|tos|mas|ma|mi)\b",r"\b\w+(oma|ima|ama)\b",r"\bproc\.",r"%",r"€",r"\beurų\b",r"\bEur\b",r"\bmln\.",r"\btūkst\.",r"–",r"\u2014",r"„",r"\"",r"\bsklandž\w*|\bsklandus\b|\bsklandi\b",r"\bišnaudo\w*",r"\bsprendim\w*",r"\bpatirt\w*",r"\binovatyv\w*",r"\bunikal\w*",r"\bšiuolaik\w*",r"\bekosistem\w*"]
for name,ss in (("news",news),("mkt",mkt)):
    d,w=cnt(ss,pats); print(f"\n--- {name} ({w} žodžių) dažniai ir /1000 žodž.")
    for k,v in d.items(): print(f"  {k!r}: {v}  ({1000*v/w:.1f})")
