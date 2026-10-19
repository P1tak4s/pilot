import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const repo = fileURLToPath(new URL('../../', import.meta.url))
const src = fs.readFileSync(repo + '/hooks/register.tsx', 'utf8')
const grab = n => { const m = src.match(new RegExp('const ' + n + ' = `([^`]*)`')); if (!m) throw Error(n); return m[1] }
const uri = s => 'data:image/svg+xml,' + encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')
// ringSvg(72, BOG), as the plugin builds it
const c = 2 * Math.PI * 6, p = 72
const ring = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="#a7c98f" stroke-opacity=".25" stroke-width="2.2"/><circle cx="8" cy="8" r="6" fill="none" stroke="#a7c98f" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${((c * p) / 100).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)"/></svg>`
// The brand mark (brand/mark.svg). Every copy on the page gets its own mask and clip ids.
const markSvg = fs.readFileSync(repo + '/brand/mark.svg', 'utf8'), markInner = markSvg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')
let marks = 0
const mark = () => { const id = 'mk' + (marks++); return '<svg class="spark" viewBox="0 0 100 100" aria-hidden="true">' + markInner.split('em').join(id) + '</svg>' }
const favicon = fs.readFileSync(repo + '/brand/favicon.svg', 'utf8')
const github = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>'

// The hero: BRAND_SVG's own pieces (gradient, glow, light streaks, sparkles, fade), laid out for a wide card.
const sp = [[470,70,5,4.2,.3],[520,300,4,5.1,2.1],[560,150,3,3.8,1.2],[600,345,6,4.6,3.4],[640,60,4,5.4,.9],[690,250,5,4,2.7],[720,120,3,4.8,1.8],[760,330,7,5.8,4],[800,40,5,4.4,3],[830,200,9,3.6,.1],[860,300,4,4.9,1.5],[880,110,6,5.2,2.4],[910,360,5,4.1,.6],[935,60,8,4.7,3.7],[960,250,6,5.5,1.1],[985,150,4,3.9,2.9],[540,220,3,6,4.4],[740,190,4,5,.4],[905,230,3,4.3,3.2],[620,210,3,5.6,2.2]]
const still = [[505,110,4,.35],[585,280,3,.3],[655,140,5,.45],[705,370,4,.4],[775,90,6,.55],[815,270,4,.5],[845,150,3,.45],[895,300,6,.6],[925,190,4,.55],[950,95,3,.5],[975,330,5,.6],[640,330,3,.3],[870,40,4,.5]]
const star4 = (x, y, s) => { const i = s * .21; return `M${x} ${y-s} L${x+i} ${y-i} L${x+s} ${y} L${x+i} ${y+i} L${x} ${y+s} L${x-i} ${y+i} L${x-s} ${y} L${x-i} ${y-i} Z` }
const streaks = [[600,38,.04],[680,14,.05],[770,46,.05],[880,18,.04],[960,36,.05],[1040,14,.04]].map(([x,w,o]) => `<line x1="${x-70}" y1="420" x2="${x+70}" y2="-20" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}"/>`).join("")
const heroArt = `<svg class="stars" viewBox="0 0 1000 600" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><style>.h-sp{fill:#fff;opacity:0;transform-box:fill-box;transform-origin:center;animation:h-gl 4s ease-in-out infinite}@keyframes h-gl{0%,50%,100%{opacity:0;transform:scale(0) rotate(0deg)}70%{opacity:.95;transform:scale(1) rotate(30deg)}90%{opacity:0;transform:scale(.2) rotate(60deg)}}</style>${sp.map(([x,y,s,d,dl]) => `<path class="h-sp" style="animation-duration:${d}s;animation-delay:${dl}s" d="${star4(x,y*1.5,s*1.1)}"/>`).join("")}${still.map(([x,y,s,o]) => `<path fill="#fff" fill-opacity="${o}" d="${star4(x,y*1.5,s)}"/>`).join("")}</svg>`
// What's new: public.json at the repo root, newest first. It holds only published versions (tools/publish.sh writes
// it); releases.json also lists dev versions users never get. The latest 10 show; the rest wait behind "Show all".
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const releases = JSON.parse(fs.readFileSync(repo + "/public.json", "utf8")).filter(r => r.public)
// A release may carry `detail`: one line or a list of lines saying what changed. They show under the headline.
const lines = d => [].concat(d || []).filter(Boolean)
const row = r => `<li>__SPARK__<b class="v">${esc(r.version)}</b><span class="n">${esc(r.note)}</span><time datetime="${esc(r.date)}">${esc(r.date)}</time>${lines(r.detail).length ? `<div class="d">${lines(r.detail).map(t => `<p>${esc(t)}</p>`).join("")}</div>` : ""}</li>`
const news = `<ol class="rel">${releases.slice(0, 10).map(row).join("")}</ol>` + (releases.length > 10 ? `<details class="more"><summary>Show all</summary><ol class="rel">${releases.slice(10).map(row).join("")}</ol></details>` : "")
// The star count, read once at build time so the page never calls the GitHub API (it is rate limited per visitor IP).
// gh is signed in and allowed far more calls; without it the plain API is tried. No count, or zero, shows no badge.
let stars = 0
try { stars = Number(execSync('gh api repos/HeyCubit/effortless --jq .stargazers_count', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) || 0 } catch {
  try { const r = await fetch('https://api.github.com/repos/HeyCubit/effortless'); if (r.ok) stars = (await r.json()).stargazers_count || 0 } catch {}
}
const starsBadge = stars > 0 ? `<span class="stars">${stars >= 1000 ? (stars / 1000).toFixed(1) + 'k' : stars}</span>` : ''
// The two ways in, side by side in the install section and the install popover. Left, Claude's: one button copies a
// request Claude Code runs for you. Right: one button copies the terminal line (joined with ; so it also runs in
// PowerShell 5). The line shows under its button, so people see what they paste.
const copyIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 10.5V4a1.5 1.5 0 011.5-1.5H11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
const termIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="1.5" y="3" width="17" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2.5 2-2.5 2M10 12.5h4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ask = 'Install the effortless plugin for me: run `claude plugin marketplace add HeyCubit/effortless` and then `claude plugin install effortless@effortless`. When both succeed, tell me to run /reload-plugins.'
const term = 'claude plugin marketplace add HeyCubit/effortless; claude plugin install effortless@effortless'
// effortless follows one chat; split view breaks it. Said before the two ways in, in the section and the popover.
const soloIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v16" stroke="currentColor" stroke-width="1.6"/><path d="M4 21L20 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
const solo = `<p class="solo">${soloIcon}<span><b>One chat at a time.</b>This is a Claude Code limitation: in split view, mods like effortless only show in the left pane. Put the chat you want effortless in on the left.</span></p>`
const install = solo + '<div class="ways">'
  + `<div class="way way-claude"><p class="way-k"><img src="__CLAUDE_ORANGE__" alt="" width="20" height="20">Ask Claude</p><p class="way-t">Claude installs it for you.</p><button type="button" class="big claude" data-copy="${ask}" aria-label="Copy the install request for Claude"><img src="__CLAUDE_DARK__" alt="" width="20" height="20"><span>Copy for Claude</span></button><p class="way-h">Paste into Claude Code, press Enter.</p></div>`
  + `<div class="way way-cmd"><p class="way-k">${termIcon}Terminal</p><p class="way-t">Run one command.</p><button type="button" class="big term" data-copy="${term}" aria-label="Copy the install command">${copyIcon}<span>Copy command</span></button><p class="way-h"><code>${term}</code></p></div>`
  + '</div><p class="then">Then run <code>/reload-plugins</code> in Claude Code.</p>'
// The opening's background: the dot grid, with one soft light drifting across it (see .dots in template.html).
const waves = () => '<div class="dots" aria-hidden="true"><i class="lit a"></i><i class="lit b"></i></div>'
const map = {
  __INSTALL__: install,
  __WAVES__: waves(),
  __STARS_BADGE__: starsBadge,
  __STARS__: heroArt, 
  __ART_BRAND__: uri(grab('BRAND_SVG')), __ART_FROST__: uri(grab('FROST_SVG')), __ART_SWAMP__: uri(grab('SWAMP_SVG')),
  __ART_EMBER__: uri(grab('EMBER_SVG')), __ART_DOWN__: uri(grab('DOWN_SVG')),
  __TYPESAFE__: uri(grab('TYPESAFE_MARK')), __TYPESAFE_VIOLET__: uri(grab('TYPESAFE_MARK').replace(/#ffffff/gi, '#ff8fd6').replace(/<style>/, '<style>path{fill:#ff8fd6}')), __CLAUDE__: uri(grab('CLAUDE_MARK')), __CLAUDE_ORANGE__: uri(grab('CLAUDE_MARK').replace(/#ffffff/g, '#d97757')), __CLAUDE_DARK__: uri(grab('CLAUDE_MARK').replace(/#ffffff/g, '#1f1009')), __RING__: uri(ring),
  __ICON__: uri(favicon), __GITHUB__: github,
}
let out = fs.readFileSync(new URL('./template.html', import.meta.url), 'utf8')
out = out.replace(/__SPARK__/g, mark)
for (const [k, v] of Object.entries(map)) out = out.split(k).join(v)
if (/__[A-Z_]+__/.test(out)) throw Error('left: ' + out.match(/__[A-Z_]+__/)[0])
fs.mkdirSync(repo + '/site', { recursive: true })
fs.writeFileSync(repo + '/site/index.html', out)
// The link-preview card, served from the site so every share shows it.
fs.copyFileSync(repo + '/brand/social-preview.png', repo + '/site/og.png')
// What's new has its own page, at whats-new/. The main page forwards old #whats-new links there.
let page = fs.readFileSync(new URL('./whats-new.html', import.meta.url), 'utf8').split('__WHATSNEW__').join(news).replace(/__SPARK__/g, mark).split('__ICON__').join(map.__ICON__)
if (/__[A-Z_]+__/.test(page)) throw Error('left: ' + page.match(/__[A-Z_]+__/)[0])
fs.mkdirSync(repo + '/site/whats-new', { recursive: true })
fs.writeFileSync(repo + '/site/whats-new/index.html', page)
// Report a bug, at report/: the mod's Settings link lands here. It opens a prefilled GitHub issue; no backend.
let report = fs.readFileSync(new URL('./report.html', import.meta.url), 'utf8').replace(/__SPARK__/g, mark).split('__ICON__').join(map.__ICON__).split('__GITHUB__').join(map.__GITHUB__).split('__LATEST__').join(releases.length ? 'e.g. ' + releases[0].version : 'e.g. 1.36.0')
if (/__[A-Z_]+__/.test(report)) throw Error('left: ' + report.match(/__[A-Z_]+__/)[0])
fs.mkdirSync(repo + '/site/report', { recursive: true })
fs.writeFileSync(repo + '/site/report/index.html', report)
// Benchmarks, at bench/: the numbers from bench/RESULTS.md as charts and tables, limits included.
let bench = fs.readFileSync(new URL('./bench.html', import.meta.url), 'utf8').replace(/__SPARK__/g, mark).split('__ICON__').join(map.__ICON__)
if (/__[A-Z_]+__/.test(bench)) throw Error('left: ' + bench.match(/__[A-Z_]+__/)[0])
fs.mkdirSync(repo + '/site/bench', { recursive: true })
fs.writeFileSync(repo + '/site/bench/index.html', bench)
console.log('bytes', out.length)
