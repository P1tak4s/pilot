Sukurk svetainės puslapio turinį lietuvių kalba. Kalbai taikyk `lt-rasyba` skill'ą: jo taisyklės nugali bet kokį kalbos patarimą šiame faile ir avoid-ai-writing references. Iš avoid-ai-writing imk tik `page-templates.md` ir `seo-copy.md`.

## Prieš rašant - nustatyk

Iš $ARGUMENTS išsitrauk:
1. **Puslapio tipas** - Hero / Paslaugos / Apie mus / Landing page / Kainodara / Kontaktai / FAQ / Blogas
2. **Verslas / paslauga** - kas tai yra
3. **Tikslinė auditorija** - kam skirta
4. **Miestas / regionas** - jei taikoma
5. **Tonas** - jei nenurodytas, naudok pagarbų „Jūs" formą

## Ką daryti

1. Perskaityk `references/page-templates.md` - rask šabloną pagal puslapio tipą
2. Perskaityk `references/lithuanian-web-copy.md` - tonas ir stilius
3. Perskaityk `references/seo-copy.md` - pasiūlyk Title tag ir meta aprašymą
4. Perskaityk `references/vlkk-grammar-rules.md` - gramatika

## Ką pateikti

### SEO
```
Title tag: [max 60 simbolių]
Meta aprašymas: [max 160 simbolių]
URL pasiūlymas: /[slug]
```

### Turinys
Pilnas puslapio turinys pagal šabloną su žymėjimu:
- `# H1` - pagrindinė antraštė
- `## H2` - skyrių antraštės
- `### H3` - poskirsniai
- `[CTA: tekstas]` - mygtukų tekstai
- `[ALT: aprašymas]` - nuotraukų alt tekstai

### Patikrinimas
Po rašymo patikrink:
- [ ] Nėra AI-isms iš `references/english-patterns.md` ar `references/lithuanian-patterns.md`
- [ ] Naudojama „Jūs" forma
- [ ] Title tag ≤ 60 simbolių
- [ ] Meta ≤ 160 simbolių
- [ ] Nėra Title Case antraštėse
- [ ] Teisingos kabutės „..."
- [ ] Teisingas brūkšnys – (ne -)

## Pavyzdys

Įvestis: `automobilių servisas Vilniuje, pagrindinis puslapis`

Išvestis:
```
Title tag: Automobilių servisas Vilniuje | RevMotors
Meta: Remontuojame per dieną. Diagnostika 30 €, variklio remontas nuo 150 €. Registruokitės dabar.
URL: /

# Automobilis sutvarkytas per dieną.

Vilniuje remontuojame nuo 2010 m.
Kainą sužinote prieš remontą. Jokių staigmenų.

[CTA: Registruotis]  [CTA: Skambinti]

## Mūsų paslaugos
...
```

## Turinys kuriam rašyti:
$ARGUMENTS
