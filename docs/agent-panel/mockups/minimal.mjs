// Second sketch, after Isac's review of d-hub: show only what matters, the rest on a press; the bar's own style (dark
// card, thin edge, a violet wash and grain fading in from one side); the effortless mark large in the pane's
// bottom-right corner. Two layouts to choose between, plus one with things opened on demand:
//   hub    this chat as a core, active agents as dots on short branches, done ones folded into a count
//   line   this chat at the top of a rail, each active agent a row hanging off it
//   open   the line, with "Other chats" and one agent opened by a press
// `node minimal.mjs` writes trees/min-*.json (render as in README.md).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MARK = readFileSync(join(HERE, '..', '..', '..', 'brand', 'mark.svg'), 'utf8').trim()

// The bar's palette (band trees) and its alert colours.
const C = {
  card: '#141416', edge: '#2a2a2f', chip: '#2b2b2f', text: '#d4d4d8', dim: '#8b8b93', faint: '#5d5d66',
  accent: '#a79cf7', wash: '#7c6cf0', done: '#7fe0a4', wait: '#e0a33a', red: '#e5534b',
}
const font = "system-ui,'Segoe UI',sans-serif"
const W = 368 // the pane body, inside its padding

let handle = 0
const node = (type, props = {}, ...children) => ({ type, props, children: children.flat().filter(c => c !== null && c !== undefined && c !== false) })
const Box = (props, ...kids) => node('Box', props, ...kids)
const Text = (props, text) => node('Text', props, text)
const Svg = (source, alt, width, height) => node('Svg', { source, alt, width, height })
const Button = (key, label, props = {}) => ({ type: 'Button', props: { key, label, ...props }, children: [], press: { plugin: 'effortless', handle: ++handle } })
const grow = () => Box({ flexGrow: 1, minWidth: 1 })
const pressLayer = key => Box({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, Button(key, ' '.repeat(60), { plain: true }))
const lift = () => Box({ position: 'absolute', top: 0, left: 0 })

// --- Data: one chat with six agents, two more chats in the project ----------------------------------------------------
const agents = [
  { id: 1, type: 'Explore', task: 'find the pane hooks', state: 'running', steps: [2, 4], time: '1:43', pick: 'Haiku Low' },
  { id: 2, type: 'code-reviewer', task: 'review the branch', state: 'waiting', steps: [3, 5], time: '4:11', pick: 'Opus High', now: 'npm test 0:38' },
  { id: 4, type: 'Plan', task: 'release notes', state: 'picking' },
  { id: 5, type: 'Explore', task: 'dead links in site/', state: 'failed', time: '0:21', pick: 'Haiku Low' },
  { id: 3, type: 'general-purpose', task: 'add panel state', state: 'done', steps: [6, 6], time: '3:12', pick: 'Sonnet Medium' },
  { id: 6, parent: 3, type: 'Explore', task: 'read the tests', state: 'done', steps: [1, 1], time: '0:40', pick: 'Haiku Low' },
]
const shown = agents.filter(a => a.state !== 'done')
const doneCount = agents.length - shown.length
const chats = [
  { title: 'Settings polish', line: 'done', color: C.done },
  { title: 'Site redesign', line: '2 agents', color: C.accent },
]
const tone = { running: C.accent, waiting: C.wait, picking: C.accent, failed: C.red, done: C.done }

// --- Images -------------------------------------------------------------------------------------------------------
const GRAIN = `<pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".07"/></pattern>`

/** The bottom-right corner: the bar's violet wash and grain, and the mark, large, half off the edge. */
function corner(size) {
  const mark = MARK.replace('<svg ', `<svg x="${size * 0.22}" y="${size * 0.22}" width="${size}" height="${size}" opacity=".16" `)
  return Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><radialGradient id="w" cx="${size}" cy="${size}" r="${size}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b3a6ff" stop-opacity=".42"/><stop offset=".45" stop-color="${C.wash}" stop-opacity=".18"/><stop offset="1" stop-color="${C.wash}" stop-opacity="0"/></radialGradient><radialGradient id="f" cx="${size}" cy="${size}" r="${size}" gradientUnits="userSpaceOnUse"><stop offset=".2" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="m"><rect width="${size}" height="${size}" fill="url(#f)"/></mask>${GRAIN}</defs><style>.br{animation:br 6s ease-in-out infinite}@keyframes br{0%,100%{opacity:.8}50%{opacity:1}}</style><g mask="url(#m)"><rect class="br" width="${size}" height="${size}" fill="url(#w)"/><rect width="${size}" height="${size}" fill="url(#grain)"/></g>${mark}</svg>`, '', size, size)
}

/** A thin progress track, the bar's ring as a line: done of total, in the state's colour. */
function track(a, width = 56) {
  if (!a.steps) return null
  const f = a.steps[0] / a.steps[1]
  return Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="6" viewBox="0 0 ${width} 6"><rect y="2" width="${width}" height="2" rx="1" fill="${C.text}" fill-opacity=".14"/><rect y="2" width="${(width * f).toFixed(1)}" height="2" rx="1" fill="${tone[a.state]}"/></svg>`, `${a.steps[0]} of ${a.steps[1]}`, width, 6)
}

/** Layout (a): this chat as a core, active agents as dots on short branches; done agents only a count on the core. */
function hubArt() {
  const H = 200, cx = W / 2, cy = 96
  const spots = [[cx - 112, 44], [cx + 112, 44], [cx + 118, 150], [cx - 118, 150]]
  const parts = []
  shown.forEach((a, i) => {
    const [x, y] = spots[i], c = tone[a.state]
    const mx = (cx + x) / 2, my = (cy + y) / 2 - 14
    parts.push(`<path d="M${cx} ${cy} Q${mx} ${my} ${x} ${y}" fill="none" stroke="${a.state === 'failed' ? C.red : C.edge}" stroke-opacity="${a.state === 'failed' ? 0.35 : 1}" stroke-width="1.4"${a.state === 'running' ? ` stroke-dasharray="3 5" class="flow" style="stroke:${C.accent};stroke-opacity:.6"` : ''}/>`)
    if (a.state === 'running') parts.push(`<circle cx="${x}" cy="${y}" r="13" fill="${C.accent}" opacity=".14" class="br"/>`)
    if (a.steps) {
      const circ = 2 * Math.PI * 9
      parts.push(`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${C.text}" stroke-opacity=".14" stroke-width="2"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${(circ * a.steps[0] / a.steps[1]).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${x} ${y})"${a.state === 'waiting' ? ' class="pulse"' : ''}/>`)
    } else if (a.state === 'picking') parts.push(`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${C.accent}" stroke-width="1.4" stroke-dasharray="2 3" class="spin" style="transform-origin:${x}px ${y}px"/>`)
    else parts.push(`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${C.red}" stroke-width="1.4"/>`)
    parts.push(`<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>`)
    const ly = y < cy ? y - 18 : y + 26
    parts.push(`<text x="${x}" y="${ly}" text-anchor="middle" class="t" fill="${a.state === 'failed' ? C.dim : C.text}">${a.type}</text>`)
  })
  // The core: the bar's dark card as a disc, its edge, the violet star, done agents as a small green count.
  const circ = 2 * Math.PI * 26, overall = 0.5
  parts.push(`<circle cx="${cx}" cy="${cy}" r="26" fill="${C.card}" stroke="${C.edge}" stroke-width="1.2"/>`,
    `<circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${(circ * overall).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`,
    `<path transform="translate(${cx} ${cy}) scale(.62)" d="M0 -17 C1.5 -5 5 -1.5 17 0 C5 1.5 1.5 5 0 17 C-1.5 5 -5 1.5 -17 0 C-5 -1.5 -1.5 -5 0 -17Z" fill="${C.accent}"/>`,
    `<text x="${cx}" y="${cy + 46}" text-anchor="middle" class="s"><tspan fill="${C.done}">✓ ${doneCount} done</tspan></text>`)
  return Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>.t{font:600 12px ${font}}.s{font:11px ${font}}.flow{animation:flow 1s linear infinite}@keyframes flow{to{stroke-dashoffset:-8}}.spin{animation:spin 1.4s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.pulse{animation:p 1.6s ease-in-out infinite}@keyframes p{0%,100%{opacity:.35}50%{opacity:1}}.br{animation:br 3s ease-in-out infinite}@keyframes br{0%,100%{opacity:.4}50%{opacity:1}}</style>${parts.join('')}</svg>`, `this chat and ${shown.length} active agents, ${doneCount} done`, W, H)
}

// --- Pieces in the bar's style -------------------------------------------------------------------------------------
/** This chat, as the bar draws itself: a dark card, its edge, the violet star, the title, one quiet fact. */
const chatCard = (right) =>
  Box({ key: 'chat', position: 'relative', flexDirection: 'row', alignItems: 'center', paddingX: 1, backgroundColor: C.card, borderStyle: 'round', borderColor: C.edge },
    Text({ color: C.accent, bold: true }, '✦ '),
    Text({ color: C.text, bold: true }, 'Build agent panel'),
    grow(),
    right)

const glyph = { running: '◐', waiting: '◉', picking: '◌', failed: '✕', done: '✓' }
/** One agent: its state glyph, type, task; on the right the one thing worth seeing (progress, the wait, the failure). */
const agentRow = (a, rail = false) =>
  Box({ key: `agent-${a.id}`, position: 'relative', flexDirection: 'row', alignItems: 'center', paddingX: 1 },
    rail ? Text({ color: C.edge }, a.parent ? '│   ' : '├ ') : null,
    a.parent && rail ? Text({ color: C.edge }, '└ ') : null,
    Text({ color: tone[a.state], bold: true }, `${glyph[a.state]} `),
    Text({ color: a.state === 'failed' ? C.dim : C.text, bold: true }, a.type),
    Box({ flexShrink: 1, minWidth: 0, flexGrow: 1, overflow: 'hidden' }, Text({ color: C.dim, wrap: 'truncate' }, `  ${a.task}`)),
    a.state === 'waiting' ? Text({ color: C.wait }, a.now)
      : a.state === 'picking' ? Text({ color: C.accent }, 'picking')
      : a.state === 'failed' ? Text({ color: C.red }, 'failed')
      : Box({ flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 1 }, track(a), Text({ color: C.dim }, a.time)),
    pressLayer(`open-${a.id}`))

/** The things on demand, folded to one dim line each: the press opens them. */
const fold = (key, text, color = C.dim) =>
  Box({ key, position: 'relative', flexDirection: 'row', paddingX: 1 }, Text({ color }, text), grow(), Text({ color: C.faint }, '›'), pressLayer(key))

/** The pane: content at the top, the corner art behind, the whole height used. */
const pane = (...content) =>
  Box({ key: 'pane', position: 'relative', flexDirection: 'column', height: 44, overflow: 'hidden' },
    Box({ position: 'absolute', right: -6, bottom: -2 }, corner(300)),
    Box({ position: 'relative', flexDirection: 'column', gap: 1, paddingY: 1 }, lift(), ...content))

// --- The three sketches --------------------------------------------------------------------------------------------
const hub = pane(
  chatCard(Text({ color: C.dim }, '3 of 6 done')),
  hubArt(),
  Box({ flexDirection: 'column' }, ...shown.map(a => agentRow(a))),
  Box({ flexDirection: 'column' },
    fold('done', `✓ ${doneCount} done`, C.done),
    fold('chats', `↗ 2 other chats in this project`)))

const line = pane(
  chatCard(Text({ color: C.dim }, '3 of 6 done')),
  Box({ flexDirection: 'column' }, ...shown.map(a => agentRow(a, true)), Box({ position: 'relative', flexDirection: 'row', paddingX: 1 }, Text({ color: C.edge }, '└ '), Text({ color: C.done }, `✓ ${doneCount} done`), grow(), Text({ color: C.faint }, '›'), pressLayer('done'))),
  fold('chats', `↗ 2 other chats in this project`))

/** One agent opened: the pick and why, its progress, what it does now. Folded again by a press on its row. */
const opened = a =>
  Box({ key: `open-${a.id}`, flexDirection: 'column', paddingX: 1, marginLeft: 2, borderStyle: 'round', borderColor: C.edge, backgroundColor: C.card },
    Box({ flexDirection: 'row' }, Text({ color: C.accent, bold: true }, a.pick), Text({ color: C.dim }, '  picked by Jev'), grow(), Text({ color: C.dim }, `${a.steps[0]} of ${a.steps[1]} steps`)),
    Text({ color: '#8f86d6', italic: true }, 'a review before merge: misses cost more'),
    Box({ flexDirection: 'row' }, Text({ color: C.wait }, `Bash  ${a.now}`), grow(), Text({ color: C.dim }, '182k tokens')))

const chatRow = c =>
  Box({ key: `chat-${c.title}`, position: 'relative', flexDirection: 'row', paddingX: 1, marginLeft: 2 },
    Text({ color: c.color, bold: true }, '● '), Text({ color: C.text }, c.title), grow(), Text({ color: C.dim }, `${c.line}  `), Text({ color: C.accent }, '↗'),
    pressLayer(`go-${c.title}`))

const open = pane(
  chatCard(Text({ color: C.dim }, '3 of 6 done')),
  Box({ flexDirection: 'column' },
    agentRow(shown[0], true), agentRow(shown[1], true), opened(shown[1]), agentRow(shown[2], true), agentRow(shown[3], true),
    Box({ flexDirection: 'row', paddingX: 1 }, Text({ color: C.edge }, '└ '), Text({ color: C.done }, `✓ ${doneCount} done`), grow(), Text({ color: C.faint }, '›'))),
  Box({ flexDirection: 'column' },
    Box({ flexDirection: 'row', paddingX: 1 }, Text({ color: C.dim }, '↗ Other chats in this project'), grow(), Text({ color: C.faint }, '⌄')),
    ...chats.map(chatRow)))

mkdirSync(join(HERE, 'trees'), { recursive: true })
for (const [name, tree] of Object.entries({ 'min-hub': hub, 'min-line': line, 'min-open': open })) {
  writeFileSync(join(HERE, 'trees', `${name}.json`), JSON.stringify(tree, null, 1))
  console.log(`trees/${name}.json`)
}
