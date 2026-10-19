import { describe, expect, mock, test } from 'claude-code/testing'
import { ANSWERS } from './register'

// How much work textless adds to drawing the chat: a turn's rows while the card shows, and a finished turn's answer
// with its question list, each drawn many times as the app redraws.
const ANSWER = Array.from({ length: 40 }, (_, i) => i % 5 === 0 ? `${i / 5 + 1}. Should the card show the scene's maker under it, or stay as it is?` : `Line ${i} of a long answer with a [link](https://example.com/${i}) and \`npm run build\` in it.`).join('\n')

function fakeHost(on: any, submit?: (e: any) => void) {
  const store = new Map<string, unknown>()
  on('env.get', () => ({ value: '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($: any, e: any) => { submit?.(e); return { text: e.text } })
  on('turn.complete', () => ({ text: '' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const ms = (t0: number, n: number) => Math.round(((performance.now() - t0) / n) * 1000) / 1000

describe('cost of drawing', () => {
  test('rows during a turn and a finished answer stay cheap to draw', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    const N = 200
    let t0 = performance.now()
    for (let i = 0; i < N; i++) await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: `t${i}`, tool: 'Bash', input: { command: 'ls' }, isRunning: false } })
    await clock.advance(3500)
    const stepMs = ms(t0, N)
    t0 = performance.now()
    for (let i = 0; i < N; i++) await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: 't0', tool: 'Bash', input: {}, isRunning: true } })
    const cardMs = ms(t0, N)
    t0 = performance.now()
    for (let i = 0; i < N; i++) await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: 't' + (50 + (i % 100)), tool: 'Bash', input: { command: 'ls' }, isRunning: false } })
    const redrawMs = ms(t0, N)
    await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: ANSWER } })
    await e.turn.complete({ answer: ANSWER, reason: 'answer', durationMs: 60000, isAborted: false, turnId: 'p' })
    t0 = performance.now()
    for (let i = 0; i < N; i++) await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: ANSWER } })
    const doneMs = ms(t0, N)
    // The same drawing with nothing of textless's own: the kit's cost alone.
    t0 = performance.now()
    for (let i = 0; i < N; i++) await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'UserMessage', props: { text: 'hi' } })
    const baseMs = ms(t0, N)
    console.log(`PERF ms per draw: hidden step first draw ${stepMs}, hidden step redraw ${redrawMs}, card ${cardMs}, finished answer with questions ${doneMs}, kit baseline ${baseMs}`)
    expect(doneMs).toBeLessThan(50)
  })
})

describe('the note on questions', () => {
  test('goes with the first message of a chat and then every 20th, not with each one', async ($, on) => {
    if (!ANSWERS) return // parked: see backup/answer-cards
    const seen: boolean[] = []
    fakeHost(on, e => seen.push(((e.context ?? []) as string[]).some(c => c.startsWith('textless shows each question'))))
    mock.clock(on)
    for (let i = 0; i < 41; i++) await ($ as any).prompt.submit({ text: `message ${i}` })
    expect(seen.map((s, i) => (s ? i : -1)).filter(i => i >= 0)).toEqual([0, 20, 40])
  })
})
