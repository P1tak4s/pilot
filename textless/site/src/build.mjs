// Builds the textless site: site/src/template.html -> site/index.html, with the scenes copied into site/assets/scenes
// and every pixel word drawn from the plugin's own 5x7 glyphs, so the site and the chat can never drift apart.
// Usage: node site/src/build.mjs
import fs from "node:fs"
import { execSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { compare, preview, icons } from "./compare.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const site = path.resolve(here, "..")
const repo = path.resolve(site, "..")
const hooks = path.join(repo, "plugin", "hooks")
const plugin = JSON.parse(fs.readFileSync(path.join(repo, "plugin", ".claude-plugin", "plugin.json"), "utf8"))

// The glyph and badge tables are object literals in register.tsx. Read them out as text and evaluate them alone.
const tsx = fs.readFileSync(path.join(hooks, "register.tsx"), "utf8")
const table = name => {
  const m = tsx.match(new RegExp(`const ${name}: Record<string, string\\[\\]> = (\\{[\\s\\S]*?\\n\\})`))
  if (!m) throw new Error(`build: ${name} not found in register.tsx`)
  return Function(`return ${m[1]}`)()
}
const BADGES = table("BADGES")
// The plugin only needs the capitals of its own words. The site adds the lowercase of its wordmark in the same grid.
const GLYPHS = {
  ...table("GLYPHS"),
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#..#", "..##."],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
}

// The same drawing as pixelWord in register.tsx: each stroke two pixels wide, a darker drop one pixel down, and a
// leading mark becomes the 9x9 badge with the mark cut out.
// The controls demo: the card's top row as textless draws it, its three buttons at the right, the scene under them and
// the prompt below, where the commands type themselves.
function ctrlbar() {
  const I = icons
  return `<div class="cbar" id="strip" data-on="true">
      <div class="cb-card">
        <div class="cb-top"><span class="cb-tl">
          <button type="button" class="cb-b cb-aa" data-power data-tip="power" aria-pressed="true" aria-label="textless on or off in this chat" title="Orange and struck through while the steps are hidden">Aa</button>
          <button type="button" class="cb-b" data-tip="gear" aria-label="textless settings">${I.gear}</button>
          <button type="button" class="cb-b" data-tip="min" aria-label="Minimize the card">${I.shrink}</button>
        </span></div>
        <img class="cb-art" src="assets/scenes/scenery/campfire.svg" alt="" width="560" height="350">
        <p class="cb-busy">Claude is working</p>
      </div>
      <div class="cb-comp"><span class="cb-type" id="cb-type">Type / for commands</span><span class="cb-stop" aria-hidden="true"></span></div>
    </div>
`
}

// The uses section: one Claude Code pane that changes with the word picked beside it.
function uses() {
  return `<h2 id="us-h">Made for <span class="rot" id="rot">a more playful Claude</span></h2>
    <p class="use-cap" id="use-cap" aria-live="polite">Pixel art where the wall of text used to be.</p>`
}

const ORANGE = "#d97757"
const DROP = "#a8573c"
function badge(mark, label) {
  const cells = []
  BADGES[mark].forEach((row, y) => [...row].forEach((c, x) => { if (c === ".") cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`) }))
  return `<svg class="ask-badge" role="img" aria-label="${label}" width="18" height="18" viewBox="0 0 9 9" shape-rendering="crispEdges"><g fill="${ORANGE}">${cells.join("")}</g></svg>`
}
function pixel(word, { color = ORANGE, drop = DROP, flat = false, px = 4, cls = "", label = word } = {}) {
  const mark = BADGES[word[0]] && word[1] === " " ? word[0] : ""
  const text = mark ? word.slice(2) : word
  const ink = [], under = []
  const cell = (x, y, w = 1) => `<rect x="${x}" y="${y}" width="${w}" height="1"/>`
  if (mark) BADGES[mark].forEach((row, y) => [...row].forEach((c, x) => { if (c === ".") ink.push(cell(x, y)) }))
  let x = mark ? 12 : 0
  for (const c of text) {
    const g = GLYPHS[c] ?? GLYPHS[" "]
    g.forEach((row, y) => [...row].forEach((on, i) => {
      if (on !== "#") return
      if (!flat) under.push(cell(x + i, y + 2, 2))
      ink.push(cell(x + i, y + 1, 2))
    }))
    x += g[0].length + 2
  }
  const w = x - 1
  return `<svg class="px ${cls}" role="img" aria-label="${label}" width="${w * px}" height="${9 * px}" viewBox="0 0 ${w} 9" shape-rendering="crispEdges"><g fill="${drop}">${under.join("")}</g><g fill="${color}">${ink.join("")}</g></svg>`
}

// The logo: the toggle's own sign, "Aa" struck through. Outfit SemiBold, the effortless name's face, rasterised into a
// 64 px grid, so it reads as real letters with a pixel edge. Flat orange, no drop shadow. The strike sits mid x-height
// with a one-pixel gap above and below it in the tile colour, so both letters stay legible under it.
const LOGO_AA = ["............####..................................","...........######.................................","...........######.................................","...........#######................................","..........########................................","..........########................................",".........##########...............................",".........##########...............................","........############..............................","........############.................####.........","........#####..#####..............#########..#####",".......######..######............#################",".......######...#####...........##################","......######....######.........###################","......######....######........#########..#########","......#####......#####........#######......#######",".....######......######.......######........######",".....######......######......######..........#####","....######........######.....######..........#####","....######........######.....######..........#####","....####################.....######..........#####","...######################....######..........#####","...######################....######..........#####","..########################....######........######","..########################....#######......#######","..######............######.....###################",".######..............######....###################",".######..............######.....##################","######................######.....#################","######................######.......########..#####"]
// No tile: the mark stands on whatever is behind it. The gaps either side of the strike are cut with a mask, so they
// are see-through rather than painted in one background colour.
function logo(size = 64, square = false) {
  const rects = []
  LOGO_AA.forEach((row, y) => { for (const m of row.matchAll(/#+/g)) rects.push(`<rect x="${m.index + 7}" y="${y + 17}" width="${m[0].length}" height="1"/>`) })
  const id = `aa${size}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${square ? size : Math.round(size * 0.6)}" viewBox="${square ? "2 2 60 60" : "2 14 60 36"}" shape-rendering="crispEdges"><mask id="${id}"><rect width="64" height="64" fill="#fff"/><rect x="3" y="35" width="58" height="1" fill="#000"/><rect x="3" y="39" width="58" height="1" fill="#000"/></mask><g fill="${ORANGE}"><g mask="url(#${id})">${rects.join("")}</g><rect x="4" y="36" width="56" height="3"/></g></svg>`
}

// The scenes ship in the plugin, one set per folder: the bare Clawd scenes at the top, then scenery/, abstract/ and
// status/ (any new folder becomes a set too). Copy them as they are, keeping the folders.
const from = path.join(hooks, "scenes")
const out = path.join(site, "assets", "scenes")
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
const SETS = { "": "Clawd", scenery: "Scenery", abstract: "Abstract", paintings: "Paintings", status: "Working", chess: "Chess" }
// Sets that are played, not watched: the settings page lists them under Interactive sets.
const INTERACTIVE = ["chess"]
const NAMES = { sit: "Tea", "working-block": "Working, block", "working-sit": "Working, sitting", "working-text": "Working, text" }
const pretty = id => NAMES[id] ?? (id[0].toUpperCase() + id.slice(1)).replace(/-bare$/, "").replace(/-smooth$/, ", smooth").replace(/-/g, " ")
const folders = ["", ...fs.readdirSync(from, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)]
folders.sort((x, y) => Object.keys(SETS).indexOf(x) - Object.keys(SETS).indexOf(y))
const scenes = []
for (const dir of folders) {
  const files = fs.readdirSync(path.join(from, dir)).filter(f => /\.(svg|gif|png|webp|jpe?g)$/i.test(f)).sort()
  if (!files.length) continue
  fs.mkdirSync(path.join(out, dir), { recursive: true })
  for (const f of files) {
    fs.copyFileSync(path.join(from, dir, f), path.join(out, dir, f))
    const head = fs.readFileSync(path.join(from, dir, f), "utf8").slice(0, 400)
    const size = head.match(/width="(\d+)"[^>]*height="(\d+)"/)
    const id = f.replace(/\.[^.]+$/, "")
    scenes.push({ id, dir: dir || "clawd", set: SETS[dir] ?? dir[0].toUpperCase() + dir.slice(1), name: pretty(id), src: `assets/scenes/${dir ? dir + "/" : ""}${f}`, sq: size ? Number(size[2]) >= Number(size[1]) : false, tall: size ? Number(size[2]) > Number(size[1]) * 1.2 : false })
  }
}
// The Quotes set is drawn by the plugin when shown, so no files ship in plugin/hooks/scenes. The site needs them as
// images, so draw them here, every build: a build that skipped this dropped the set from the settings page and gallery.
execSync(`node --experimental-strip-types "${path.join(repo, "scripts", "quote-previews.mjs")}" "${path.join(out, "quotes")}"`, { stdio: "inherit" })
for (const f of fs.readdirSync(path.join(out, "quotes")).filter(f => f.endsWith(".svg")).sort()) {
  const id = f.replace(/\.svg$/, "")
  const size = fs.readFileSync(path.join(out, "quotes", f), "utf8").slice(0, 400).match(/width="(\d+)"[^>]*height="(\d+)"/)
  scenes.push({ id, dir: "quotes", set: "Quotes", name: pretty(id), src: `assets/scenes/quotes/${f}`, sq: size ? Number(size[2]) >= Number(size[1]) : false, tall: size ? Number(size[2]) > Number(size[1]) * 1.2 : false })
}
fs.writeFileSync(path.join(site, "assets", "logo.svg"), logo(64, true))
// Cubit, peeking through: the real clip and sky from the Cubit repo (copied into site/src/cubit), never redrawn.
fs.mkdirSync(path.join(site, "assets", "cubit"), { recursive: true })
for (const f of fs.readdirSync(path.join(here, "cubit"))) fs.copyFileSync(path.join(here, "cubit", f), path.join(site, "assets", "cubit", f))

// The rip Cubit looks through: a torn hole in square pixels, the same shape every build (a fixed seed). The mask is the
// hole; the edge is one ring of orange pixels around it, some brighter, some missing.
function rip() {
  const W = 44, H = 30, cx = W / 2, cy = H / 2, rx = W / 2 - 2.5, ry = H / 2 - 2.5
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const wob = Array.from({ length: 36 }, () => 0.86 + rnd() * 0.2)
  const inside = (x, y) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * 36
    const i = Math.floor(a) % 36, k = a - Math.floor(a), r = wob[i] * (1 - k) + wob[(i + 1) % 36] * k
    return Math.hypot(dx, dy) < r
  }
  const hole = [], edge = []
  const skip = new Set()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (skip.has(x + "," + y)) continue
    if (inside(x, y)) { let e = x; while (e + 1 < W && inside(e + 1, y)) e++; hole.push(`<rect x="${x}" y="${y}" width="${e - x + 1}" height="1"/>`); for (let k = x + 1; k <= e; k++) skip.add(k + "," + y); continue }
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => inside(x + a, y + c))
    if (near && rnd() > 0.12) edge.push(`<rect x="${x}" y="${y}" width="1" height="1" opacity="${(0.45 + rnd() * 0.55).toFixed(2)}"/>`)
  }
  const svg = (body, fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges"><g fill="${fill}">${body}</g></svg>`
  const uri = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`
  return { mask: uri(svg(hole.join(""), "#fff")), edge: uri(svg(edge.join(""), ORANGE)), aspect: `${W} / ${H}` }
}
const RIP = rip()

// The scenes as a marquee: two rows drifting in opposite directions, every scene once, each row drawn twice so the
// loop has no seam (the copy is hidden from screen readers and the keyboard). A row's speed follows its length.
const card = ([s, i], copy) => `<li><button type="button" class="scene-card${s.sq ? " sq" : ""}${s.tall ? " tall" : ""}" data-scene="${i}" aria-pressed="false"${copy ? ' tabindex="-1"' : ""} title="${s.name}"><img src="${s.src}" alt="${copy ? "" : s.name}" loading="lazy"><span>${s.name}</span></button></li>`
const indexed = scenes.map((s, i) => [s, i])
// Row one: the pictures (scenery, paintings, abstract). Row two: the characters, Clawd and WORKING taking turns so the
// WORKING lettering never sits twice in a row. The bare WORKING word stays out; it is not a scene to look at.
const art = indexed.filter(([s]) => ["scenery", "paintings", "abstract"].includes(s.dir))
const clawd = indexed.filter(([s]) => s.dir === "clawd"), working = indexed.filter(([s]) => s.dir === "status" && !/working-text/.test(s.src))
const chars = []
for (let k = 0; k < Math.max(clawd.length, working.length); k++) { if (clawd[k]) chars.push(clawd[k]); if (working[k]) chars.push(working[k]) }
const rows = [art, chars]
const gallery = rows.map((row, r) => `<div class="mq${r ? " back" : ""}" style="--dur:${Math.max(40, row.length * 7)}s"><ul class="track" aria-label="Scenes, row ${r + 1}">${row.map(x => card(x, false)).join("")}</ul><ul class="track copy" aria-hidden="true">${row.map(x => card(x, true)).join("")}</ul></div>`).join("")

// GitHub stars: textless will live in the effortless repo as its second plugin, so the stars are shared. Read once at
// build time (gh first, then the open API); no count shows no badge.
let stars = 0
try { stars = Number(execSync("gh api repos/HeyCubit/effortless --jq .stargazers_count", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()) || 0 } catch {
  try { const r = await fetch("https://api.github.com/repos/HeyCubit/effortless"); if (r.ok) stars = (await r.json()).stargazers_count || 0 } catch {}
}
const GITHUB = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>'

// Install, the way effortless does it: a request Claude Code runs for you, or the terminal line (joined with ; so it
// also runs in PowerShell 5), then /reload-plugins. textless is the second plugin in the effortless marketplace.
const CLAUDE_MARK = fs.readFileSync(path.join(here, "claude-mark.svg"), "utf8")
const svgUri = s => "data:image/svg+xml," + encodeURIComponent(s).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29")
const copyIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 10.5V4a1.5 1.5 0 011.5-1.5H11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
const termIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="1.5" y="3" width="17" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2.5 2-2.5 2M10 12.5h4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ask = "Install the textless plugin for me: run `claude plugin marketplace add HeyCubit/effortless` and then `claude plugin install textless@effortless`. When both succeed, tell me to run /reload-plugins."
const term = "claude plugin marketplace add HeyCubit/effortless; claude plugin install textless@effortless"
const install = '<div class="ways">'
  + `<div class="way way-claude"><p class="way-k"><img src="${svgUri(CLAUDE_MARK.replace(/#ffffff/g, "#d97757"))}" alt="" width="20" height="20">Ask Claude</p><p class="way-t">Claude installs it for you.</p><button type="button" class="big claude" data-copy="${ask.replace(/"/g, "&quot;")}" aria-label="Copy the install request for Claude"><img src="${svgUri(CLAUDE_MARK.replace(/#ffffff/g, "#1f1009"))}" alt="" width="20" height="20"><span>Copy for Claude</span></button><p class="way-h">Paste it into Claude Code and press Enter.</p></div>`
  + `<div class="way way-cmd"><p class="way-k">${termIcon}Terminal</p><p class="way-t">Run one command.</p><button type="button" class="big term" data-copy="${term}" aria-label="Copy the install command">${copyIcon}<span>Copy command</span></button><p class="way-h"><code>${term}</code></p></div>`
  + '</div><p class="then">Then run <code>/reload-plugins</code> in Claude Code.</p>'

const map = {
  __INSTALL__: install,
  __GITHUB__: GITHUB,
  __STARS__: stars > 0 ? `<span class="stars">${stars >= 1000 ? (stars / 1000).toFixed(1) + "k" : stars}</span>` : "",
  __VERSION__: plugin.version,
  __ICON__: "data:image/svg+xml," + encodeURIComponent(logo(32, true)),
  __LOGO__: logo(30).replace("<svg ", '<svg class="logo" aria-hidden="true" '),
  __NEEDS__: pixel("▶ YOUR TURN", { px: 3, label: "Your turn" }),
  __STOPPED__: pixel("■ STOPPED", { px: 3, label: "Stopped" }),
  __SCENES__: JSON.stringify(scenes.map(s => ({ name: s.name, src: s.src, sq: s.sq, set: s.set }))),
  __GALLERY__: gallery,
  __USES__: uses(),
  __RIPMASK__: RIP.mask,
  __RIPEDGE__: RIP.edge,
  __RIPASPECT__: RIP.aspect,
  __CTRLBAR__: ctrlbar(),
  __COMPARE__: compare({ scene: (scenes.find(s => s.src.endsWith("scenery/meadow.svg")) ?? scenes[0]).src, needs: pixel("▶ YOUR TURN", { px: 3, label: "Your turn" }), qbadge: badge("?", "Question"), todobadge: badge("☐", "To do"), stopped: pixel("■ STOPPED", { px: 3, label: "Stopped" }) }),
  __COUNT__: String(scenes.length),
}
let html = fs.readFileSync(path.join(here, "template.html"), "utf8")
for (const [k, v] of Object.entries(map)) html = html.split(k).join(v)
const left = html.match(/__[A-Z_]+__/)
if (left) throw new Error(`build: ${left[0]} was not replaced`)
fs.writeFileSync(path.join(site, "index.html"), html)
console.log(`built site/index.html (${html.length} bytes), ${scenes.length} scenes, textless ${plugin.version}`)

// The marketplace page lists scenes live from the market Worker (market/worker). The build only says where that
// Worker is and which Turnstile site key to use; both default to local development: `npm run dev` in market/worker
// and Cloudflare's always-pass test key. Set MARKET_API and TURNSTILE_SITEKEY when building for the real site.
const market = path.join(site, "market")
fs.rmSync(market, { recursive: true, force: true })
fs.mkdirSync(market, { recursive: true })
const style = html.match(/<style>[\s\S]*?<\/style>/)[0]
let page = fs.readFileSync(path.join(here, "market.html"), "utf8")
// The built-in sets, shown first on the marketplace: what every textless install already has.
const builtin = Object.entries(scenes.reduce((m, s) => ((m[s.dir] ??= []).push(s), m), {})).map(([dir, list]) => {
  const label = list[0].set, cmd = `/textless set ${dir === "clawd" ? "clawd" : dir}`
  return `<li><div class="bi-art">${list.slice(0, 5).map(s => `<img src="../${s.src}" alt="${s.name}" loading="lazy">`).join("")}</div><div class="bi-info"><h3>${label}</h3><span class="by">${list.length} scenes · by textless</span><div class="acts"><button type="button" class="use" data-cmd="${cmd}">Use this set</button></div></div></li>`
}).join("")
const mmap = { __BUILTIN__: builtin, __PREVIEW__: preview(), __STYLE__: style, __ICON__: map.__ICON__, __LOGO__: map.__LOGO__, __API__: process.env.MARKET_API || "http://127.0.0.1:8788", __SITEKEY__: process.env.TURNSTILE_SITEKEY || "1x00000000000000000000AA" }
for (const [k, v] of Object.entries(mmap)) page = page.split(k).join(v)
const mleft = page.match(/__[A-Z_]+__/)
if (mleft) throw new Error(`build: ${mleft[0]} was not replaced in market.html`)
fs.writeFileSync(path.join(market, "index.html"), page)
console.log(`built site/market/index.html, listing from ${mmap.__API__}`)

// The settings page: the ⚙ in the plugin opens it with the computer's key in the hash. It saves to the same market
// Worker; the scenes are the plugin's own, so a picked id is a file the plugin has.
const settingsDir = path.join(site, "settings")
fs.rmSync(settingsDir, { recursive: true, force: true })
fs.mkdirSync(settingsDir, { recursive: true })
const setIds = [...new Set(scenes.map(s => s.dir))].sort((a, b) => (a === "clawd" ? -1 : b === "clawd" ? 1 : 0))
const settingsSets = [...setIds.map(id => ({ id, name: scenes.find(s => s.dir === id).set, ...(INTERACTIVE.includes(id) ? { interactive: true } : {}) })), { id: "yours", name: "Your own" }]
let spage = fs.readFileSync(path.join(here, "settings.html"), "utf8")
const smap = {
  __STYLE__: style, __ICON__: map.__ICON__, __LOGO__: map.__LOGO__, __API__: mmap.__API__,
  __SCENES__: JSON.stringify(scenes.map(s => ({ id: s.id, dir: s.dir, name: s.name, src: `../${s.src}` }))),
  __SETS__: JSON.stringify(settingsSets),
}
for (const [k, v] of Object.entries(smap)) spage = spage.split(k).join(v)
const sleft = spage.match(/__[A-Z_]+__/)
if (sleft) throw new Error(`build: ${sleft[0]} was not replaced in settings.html`)
fs.writeFileSync(path.join(settingsDir, "index.html"), spage)
console.log(`built site/settings/index.html, ${settingsSets.length} sets, saving to ${smap.__API__}`)

// What's new: plugin/public.json, newest first. It holds only published versions (scripts/publish.sh writes it), the
// same list the update card in the chat reads. The latest 10 show; the rest wait behind "Show all".
const wesc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const releases = JSON.parse(fs.readFileSync(path.join(repo, "plugin", "public.json"), "utf8")).filter(r => r.public)
const relMark = logo(20, true).replace("<svg ", '<svg class="mark" aria-hidden="true" ').split(ORANGE).join("currentColor")
const relLines = d => [].concat(d || []).filter(Boolean)
const relRow = r => `<li>${relMark}<b class="v">${wesc(r.version)}</b><span class="n">${wesc(r.note)}</span><time datetime="${wesc(r.date)}">${wesc(r.date)}</time>${relLines(r.detail).length ? `<div class="d">${relLines(r.detail).map(t => `<p>${wesc(t)}</p>`).join("")}</div>` : ""}</li>`
const news = `<ol class="rel">${releases.slice(0, 10).map(relRow).join("")}</ol>` + (releases.length > 10 ? `<details class="more"><summary>Show all</summary><ol class="rel">${releases.slice(10).map(relRow).join("")}</ol></details>` : "")
const whatsDir = path.join(site, "whats-new")
fs.mkdirSync(whatsDir, { recursive: true })
let wpage = fs.readFileSync(path.join(here, "whats-new.html"), "utf8")
for (const [k, v] of Object.entries({ __STYLE__: style, __ICON__: map.__ICON__, __LOGO__: map.__LOGO__, __WHATSNEW__: news })) wpage = wpage.split(k).join(v)
const wleft = wpage.match(/__[A-Z_]+__/)
if (wleft) throw new Error(`build: ${wleft[0]} was not replaced in whats-new.html`)
fs.writeFileSync(path.join(whatsDir, "index.html"), wpage)
console.log(`built site/whats-new/index.html, ${releases.length} releases`)

// Every inline script of every built page must parse: one stray quote broke the whole settings page once.
for (const rel of ["index.html", "market/index.html", "settings/index.html", "whats-new/index.html"]) {
  const file = path.join(site, rel)
  if (!fs.existsSync(file)) continue
  const html = fs.readFileSync(file, "utf8")
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?!text\/javascript)[^"]*")[^>]*>([\s\S]*?)<\/script>/g)) {
    try { new Function(m[1]) } catch (err) { throw new Error(`build: an inline script in ${rel} does not parse: ${err.message}`) }
  }
}
