---
name: avoid-ai-writing
description: "Lithuanian and English writing quality toolkit: removes AI patterns, writes human copy, audits full websites, generates SEO metadata, schema markup, llms.txt, and competitor analysis. 11 commands for Lithuanian web projects."
risk: none
date_updated: "2026-05-22"
---

# Avoid AI Writing - Lithuanian & English Copy Toolkit

Full writing quality system for Lithuanian and English web projects. Removes AI writing patterns, writes human copy, audits entire codebases, generates SEO metadata, schema markup, llms.txt, and analyses competitors.

**Core principle:** human writing is **simple, short, and specific**. AI writing is vague, inflated, and formulaic.

---

## Commands

| Komanda | Ką daro |
|---|---|
| `/fix-ai-slop` | Audituoja ir perrašo tekstą (EN arba LT) - grąžina 4 skyrius |
| `/rašyk-lt` | Rašo lietuvišką tekstą su „Jūs" forma, be AI šablonų |
| `/rašyk-en` | Rašo anglišką tekstą be AI šablonų |
| `/rašyk-puslapį` | Pilnas svetainės puslapis su SEO: title, meta, H1/H2, CTA |
| `/rašyk-emailą` | Lietuviškas el. laiškas (transakcinis arba rinkodaros) |
| `/polish-lt` | Nuskanuoja visą projektą, rodo preview, taiso tekstą visur |
| `/scan-website` | Nuskanuoja frontend failus, siūlo pakeitimus su patvirtinimu |
| `/seo-lt` | SEO + AI SEO auditas: techninis, on-page, vietinis, GEO, SXO |
| `/schema-lt` | Generuoja JSON-LD schema.org (LocalBusiness, FAQ, Service...) |
| `/llms-txt` | Sukuria `/llms.txt` failą AI crawleriams |
| `/konkurentai-lt` | Analizuoja konkurentų copy ir SEO, randa galimybes |

---

## Reference Files

> Lithuanian language rules moved to the `lt-rasyba` skill (2026-09-27). The Lithuanian reference files below are deprecated and contain known errors; for any Lithuanian text use `lt-rasyba`. This skill keeps English patterns, page templates and SEO.

- `references/english-patterns.md` - 43-entry word replacement table, structural patterns, formatting rules (English)
- `references/lithuanian-patterns.md` - Lithuanian word replacements, grammar fixes, calque patterns, loan-word table
- `references/lithuanian-web-copy.md` - Lithuanian website tone guide, Jūs form, natural phrases, before/after examples
- `references/lt-writing-quality.md` - Sentence rhythm, Lithuanian idioms, industry-specific tone
- `references/vlkk-grammar-rules.md` - Official VLKK 2022 spelling rules: brūkšnelis vs brūkšnys, kabutės, skaičiai
- `references/vlkk-skyryba-rules.md` - Official VLKK 2020 punctuation: kableliai, brūkšniai, bullet sąrašai
- `references/linkeviciene-editing.md` - Linkevičienė "Redagavimo pradmenys" (VU 2013): semantizmai, vertiniai, stiliaus reikalavimai
- `references/page-templates.md` - 8 page type templates: Hero, Paslaugos, Apie mus, Landing, Kainodara, Kontaktai
- `references/seo-copy.md` - SEO copy rules: title ≤60, meta ≤160, H1/H2, URL format, Lithuanian keywords

---

## When to Use

**Writing:**
- `/rašyk-lt` - write Lithuanian website copy
- `/rašyk-puslapį` - write a full page with SEO
- `/rašyk-emailą` - write a Lithuanian email

**Auditing:**
- `/fix-ai-slop` - fix AI patterns in a snippet
- `/polish-lt` - fix entire project (all files)
- `/scan-website` - fix frontend files only

**SEO:**
- `/seo-lt` - full SEO audit (plan first, then execute)
- `/schema-lt` - generate schema markup
- `/llms-txt` - create llms.txt for AI search
- `/konkurentai-lt` - competitor analysis

---

## Core Audit Process (for /fix-ai-slop)

### Step 1: Detect language
English, Lithuanian, or mixed. Apply relevant reference files.

### Step 2: Audit - find every AI-ism

1. Words on the replacement table
2. Template openings ("In today's rapidly evolving...")
3. Overused transitions (Moreover, Be to, Tuo tarpu)
4. Hollow intensifiers (truly, iš esmės as filler)
5. Hedging chains ("it could be argued")
6. Rule of three (three-adjective lists)
7. Negative parallelism ("Not only X but also Y")
8. Copula avoidance ("serves as" instead of "is")
9. Significance inflation ("pivotal role", "testament to")
10. Superficial -ing endings ("highlighting the importance")
11. Vague attributions ("experts say")
12. Formulaic challenges section
13. Generic conclusions ("The future remains bright")
14. Formatting tells (em dash overuse, mechanical bold)
15. Lithuanian-specific: noun string calques, passive overuse, English loan words

### Step 3: Rewrite
- Replace every flagged word using the replacement table
- Active voice over passive
- Sentences ≤25 words - split longer ones
- No filler transitions
- No three-adjective lists
- No generic openings/conclusions

### Step 4: Report
1. Issues found (with category labels)
2. Rewritten version
3. What changed
4. Second-pass: clean or flag survivors

---

## Limitations

- Prose only - not code
- Pattern matching is guideline-based - use judgment for context
- Cannot verify factual claims
- Lithuanian loan-word fixes assume native audience
- `/seo-lt` without DataForSEO cannot show live keyword volumes or rankings
