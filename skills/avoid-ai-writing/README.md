# avoid-ai-writing

Lithuanian and English writing quality toolkit for Claude Code. Removes AI patterns, writes human copy, audits entire codebases, generates SEO metadata, schema markup, llms.txt, and competitor analysis.

**11 commands** for Lithuanian web projects.

---

## Install

```bash
git clone https://github.com/P1tak4s/avoid-ai-writing \
  ~/.claude/skills/avoid-ai-writing

cp ~/.claude/skills/avoid-ai-writing/commands/*.md ~/.claude/commands/
```

---

## Commands

### Writing

| Command | What it does |
|---|---|
| `/rašyk-lt` | Write Lithuanian copy with `Jūs` form, no AI patterns |
| `/rašyk-en` | Write English copy without AI patterns |
| `/rašyk-puslapį [puslapis]` | Full page with SEO: title, meta, H1/H2, CTA |
| `/rašyk-emailą [tipas]` | Lithuanian email (transactional or marketing) |

### Auditing & Fixing

| Command | What it does |
|---|---|
| `/fix-ai-slop` | Audit and rewrite a text snippet (EN or LT) |
| `/polish-lt` | Scan entire project, show preview, fix all text |
| `/scan-website` | Scan frontend files with approval flow |

### SEO

| Command | What it does |
|---|---|
| `/seo-lt [url]` | Full SEO + AI SEO audit (plan first, then execute) |
| `/schema-lt [url]` | Generate JSON-LD schema.org markup |
| `/llms-txt [url]` | Create `/llms.txt` for AI search crawlers |
| `/konkurentai-lt [urls]` | Competitor copy and SEO analysis |

---

## Quick start

```
/rašyk-puslapį automobilių servisas Vilniuje, pagrindinis puslapis

/seo-lt https://revmotors.lt

/polish-lt

/schema-lt https://revmotors.lt

/konkurentai-lt https://revmotors.lt vs https://competitor.lt
```

---

## Core principle

> Human writing is **simple, short, and specific**.
> AI writing is vague, inflated, and formulaic.

Removes: template openings, hollow intensifiers, three-adjective lists, AI transitions, Lithuanian calques, grammar errors (Registruojies→Registruokitės), long em dashes.

---

## DataForSEO (optional)

Adds live keyword volumes, rankings, and competitor data.

```bash
npm install -g dataforseo-mcp-server
python3 ~/.claude/skills/avoid-ai-writing/scripts/setup-dataforseo.py EMAIL PASSWORD
```

Cost: ~$5-20/month. Free $1 credit on signup at app.dataforseo.com.

---

## License

MIT
