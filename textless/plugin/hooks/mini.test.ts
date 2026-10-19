import { describe, expect, mock, test } from 'claude-code/testing'

// textless keeps no row under the prompt: its buttons sit on the card, which minimizes to one line, and under the
// newest answer, which says so when textless is off.
function fakeHost(on: any) {
  const store = new Map<string, unknown>()
  on('env.get', () => ({ value: '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  const counts = { invalidations: 0 }
  on('ui.invalidate', async ($: any, e: any, next: any) => { counts.invalidations++; return next(e).catch(() => ({ value: undefined })) })
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
  return { store, counts }
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const step = ($: any, id: string) =>
  $.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: id, tool: 'Bash', input: { description: 'Run the tests' }, isRunning: true } })
const answer = ($: any, t: string) => $.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: t } })

describe('the card minimized', () => {
  test('– shrinks the card to one line with the buttons, ⤢ brings it back, and the choice is kept', async ($, on) => {
    const { store } = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    let row: any = await step(e, 't1')
    await clock.advance(3500)
    row = await step(e, 't1')
    await row.press({ key: 'textless-minimize' })
    expect(store.get('mini')).toBe(true)
    // One line in the card's place, with the buttons.
    const line: any = await step(e, 't1')
    expect(await line.find({ key: 'textless-minimize' })).toBeUndefined()
    expect(await line.find({ key: 'textless-switch' })).toBeDefined()
    expect(await line.find({ key: 'textless-settings' })).toBeDefined()
    await line.press({ key: 'textless-expand' })
    expect(store.get('mini')).toBe(false)
    row = await step(e, 't1')
    expect(await row.find({ key: 'textless-minimize' })).toBeDefined()
  })
})

describe('under the newest answer', () => {
  test('the buttons, Aa styled on and plain off; older answers get none', async ($, on) => {
    fakeHost(on)
    mock.clock(on)
    const e: any = $
    await e.turn.complete({ answer: 'First.', reason: 'answer', durationMs: 1, isAborted: false, turnId: 'a' })
    await e.turn.complete({ answer: 'Second.', reason: 'answer', durationMs: 1, isAborted: false, turnId: 'b' })
    expect(await (await answer(e, 'First.')).find({ key: 'textless-newest' })).toBeUndefined()
    const last: any = await answer(e, 'Second.')
    expect(await last.find({ key: 'core' })).toBeDefined()
    // On: "Aa" in orange, struck through. Off: plain, and the buttons stay to turn it back on.
    const struck = async (ui: any) => JSON.stringify(await ui.find({ text: 'Aa' })).includes('"strikethrough":true')
    expect(await struck(last)).toBe(true)
    await last.press({ key: 'textless-switch' })
    const off: any = await answer(e, 'Second.')
    expect(await struck(off)).toBe(false)
    expect(await off.find({ key: 'textless-settings' })).toBeDefined()
    await off.press({ key: 'textless-switch' })
    expect(await struck(await answer(e, 'Second.'))).toBe(true)
  })
})

describe('background work after the answer', () => {
  test('the card waits under the answer, not up among the steps, and the running tasks are named', async ($, on) => {
    fakeHost(on)
    on('turn.step', async function* (_: any, s: any) { return { turnId: s.turnId, index: s.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null } })
    on('classic.Stop', () => ({}))
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'audit it' })
    await wait(1600)
    await step(e, 't1')
    await clock.advance(3500)
    expect(await (await step(e, 't1')).find({ key: 'textless' })).toBeDefined()
    // A subagent works on; the main turn answers.
    const it = e.turn.step({ turnId: 'x', index: 0, model: 'opus', messageCount: 1, agentId: 'a1' }); for await (const _ of it) void _
    await e.classic.Stop({ stop_hook_active: false, last_assistant_message: 'Three reviewers still run.', background_tasks: [{ id: 'b1', type: 'subagent', status: 'running', description: 'Audit theme JS' }] })
    await answer(e, 'Three reviewers still run.')
    await e.turn.complete({ answer: 'Three reviewers still run.', reason: 'answer', durationMs: 9000, isAborted: false, turnId: 'x' })
    expect(await (await step(e, 't1')).find({ key: 'textless' })).toBeUndefined()
    const below: any = await answer(e, 'Three reviewers still run.')
    expect(await below.find({ key: 'core' })).toBeDefined()
    expect(await below.find({ key: 'textless' })).toBeDefined()
    expect(await below.find({ text: 'Waiting for 1 background task: Audit theme JS' })).toBeDefined()
  })
})

describe('a turn with a task list', () => {
  test('the card goes to one line, and full size holds for the rest of the turn', async ($, on) => {
    const { store } = fakeHost(on)
    on('turn.step', async function* (_: any, s: any) { return { turnId: s.turnId, index: s.index, answer: '', toolUses: [{ id: 't2', name: 'TaskCreate', input: {} }], stopReason: 'tool_use', usage: null } })
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'audit' })
    await wait(1600)
    await step(e, 't1')
    await clock.advance(3500)
    expect(await (await step(e, 't1')).find({ key: 'textless-minimize' })).toBeDefined()
    // The app draws no row for the task tools: the step's tool calls tell.
    const it = e.turn.step({ turnId: 'x', index: 1, model: 'opus', messageCount: 2 })
    for await (const _ of it) void _
    const line: any = await step(e, 't1')
    expect(await line.find({ key: 'textless-minimize' })).toBeUndefined()
    expect(await line.find({ key: 'textless-expand' })).toBeDefined()
    await line.press({ key: 'textless-expand' })
    expect(store.get('mini')).not.toBe(true)
    expect(await (await step(e, 't1')).find({ key: 'textless-minimize' })).toBeDefined()
  })
})

describe('the next message', () => {
  test('an earlier folded turn stays folded while the next turn runs', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'audit' })
    await wait(1600)
    await step(e, 'a1')
    await clock.advance(3500)
    await step(e, 'a2')
    await answer(e, 'Checking the worker.')
    await answer(e, 'Five agents run.')
    await e.turn.complete({ answer: 'Five agents run.', reason: 'answer', durationMs: 9000, isAborted: false, turnId: 'x' })
    const shown = async (ui: any) => (await ui.find({ key: 'core' })) !== undefined
    expect(await shown(await step(e, 'a2'))).toBe(false)
    // The person sends another message; the app redraws every row.
    await e.prompt.submit({ text: 'any news?' })
    expect(await shown(await step(e, 'a2'))).toBe(false)
    expect(await shown(await answer(e, 'Checking the worker.'))).toBe(false)
    const last: any = await answer(e, 'Five agents run.')
    expect(await shown(last)).toBe(true)
    expect(await last.find({ text: 'show steps' })).toBeDefined()
  })
})

describe('switched off mid-turn', () => {
  test('the row the card sat in keeps a grey Aa that turns textless back on', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    await step(e, 'o1')
    await clock.advance(3500)
    await (await step(e, 'o1')).press({ key: 'textless-switch' })
    const struck = async (ui: any) => JSON.stringify(await ui.find({ text: 'Aa' })).includes('"strikethrough":true')
    // The app draws the row as usual (core), and under it the grey Aa where the card was.
    const row: any = await step(e, 'o1')
    expect(await row.find({ key: 'core' })).toBeDefined()
    expect(await struck(row)).toBe(false)
    expect(await row.find({ key: 'textless-settings' })).toBeDefined()
    // A later step's row has none.
    expect(await (await step(e, 'o2')).find({ key: 'textless-switch' })).toBeUndefined()
    await row.press({ key: 'textless-switch' })
    expect(await (await step(e, 'o1')).find({ key: 'textless-minimize' })).toBeDefined()
  })
})

describe('a stopped turn', () => {
  test('the folded row keeps the textless buttons although there is no answer', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'audit' })
    await wait(1600)
    await step(e, 's1')
    await clock.advance(3500)
    await step(e, 's2')
    await e.turn.complete({ answer: '', reason: 'interrupted', durationMs: 4000, isAborted: true, turnId: 'x' })
    const row: any = await step(e, 's2')
    expect(await row.find({ text: 'show steps' })).toBeDefined()
    expect(await row.find({ key: 'textless-switch' })).toBeDefined()
    expect(await row.find({ key: 'textless-settings' })).toBeDefined()
  })
})

describe('which scene a turn shows', () => {
  test('random, never one of the last shown, and the whole set gets used', async ($, on) => {
    const { store } = fakeHost(on)
    mock.clock(on)
    const e: any = $
    const seen: string[] = []
    for (let n = 0; n < 60; n++) {
      await e.prompt.submit({ text: `turn ${n}` })
      await wait(5)
      await e.turn.complete({ answer: 'ok', reason: 'answer', durationMs: 1, isAborted: false, turnId: `t${n}` })
      const picked = store.get('recentScenes') as string[]
      seen.push(picked[picked.length - 1])
    }
    // The test host has five scenes: never the same one twice in a row, and most of them come up in 60 turns.
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen).size).toBeGreaterThan(3)
  })
})

describe('redraws', () => {
  test('hidden text asks for one redraw once it settles, not a redraw every 0.7 s', async ($, on) => {
    const { counts } = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    await step(e, 'r1')
    await clock.advance(3500)
    await step(e, 'r2')
    await answer(e, 'Checking the worker.')
    const before = counts.invalidations
    // The redraw the app makes draws the hidden text again.
    for (let i = 0; i < 8; i++) { await clock.advance(800); await answer(e, 'Checking the worker.') }
    expect(counts.invalidations - before).toBeLessThanOrEqual(2)
  })
})
