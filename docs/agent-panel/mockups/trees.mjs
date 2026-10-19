// Element trees for the agent panel mockups: the same Box/Text/Button/Svg trees a `ui.render` hook on
// `{ component: 'Pane' }` would return on desktop. `node trees.mjs` writes trees/<name>.json, which
// render.mjs draws with the desktop app's own renderer (see README.md).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MARK = readFileSync(join(HERE, '..', '..', '..', 'brand', 'mark.svg'), 'utf8').trim()

// Palette: the band's, the brand card's and the alert colours already in hooks/register.tsx.
const C = {
  bg: '#141416', edge: '#2a2a2f', text: '#d4d4d8', dim: '#8b8b93', faint: '#5d5d66',
  accent: '#a79cf7', flash: '#9b7bff', brandBg: '#15121f', brandEdge: '#4a3f80', brandHead: '#221c3a',
  doneBg: '#0f1c15', doneEdge: '#2f7a4c', done: '#7fe0a4',
  wait: '#e0a33a', waitBg: '#1a150c', waitEdge: '#5c4520', red: '#e5534b',
}

let handle = 0
const node = (type, props = {}, ...children) => ({ type, props, children: children.flat().filter(c => c !== null && c !== undefined && c !== false) })
const Box = (props, ...kids) => node('Box', props, ...kids)
const Text = (props, text) => node('Text', props, text)
const Svg = (source, alt, width, height) => node('Svg', { source, alt, width, height })
const Button = (key, label, props = {}) => ({ type: 'Button', props: { key, label, ...props }, children: [], press: { plugin: 'effortless', handle: ++handle } })
const grow = () => Box({ flexGrow: 1, minWidth: 1 })
/** A whole card pressable: a blank plain Button in a layer over it, as the dashboard's switches are built. */
const pressLayer = key => Box({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, Button(key, ' '.repeat(60), { plain: true }))

// --- Images (the only things that move) ------------------------------------------------------------------------------
const mark = (size, opacity = 1) =>
  Svg(MARK.replace('<svg ', `<svg width="${size}" height="${size}" opacity="${opacity}" `), 'effortless', size, size)

const icon = {
  // Running: an arc that turns, violet.
  running: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><style>.a{transform-origin:7px 7px;animation:r 1.1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style><circle cx="7" cy="7" r="5.2" fill="none" stroke="${C.accent}" stroke-opacity=".22" stroke-width="1.8"/><path class="a" d="M7 1.8 A5.2 5.2 0 0 1 12.2 7" fill="none" stroke="${C.accent}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  // Waiting on a tool: an amber ring that breathes, a dot in the middle.
  waiting: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><style>.p{animation:p 1.6s ease-in-out infinite}@keyframes p{0%,100%{opacity:.35}50%{opacity:1}}</style><circle class="p" cx="7" cy="7" r="5.2" fill="none" stroke="${C.wait}" stroke-width="1.6"/><circle cx="7" cy="7" r="1.8" fill="${C.wait}"/></svg>`,
  done: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="${C.done}" fill-opacity=".18" stroke="${C.done}" stroke-width="1.3"/><path d="M4.3 7.2 L6.2 9 L9.8 5.2" fill="none" stroke="${C.done}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  failed: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="${C.red}" fill-opacity=".15" stroke="${C.red}" stroke-width="1.3"/><path d="M5 5 L9 9 M9 5 L5 9" stroke="${C.red}" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  queued: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.2" fill="none" stroke="${C.dim}" stroke-width="1.4" stroke-dasharray="2.2 2.2"/></svg>`,
  // Main chat, waiting on its agents: three dots that pass a light along.
  dots: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="14" viewBox="0 0 22 14"><style>circle{fill:${C.accent};opacity:.25;animation:d 1.2s ease-in-out infinite}@keyframes d{0%,60%,100%{opacity:.25}30%{opacity:1}}</style><circle cx="4" cy="7" r="2"/><circle cx="11" cy="7" r="2" style="animation-delay:.2s"/><circle cx="18" cy="7" r="2" style="animation-delay:.4s"/></svg>`,
  reportBack: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="M11.5 3.5 V7 a2 2 0 0 1 -2 2 H3.5 M6 6.3 L3.3 9 L6 11.7" fill="none" stroke="${C.done}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
}
const status = kind => Svg(icon[kind], kind, 14, 14)

/** The context ring of the dashboard (ringSvg in register.tsx). */
const ring = (percent, color) => {
  const c = 2 * Math.PI * 6
  return Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="2.2"/><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${((c * percent) / 100).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)"/></svg>`, `${percent}% of context`, 16, 16)
}

/** Elapsed time that counts up by itself: a frame a second for 75 s, as cacheClockSvg counts down. The pane is
 * redrawn at most once a minute for the clocks, so the image carries the seconds between. */
const clock = (startS, color = C.dim, width = 40) => {
  const frames = []
  for (let j = 0; j < 75; j++) {
    const s = startS + j
    frames.push(`<text x="${width}" y="12.5" text-anchor="end" style="animation-delay:${j}s">${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</text>`)
  }
  return Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="17" viewBox="0 0 ${width} 17"><style>text{font:13px system-ui,'Segoe UI',sans-serif;font-variant-numeric:tabular-nums;fill:${color};opacity:0;animation:f 1s step-end 1}text:first-child{opacity:1;animation:none}@keyframes f{0%{opacity:1}100%{opacity:0}}</style>${frames.slice(0, 1).join('')}${frames.slice(1).join('')}</svg>`, `${Math.floor(startS / 60)}:${String(startS % 60).padStart(2, '0')} running`, width, 17)
}

/** Tool calls per 10 s since the agent started: the bars of the detail view, the newest one in the state's colour. */
const activity = (counts, width, color) => {
  const h = 30, gap = 2, w = (width - gap * (counts.length - 1)) / counts.length, max = Math.max(...counts, 1)
  const bars = counts.map((n, i) => {
    const bh = Math.max(2, (n / max) * (h - 4))
    const last = i === counts.length - 1
    return `<rect x="${(i * (w + gap)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${last ? color : C.accent}" fill-opacity="${last ? 1 : 0.28 + 0.5 * (i / counts.length)}"${last ? ' class="n"' : ''}/>`
  })
  return Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}"><style>.n{animation:n 1.6s ease-in-out infinite}@keyframes n{0%,100%{opacity:.45}50%{opacity:1}}</style><line x1="0" x2="${width}" y1="${h - 0.5}" y2="${h - 0.5}" stroke="${C.edge}"/>${bars.join('')}</svg>`, 'tool calls over time', width, h)
}

const rule = width => Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="1"><rect width="${width}" height="1" fill="${C.edge}"/></svg>`, '', width, 1)

// --- Pieces --------------------------------------------------------------------------------------------------------
/** The pick, as a small violet-edged tag: the model and effort effortless chose. */
const pickTag = (model, effort, tone = 'brand') =>
  Box({ flexShrink: 0, flexDirection: 'row', paddingX: 1, backgroundColor: tone === 'done' ? '#143021' : C.brandHead },
    Text({ color: tone === 'done' ? C.done : C.accent, bold: true }, model),
    Text({ color: tone === 'done' ? C.done : C.accent }, ` · ${effort}`))

/** A small chevron before what an agent does now (a glyph would be too thin at this size). */
const chevron = color => Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="M5 3.5 L8.5 7 L5 10.5" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`, '', 14, 14)

const header = (right) =>
  Box({ key: 'head', flexDirection: 'row', alignItems: 'center', paddingX: 1 },
    Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, mark(18)),
    Text({ color: '#ececf0', bold: true }, 'effortless'),
    Text({ color: C.dim }, '  Agents'),
    grow(),
    right)

const mainChat = ({ effort, model, percent, cache, line, busy }) =>
  Box({ key: 'main', position: 'relative', flexDirection: 'column', paddingX: 1, backgroundColor: C.brandBg, borderStyle: 'round', borderColor: C.brandEdge },
    Box({ flexDirection: 'row', alignItems: 'center' },
      Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, mark(14)),
      Text({ color: C.text, bold: true }, 'Main chat'),
      grow(),
      Text({ color: C.accent, bold: true }, effort),
      Text({ color: C.dim }, `  ${model}`)),
    Box({ flexDirection: 'row', alignItems: 'center', gap: 1 },
      ring(percent, C.text),
      Text({ color: C.text }, `${percent}%`),
      Text({ color: C.dim }, `  cache ${cache}`),
      grow(),
      busy ? Svg(icon.dots, 'waiting on agents', 22, 14) : null,
      Text({ color: busy ? C.accent : C.dim }, line)))

/**
 * One agent: what it is, the pick, what it is doing now, and why effortless picked what it did.
 * tone: brand (running), wait (on a tool), done, failed, queued.
 */
const agentCard = a => {
  const tone = a.tone
  const bg = tone === 'done' ? C.doneBg : tone === 'wait' ? C.waitBg : C.bg
  const edge = tone === 'done' ? C.doneEdge : tone === 'wait' ? C.waitEdge : C.edge
  const nowColor = tone === 'done' ? C.done : tone === 'wait' ? C.wait : tone === 'failed' ? C.red : C.text
  return Box({ key: `agent-${a.id}`, position: 'relative', flexDirection: 'column', paddingX: 1, backgroundColor: bg, borderStyle: 'round', borderColor: edge },
    Box({ flexDirection: 'row', alignItems: 'center' },
      Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, status(a.status)),
      Text({ color: C.text, bold: true, wrap: 'truncate' }, a.type),
      Box({ flexShrink: 1, minWidth: 0, flexGrow: 1, overflow: 'hidden' }, Text({ color: C.dim, wrap: 'truncate' }, `  ${a.title}`)),
      Box({ flexShrink: 0, marginLeft: 1 }, a.clock ?? Text({ color: C.dim }, a.time))),
    Box({ flexDirection: 'row', alignItems: 'center', marginTop: 0 },
      pickTag(a.model, a.effort, tone === 'done' ? 'done' : 'brand'),
      Text({ color: C.dim, wrap: 'truncate' }, `  ${a.stats}`),
      grow(),
      Text({ color: C.text, bold: true }, a.cost)),
    Box({ flexDirection: 'row', alignItems: 'center' },
      Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, a.nowIcon ? Svg(icon[a.nowIcon], '', 14, 14) : chevron(tone === 'wait' ? C.wait : C.dim)),
      a.nowTool ? Text({ color: nowColor, bold: true }, `${a.nowTool} `) : null,
      Box({ flexShrink: 1, minWidth: 0, flexGrow: 1, overflow: 'hidden' }, Text({ color: tone === 'done' || tone === 'wait' ? nowColor : C.dim, wrap: 'truncate' }, a.now)),
      a.nowTime ? Text({ color: nowColor }, a.nowTime) : null),
    a.why
      ? Box({ flexDirection: 'row', alignItems: 'center' },
          Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, mark(12, tone === 'done' ? 0.55 : 0.9)),
          Box({ flexShrink: 1, minWidth: 0, overflow: 'hidden' }, Text({ color: tone === 'done' ? C.dim : '#8f86d6', italic: true, wrap: 'truncate' }, a.why)))
      : null,
    pressLayer(`open-${a.id}`))
}

/** A one-line agent: queued while effortless picks, or finished and folded away. */
const agentRow = a =>
  Box({ key: `row-${a.id}`, position: 'relative', flexDirection: 'row', alignItems: 'center', paddingX: 1, backgroundColor: a.bg ?? C.bg, borderStyle: 'round', borderColor: a.edge ?? C.edge },
    Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, status(a.status)),
    Text({ color: a.status === 'failed' ? C.dim : C.text, bold: true }, a.type),
    Box({ flexShrink: 1, minWidth: 0, flexGrow: 1, overflow: 'hidden' }, Text({ color: C.dim, wrap: 'truncate' }, `  ${a.title}`)),
    a.dots ? Box({ flexShrink: 0, marginLeft: 1, alignItems: 'center' }, Svg(icon.dots, 'picking', 22, 14)) : null,
    Box({ flexShrink: 0, marginLeft: 1 }, Text({ color: a.endColor ?? C.dim }, a.end)),
    pressLayer(`open-${a.id}`))

// --- (a) The panel: main chat and three agents ---------------------------------------------------------------------
function panel() {
  return Box({ key: 'agents', flexDirection: 'column', gap: 1, paddingY: 1 },
    header(Box({ flexDirection: 'row', flexShrink: 0 }, Text({ color: C.dim }, '5 agents  '), Text({ color: C.text, bold: true }, '$0.58'))),
    mainChat({ effort: 'High', model: 'Opus 5.5', percent: 38, cache: '59m', line: 'waits on 2', busy: true }),
    Box({ flexDirection: 'row', paddingX: 1 }, Text({ color: C.dim, bold: true }, 'Agents'), grow(), Text({ color: C.dim }, 'picked by Jev')),
    agentCard({
      id: 1, tone: 'brand', status: 'running', type: 'Explore', title: 'find the pane and agent hooks',
      clock: clock(102), model: 'Haiku', effort: 'Low', stats: '14 calls · 61k', cost: '$0.01',
      nowTool: 'Grep', now: '"agentId" in hooks/register.tsx',
      why: 'read-only search, wide but shallow',
    }),
    agentCard({
      id: 2, tone: 'wait', status: 'waiting', type: 'code-reviewer', title: 'review the agent-panel branch',
      clock: clock(250, C.wait), model: 'Opus', effort: 'High', stats: '23 calls · 182k', cost: '$0.31',
      nowTool: 'Bash', now: 'npm test', nowTime: '0:38',
      why: 'a review before merge: misses cost more',
    }),
    agentCard({
      id: 3, tone: 'done', status: 'done', type: 'general-purpose', title: 'add state for the panel',
      time: '3:12', model: 'Sonnet', effort: 'Medium', stats: '31 calls · 240k', cost: '$0.26',
      nowIcon: 'reportBack', now: 'Reported back to the main chat', nowTime: '0:04 ago',
      why: 'a plan to follow, three files',
    }),
    agentRow({ id: 4, status: 'queued', type: 'Plan', title: 'outline the release notes', dots: true, end: 'picking', endColor: C.accent, bg: C.brandBg, edge: C.brandEdge }),
    agentRow({ id: 5, status: 'failed', type: 'Explore', title: 'scan site/ for dead links', end: 'failed · 0:21', endColor: C.red }),
    Box({ flexDirection: 'column', paddingX: 1 },
      rule(368),
      Box({ flexDirection: 'row', marginTop: 1 }, Text({ color: C.dim }, 'Agents this chat'), grow(), Text({ color: C.text }, '$0.58')),
      Box({ flexDirection: 'row' }, Text({ color: C.dim }, 'All on Opus · High would be'), grow(), Text({ color: C.dim }, '≈ $1.05')),
      Box({ flexDirection: 'row' }, Text({ color: C.dim }, 'Saved by picking'), grow(), Text({ color: C.done, bold: true }, '≈ $0.47'))),
    Box({ flexDirection: 'row', gap: 1, paddingX: 1 },
      Button('auto-agents', 'Auto picks: On', { variant: 'secondary' }),
      Button('clear-done', 'Clear done', { variant: 'secondary', dimColor: true }),
      grow()))
}

// --- (b) One agent opened -----------------------------------------------------------------------------------------
function detail() {
  const kv = (k, v, color = C.text) => Box({ flexDirection: 'row', width: '50%' }, Text({ color: C.dim }, `${k}  `), Text({ color, bold: true }, v))
  const call = (state, tool, arg, time, color = C.dim) =>
    Box({ flexDirection: 'row', alignItems: 'center' },
      Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, status(state)),
      Box({ width: 6, flexShrink: 0 }, Text({ color: state === 'waiting' ? C.wait : C.text, bold: true }, tool)),
      Box({ flexGrow: 1, flexShrink: 1, minWidth: 0, overflow: 'hidden' }, Text({ color: C.dim, wrap: 'truncate' }, arg)),
      Text({ color }, time))
  const input = (k, v) => Box({ flexDirection: 'row' }, Box({ width: 9, flexShrink: 0 }, Text({ color: '#8f86d6' }, k)), Box({ flexShrink: 1, minWidth: 0 }, Text({ color: C.text, wrap: 'wrap' }, v)))
  return Box({ key: 'agent-detail', flexDirection: 'column', gap: 1, paddingY: 1 },
    Box({ flexDirection: 'row', alignItems: 'center', paddingX: 1 },
      Button('back', '‹ Agents', { variant: 'secondary' }),
      grow(),
      Text({ color: C.dim }, '2 of 3')),
    Box({ key: 'head', flexDirection: 'column', paddingX: 1, backgroundColor: C.waitBg, borderStyle: 'round', borderColor: C.waitEdge },
      Box({ flexDirection: 'row', alignItems: 'center' },
        Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, status('waiting')),
        Text({ color: C.text, bold: true }, 'code-reviewer'),
        grow(),
        clock(250, C.wait)),
      Text({ color: C.dim, wrap: 'wrap' }, 'Review the agent-panel branch before merge: hooks, state, tests.'),
      Box({ flexDirection: 'row', alignItems: 'center' },
        Text({ color: C.wait, bold: true }, 'Waiting on Bash'),
        Text({ color: C.wait }, '  npm test'),
        grow(),
        Text({ color: C.wait }, '0:38'))),
    Box({ flexDirection: 'column', paddingX: 1 },
      Box({ flexDirection: 'row' }, kv('Model', 'Opus 5.5', C.accent), kv('Effort', 'High', C.accent)),
      Box({ flexDirection: 'row' }, kv('Cost', '$0.31'), kv('Calls', '23')),
      Box({ flexDirection: 'row' }, kv('Read', '171k cached'), kv('Wrote', '9.4k'))),
    Box({ key: 'why', flexDirection: 'column', paddingX: 1, backgroundColor: C.brandBg, borderStyle: 'round', borderColor: C.brandEdge },
      Box({ flexDirection: 'row', alignItems: 'center' },
        Box({ flexShrink: 0, marginRight: 1, alignItems: 'center' }, mark(14)),
        Text({ color: C.accent, bold: true }, 'Why Opus · High'),
        grow(),
        Text({ color: C.dim }, 'Jev · 0.24 s · sure 0.9')),
      Text({ color: C.text, wrap: 'wrap' }, 'A review of a whole branch before merge. A miss here costs more than the tokens.'),
      Box({ flexDirection: 'column', marginTop: 1 },
        input('Type', 'code-reviewer: floor Medium'),
        input('Task', '2.1k chars, names 4 files, "before merge"'),
        input('Parent', 'main chat at High on Opus'),
        input('Bias', 'Balanced, ceiling Max')),
      Box({ flexDirection: 'row', marginTop: 1 }, Text({ color: C.dim }, 'Next best  '), Text({ color: C.text }, 'Sonnet · High'), grow(), Text({ color: C.dim }, '≈ $0.14'))),
    Box({ flexDirection: 'column', paddingX: 1 },
      Box({ flexDirection: 'row' }, Text({ color: C.dim, bold: true }, 'Tool calls'), grow(), Text({ color: C.dim }, 'per 10 s')),
      activity([2, 4, 3, 5, 6, 2, 3, 4, 1, 5, 3, 2, 4, 6, 5, 3, 2, 1, 3, 4, 2, 3, 2, 1, 1], 368, C.wait)),
    Box({ flexDirection: 'column', paddingX: 1 },
      call('waiting', 'Bash', 'npm test', '0:38', C.wait),
      call('done', 'Grep', '"agentId" hooks/register.tsx', '0.2 s'),
      call('done', 'Read', 'hooks/register.tsx  3355-3420', '0.1 s'),
      call('done', 'Read', 'tests/effortless.test.ts', '0.1 s'),
      call('done', 'Glob', 'docs/agent-panel/**', '0.1 s'),
      Text({ color: C.faint }, '18 earlier')),
    Box({ flexDirection: 'row', gap: 1, paddingX: 1 },
      Button('message', 'Message', { variant: 'secondary' }),
      Button('stop', 'Stop', { variant: 'secondary' }),
      Button('copy-task', 'Copy task', { variant: 'secondary', dimColor: true }),
      grow()))
}

// --- (c) Nothing running -------------------------------------------------------------------------------------------
function idle() {
  const toggle = on =>
    Svg(`<svg xmlns="http://www.w3.org/2000/svg" width="26" height="15" viewBox="0 0 26 15"><rect x=".5" y=".5" width="25" height="14" rx="7" fill="${on ? C.accent : '#2b2b2f'}"/><circle cx="${on ? 18.5 : 7.5}" cy="7.5" r="5" fill="${on ? '#fff' : '#8b8b93'}"/></svg>`, on ? 'on' : 'off', 26, 15)
  const setting = (label, on, hint) =>
    Box({ flexDirection: 'column' },
      Box({ position: 'relative', flexDirection: 'row', alignItems: 'center' }, Text({ color: C.text }, label), grow(), toggle(on), pressLayer(`toggle-${label.length}`)),
      Text({ color: C.dim, wrap: 'wrap' }, hint))
  return Box({ key: 'agents-idle', flexDirection: 'column', gap: 1, paddingY: 1 },
    header(Text({ color: C.dim }, 'none running')),
    mainChat({ effort: 'Medium', model: 'Sonnet 5.5', percent: 22, cache: '59m', line: 'idle', busy: false }),
    Box({ key: 'empty', flexDirection: 'column', alignItems: 'center', paddingX: 2, paddingY: 1, backgroundColor: C.bg, borderStyle: 'round', borderColor: C.edge },
      Svg(MARK.replace('<svg ', `<svg width="56" height="56" `).replace('<defs>', '<style>g{animation:b 4s ease-in-out infinite;transform-origin:50px 50px}@keyframes b{0%,100%{opacity:.45}50%{opacity:.85}}</style><defs>'), 'effortless', 56, 56),
      Box({ marginTop: 1 }, Text({ color: C.text, bold: true }, 'No agents yet')),
      Text({ color: C.dim, wrap: 'wrap' }, 'When Claude hands work to a subagent it shows here,'),
      Text({ color: C.dim, wrap: 'wrap' }, 'with the model and effort effortless picked for it.')),
    Box({ flexDirection: 'column', gap: 1, paddingX: 1 },
      setting('Pick model and effort for agents', true, 'Haiku for searches, Opus for reviews. You can still name one.'),
      setting('Keep a model Claude names', true, 'When the main chat asks for a model, effortless picks the effort only.')),
    Box({ flexDirection: 'column', paddingX: 1 },
      rule(368),
      Box({ flexDirection: 'row', marginTop: 1 }, Text({ color: C.dim, bold: true }, 'Earlier this chat')),
      Box({ flexDirection: 'row' }, Text({ color: C.dim }, '4 agents · 11 min'), grow(), Text({ color: C.text }, '$0.38')),
      Box({ flexDirection: 'row' }, Text({ color: C.dim }, 'Saved by picking'), grow(), Text({ color: C.done, bold: true }, '≈ $0.52'))))
}

mkdirSync(join(HERE, 'trees'), { recursive: true })
for (const [name, tree] of Object.entries({ panel: panel(), detail: detail(), idle: idle() })) {
  writeFileSync(join(HERE, 'trees', `${name}.json`), JSON.stringify(tree, null, 1))
  console.log(`trees/${name}.json`)
}
