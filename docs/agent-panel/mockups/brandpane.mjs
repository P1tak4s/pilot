// Third sketch, after Isac: the whole pane is the effortless brand background (dark ground, violet light rising from
// a corner, slanted light streaks, four-point sparkles, grain, the mark), slowly moving, its mood set by what the
// chat's agents are doing. Each agent is one bright sparkle in the field, coloured by its state, named in small type.
// The only other words: one big line saying what is going on, one small line under it. Everything else on a press.
//   node brandpane.mjs  ->  trees/brand-{idle,working,waiting,done}.json (render as in README.md)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MARK = readFileSync(join(HERE, '..', '..', '..', 'brand', 'mark.svg'), 'utf8').trim()
const W = 384, H = 840
const font = "anthropic-sans,system-ui,'Segoe UI',sans-serif"
const C = { ground: '#18171c', text: '#ecebf2', dim: '#9a97a8', accent: '#a79cf7', done: '#7fe0a4', wait: '#e0a33a', red: '#e5534b' }

const node = (type, props = {}, ...children) => ({ type, props, children: children.flat().filter(Boolean) })
const Box = (props, ...kids) => node('Box', props, ...kids)
const Svg = (source, alt, width, height) => node('Svg', { source, alt, width, height })

// Each mood: the wash colours (light at the corner, mid, the far tint), how lively the field is, the words.
const MOODS = {
  idle: { light: '#6e62c9', mid: '#3a3270', tint: null, life: 0.35, title: 'Quiet', line: 'No agents running' },
  working: { light: '#8f80f0', mid: '#4a3f99', tint: null, life: 1, title: '3 working', line: 'Explore is halfway' },
  waiting: { light: '#8f80f0', mid: '#4a3f99', tint: C.wait, life: 0.7, title: '1 waiting', line: 'code-reviewer on npm test, 0:38' },
  done: { light: '#6fc9a0', mid: '#2f6b55', tint: null, life: 0.45, title: 'All done', line: '6 agents reported back' },
}
// The agents of each mood: where they float, their state.
const AGENTS = {
  idle: [],
  working: [
    { name: 'Explore', state: 'running', x: 108, y: 300, p: 0.5 },
    { name: 'code-reviewer', state: 'running', x: 262, y: 360, p: 0.6 },
    { name: 'Plan', state: 'running', x: 150, y: 470, p: 0.2 },
    { name: 'general-purpose', state: 'done', x: 286, y: 520 },
  ],
  waiting: [
    { name: 'Explore', state: 'running', x: 108, y: 300, p: 0.75 },
    { name: 'code-reviewer', state: 'waiting', x: 262, y: 360, p: 0.6 },
    { name: 'general-purpose', state: 'done', x: 286, y: 520 },
    { name: 'Plan', state: 'done', x: 130, y: 500 },
  ],
  done: [
    { name: 'Explore', state: 'done', x: 108, y: 300 },
    { name: 'code-reviewer', state: 'done', x: 262, y: 360 },
    { name: 'Plan', state: 'done', x: 150, y: 470 },
    { name: 'general-purpose', state: 'done', x: 286, y: 520 },
  ],
}
const tone = { running: C.accent, waiting: C.wait, done: C.done, failed: C.red }

/** A four-point sparkle, the brand's: the star path at a size. */
const star = (x, y, r, fill, extra = '') =>
  `<path transform="translate(${x} ${y}) scale(${(r / 17).toFixed(3)})" d="M0 -17 C1.5 -5 5 -1.5 17 0 C5 1.5 1.5 5 0 17 C-1.5 5 -5 1.5 -17 0 C-5 -1.5 -1.5 -5 0 -17Z" fill="${fill}" ${extra}/>`

// A fixed scatter, so the four moods share one sky.
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const SKY = Array.from({ length: 46 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1.6 + rnd() * 3.4, d: rnd() * 6, t: 3 + rnd() * 4 }))

function field(mood) {
  const m = MOODS[mood], agents = AGENTS[mood]
  const lit = SKY.filter((_, i) => i < 14 + m.life * 32)
  const streaks = [0, 1, 2, 3, 4].map(i => {
    const x = 120 + i * 70, w = 16 + (i % 3) * 14
    return `<polygon class="st" style="animation-delay:-${i * 3}s" points="${x},${H} ${x + w},${H} ${x + w + 260},0 ${x + 260},0" fill="#fff" fill-opacity="${0.025 + (i % 2) * 0.02}"/>`
  })
  const sparkles = lit.map(s => star(s.x.toFixed(1), s.y.toFixed(1), s.r, '#fff', `class="tw" style="animation-delay:-${s.d.toFixed(1)}s;animation-duration:${(s.t / Math.max(m.life, 0.4)).toFixed(1)}s"`))
  const mark = MARK.replace('<svg ', `<svg x="${W - 250}" y="${H - 250}" width="330" height="330" opacity=".22" `)

  const agentArt = agents.map((a, i) => {
    const c = tone[a.state], parts = []
    if (a.state === 'running' || a.state === 'waiting') {
      parts.push(`<circle cx="${a.x}" cy="${a.y}" r="34" fill="url(#halo-${a.state})" class="${a.state === 'waiting' ? 'pl' : 'br'}" style="animation-delay:-${i}s"/>`)
      // Progress: a fine ring that fills, the same idea as the bar's context ring.
      const circ = 2 * Math.PI * 20
      parts.push(`<circle cx="${a.x}" cy="${a.y}" r="20" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/>`,
        `<circle cx="${a.x}" cy="${a.y}" r="20" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="${(circ * a.p).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${a.x} ${a.y})"/>`)
      parts.push(`<g class="spin" style="transform-origin:${a.x}px ${a.y}px;animation-delay:-${i * 2}s">${star(a.x, a.y, 11, c)}</g>`)
    } else {
      parts.push(`<circle cx="${a.x}" cy="${a.y}" r="16" fill="url(#halo-done)" opacity=".7"/>`, star(a.x, a.y, 7, c, 'opacity=".9"'))
    }
    parts.push(`<text x="${a.x}" y="${a.y + (a.state === 'done' ? 22 : 36)}" text-anchor="middle" class="n${a.state === 'done' ? ' d' : ''}">${a.name}</text>`)
    return parts.join('')
  })

  const tint = m.tint
    ? `<radialGradient id="tint" cx="0" cy="${H}" r="${H * 0.8}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${m.tint}" stop-opacity=".5"/><stop offset="1" stop-color="${m.tint}" stop-opacity="0"/></radialGradient>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<radialGradient id="wash" cx="${W}" cy="${H}" r="${H * 1.05}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${m.light}" stop-opacity=".95"/><stop offset=".45" stop-color="${m.mid}" stop-opacity=".55"/><stop offset="1" stop-color="${m.mid}" stop-opacity="0"/></radialGradient>
${tint}
<radialGradient id="halo-running"><stop offset="0" stop-color="${C.accent}" stop-opacity=".45"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
<radialGradient id="halo-waiting"><stop offset="0" stop-color="${C.wait}" stop-opacity=".5"/><stop offset="1" stop-color="${C.wait}" stop-opacity="0"/></radialGradient>
<radialGradient id="halo-done"><stop offset="0" stop-color="${C.done}" stop-opacity=".35"/><stop offset="1" stop-color="${C.done}" stop-opacity="0"/></radialGradient>
<pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".05"/></pattern>
</defs>
<style>
.big{font:600 34px ${font};fill:${C.text};letter-spacing:-.5px}
.sub{font:14px ${font};fill:${C.dim}}.sub.w{fill:${C.wait}}
.lab{font:600 11px ${font};fill:${C.dim};letter-spacing:1.4px}
.n{font:600 12px ${font};fill:${C.text}}.n.d{font-weight:400;fill:${C.dim}}
.wash{animation:wb ${(9 / Math.max(m.life, 0.4)).toFixed(1)}s ease-in-out infinite}@keyframes wb{0%,100%{opacity:.82}50%{opacity:1}}
.st{animation:st 24s linear infinite}@keyframes st{from{transform:translateX(-60px)}to{transform:translateX(60px)}}
.tw{opacity:.15;animation:tw 4s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.12}50%{opacity:.85}}
.br{animation:br 3s ease-in-out infinite}@keyframes br{0%,100%{opacity:.55}50%{opacity:1}}
.pl{animation:pl 1.6s ease-in-out infinite}@keyframes pl{0%,100%{opacity:.35}50%{opacity:1}}
.spin{animation:sp 9s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
</style>
<rect width="${W}" height="${H}" fill="${C.ground}"/>
<rect class="wash" width="${W}" height="${H}" fill="url(#wash)"/>
${tint ? `<rect class="pl" width="${W}" height="${H}" fill="url(#tint)"/>` : ''}
<g>${streaks.join('')}</g>
<g>${sparkles.join('')}</g>
${mark}
<rect width="${W}" height="${H}" fill="url(#grain)"/>
<text x="24" y="44" class="lab">BUILD AGENT PANEL</text>
<text x="24" y="96" class="big">${m.title}</text>
<text x="24" y="122" class="sub${m.tint ? ' w' : ''}">${m.line}</text>
${agentArt.join('\n')}
</svg>`
}

const pane = mood => Box({ key: `brand-${mood}`, flexDirection: 'column' }, Svg(field(mood), `${MOODS[mood].title}: ${MOODS[mood].line}`, W, H))

mkdirSync(join(HERE, 'trees'), { recursive: true })
for (const mood of Object.keys(MOODS)) {
  writeFileSync(join(HERE, 'trees', `brand-${mood}.json`), JSON.stringify(pane(mood), null, 1))
  console.log(`trees/brand-${mood}.json`)
}
