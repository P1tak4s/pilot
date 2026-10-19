// Proposal sketch: the agent panel as a live project hub. Top: the project's chats, the hub chat large and the one
// you are in marked. Below: this chat as a core with each subagent on a branch out of it, coloured by model, ringed by
// its progress (its own task list, done of total), a finished agent sending a light back along its branch. One Svg
// fills the pane, one line per agent below it. `node hub.mjs` writes trees/hub.json (render as in README.md).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const C = {
  bg: '#141416', edge: '#2a2a2f', text: '#d4d4d8', dim: '#8b8b93', faint: '#2c2c33',
  accent: '#a79cf7', done: '#7fe0a4', wait: '#e0a33a', red: '#e5534b',
}
// Model colours fill the node. State and progress are the ring around it.
const MODEL = { Haiku: '#5fd0c0', Sonnet: '#7aa7ff', Opus: '#a79cf7', Fable: '#f2a6d4' }

const node = (type, props = {}, ...children) => ({ type, props, children: children.flat().filter(Boolean) })
const Box = (props, ...kids) => node('Box', props, ...kids)
const Text = (props, text) => node('Text', props, text)
const Svg = (source, alt, width, height) => node('Svg', { source, alt, width, height })
const grow = () => Box({ flexGrow: 1, minWidth: 1 })

const W = 384, H = 520
const font = "system-ui,'Segoe UI',sans-serif"

// --- The project's chats -----------------------------------------------------------------------------------------
const chats = [
  { title: 'Build agent panel', hub: true, here: true, agents: 6, progress: 0.55 },
  { title: 'Settings polish', agents: 0, progress: 1 },
  { title: 'Site redesign', agents: 2, progress: 0.3 },
]

function chatStrip() {
  const y = 44, xs = [70, 196, 316]
  const parts = [`<text x="14" y="18" class="h">PROJECT</text><text x="72" y="18" class="t">effortless</text><text x="${W - 14}" y="18" text-anchor="end" class="s">3 chats  8 agents</text>`]
  parts.push(`<path d="M${xs[0]} ${y} L${xs[2]} ${y}" stroke="${C.edge}" stroke-width="1.4"/>`)
  chats.forEach((c, i) => {
    const x = xs[i], r = c.hub ? 13 : 9, circ = 2 * Math.PI * (r + 4)
    if (c.here) parts.push(`<circle cx="${x}" cy="${y}" r="${r + 10}" fill="${C.accent}" opacity=".14" class="breathe"/>`)
    parts.push(`<circle cx="${x}" cy="${y}" r="${r + 4}" fill="none" stroke="${C.text}" stroke-opacity=".12" stroke-width="2.2"/>`,
      `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="none" stroke="${c.progress === 1 ? C.done : C.accent}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${(circ * c.progress).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${x} ${y})"/>`,
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.hub ? 'url(#core)' : '#2a2640'}"/>`)
    if (c.hub) parts.push(star(x, y, 0.45))
    else if (c.agents) parts.push(`<text x="${x}" y="${y + 3.5}" text-anchor="middle" class="n">${c.agents}</text>`)
    parts.push(`<text x="${x}" y="${y + r + 18}" text-anchor="middle" class="${c.here ? 't' : 's'}">${c.title}</text>`)
    if (c.here) parts.push(`<text x="${x}" y="${y + r + 31}" text-anchor="middle" class="s" fill="${C.accent}">you are here · hub</text>`)
    else if (c.progress === 1) parts.push(`<text x="${x}" y="${y + r + 31}" text-anchor="middle" class="s" fill="${C.done}">done</text>`)
    else parts.push(`<text x="${x}" y="${y + r + 31}" text-anchor="middle" class="s">${c.agents} agents running</text>`)
  })
  parts.push(`<line x1="14" x2="${W - 14}" y1="112" y2="112" stroke="${C.edge}"/>`)
  return parts.join('')
}

// --- This chat's agents --------------------------------------------------------------------------------------------
const core = { x: 192, y: 300 }
const agents = [
  { id: 1, type: 'Explore', task: 'find the pane hooks', model: 'Haiku', effort: 'Low', state: 'running', steps: [2, 4], time: '1:43', x: 76, y: 196 },
  { id: 2, type: 'code-reviewer', task: 'review the branch', model: 'Opus', effort: 'High', state: 'waiting', steps: [3, 5], time: '4:11', x: 306, y: 200, now: 'npm test 0:38' },
  { id: 3, type: 'general-purpose', task: 'add panel state', model: 'Sonnet', effort: 'Medium', state: 'done', steps: [6, 6], time: '3:12', x: 78, y: 396 },
  { id: 6, parent: 3, type: 'Explore', task: 'read the tests', model: 'Haiku', effort: 'Low', state: 'done', steps: [1, 1], time: '0:40', x: 156, y: 478, small: true },
  { id: 4, type: 'Plan', task: 'release notes', state: 'picking', x: 314, y: 404 },
  { id: 5, type: 'Explore', task: 'dead links', model: 'Haiku', effort: 'Low', state: 'failed', time: '0:21', x: 262, y: 478, small: true },
]
const radius = a => (a.small ? 10 : 15)
const at = id => (id ? agents.find(a => a.id === id) : core)
const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -17 C1.5 -5 5 -1.5 17 0 C5 1.5 1.5 5 0 17 C-1.5 5 -5 1.5 -17 0 C-5 -1.5 -1.5 -5 0 -17Z" fill="#fff" fill-opacity=".92"/>`

function branch(a) {
  const from = at(a.parent)
  const cx = (from.x + a.x) / 2 + (a.y - from.y) * 0.16, cy = (from.y + a.y) / 2 - (a.x - from.x) * 0.16
  const q = `Q${cx.toFixed(1)} ${cy.toFixed(1)}`
  const out = `M${from.x} ${from.y} ${q} ${a.x} ${a.y}`, back = `M${a.x} ${a.y} ${q} ${from.x} ${from.y}`
  switch (a.state) {
    case 'running': return `<path d="${out}" fill="none" stroke="${MODEL[a.model]}" stroke-opacity=".8" stroke-width="1.8" stroke-dasharray="3 6" class="flow"/>`
    case 'waiting': return `<path d="${out}" fill="none" stroke="${C.wait}" stroke-opacity=".55" stroke-width="1.8" stroke-dasharray="3 6"/>`
    case 'done': return `<path d="${out}" fill="none" stroke="${C.done}" stroke-opacity=".35" stroke-width="1.5"/><circle r="3.4" fill="${C.done}" filter="url(#glow)"><animateMotion dur="2.6s" repeatCount="indefinite" path="${back}" keyPoints="0;1;1" keyTimes="0;.55;1" calcMode="linear"/></circle>`
    case 'failed': return `<path d="${out}" fill="none" stroke="${C.red}" stroke-opacity=".3" stroke-width="1.2" stroke-dasharray="2 4"/>`
    default: return `<path d="${out}" fill="none" stroke="${C.dim}" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="1 5"/>`
  }
}

function agentNode(a) {
  const r = radius(a), body = a.model ? MODEL[a.model] : C.dim, s = a.state, ring = r + 5, circ = 2 * Math.PI * ring
  const p = []
  const ringColor = { running: C.accent, waiting: C.wait, done: C.done, failed: C.red, picking: C.accent }[s]
  if (s === 'running') p.push(`<circle cx="${a.x}" cy="${a.y}" r="${r + 12}" fill="${body}" opacity=".12" class="breathe"/>`)
  // Progress: done of total steps in the agent's own task list, as an arc; the rest a faint track.
  p.push(`<circle cx="${a.x}" cy="${a.y}" r="${ring}" fill="none" stroke="${C.text}" stroke-opacity=".1" stroke-width="2.6"/>`)
  if (a.steps) p.push(`<circle cx="${a.x}" cy="${a.y}" r="${ring}" fill="none" stroke="${ringColor}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${(circ * a.steps[0] / a.steps[1]).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${a.x} ${a.y})"${s === 'waiting' ? ' class="pulse"' : ''}/>`)
  if (s === 'picking') p.push(`<circle cx="${a.x}" cy="${a.y}" r="${ring}" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-dasharray="2.5 3.5" class="spin" style="transform-origin:${a.x}px ${a.y}px"/>`)
  if (s === 'failed') p.push(`<circle cx="${a.x}" cy="${a.y}" r="${ring}" fill="none" stroke="${C.red}" stroke-width="1.6" stroke-opacity=".8"/>`)
  p.push(`<circle cx="${a.x}" cy="${a.y}" r="${r}" fill="url(#g-${a.model ?? 'none'})" opacity="${s === 'failed' ? 0.25 : s === 'picking' ? 0.18 : 0.92}"/>`)
  if (s === 'done') p.push(`<path d="M${a.x - 5} ${a.y} l3.6 3.6 l6.6 -7" fill="none" stroke="#0f1c15" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`)
  if (s === 'failed') p.push(`<path d="M${a.x - 4} ${a.y - 4} l8 8 M${a.x + 4} ${a.y - 4} l-8 8" stroke="${C.red}" stroke-width="2" stroke-linecap="round"/>`)
  if (s === 'picking') p.push(...[0, 1, 2].map(i => `<circle cx="${a.x - 6 + i * 6}" cy="${a.y}" r="1.8" fill="${C.accent}" class="dot" style="animation-delay:${i * 0.2}s"/>`))
  if ((s === 'running' || s === 'waiting') && a.steps) p.push(`<text x="${a.x}" y="${a.y + 4}" text-anchor="middle" class="n">${a.steps[0]}/${a.steps[1]}</text>`)
  if (a.small) return p.join('')
  // Label above the upper nodes, below the lower ones: type, then the pick and the time.
  const above = a.y < core.y
  const ly = above ? a.y - ring - 22 : a.y + ring + 16
  p.push(`<text x="${a.x}" y="${ly}" text-anchor="middle" class="t${s === 'failed' ? ' gone' : ''}">${a.type}</text>`)
  const sub = s === 'picking' ? `<tspan fill="${C.accent}">picking a model</tspan>`
    : s === 'waiting' ? `<tspan fill="${C.wait}">${a.now}</tspan>`
    : `<tspan fill="${body}" font-weight="600">${a.model} ${a.effort}</tspan><tspan fill="${C.dim}">  ${a.time}</tspan>`
  p.push(`<text x="${a.x}" y="${ly + 14}" text-anchor="middle" class="s">${sub}</text>`)
  return p.join('')
}

function hubSvg() {
  const grads = Object.entries({ ...MODEL, none: C.dim }).map(([m, c]) =>
    `<radialGradient id="g-${m}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".55"/></radialGradient>`).join('')
  const dots = []
  for (let y = 124; y < H; y += 22) for (let x = 12; x < W; x += 22) dots.push(`<circle cx="${x}" cy="${y}" r=".8"/>`)
  const cr = 40, circ = 2 * Math.PI * cr, overall = 0.55
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${grads}
<radialGradient id="core" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e9e4ff"/><stop offset=".4" stop-color="${C.accent}"/><stop offset="1" stop-color="#4a3f80"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="${C.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<style>
.h{font:600 10px ${font};letter-spacing:1.2px;fill:${C.dim}}
.t{font:600 12px ${font};fill:${C.text}}.t.gone{fill:${C.dim}}
.s{font:10.5px ${font};fill:${C.dim}}
.n{font:600 10px ${font};fill:#fff}
.flow{animation:flow 1s linear infinite}@keyframes flow{to{stroke-dashoffset:-9}}
.spin{animation:spin 1.4s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.pulse{animation:pulse 1.6s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
.breathe,.halo{animation:br 3s ease-in-out infinite}@keyframes br{0%,100%{opacity:.5}50%{opacity:1}}
.dot{animation:d 1.2s ease-in-out infinite;opacity:.25}@keyframes d{0%,60%,100%{opacity:.25}30%{opacity:1}}
</style>
${chatStrip()}
<g fill="${C.faint}">${dots.join('')}</g>
<text x="14" y="134" class="h">THIS CHAT</text><text x="${W - 14}" y="134" text-anchor="end" class="s">6 agents  514k tokens</text>
<circle cx="${core.x}" cy="${core.y}" r="132" fill="none" stroke="${C.edge}" stroke-dasharray="2 5"/>
${agents.map(branch).join('\n')}
<circle cx="${core.x}" cy="${core.y}" r="74" fill="url(#halo)" class="halo"/>
<circle cx="${core.x}" cy="${core.y}" r="${cr}" fill="none" stroke="${C.text}" stroke-opacity=".12" stroke-width="3.2"/>
<circle cx="${core.x}" cy="${core.y}" r="${cr}" fill="none" stroke="${C.accent}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${(circ * overall).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${core.x} ${core.y})"/>
<circle cx="${core.x}" cy="${core.y}" r="31" fill="url(#core)"/>
${star(core.x, core.y, 1)}
<text x="${core.x}" y="${core.y + 60}" text-anchor="middle" class="t">Build agent panel</text>
<text x="${core.x}" y="${core.y + 74}" text-anchor="middle" class="s"><tspan fill="${C.accent}" font-weight="600">Opus High</tspan>  11 of 20 steps</text>
${agents.map(agentNode).join('\n')}
</svg>`
}

const glyph = { running: ['◐', C.accent], waiting: ['◉', C.wait], done: ['✓', C.done], failed: ['✕', C.red], picking: ['◌', C.dim] }
const tail = a => a.state === 'picking' ? Text({ color: C.accent }, 'picking')
  : a.state === 'failed' ? Text({ color: C.red }, `failed ${a.time}`)
  : Box({ flexDirection: 'row', flexShrink: 0 }, Text({ color: MODEL[a.model], bold: true }, `${a.model} ${a.effort}`), Text({ color: C.dim }, `  ${a.steps[0]}/${a.steps[1]}`))
const row = a => Box({ key: `row-${a.id}`, flexDirection: 'row', paddingX: 1 },
  Text({ color: glyph[a.state][1], bold: true }, `${a.parent ? '  └ ' : ''}${glyph[a.state][0]} `),
  Text({ color: a.state === 'failed' ? C.dim : C.text, bold: true }, a.type),
  Box({ flexShrink: 1, minWidth: 0, flexGrow: 1, overflow: 'hidden' }, Text({ color: C.dim, wrap: 'truncate' }, `  ${a.task}`)),
  tail(a))

const hub = Box({ key: 'hub', flexDirection: 'column', paddingY: 1 },
  Svg(hubSvg(), 'Project hub: three chats, this one the hub; six agents of this chat with their progress', W, H),
  Box({ flexDirection: 'column' }, ...agents.map(row)))

mkdirSync(join(HERE, 'trees'), { recursive: true })
writeFileSync(join(HERE, 'trees', 'hub.json'), JSON.stringify(hub, null, 1))
console.log('trees/hub.json')
