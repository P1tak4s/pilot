import { atom, read, update } from 'claude-code'
import type { On } from 'claude-code'
import { tintHex } from './theme'

import type { Progress, ProgressStep } from '../types'

// The progress bar: a band above the prompt that follows a bigger task step by step (docs/specs/2026-10-06-progress-bar.md).
// Its own file, so the branches that edit register.tsx meet it in a few lines only. The engine follows $ only into
// functions of the file it is in, so what needs $ in a hook register.tsx already holds (session.start, prompt.submit,
// turn.complete, the band) is a short section there; the rules and the drawing are here.

/** A list shorter than this is no bigger task: no bar. */
export const MIN_STEPS = 3
/** Past this many steps the bar is one continuous fill instead of a segment per step. */
const SEGMENTS_MAX = 12

// The brand purple, as in register.tsx, and the two signal sets: yellow when Claude asks, green when it is done.
/** A phase's look in the current theme: the violet ones turn orange, the signal greens and yellows stay. */
export const looks = (phase: Progress['phase']) => {
  const l = LOOKS[phase]
  return { color: tintHex(l.color), bg: tintHex(l.bg), edge: tintHex(l.edge) }
}
export const LOOKS: Record<Progress['phase'], { color: string; bg: string; edge: string }> = {
  planning: { color: '#a79cf7', bg: '#15121f', edge: '#4a3f80' },
  working: { color: '#a79cf7', bg: '#15121f', edge: '#4a3f80' },
  paused: { color: '#7d76a8', bg: '#15121f', edge: '#3a3360' },
  asking: { color: '#e0a33a', bg: '#1c1608', edge: '#6b5218' },
  done: { color: '#6fcf8e', bg: '#0e1a12', edge: '#2f6b45' },
}
// Every segment holds the same long run of one character and is clipped to its share: equal content, equal width.
const RUN = 160

const progressState = atom({ plugin: 'pilot', key: 'progress' } as const, null)
// The list the person closed with ✕, as register.tsx sets it; read here only.
const progressHidden = atom({ plugin: 'pilot', key: 'progressHidden' } as const, null)

export type Cue = 'question' | 'done'

type Todo = { content: string; status: ProgressStep['status']; activeForm?: string }

/** The steps of a TodoWrite list, the whole list each time. */
export function stepsFromTodos(todos: readonly Todo[]): ProgressStep[] {
  return todos.map((t, i) => ({ id: `todo-${i}`, label: t.content, doing: t.activeForm || t.content, status: t.status }))
}

/** The steps with a task TaskCreate made added at the end, pending. */
export function withTaskCreated(steps: readonly ProgressStep[], id: string, task: { subject: string; activeForm?: string }): ProgressStep[] {
  return [...steps.filter(s => s.id !== id), { id, label: task.subject, doing: task.activeForm || task.subject, status: 'pending' }]
}

/** The steps after a TaskUpdate: a new status, subject or running form; deleted drops the step. */
export function withTaskUpdated(
  steps: readonly ProgressStep[],
  change: { taskId: string; status?: ProgressStep['status'] | 'deleted'; subject?: string; activeForm?: string },
): ProgressStep[] {
  if (change.status === 'deleted') return steps.filter(s => s.id !== change.taskId)
  return steps.map(s =>
    s.id !== change.taskId
      ? s
      : {
          ...s,
          ...(change.status ? { status: change.status } : {}),
          ...(change.subject ? { label: change.subject } : {}),
          ...(change.activeForm ? { doing: change.activeForm } : {}),
        },
  )
}

/** How far along the task is, 0 to 1: completed steps, and half of each one in progress. */
export function progressShare(steps: readonly ProgressStep[]): number {
  if (!steps.length) return 0
  const done = steps.filter(s => s.status === 'completed').length
  const doing = steps.filter(s => s.status === 'in_progress').length
  return Math.min(1, (done + doing / 2) / steps.length)
}

/** The step to name: the one in progress, else the next pending one. */
export function currentStep(steps: readonly ProgressStep[]): ProgressStep | undefined {
  return steps.find(s => s.status === 'in_progress') ?? steps.find(s => s.status === 'pending')
}

/** Which step the task is at, counted from 1: the steps completed plus one, at most all of them. */
export function stepNumber(steps: readonly ProgressStep[]): number {
  return Math.min(steps.length, steps.filter(s => s.status === 'completed').length + 1)
}

/** The list as one string: closing the bar hides it for this list until another one comes. */
export function stepsKey(steps: readonly ProgressStep[]): string {
  return steps.map(s => s.label).join('\n')
}

/**
 * Where the task stands when a main-conversation turn ends: done when every step is completed, asking when the answer
 * ends on a question, paused otherwise; null when there is nothing to follow (no list came, or too short a one).
 */
export function phaseAtTurnEnd(
  p: Progress,
  turn: { reason: string; answer: string },
  endsOnQuestion: (context: string) => boolean,
): Progress['phase'] | null {
  if (p.steps.length < MIN_STEPS) return null
  if (p.steps.every(s => s.status === 'completed')) return 'done'
  if (turn.reason === 'answer' && endsOnQuestion(`assistant: ${turn.answer}`)) return 'asking'
  return 'paused'
}

/** The bar after a turn ends, and the sound to play: a chime when it turns done or asking. */
export function atTurnEnd(
  p: Progress | null,
  turn: { reason: string; answer: string },
  endsOnQuestion: (context: string) => boolean,
): { next: Progress | null; cue?: Cue } {
  if (!p) return { next: null }
  const phase = phaseAtTurnEnd(p, turn, endsOnQuestion)
  if (phase === null) return { next: null }
  if (phase === p.phase) return { next: p }
  return { next: { ...p, phase }, ...(phase === 'done' ? { cue: 'done' } : phase === 'asking' ? { cue: 'question' } : {}) }
}

/** The bar after the person sends a prompt: a finished task is over; an asking or paused one carries on. */
export function afterPrompt(p: Progress | null, prompt: { text: string; origin: { kind: string } }): Progress | null {
  const byPerson = prompt.origin.kind === 'composer' || prompt.origin.kind === 'bridge' || prompt.origin.kind === 'sdk'
  if (!p || !byPerson || prompt.text.trim().startsWith('/')) return p
  if (p.phase === 'done') return null
  return p.phase === 'asking' || p.phase === 'paused' ? { ...p, phase: 'working' } : p
}

/**
 * How Windows plays a sound: `$.audio.play` plays nothing in a Windows terminal, so PowerShell's SoundPlayer plays the
 * file. Null on other systems, where `$.audio.play` does it.
 */
export function soundArgv(root: string, file: string): string[] | null {
  if (!/^[A-Za-z]:[\\/]/.test(root)) return null
  const path = `${root.replace(/[\\/]+$/, '')}\\${file}`.replace(/\//g, '\\').replace(/'/g, "''")
  return ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', `(New-Object Media.SoundPlayer '${path}').PlaySync()`]
}

// Sounds wait here for the session's timer (register.tsx plays them): a hook's own $ is refused once the hook has
// returned, and a sound should not hold the turn up while it plays.
let cues: Cue[] = []

/** Queues a sound, unless sounds are switched off. */
export function queueCue(hidden: readonly string[], sound: Cue | undefined) {
  if (sound && !hidden.includes('sounds') && !hidden.includes('progress')) cues.push(sound)
}

/** The queued sounds, taken off the queue. */
export function takeCues(): Cue[] {
  const due = cues
  cues = []
  return due
}

/** /effortless progress [ask|done|clear]: a demo task of five steps in the state asked for, to see the bar. */
export function demoProgress(arg: string): { progress: Progress | null; cue?: Cue; text: string } {
  const demo = (completed: number, doing: boolean): ProgressStep[] =>
    [
      ['Read the code', 'Reading the code'],
      ['Write the tests', 'Writing the tests'],
      ['Build the bar', 'Building the bar'],
      ['Run the tests', 'Running the tests'],
      ['Write the handoff', 'Writing the handoff'],
    ].map(([label, running], i) => ({
      id: `demo-${i}`,
      label,
      doing: running,
      status: i < completed ? 'completed' : i === completed && doing ? 'in_progress' : 'pending',
    }))
  if (arg === 'clear') return { progress: null, text: 'The progress bar is cleared.' }
  if (arg === 'plan')
    return { progress: { phase: 'planning', steps: [] }, text: 'The progress bar is planning (a test): Claude is in plan mode and no steps exist yet.' }
  if (arg === 'ask')
    return {
      progress: { phase: 'asking', steps: demo(2, true) },
      cue: 'question',
      text: 'The progress bar is yellow: Claude is asking something (a test). /effortless progress clear removes it.',
    }
  if (arg === 'done')
    return {
      progress: { phase: 'done', steps: demo(5, false) },
      cue: 'done',
      text: 'The progress bar is green: every step is done (a test). /effortless progress clear removes it.',
    }
  return {
    progress: { phase: 'working', steps: demo(2, true) },
    text: 'A demo progress bar is showing, step 3 of 5 (a test). Try /effortless progress plan, progress ask, progress done, progress clear.',
  }
}

/** The line in the system prompt that asks Claude to keep a step list for multi-step work. */
export const PROGRESS_PROMPT =
  'When a request takes three or more distinct steps, write them as a task list with the task tools (TaskCreate and ' +
  'TaskUpdate, or TodoWrite) before you start, and keep the status of each step current as you go. Skip the list for quick ' +
  'answers and one-step changes.'

/**
 * The hooks register.tsx does not have yet: the step list from the todo and task tools, Claude asking, and plan mode. `hidden` gives the parts switched off.
 */
export function registerProgress(on: On, hidden: () => readonly string[]) {
  const off = () => hidden().includes('progress')

  // The bar follows the task tools, and Claude writes a list only when it decides to: this line asks it to for real
  // multi-step work, so the bar has steps to show. Static text, so the prompt cache stays warm. It rides in the first
  // message's context, not the system prompt: prompt.compose is missing on the stable CLI (2.1.285) and a module that
  // names it does not load there at all.
  on('prompt.context', async ($, e, next) => {
    const result = await next(e)
    if (off()) return result
    return { ...result, blocks: [...result.blocks, { name: 'effortless-progress', text: PROGRESS_PROMPT }] }
  })

  on('tool.call', async ($, e, next) => {
    if (off() || e.agentId !== undefined) return next(e)
    if (e.tool === 'AskUserQuestion') {
      const p = await read($, progressState)
      const shown = Boolean(p && (p.phase === 'working' || p.phase === 'paused') && p.steps.length >= MIN_STEPS)
      if (shown) {
        await update($, progressState, cur => (cur ? { ...cur, phase: 'asking' } : cur))
        // A chime only with a bar to see: a list the person closed asks quietly.
        if (p && (await read($, progressHidden)) !== stepsKey(p.steps)) queueCue(hidden(), 'question')
      }
      const result = await next(e)
      if (shown) await update($, progressState, cur => (cur?.phase === 'asking' ? { ...cur, phase: 'working' } : cur))
      return result
    }
    if (e.tool === 'EnterPlanMode') {
      // Claude is planning for real: the bar says so until a step list comes. A guess from the effort pick showed it
      // for turns that never made a list, a handoff among them.
      const result = await next(e)
      if (!('deny' in result && result.deny) && !result.isError) await update($, progressState, p => p ?? { phase: 'planning', steps: [] })
      return result
    }
    if (e.tool !== 'TodoWrite' && e.tool !== 'TaskCreate' && e.tool !== 'TaskUpdate') return next(e)
    const result = await next(e)
    if (('deny' in result && result.deny) || result.isError) return result
    if (e.tool === 'TodoWrite') {
      const steps = stepsFromTodos(e.todos)
      await update($, progressState, () => ({ phase: 'working', steps }))
    } else if (e.tool === 'TaskCreate') {
      const id = (result.result as { task?: { id?: string } } | undefined)?.task?.id
      if (id) await update($, progressState, p => ({ phase: 'working', steps: withTaskCreated(p && p.phase !== 'done' ? p.steps : [], id, e) }))
    } else {
      await update($, progressState, p => (p ? { phase: p.phase === 'planning' ? 'working' : p.phase, steps: withTaskUpdated(p.steps, e) } : p))
    }
    return result
  })
}

/** What drawing the bar takes besides the state: the surface's elements, the rows there is room for, the ✕. */
export type ProgressDraw = {
  // The surface's element table, as $.ui.resolve(e) gives it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Box: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Text: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: any
  /** The surface's Svg, on the surfaces that have one (not the terminal): the track is drawn as one still image. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Svg?: any
  maxRows: number
  onClose: () => unknown
}

/**
 * Whether the bar shows in this place: 'active' (planning, working, asking) sits above the alert bands, 'resting'
 * (done, paused) below them. A list too short, or one the person closed, shows nowhere.
 */
export function progressShows(p: Progress | null, hiddenKey: string | null, when: 'active' | 'resting'): p is Progress {
  if (!p) return false
  // A finished task comes before the alerts too: it is news, and it lasts only until the next message.
  const active = p.phase === 'planning' || p.phase === 'working' || p.phase === 'asking' || p.phase === 'done'
  if ((when === 'active') !== active) return false
  if (p.phase === 'planning') return true
  return p.steps.length >= MIN_STEPS && hiddenKey !== stepsKey(p.steps)
}

/** The thinking dots' size in pixels. */
export const THINK_W = 34

/**
 * Planning, before any step exists: three dots pulsing one after another, like thinking. No bar: nothing is measured
 * yet, so nothing pretends to fill. Fixed size, so its interactive frame fits it.
 */
export function thinkingSvg(phase: Progress['phase'], w = THINK_W, h = PILL_H): string {
  const look = looks(phase)
  const r = h / 2
  const dots = [0, 1, 2]
    .map(i => `<circle class="dot" style="animation-delay:${(i * 0.18).toFixed(2)}s" cx="${6 + i * 11}" cy="${r}" r="3" fill="${look.color}"/>`)
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    '<style>:root{color-scheme:light dark}html,body{margin:0;overflow:hidden}svg{background:transparent;display:block}' +
    '.dot{transform-box:fill-box;transform-origin:center;opacity:.3;animation:dot 1.1s ease-in-out infinite}' +
    '@keyframes dot{30%{opacity:1;transform:translateY(-2.5px) scale(1.15)}60%{opacity:.3;transform:none}}</style>' +
    dots +
    '</svg>'
  )
}

/** The thinking pill's height in pixels. */
export const PILL_H = 16

/**
 * The track as one image that scales to the band's width, so it fits any window: a pill per step. Done steps are
 * filled, pending steps a faint outline, and the step in progress is alive: soft light flows through it, a shine
 * passes over it now and then and its glow breathes. A small flag at the end turns into a ticked circle when the task
 * is done. Past SEGMENTS_MAX one continuous pill, filled to the share done. The image is not interactive (an
 * interactive one needs a fixed size); its CSS animation still runs where the surface animates images, and it reads
 * the same standing still.
 */
export function progressTrackSvg(p: Progress): string {
  const look = looks(p.phase)
  const id = p.phase
  const W = 1000
  const H = 24
  const end = 30
  const y = 4
  const h = 16
  const r = h / 2
  const n = (v: number) => v.toFixed(1)
  const finished = p.phase === 'done'
  const pending = (x: number, w: number) =>
    `<rect x="${n(x + 0.6)}" y="${y + 0.6}" width="${n(Math.max(0, w - 1.2))}" height="${h - 1.2}" rx="${r - 0.6}" fill="#ffffff" fill-opacity=".04" stroke="${look.color}" stroke-opacity=".3" stroke-width="1.2"/>`
  const filled = (x: number, w: number) => `<rect x="${n(x)}" y="${y}" width="${n(Math.max(0, w))}" height="${h}" rx="${r}" fill="url(#fill-${id})"/>`
  // The live pill: a breathing halo, a body of light flowing to the right, a shine that passes over it, a bright rim.
  const live = (x: number, w: number, share = 1) => {
    const lit = Math.max(r * 2, w * share)
    const flow = 160
    return (
      `<rect class="halo" x="${n(x)}" y="${y}" width="${n(lit)}" height="${h}" rx="${r}" fill="${look.color}" filter="url(#halo-${id})"/>` +
      (share < 1 ? `<rect x="${n(x)}" y="${y}" width="${n(w)}" height="${h}" rx="${r}" fill="${look.color}" fill-opacity=".1"/>` : '') +
      `<clipPath id="cut-${id}"><rect x="${n(x)}" y="${y}" width="${n(lit)}" height="${h}" rx="${r}"/></clipPath>` +
      `<g clip-path="url(#cut-${id})">` +
      `<rect x="${n(x)}" y="${y}" width="${n(lit)}" height="${h}" fill="${look.color}" fill-opacity=".78"/>` +
      `<g class="flow"><rect x="${n(x - flow)}" y="${y}" width="${n(lit + flow * 2)}" height="${h}" fill="url(#flow-${id})"/></g>` +
      `<rect x="${n(x)}" y="${y}" width="${n(lit)}" height="${h / 2}" fill="#ffffff" fill-opacity=".1"/>` +
      `<g class="shine"><rect x="${n(x - 60)}" y="${y - 4}" width="44" height="${h + 8}" transform="skewX(-25)" fill="url(#shine-${id})"/></g>` +
      '</g>' +
      `<rect x="${n(x + 0.6)}" y="${y + 0.6}" width="${n(lit - 1.2)}" height="${h - 1.2}" rx="${r - 0.6}" fill="none" stroke="#ffffff" stroke-opacity=".32" stroke-width="1.2"/>` +
      `<style>.shine{animation:shine-${id} 3.2s ease-in-out infinite}@keyframes shine-${id}{0%,35%{transform:translateX(0)}100%{transform:translateX(${n(lit + 140)}px)}}</style>`
    )
  }
  const total = p.steps.length
  const room = W - end
  const parts: string[] = []
  if (total > 0 && total <= SEGMENTS_MAX) {
    const gap = 10
    const seg = (room - gap * (total - 1)) / total
    p.steps.forEach((step, i) => {
      const x = i * (seg + gap)
      if (finished || step.status === 'completed') parts.push(filled(x, seg))
      else if (step.status === 'in_progress' && p.phase !== 'paused') parts.push(live(x, seg))
      else parts.push(pending(x, seg))
    })
  } else {
    parts.push(finished ? filled(0, room) : live(0, room, progressShare(p.steps)))
  }
  const fx = W - 12
  const flag = finished
    ? `<circle cx="${fx}" cy="12" r="9" fill="${look.color}"/><path d="M${fx - 4.4} 12.2L${fx - 1.4} 15.2L${fx + 4.2} 8.8" fill="none" stroke="${look.bg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M${fx - 6} 21V3.5" stroke="${look.color}" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/><path d="M${fx - 5.2} 4L${fx + 7} 7.8L${fx - 5.2} 11.6Z" fill="${look.color}" fill-opacity=".75"/>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    '<style>svg{background:transparent;display:block;overflow:visible}' +
    '.flow{animation:flow 2.6s linear infinite}@keyframes flow{from{transform:translateX(0)}to{transform:translateX(160px)}}' +
    '.halo{opacity:.35;animation:halo 2.4s ease-in-out infinite}@keyframes halo{50%{opacity:.75}}</style>' +
    `<defs><linearGradient id="fill-${id}" x1="0" x2="1"><stop offset="0" stop-color="${look.color}" stop-opacity=".62"/><stop offset="1" stop-color="${look.color}"/></linearGradient>` +
    // A repeating band of light every 160 units, so moving it by one period loops without a seam.
    `<linearGradient id="flow-${id}" gradientUnits="userSpaceOnUse" x1="0" x2="160" spreadMethod="repeat"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset=".5" stop-color="#ffffff" stop-opacity=".26"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="shine-${id}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
    `<filter id="halo-${id}" x="-10%" y="-80%" width="120%" height="260%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>` +
    parts.join('') + flag + '</svg>'
  )
}

/** The background art's size in pixels: wider than any band, cut by it on the right. */
export const ART_W = 1600
export const ART_H = 64

/**
 * The band's whole background, in its colour, in layers: a faint dot grid, soft aurora clouds drifting and breathing,
 * two flowing lines of light, a slow streak passing across, twinkling sparkles, and one layer by state. Planning:
 * points of a constellation lighting up and linking. Working: particles streaming right. Asking: ripples spreading and
 * question marks rising. Done: confetti falling and checkmarks rising. Fixed size, anchored left and cut by the band,
 * so its interactive frame always fits; one source per state.
 */
export function progressArtSvg(phase: Progress['phase']): string {
  const c = looks(phase).color
  // A fixed pseudo-random spread, so the same state always draws the same art.
  const spread = (count: number, salt: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
      const b = Math.sin((i + 1) * 39.3467 + salt * 11.135) * 24634.6345
      return [(i + (a - Math.floor(a))) * (ART_W / count), 8 + (b - Math.floor(b)) * (ART_H - 16), a - Math.floor(a)] as const
    })
  const f = (v: number) => v.toFixed(1)
  const sparks = spread(26, 1)
    .map(([x, y, k]) => {
      const s = 2 + k * 2.6
      return (
        `<path class="sp" style="transform-origin:${f(x)}px ${f(y)}px;animation-delay:${(k * 4.2).toFixed(2)}s" ` +
        `d="M${f(x)} ${f(y - s)}L${f(x + s * 0.28)} ${f(y - s * 0.28)}L${f(x + s)} ${f(y)}L${f(x + s * 0.28)} ${f(y + s * 0.28)}L${f(x)} ${f(y + s)}L${f(x - s * 0.28)} ${f(y + s * 0.28)}L${f(x - s)} ${f(y)}L${f(x - s * 0.28)} ${f(y - s * 0.28)}Z" fill="#fff"/>`
      )
    })
    .join('')
  const clouds = spread(6, 5)
    .map(([x, , k], i) =>
      `<ellipse class="cl" style="animation-delay:-${(k * 9).toFixed(2)}s;animation-duration:${(9 + k * 6).toFixed(2)}s" cx="${f(x)}" cy="${i % 2 ? 50 : 14}" rx="${f(120 + k * 90)}" ry="26" fill="${c}"/>`,
    )
    .join('')
  // Two sine lines across the band; their dashes travel, so light runs along them.
  const wave = (amp: number, period: number, phase0: number, cls: string, op: number) => {
    let d = ''
    for (let x = 0; x <= ART_W; x += 20) d += `${x ? 'L' : 'M'}${x} ${f(ART_H / 2 + amp * Math.sin((x / period) * Math.PI * 2 + phase0))}`
    return `<path class="${cls}" d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="1.2" stroke-linecap="round"/>`
  }
  const rising = (count: number, glyph: (x: number) => string) =>
    spread(count, 7)
      .map(([x, , k]) => `<g class="up" style="animation-delay:${(k * 3).toFixed(2)}s;animation-duration:${(3 + k * 1.5).toFixed(2)}s">${glyph(x)}</g>`)
      .join('')
  let extra = ''
  if (phase === 'done') {
    const hues = [c, '#ffffff', '#f2d16b', '#a79cf7']
    extra =
      spread(34, 11)
        .map(([x, , k], i) =>
          `<rect class="cf" style="animation-delay:-${(k * 4).toFixed(2)}s;animation-duration:${(2.6 + k * 2).toFixed(2)}s" x="${f(x)}" y="-8" width="${(3 + k * 3).toFixed(1)}" height="${(2 + k * 2).toFixed(1)}" rx=".6" fill="${hues[i % hues.length]}"/>`,
        )
        .join('') +
      rising(14, x => `<path d="M${f(x - 5)} 56L${f(x - 1.5)} 59.5L${f(x + 5.5)} 52" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`)
  } else if (phase === 'asking') {
    extra =
      spread(5, 9)
        .map(([x, y, k]) => `<circle class="rp" style="transform-origin:${f(x)}px ${f(y)}px;animation-delay:${(k * 3).toFixed(2)}s" cx="${f(x)}" cy="${f(y)}" r="22" fill="none" stroke="${c}" stroke-width="1.2"/>`)
        .join('') +
      rising(10, x => `<text x="${f(x)}" y="60" font-size="13" font-family="sans-serif" font-weight="700" fill="${c}">?</text>`)
  } else if (phase === 'planning') {
    const pts = spread(16, 4)
    extra =
      pts
        .slice(1)
        .map(([x, y], i) => {
          const [px, py] = pts[i]
          return `<line class="lk" style="animation-delay:${(i * 0.35).toFixed(2)}s" x1="${f(px)}" y1="${f(py)}" x2="${f(x)}" y2="${f(y)}" stroke="${c}" stroke-width="1" stroke-dasharray="140" stroke-dashoffset="140"/>`
        })
        .join('') +
      pts.map(([x, y], i) => `<circle class="nd" style="animation-delay:${(i * 0.35).toFixed(2)}s" cx="${f(x)}" cy="${f(y)}" r="2.2" fill="${c}"/>`).join('')
  } else {
    extra = spread(30, 3)
      .map(([x, y, k]) => `<circle class="pt" style="animation-delay:-${(k * 3).toFixed(2)}s;animation-duration:${(1.8 + k * 2.2).toFixed(2)}s" cx="${f(x)}" cy="${f(y)}" r="${(0.8 + k * 1.4).toFixed(1)}" fill="${c}"/>`)
      .join('') +
      spread(9, 6)
        .map(([x, y, k]) => `<rect class="ln" style="animation-delay:${(k * 2.4).toFixed(2)}s" x="${f(x)}" y="${f(y)}" width="${f(40 + k * 50)}" height="1.2" rx=".6" fill="${c}"/>`)
        .join('')
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}" viewBox="0 0 ${ART_W} ${ART_H}">` +
    '<style>:root{color-scheme:light dark}html,body{margin:0;overflow:hidden}svg{background:transparent;display:block}' +
    '.sp{opacity:0;transform:scale(0);animation:tw 4.2s ease-in-out infinite}' +
    '@keyframes tw{0%,70%,100%{opacity:0;transform:scale(0) rotate(0)}82%{opacity:.85;transform:scale(1) rotate(30deg)}92%{opacity:0;transform:scale(.2) rotate(60deg)}}' +
    '.cl{opacity:.1;animation-name:cl;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}' +
    '@keyframes cl{from{opacity:.06;transform:translateX(-60px)}to{opacity:.2;transform:translateX(60px)}}' +
    '.w1{stroke-dasharray:90 260;animation:w 7s linear infinite}.w2{stroke-dasharray:50 330;animation:w 11s linear infinite reverse}' +
    '@keyframes w{to{stroke-dashoffset:-1400}}' +
    '.up{opacity:0;animation-name:up;animation-timing-function:ease-out;animation-iteration-count:infinite}' +
    '@keyframes up{0%{opacity:0;transform:translateY(0)}20%{opacity:.6}100%{opacity:0;transform:translateY(-52px)}}' +
    '.ln{opacity:0;animation:ln 2.4s ease-in infinite}@keyframes ln{0%{opacity:0;transform:translateX(-60px)}30%{opacity:.35}100%{opacity:0;transform:translateX(220px)}}' +
    '.pt{opacity:0;animation-name:pt;animation-timing-function:linear;animation-iteration-count:infinite}' +
    '@keyframes pt{0%{opacity:0;transform:translateX(0)}15%{opacity:.6}100%{opacity:0;transform:translateX(160px)}}' +
    '.rp{opacity:0;transform:scale(.2);animation:rp 3s ease-out infinite}@keyframes rp{0%{opacity:.6;transform:scale(.2)}100%{opacity:0;transform:scale(1.6)}}' +
    '.cf{animation-name:cf;animation-timing-function:linear;animation-iteration-count:infinite}' +
    '@keyframes cf{0%{opacity:0;transform:translateY(0) rotate(0)}10%{opacity:.85}100%{opacity:0;transform:translateY(80px) rotate(540deg)}}' +
    '.cf{transform-box:fill-box;transform-origin:center}' +
    '.lk{opacity:.4;animation:lk 5.6s ease-in-out infinite}@keyframes lk{0%{stroke-dashoffset:140;opacity:0}30%{opacity:.45}60%{stroke-dashoffset:0;opacity:.45}100%{stroke-dashoffset:0;opacity:0}}' +
    '.nd{transform-box:fill-box;transform-origin:center;opacity:.2;animation:nd 5.6s ease-in-out infinite}@keyframes nd{0%,100%{opacity:.15;transform:scale(.7)}25%{opacity:1;transform:scale(1.5)}50%{opacity:.5;transform:scale(1)}}' +
    `.sweep{animation:sweep 6s linear infinite}@keyframes sweep{from{transform:translateX(-400px)}to{transform:translateX(${ART_W + 100}px)}}</style>` +
    `<defs><linearGradient id="wash" x1="0" x2="1"><stop offset="0" stop-color="${c}" stop-opacity=".06"/><stop offset=".6" stop-color="${c}" stop-opacity=".1"/><stop offset="1" stop-color="${c}" stop-opacity=".2"/></linearGradient>` +
    '<linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    `<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r=".8" fill="${c}" fill-opacity=".16"/></pattern>` +
    '<filter id="soft" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="16"/></filter></defs>' +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#wash)"/>` +
    `<rect width="${ART_W}" height="${ART_H}" fill="url(#dots)"/>` +
    `<g filter="url(#soft)">${clouds}</g>` +
    wave(9, 420, 0, 'w1', 0.5) + wave(6, 300, 2, 'w2', 0.35) +
    `<g class="sweep"><rect x="0" y="-20" width="300" height="${ART_H + 40}" transform="skewX(-20)" fill="url(#beam)"/></g>` +
    sparks + extra + '</svg>'
  )
}

/** The bar's first words: where the task is. */
export function progressTitle(p: Progress): string {
  const total = p.steps.length
  const at = stepNumber(p.steps)
  if (p.phase === 'planning') return 'Planning a bigger task'
  if (p.phase === 'done') return `Done · all ${total} steps`
  if (p.phase === 'asking') return `Waiting for your answer · step ${at} of ${total}`
  if (p.phase === 'paused') return `Paused at step ${at} of ${total}`
  return `Step ${at} of ${total}`
}

/**
 * The band: the brand surface (or yellow, or green), the title and the step on the first row, the track below it.
 * The track is a still Svg where the surface has one, else a row of characters: an interactive Svg sits in a frame of
 * a fixed default size (about 300 by 150) unless given both sizes, and the track has no fixed width. The motion is in
 * the art behind the band, which has a fixed size.
 */
export function drawProgress(p: Progress, d: ProgressDraw) {
  const { Box, Text, Button } = d
  const look = looks(p.phase)
  const total = p.steps.length
  const step = currentStep(p.steps)
  const title = progressTitle(p)
  const words = p.phase === 'done' || p.phase === 'planning' ? '' : ((p.phase === 'paused' ? step?.label : step?.doing) ?? '')
  const name = (
    <Box key="progress-name" position="relative" flexShrink={0}>
      <Text color={look.color} bold>
        ✦ effortless
      </Text>
    </Box>
  )
  const closeButton = <Button key="progress-close" plain role="dismiss" label="✕" onPress={d.onClose} />
  // Short of room, or nothing to count yet: one row, the bar as ten blocks.
  if (d.maxRows < 4 || p.phase === 'planning') {
    const blocks = Math.round(progressShare(p.steps) * 10)
    return (
      <Box key="progress-bar" position="relative" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden"
        backgroundColor={look.bg} borderStyle="round" borderColor={look.edge}>
        {d.Svg ? (
          <Box key="progress-art" position="absolute" top={-1} left={0} bottom={-1}>
            <d.Svg key={`art-${p.phase}`} source={progressArtSvg(p.phase)} alt="" width={ART_W} height={ART_H} />
          </Box>
        ) : null}
        {name}
        {p.phase === 'planning' ? (
          d.Svg ? (
            <Box key="progress-thinking" position="relative" flexShrink={0}>
              <d.Svg source={thinkingSvg(p.phase)} alt="thinking" width={THINK_W} height={PILL_H} />
            </Box>
          ) : null
        ) : (
          <Box key="progress-blocks" position="relative" flexShrink={0} flexDirection="row">
            <Text color={look.color}>{'▰'.repeat(blocks)}</Text>
            <Text dimColor>{'▱'.repeat(10 - blocks)}</Text>
          </Box>
        )}
        <Box key="progress-words" position="relative" flexShrink={1} minWidth={0}>
          <Text wrap="truncate">{words ? `${title} · ${words}` : title}</Text>
        </Box>
        <Box flexGrow={1} />
        {closeButton}
      </Box>
    )
  }
  const fill = (key: string, lit: boolean) => (
    <Box key={key} flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden">
      {lit ? <Text color={look.color}>{'━'.repeat(RUN)}</Text> : <Text dimColor>{'─'.repeat(RUN)}</Text>}
    </Box>
  )
  // One segment per step: completed full, in progress half, pending empty. Past SEGMENTS_MAX one continuous fill.
  const track =
    total <= SEGMENTS_MAX
      ? p.steps.map((s, i) =>
          s.status === 'in_progress' && p.phase !== 'done' ? (
            <Box key={`seg-${i}`} flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden" flexDirection="row">
              {fill(`seg-${i}-a`, true)}
              {fill(`seg-${i}-b`, false)}
            </Box>
          ) : (
            fill(`seg-${i}`, p.phase === 'done' || s.status === 'completed')
          ),
        )
      : [
          <Box key="seg-done" width={`${Math.round(progressShare(p.steps) * 100)}%`} height={1} overflow="hidden">
            <Text color={look.color}>{'━'.repeat(RUN * 2)}</Text>
          </Box>,
          fill('seg-rest', false),
        ]
  return (
    <Box key="progress-bar" position="relative" flexDirection="column" paddingX={1} overflow="hidden"
      backgroundColor={look.bg} borderStyle="round" borderColor={look.edge}>
      {d.Svg ? (
        <Box key="progress-art" position="absolute" top={-1} left={0} bottom={-1}>
          <d.Svg key={`art-${p.phase}`} source={progressArtSvg(p.phase)} alt="" width={ART_W} height={ART_H} />
        </Box>
      ) : null}
      <Box key="progress-head" position="relative" flexDirection="row" gap={1} alignItems="center">
        {name}
        <Box key="progress-words" flexShrink={1} minWidth={0} flexDirection="row" gap={1}>
          <Text color={look.color} wrap="truncate">
            {title}
          </Text>
          {words ? <Text wrap="truncate">{words}</Text> : null}
        </Box>
        <Box flexGrow={1} />
        {closeButton}
      </Box>
      {d.Svg ? (
        <Box key="progress-track" position="relative" flexDirection="row">
          <d.Svg key={`track-${p.phase}`} source={progressTrackSvg(p)} alt={title} />
        </Box>
      ) : (
        <Box key="progress-track" width="100%" height={1} flexDirection="row" gap={total <= SEGMENTS_MAX ? 1 : 0} alignItems="center">
          {track}
          <Box key="progress-flag" flexShrink={0}>
            <Text color={p.phase === 'done' ? look.color : undefined} dimColor={p.phase !== 'done'}>
              ⚑
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
